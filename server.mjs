import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import Stripe from 'stripe';
import {createBilling,parsePolicy,BillingError} from './server/billing-core.mjs';

const root=dirname(fileURLToPath(import.meta.url));
export function makeServer(billing,{origin,staticRoot=root}={}){
  const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf'};
  const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com https://billing.stripe.com"};
  const json=(res,status,data,headers={})=>{res.writeHead(status,{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));};
  async function body(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>1024*1024)throw new BillingError('body_too_large',413);chunks.push(chunk);}return Buffer.concat(chunks);}
  function token(req){return /(?:^|;\s*)crew_test_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];}
  return createServer(async(req,res)=>{
    try{
      const pathname=new URL(req.url,origin).pathname;
      if(pathname.startsWith('/api/')){
        if(req.method==='POST'&&pathname!=='/api/stripe/webhook'&&req.headers.origin!==origin)throw new BillingError('invalid_origin',403);
        if(pathname==='/api/stripe/webhook'&&req.method==='POST')return json(res,200,await billing.event(await body(req),req.headers['stripe-signature']));
        if(pathname==='/api/billing'&&req.method==='GET')return json(res,200,billing.state(token(req)));
        if(req.method!=='POST')return json(res,404,{error:'not_found'});
        let input;try{input=JSON.parse((await body(req)).toString()||'{}');if(!input||typeof input!=='object'||Array.isArray(input))throw new BillingError('invalid_json');}catch(e){if(e instanceof BillingError)throw e;throw new BillingError('invalid_json');}
        if(pathname==='/api/demo-session'){const result=billing.demoSession(token(req),input.memberType);return json(res,200,{testMode:true},{'Set-Cookie':`crew_test_session=${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${origin.startsWith('https:')?'; Secure':''}`});}
        if(pathname==='/api/checkout')return json(res,200,await billing.checkout(token(req),input));
        if(pathname==='/api/portal')return json(res,200,await billing.portal(token(req)));
        if(pathname==='/api/refund')return json(res,200,await billing.refund(token(req)));
        return json(res,404,{error:'not_found'});
      }
      if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'method_not_allowed'});
      const path=pathname==='/'?'/index.html':pathname;
      if(path!=='/index.html'&&!/^\/assets\/[a-zA-Z0-9_-]+\.(css|js|jpg|svg|ttf)$/.test(path))return json(res,404,{error:'not_found'});
      const extension=path.slice(path.lastIndexOf('.'));const file=await readFile(join(staticRoot,path));res.writeHead(200,{...security,'Content-Type':contentTypes[extension],'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:file);
    }catch(e){if(e instanceof BillingError)return json(res,e.status,{error:e.code});if(e.code==='ENOENT')return json(res,404,{error:'not_found'});json(res,502,{error:'service_unavailable',message:'決済サービスを確認できませんでした。時間を置いてお試しください。'});}
  });
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  if(process.env.NODE_ENV==='production')throw new Error('This demo has no production authentication. Production launch is disabled.');
  const origin=process.env.APP_ORIGIN||'http://localhost:4173';
  const key=process.env.STRIPE_SECRET_KEY||'';
  if(key&&!/^(sk|rk)_test_/.test(key))throw new Error('Only Stripe sandbox/test keys are accepted.');
  await mkdir(join(root,'data'),{recursive:true,mode:0o700});
  const stripe=key?new Stripe(key,{maxNetworkRetries:2,timeout:15000}):null;
  const billing=createBilling({stripe,webhookSecret:process.env.STRIPE_WEBHOOK_SECRET||'',origin,dbPath:join(root,'data/billing.sqlite'),policy:parsePolicy(process.env.DEPOSIT_POLICY_JSON)});
  const server=makeServer(billing,{origin});
  server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log(`CREW LINK test preview: ${origin}/#billing (${billing.ready?'sandbox configured':'payment connection pending'})`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{billing.close();process.exit(0);}));
}
