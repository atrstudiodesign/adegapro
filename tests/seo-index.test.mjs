import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {INDEXABLE_PATHS,PUBLIC_ALIASES,pageMetadata} from '../src/seo/pageMetadata.mjs';
import {renderPageMetadata} from '../scripts/build-seo-pages.mjs';
test('Only distinct public pages appear in sitemap with self canonicals',async()=>{
 const xml=await readFile('public/sitemap.xml','utf8');
 const paths=[...xml.matchAll(/<loc>https:\/\/adegapro\.vercel\.app([^<]*)<\/loc>/g)].map(x=>x[1]);
 assert.deepEqual(paths,INDEXABLE_PATHS);
 for(const path of paths){assert.equal(pageMetadata(path).canonical,'https://adegapro.vercel.app'+path);assert.match(pageMetadata(path).robots,/^index,/);}
 for(const path of PUBLIC_ALIASES)assert.equal(pageMetadata(path).canonical,'https://adegapro.vercel.app/');
});
test('Initial HTML exposes one correct canonical and never indexes restricted routes',async()=>{
 const base=await readFile('index.html','utf8');
 const promo=renderPageMetadata(base,'/promocao');
 assert.equal((promo.match(/rel="canonical"/g)||[]).length,1);assert.match(promo,/href="https:\/\/adegapro.vercel.app\/promocao"/);assert.match(promo,/01\/01\/2027/);
 for(const path of ['/atr-control','/entrar','/cadastro','/vendedor','/vendedor/cadastro','/comprovante/test']){
 const html=renderPageMetadata(base,path);assert.match(html,/name="robots" content="noindex, nofollow"/);assert.doesNotMatch(html,/rel="canonical"/);
 }
});
test('All static rewrites point to generated pages with built asset references',async()=>{
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 for(const route of config.rewrites.filter(r=>!r.source.includes(':'))){const html=await readFile('dist'+route.destination,'utf8');assert.match(html,/src="\/assets\/index-/);const metadata=pageMetadata(route.source);assert.ok(html.includes(`content="${metadata.robots}"`));}
 const robots=await readFile('public/robots.txt','utf8');assert.ok(robots.includes('Sitemap: https://adegapro.vercel.app/sitemap.xml'));assert.ok(!robots.includes('Disallow: /atr-control'));assert.ok(config.headers.some(h=>h.source==='/atr-control'&&h.headers.some(v=>v.key==='X-Robots-Tag'&&v.value.includes('noindex'))));
});
