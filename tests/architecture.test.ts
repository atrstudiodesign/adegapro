import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL_PROVIDER } from '../src/legal/legalDocuments';

function walk(dir:string):string[]{
  const out:string[]=[];
  for(const name of readdirSync(dir)){
    const p=join(dir,name);
    const s=statSync(p);
    if(s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

describe('identidade jurídica',()=>{
  test('usa a razão social e CNPJ corretos da ATR Studio',()=>{
    expect(LEGAL_PROVIDER.legalName).toBe('ATR STUDIO DESIGNER E ASSESSORIA INOVA SIMPLES I.S. - ME');
    expect(LEGAL_PROVIDER.cnpj).toBe('57.514.866/0001-38');
  });
});

describe('guardas de arquitetura de produção',()=>{
  test('componentes Production não importam db.ts local',()=>{
    const files=walk('src/components').filter(p=>/Production.*\.tsx$/.test(p));
    const offenders=files.filter(p=>readFileSync(p,'utf8').includes("services/db"));
    expect(offenders).toEqual([]);
  });

  test('productionDb não referencia PIN em texto puro do legado',()=>{
    const source=readFileSync('src/services/productionDb.ts','utf8');
    expect(source.includes('user.pin')).toBe(false);
    expect(source.includes('INITIAL_USERS')).toBe(false);
  });

  test('produção possui RPC transacional para venda',()=>{
    const source=readFileSync('src/services/productionDb.ts','utf8');
    expect(source.includes("supabase.rpc('finalize_sale'")).toBe(true);
  });
});
