import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestVisitorAnalytics} from '../src/services/analyticsRequest';

test('Transient browser NetworkError reconnects once and returns actual data',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=(async()=>{if(++calls===1)throw new TypeError('NetworkError when attempting to fetch resource.');return {ok:true,json:async()=>({count:{visitors:5},live:{online:2}})};}) as typeof fetch;
 try {const data=await requestVisitorAnalytics(30,'test-token',new AbortController().signal);assert.equal(data.live.online,2);assert.equal(calls,2);} finally {global.fetch=original;}
});
test('Forbidden session never retries',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=(async()=>{calls++;return {ok:false,status:403,json:async()=>({message:'Sem autorização'})};}) as typeof fetch;
 try {await assert.rejects(requestVisitorAnalytics(30,'test-token',new AbortController().signal),/Sem autorização/);assert.equal(calls,1);} finally {global.fetch=original;}
});
test('Persistent network failure is bounded and produces actionable message',async()=>{
 const original=global.fetch;let calls=0;
 global.fetch=(async()=>{calls++;throw new TypeError('NetworkError');}) as typeof fetch;
 try {await assert.rejects(requestVisitorAnalytics(30,'test-token',new AbortController().signal),/Reconexão automática ativa/);assert.equal(calls,2);} finally {global.fetch=original;}
});
test('Unmount cancellation prevents any further network request',async()=>{
 const original=global.fetch;let calls=0;const controller=new AbortController();
 global.fetch=(async()=>{calls++;controller.abort();throw new DOMException('Aborted','AbortError');}) as typeof fetch;
 try {await assert.rejects(requestVisitorAnalytics(30,'test-token',controller.signal),{name:'AbortError'});assert.equal(calls,1);} finally {global.fetch=original;}
});
