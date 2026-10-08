import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startPublicVisitTracking } from '../src/services/publicVisitTracking';

test('Presence pauses when hidden, deduplicates views, retries failed writes and cleans up', async () => {
 const saved = Object.fromEntries(['window','document','localStorage','sessionStorage','fetch'].map(k=>[k,(globalThis as any)[k]]));
 const local = new Map<string,string>(); const session = new Map<string,string>();
 const storage = (map: Map<string,string>) => ({getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)});
 const doc = new EventTarget() as EventTarget & {visibilityState:string}; doc.visibilityState='visible';
 let timer: (()=>void)|undefined;let cleared=false;let ok=false;
 const calls: {event:string;request_path:string}[]=[];
 Object.assign(globalThis,{document:doc,window:{setInterval:(fn:()=>void)=>{timer=fn;return 1;},clearInterval:()=>{cleared=true;}},localStorage:storage(local),sessionStorage:storage(session),fetch:async (_url:string,options:{body:string})=>{calls.push(JSON.parse(options.body));return {ok};}});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 try {
  const stop=startPublicVisitTracking('/promocao');await settle();
  assert.equal(calls[0].event,'pageview');assert.equal(session.size,0);
  ok=true;timer?.();await settle();assert.equal(calls[1].event,'pageview');assert.equal(session.size,1);
  timer?.();await settle();assert.equal(calls[2].event,'heartbeat');
  doc.visibilityState='hidden';timer?.();await settle();assert.equal(calls.length,3);
  doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(calls[3].event,'heartbeat');
  stop();assert.equal(cleared,true);timer?.();await settle();assert.equal(calls.length,4);
  startPublicVisitTracking('/atr-control')();assert.equal(calls.length,4);
 } finally {Object.assign(globalThis,saved);}
});
