import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Stripe from 'stripe';
import {createBilling,parsePolicy} from '../server/billing-core.mjs';
import {makeServer} from '../server.mjs';

const signingSecret='fixture-signing-secret';
const verifier=new Stripe('fixture-api-key');
const policy={version:'fixture-v1',description:'テスト専用の判定条件',minPeople:1,minMessagesEach:2,minActiveDays:2};
function fixture(options={}){
  const calls=[];const sessions=new Map();const subscriptions=new Map();
  const stripe={webhooks:verifier.webhooks,checkout:{sessions:{create:async(params,request)=>{calls.push({params,request});const id='cs_test_'+randomUUID();const result={id,url:'https://checkout.stripe.com/c/pay/'+id,expires_at:Math.floor(Date.now()/1000)+3600,status:'open',livemode:false};sessions.set(id,result);return result;},retrieve:async id=>sessions.get(id)}},subscriptions:{retrieve:async id=>subscriptions.get(id)},billingPortal:{sessions:{create:async()=>({url:'https://billing.stripe.com/p/session/test'})}},refunds:{create:async(params,request)=>{calls.push({refund:params,request});return {id:'re_fixture',status:'pending',livemode:false};}}};
  const billing=createBilling({stripe,webhookSecret:signingSecret,origin:'http://localhost:4173',policy,...options});
  const token=billing.demoSession(null,'male').token;
  const signed=async(type,object,extra={})=>{const body=JSON.stringify({id:'evt_'+randomUUID(),created:Math.floor(Date.now()/1000),livemode:false,type,data:{object},...extra});const signature=verifier.webhooks.generateTestHeaderString({payload:body,secret:signingSecret});return billing.event(Buffer.from(body),signature);};
  const payObject=()=>{const order=billing.db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1').get();return {id:order.session_id,client_reference_id:order.id,payment_status:'paid',amount_total:order.amount,currency:'jpy',mode:order.kind==='subscription'?'subscription':'payment',payment_intent:'pi_'+order.id,customer:'cus_fixture'};};
  return {billing,token,calls,stripe,subscriptions,signed,payObject};
}
test('server-owned monthly amount, consent, and duplicate checkout protection',async()=>{
  const f=fixture();try{
    await assert.rejects(f.billing.checkout(f.token,{kind:'subscription'}),{code:'consent_required'});
    const input={kind:'subscription',termsVersion:'monthly-v1',consent:true,amount:1,userId:'forged'};
    const results=await Promise.all([f.billing.checkout(f.token,input),f.billing.checkout(f.token,input)]);
    assert.equal(results[0].url,results[1].url);assert.equal(f.calls.length,1);
    assert.equal(f.calls[0].params.line_items[0].price_data.unit_amount,2980);
    assert.equal(f.calls[0].params.mode,'subscription');assert.equal('payment_method_types' in f.calls[0].params,false);
    assert.equal(f.billing.state(f.token).subscription,null);
  }finally{f.billing.close();}
});
test('retry after interrupted Stripe response keeps identical idempotent parameters',async()=>{
  const f=fixture();try{const create=f.stripe.checkout.sessions.create;let first;f.stripe.checkout.sessions.create=async(params,request)=>{if(!first){first={params,request};throw new Error('temporary network failure');}assert.deepEqual(params,first.params);assert.deepEqual(request,first.request);return create(params,request);};const input={kind:'subscription',termsVersion:'monthly-v1',consent:true};await assert.rejects(f.billing.checkout(f.token,input));await f.billing.checkout(f.token,input);assert.equal(f.billing.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);}finally{f.billing.close();}
});
test('signed paid webhook activates membership; unpaid and duplicate events do not',async()=>{
  const f=fixture();try{
    await f.billing.checkout(f.token,{kind:'subscription',termsVersion:'monthly-v1',consent:true});
    const object={...f.payObject(),subscription:'sub_fixture'};
    f.subscriptions.set('sub_fixture',{id:'sub_fixture',status:'active',livemode:false,cancel_at_period_end:false,items:{data:[{current_period_end:2000000000}]}});
    await f.signed('checkout.session.completed',{...object,payment_status:'unpaid'});
    assert.equal(f.billing.state(f.token).subscription,null);
    await f.signed('checkout.session.async_payment_succeeded',object,{id:'evt_paid'});
    await f.signed('checkout.session.async_payment_succeeded',object,{id:'evt_paid'});
    assert.equal(f.billing.state(f.token).subscription.status,'active');
    assert.equal(f.billing.state(f.token).history[0].status,'paid');
    await assert.rejects(f.billing.event(Buffer.from('{}'),'invalid'),{code:'invalid_signature'});
    await assert.rejects(f.signed('checkout.session.completed',object,{livemode:true}),{code:'live_event_rejected'});
    f.subscriptions.set('sub_fixture',{id:'sub_fixture',status:'canceled',livemode:false,items:{data:[]}});
    await f.signed('customer.subscription.updated',{id:'sub_fixture',status:'active'});
    assert.equal(f.billing.state(f.token).subscription.status,'canceled');
  }finally{f.billing.close();}
});
test('signed payment with a wrong amount does not mark the order paid',async()=>{
  const f=fixture();try{await f.billing.checkout(f.token,{kind:'subscription',termsVersion:'monthly-v1',consent:true});await assert.rejects(f.signed('checkout.session.completed',{...f.payObject(),amount_total:1}),{code:'payment_mismatch'});assert.equal(f.billing.state(f.token).history[0].status,'pending');}finally{f.billing.close();}
});
test('female deposits fail closed without agreed policy and reject male plan selection',async()=>{
  const f=fixture({policy:null});try{f.billing.demoSession(f.token,'female');await assert.rejects(f.billing.checkout(f.token,{kind:'deposit',consent:true}),{code:'policy_missing'});await assert.rejects(f.billing.checkout(f.token,{kind:'subscription',termsVersion:'monthly-v1',consent:true}),{code:'wrong_plan'});}finally{f.billing.close();}
});
test('refund uses reciprocal server records after payment; confirmed refund clears balance',async()=>{
  const f=fixture();try{
    f.billing.demoSession(f.token,'female');await f.billing.checkout(f.token,{kind:'deposit',termsVersion:policy.version,consent:true});
    const payment=f.payObject();await f.signed('checkout.session.completed',payment,{created:Math.floor(Date.now()/1000)-4*86400});
    assert.equal(f.billing.state(f.token).deposit.balance,10000);
    await assert.rejects(f.billing.refund(f.token),{code:'not_eligible'});
    const owner=f.billing.db.prepare('SELECT user_id FROM orders').get().user_id;
    const peer=randomUUID();f.billing.db.prepare('INSERT INTO users(id,member_type) VALUES(?,?)').run(peer,'male');
    const insert=(from,to,days)=>f.billing.db.prepare('INSERT INTO messages VALUES(?,?,?,?)').run(randomUUID(),from,to,Date.now()-days*86400000);
    insert(owner,peer,6);insert(peer,owner,6);
    assert.equal(f.billing.state(f.token).progress.people,0);
    insert(owner,peer,2);insert(owner,peer,1);
    assert.equal(f.billing.state(f.token).eligible,false);
    insert(peer,owner,2);insert(peer,owner,1);
    assert.equal(f.billing.state(f.token).eligible,true);
    await f.billing.refund(f.token);await assert.rejects(f.billing.refund(f.token),{code:'not_eligible'});
    assert.equal(f.calls.filter(c=>c.refund).length,1);assert.equal(f.calls.find(c=>c.refund).refund.amount,10000);
    assert.equal(f.billing.state(f.token).deposit.balance,10000);
    await f.signed('refund.updated',{id:'re_fixture',status:'succeeded'});
    assert.equal(f.billing.state(f.token).deposit.balance,10000);
    await f.signed('charge.refunded',{payment_intent:payment.payment_intent,amount_refunded:10000});
    assert.equal(f.billing.state(f.token).deposit.balance,0);assert.equal(f.billing.state(f.token).deposit.refundStatus,'succeeded');
    await f.signed('refund.updated',{id:'re_fixture',status:'succeeded'});
    assert.equal(f.billing.state(f.token).deposit.refundStatus,'succeeded');
  }finally{f.billing.close();}
});
test('no credentials, account isolation, and policy validation',async()=>{
  const f=fixture({stripe:null});try{await assert.rejects(f.billing.checkout(f.token,{kind:'subscription'}),{code:'not_ready'});assert.throws(()=>f.billing.state('made-up-cookie'),{code:'unauthorized'});const other=f.billing.demoSession(null,'male').token;assert.equal(f.billing.state(other).history.length,0);assert.throws(()=>parsePolicy('{"version":"v1"}'));}finally{f.billing.close();}
});
test('HTTP API rejects cross-origin mutations, protects files, and never fulfills from return URL',async()=>{
  const f=fixture();const server=makeServer(f.billing,{origin:'http://localhost:4173'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=`http://127.0.0.1:${server.address().port}`;
  try{
    assert.equal((await fetch(address+'/api/demo-session',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({memberType:'male'})})).status,403);
    const session=await fetch(address+'/api/demo-session',{method:'POST',headers:{Origin:'http://localhost:4173','Content-Type':'application/json'},body:JSON.stringify({memberType:'male'})});assert.equal(session.status,200);const cookie=session.headers.get('set-cookie').split(';')[0];assert.match(cookie,/crew_test_session=/);
    assert.equal((await fetch(address+'/.env')).status,404);assert.equal((await fetch(address+'/server.mjs')).status,404);
    const returned=await fetch(address+'/?payment=complete');assert.equal(returned.status,200);assert.match(returned.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    const data=await(await fetch(address+'/api/billing',{headers:{Cookie:cookie}})).json();assert.equal(data.subscription,null);
    assert.equal((await fetch(address+'/api/billing')).status,401);
  }finally{await new Promise(resolve=>server.close(resolve));f.billing.close();}
});
