import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { INDEXABLE_PATHS, PUBLIC_ALIASES, pageMetadata } from '../src/seo/pageMetadata.mjs';
export function renderPageMetadata(html, path) {
 const metadata = pageMetadata(path);
 const escape = (value) => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(metadata.title)}</title>`);
 html = html.replace(/\s*<meta\s+(?:name="(?:description|robots)"|property="(?:og:title|og:description|og:url)")[^>]*>/g,'');
 html = html.replace(/\s*<link\s+rel="canonical"[^>]*>/g,'');
 const tags = [`<meta name="description" content="${escape(metadata.description)}" />`,`<meta name="robots" content="${escape(metadata.robots)}" />`,`<meta property="og:title" content="${escape(metadata.title)}" />`,`<meta property="og:description" content="${escape(metadata.description)}" />`];
 if (metadata.canonical) tags.push(`<link rel="canonical" href="${metadata.canonical}" />`,`<meta property="og:url" content="${metadata.canonical}" />`);
 return html.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}
export async function buildSeoPages() {
 const base = await readFile('dist/index.html','utf8');
 await writeFile('dist/index.html',renderPageMetadata(base,'/'));
 await mkdir('dist/seo-pages',{recursive:true});
 for (const path of [...INDEXABLE_PATHS.filter(p=>p!=='/'), ...PUBLIC_ALIASES, '/atr-control','/entrar','/cadastro','/vendedor','/vendedor/cadastro']) {
  await writeFile(`dist/seo-pages/${path.slice(1).replaceAll('/','-')}.html`,renderPageMetadata(base,path));
 }
 console.log('SEO: canonical e metadados gerados no HTML inicial de cada rota.');
}
if (process.argv[1]?.endsWith('build-seo-pages.mjs')) await buildSeoPages();
