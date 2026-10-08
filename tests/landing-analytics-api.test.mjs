import { test } from 'node:test';
import assert from 'node:assert/strict';
import track from '../api/track-visit.js';
import analytics from '../api/analytics.js';
const response = () => ({ code:0, body:null, headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;},end(){return this;} });
test('Public tracker validates origin, ignores private paths and trusts server geo only',async()=>{
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 const original=global.fetch;
 const calls=[];
 global.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true};};
 try {
  let res=response();
  await track({method:'POST',headers:{host:'adegapro.vercel.app',origin:'https://other.test'},body:{}},res);
  assert.equal(res.code,403);assert.equal(calls.length,0);
  res=response();await track({method:'POST',headers:{host:'adegapro.vercel.app'},body:{visitor_key:'test-visitor',request_path:'/atr-control'}},res);
  assert.equal(res.code,204);assert.equal(calls.length,0);
  res=response();await track({method:'POST',headers:{host:'adegapro.vercel.app',origin:'https://adegapro.vercel.app','x-vercel-ip-city':'S%C3%A3o%20Paulo','x-vercel-ip-country-region':'SP','x-vercel-ip-country':'BR'},body:{visitor_key:'test-visitor',request_path:'/promocao',city:'spoof',event:'heartbeat'}},res);
  assert.equal(res.code,204);assert.equal(calls[0].body.p_city,'São Paulo');assert.equal(calls[0].body.p_pageview,false);assert.match(calls[0].url,/record_landing_activity_service$/);
 } finally {global.fetch=original;delete process.env.SUPABASE_SERVICE_ROLE_KEY;}
});
test('Analytics rejects non-admin before reading aggregated visitors',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=async()=>{calls++;return {ok:true,json:async()=>false};};
 try {
  const res=response();await analytics({method:'GET',headers:{authorization:'Bearer test'},query:{days:30}},res);
  assert.equal(res.code,403);assert.equal(calls,1);
 } finally {global.fetch=original;}
});
test('Admin dashboard combines history and live data without caching and handles invalid ranges',async()=>{
 const original=global.fetch;
 process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 const payloads=[];
 global.fetch=async(url,options)=>{payloads.push(JSON.parse(options.body));return {ok:true,json:async()=>url.endsWith('/is_platform_admin')?true:url.endsWith('/get_landing_live_analytics_service')?{online:2}: {source:'FIRST_PARTY',count:{visitors:12,pageviews:20}}};};
 try {
  const res=response();await analytics({method:'GET',headers:{authorization:'Bearer test'},query:{days:'garbage'}},res);
  assert.equal(res.code,200);assert.equal(res.body.live.online,2);assert.equal(res.body.count.visitors,12);assert.equal(res.headers['Cache-Control'],'private, no-store');assert.equal(payloads.at(-1).p_days,30);
 } finally {global.fetch=original;delete process.env.SUPABASE_SERVICE_ROLE_KEY;}
});
