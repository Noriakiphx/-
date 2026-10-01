import {randomBytes, randomUUID, createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

export const MONTHLY_AMOUNT=2980;
export const DEPOSIT_AMOUNT=10000;
export class BillingError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const ref=value=>typeof value==='string'?value:value?.id;
export function parsePolicy(value){
  if(!value)return null;
  const policy=JSON.parse(value);
  if(!policy.version||typeof policy.version!=='string'||!policy.description||typeof policy.description!=='string'||!['minPeople','minMessagesEach','minActiveDays'].every(key=>Number.isSafeInteger(policy[key])&&policy[key]>0))throw new Error('Invalid deposit policy');
  return policy;
}
export function createBilling({stripe=null,webhookSecret='',origin,dbPath=':memory:',policy=null}){
  const db=new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, member_type TEXT NOT NULL, customer_id TEXT, subscription_id TEXT, subscription_status TEXT, period_end INTEGER, cancel_at_end INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,male_id TEXT NOT NULL,female_id TEXT NOT NULL,active_type TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,session_id TEXT UNIQUE,checkout_url TEXT,expires INTEGER,payment_id TEXT UNIQUE,policy_json TEXT,created_at TEXT NOT NULL,paid_at INTEGER,refund_id TEXT,refund_status TEXT,refunded_amount INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,sender_id TEXT NOT NULL REFERENCES users(id),recipient_id TEXT NOT NULL REFERENCES users(id),sent_at INTEGER NOT NULL,CHECK(sender_id<>recipient_id));
    CREATE TABLE IF NOT EXISTS stripe_events(id TEXT PRIMARY KEY,processed_at TEXT NOT NULL);`);
  const ready=!!stripe&&!!webhookSecret;
  const locks=new Map();
  async function locked(id,fn){const previous=locks.get(id)||Promise.resolve();let release;const next=new Promise(resolve=>release=resolve);locks.set(id,next);await previous;try{return await fn();}finally{release();if(locks.get(id)===next)locks.delete(id);}}
  function session(token){if(!token)return null;const hash=createHash('sha256').update(token).digest('hex');return db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires>?').get(hash,Date.now());}
  function demoSession(token,type){if(!['male','female'].includes(type))throw new BillingError('invalid_member_type');let s=session(token);if(!s){token=randomBytes(32).toString('hex');const hash=createHash('sha256').update(token).digest('hex');const male=randomUUID(),female=randomUUID();db.prepare('INSERT INTO users(id,member_type) VALUES(?,?)').run(male,'male');db.prepare('INSERT INTO users(id,member_type) VALUES(?,?)').run(female,'female');db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash,male,female,type,Date.now()+86400000);s=session(token);}else db.prepare('UPDATE sessions SET active_type=? WHERE token_hash=?').run(type,s.token_hash);return {token};}
  function user(token){const s=session(token);if(!s)throw new BillingError('unauthorized',401);const id=s.active_type==='male'?s.male_id:s.female_id;return db.prepare('SELECT * FROM users WHERE id=?').get(id);}
  function progress(userId,p,since=Date.now()){if(!p)return null;const rows=db.prepare('SELECT sender_id,recipient_id,sent_at FROM messages WHERE (sender_id=? OR recipient_id=?) AND sent_at>=? AND sent_at<=? ORDER BY sent_at').all(userId,userId,since,Date.now());const peers=new Map();const days=new Set();for(const row of rows){const peer=row.sender_id===userId?row.recipient_id:row.sender_id;const counts=peers.get(peer)||{sent:0,received:0};if(row.sender_id===userId)counts.sent++;else counts.received++;peers.set(peer,counts);}const qualified=new Set([...peers].filter(([,c])=>c.sent>=p.minMessagesEach&&c.received>=p.minMessagesEach).map(([id])=>id));for(const row of rows){const peer=row.sender_id===userId?row.recipient_id:row.sender_id;if(qualified.has(peer))days.add(new Date(row.sent_at).toISOString().slice(0,10));}return {people:qualified.size,activeDays:days.size};}
  function state(token,specificUser=null){const u=specificUser||user(token);const orders=db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC').all(u.id);const deposit=orders.find(o=>o.kind==='deposit'&&['paid','refunded'].includes(o.status));const applicable=deposit?.policy_json?JSON.parse(deposit.policy_json):policy;const totals=progress(u.id,applicable,deposit?.paid_at??Date.now());const eligible=!!deposit&&deposit.status==='paid'&&!!applicable&&totals.people>=applicable.minPeople&&totals.activeDays>=applicable.minActiveDays&&!deposit.refund_status;return {ready,testMode:true,memberType:u.member_type,customerId:!!u.customer_id,subscription:u.subscription_id?{status:u.subscription_status,periodEnd:u.period_end,cancelAtPeriodEnd:!!u.cancel_at_end}:null,policy:applicable?{version:applicable.version,description:applicable.description}:null,progress:totals,eligible,deposit:deposit?{status:deposit.status,balance:deposit.amount-deposit.refunded_amount,refundStatus:deposit.refund_status}:null,history:orders.map(o=>({id:o.id,kind:o.kind,amount:o.amount,status:o.status,createdAt:o.created_at}))};}
  function requireReady(){if(!ready)throw new BillingError('not_ready',503);}
  async function checkout(token,body){const u=user(token);requireReady();if(body.kind!==(u.member_type==='male'?'subscription':'deposit'))throw new BillingError('wrong_plan');if(body.kind==='deposit'&&!policy)throw new BillingError('policy_missing',409);if(body.consent!==true||body.termsVersion!==(body.kind==='subscription'?'monthly-v1':policy?.version))throw new BillingError('consent_required');
    return locked(u.id,async()=>{
      const current=db.prepare('SELECT * FROM users WHERE id=?').get(u.id);
      if(body.kind==='subscription'&&current.subscription_id){const sub=await stripe.subscriptions.retrieve(current.subscription_id);if(!['canceled','incomplete_expired'].includes(sub.status))throw new BillingError('already_paid',409);}
      if(body.kind==='deposit'&&db.prepare("SELECT id FROM orders WHERE user_id=? AND kind='deposit' AND status IN ('paid','refunded')").get(u.id))throw new BillingError('already_paid',409);
      let pending=db.prepare("SELECT * FROM orders WHERE user_id=? AND kind=? AND status='pending' ORDER BY created_at DESC LIMIT 1").get(u.id,body.kind);
      if(pending?.session_id){const remote=await stripe.checkout.sessions.retrieve(pending.session_id);if(remote.status==='open'&&remote.url)return {url:remote.url};if(remote.status==='complete')throw new BillingError('pending_confirmation',409);db.prepare("UPDATE orders SET status='expired' WHERE id=?").run(pending.id);pending=null;}
      if(!pending){const id=randomUUID();db.prepare("INSERT INTO orders(id,user_id,kind,amount,status,policy_json,created_at) VALUES(?,?,?,?,'pending',?,?)").run(id,u.id,body.kind,body.kind==='subscription'?MONTHLY_AMOUNT:DEPOSIT_AMOUNT,body.kind==='deposit'?JSON.stringify(policy):null,new Date().toISOString());pending=db.prepare('SELECT * FROM orders WHERE id=?').get(id);}
      const priceData={currency:'jpy',unit_amount:pending.amount,product_data:{name:body.kind==='subscription'?'CREW LINK 男性会員・月額プラン（テスト）':'CREW LINK 女性会員・返金条件付きデポジット（テスト）'}};
      if(body.kind==='subscription'){priceData.recurring={interval:'month'};priceData.tax_behavior='inclusive';}
      const suffix=[...createHash('sha256').update(pending.id).digest().subarray(0,8)].map(byte=>String.fromCharCode(97+byte%26)).join('');
      const params={mode:body.kind==='subscription'?'subscription':'payment',locale:'ja',line_items:[{price_data:priceData,quantity:1}],client_reference_id:pending.id,success_url:`${origin}/?payment=complete#billing`,cancel_url:`${origin}/?payment=canceled#billing`,integration_identifier:'crew_link_'+suffix};
      if(current.customer_id)params.customer=current.customer_id;else if(body.kind==='deposit')params.customer_creation='always';
      const result=await stripe.checkout.sessions.create(params,{idempotencyKey:`checkout-${pending.id}`});
      if(result.livemode||!result.url)throw new BillingError('unsafe_gateway',502);
      db.prepare('UPDATE orders SET session_id=?,checkout_url=?,expires=? WHERE id=?').run(result.id,result.url,result.expires_at,pending.id);
      return {url:result.url};
    });
  }
  async function portal(token){const u=user(token);requireReady();if(!u.customer_id)throw new BillingError('no_customer',409);const portal=await stripe.billingPortal.sessions.create({customer:u.customer_id,return_url:`${origin}/#billing`});return {url:portal.url};}
  async function refund(token){const u=user(token);requireReady();return locked(u.id,async()=>{const s=state(token,u);if(!s.deposit)throw new BillingError('no_payment',409);if(!s.eligible)throw new BillingError('not_eligible',409);const deposit=db.prepare("SELECT * FROM orders WHERE user_id=? AND kind='deposit' AND status='paid'").get(u.id);if(!deposit.payment_id)throw new BillingError('no_payment',409);const result=await stripe.refunds.create({payment_intent:deposit.payment_id,amount:deposit.amount-deposit.refunded_amount},{idempotencyKey:`refund-${deposit.id}-${deposit.refunded_amount}`});if(result.livemode)throw new BillingError('unsafe_gateway',502);db.prepare('UPDATE orders SET refund_id=?,refund_status=? WHERE id=?').run(result.id,result.status==='failed'?'failed':'pending',deposit.id);return {status:'pending'};});}
  async function syncSubscription(id,userId){const sub=await stripe.subscriptions.retrieve(id);if(sub.livemode)throw new BillingError('unsafe_gateway',400);const period=sub.items?.data?.[0]?.current_period_end||sub.current_period_end||null;db.prepare('UPDATE users SET subscription_id=?,subscription_status=?,period_end=?,cancel_at_end=? WHERE id=?').run(sub.id,sub.status,period,sub.cancel_at_period_end?1:0,userId);}
  async function event(raw,signature){requireReady();let event;try{event=stripe.webhooks.constructEvent(raw,signature,webhookSecret);}catch{throw new BillingError('invalid_signature',400);}if(event.livemode)throw new BillingError('live_event_rejected',400);return locked('webhook',async()=>{if(db.prepare('SELECT id FROM stripe_events WHERE id=?').get(event.id))return {received:true};const object=event.data.object;
      if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&object.payment_status==='paid'){
        const order=db.prepare('SELECT * FROM orders WHERE session_id=?').get(object.id);
        if(order){if(order.id!==object.client_reference_id||object.amount_total!==order.amount||object.currency!=='jpy'||object.mode!==(order.kind==='subscription'?'subscription':'payment'))throw new BillingError('payment_mismatch',400);
          db.prepare("UPDATE orders SET status=CASE WHEN status='refunded' THEN status ELSE 'paid' END,payment_id=?,paid_at=COALESCE(paid_at,?) WHERE id=?").run(ref(object.payment_intent)||null,(event.created||Math.floor(Date.now()/1000))*1000,order.id);
          if(object.customer)db.prepare('UPDATE users SET customer_id=? WHERE id=?').run(ref(object.customer),order.user_id);
          if(order.kind==='subscription'&&object.subscription)await syncSubscription(ref(object.subscription),order.user_id);
        }
      }else if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type))db.prepare("UPDATE orders SET status=? WHERE session_id=? AND status='pending'").run(event.type.endsWith('expired')?'expired':'failed',object.id);
      else if(event.type.startsWith('customer.subscription.')){const u=db.prepare('SELECT id FROM users WHERE subscription_id=?').get(object.id);if(u)await syncSubscription(object.id,u.id);}
      else if(['invoice.paid','invoice.payment_failed'].includes(event.type)){const id=ref(object.parent?.subscription_details?.subscription)||ref(object.subscription);const u=id?db.prepare('SELECT id FROM users WHERE subscription_id=?').get(id):null;if(u)await syncSubscription(id,u.id);}
      else if(event.type==='charge.refunded'){const order=db.prepare('SELECT * FROM orders WHERE payment_id=?').get(ref(object.payment_intent));if(order){const amount=Math.min(order.amount,Math.max(order.refunded_amount,object.amount_refunded||0));db.prepare('UPDATE orders SET refunded_amount=?,status=?,refund_status=? WHERE id=?').run(amount,amount===order.amount?'refunded':order.status,amount===order.amount?'succeeded':order.refund_status,order.id);}}
      else if(['refund.created','refund.updated','refund.failed'].includes(event.type)){const order=db.prepare('SELECT * FROM orders WHERE refund_id=?').get(object.id);if(order&&order.status!=='refunded')db.prepare('UPDATE orders SET refund_status=? WHERE id=?').run(object.status==='succeeded'?'pending':object.status,order.id);}
      db.prepare('INSERT INTO stripe_events VALUES(?,?)').run(event.id,new Date().toISOString());return {received:true};
    });
  }
  return {db,ready,demoSession,state,checkout,portal,refund,event,close:()=>db.close()};
}
