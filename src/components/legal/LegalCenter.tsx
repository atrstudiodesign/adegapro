import React from 'react';
import { ArrowLeft, ExternalLink, FileCheck2, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';
import { LEGAL_DOCS,LEGAL_EFFECTIVE_DATE,LEGAL_PROVIDER,LegalDocKey } from '../../legal/legalDocuments';
import type { AppMode } from '../../services/appMode';

interface Props{appMode?:AppMode;active:LegalDocKey;onSelect:(key:LegalDocKey)=>void;onBack:()=>void;}

export const LegalCenter:React.FC<Props>=({appMode='DEMO',active,onSelect,onBack})=>{
  const doc=LEGAL_DOCS[active];
  const demo=appMode==='DEMO';
  return <div className="min-h-dvh bg-neutral-950 text-white">
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur"><div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3"><button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-neutral-300 hover:text-white"><ArrowLeft size={17}/>Voltar</button><div className="text-right"><div className="text-sm font-black">ADEGA <span className="text-amber-400">PRO</span></div><div className="text-[10px] text-neutral-500">{demo?'Resumo legal da demonstração':`Documentos legais · versão ${doc.version}`}</div></div></div></header>
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[250px_1fr] gap-6">
      <aside className="lg:sticky lg:top-24 lg:self-start space-y-2">{(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key=><button key={key} onClick={()=>onSelect(key)} className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold border ${active===key?'bg-amber-500 text-neutral-950 border-amber-400':'bg-neutral-900 text-neutral-300 border-neutral-800'}`}>{LEGAL_DOCS[key].shortTitle}</button>)}</aside>
      <article className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-7 shadow-2xl">
        <div className="pb-5 border-b border-neutral-800"><div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider"><Scale size={16}/>{demo?'Resumo demonstrativo':'Instrumento contratual eletrônico'}</div><h1 className="text-2xl sm:text-3xl font-black mt-2">{doc.title}</h1>{!demo&&<p className="text-xs text-neutral-500 mt-2">Vigência: {LEGAL_EFFECTIVE_DATE} · Versão {doc.version}</p>}</div>

        {demo?<div className="py-6 space-y-5">
          <div className="p-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 text-sm text-violet-100"><div className="font-black flex items-center gap-2"><LockKeyhole size={16}/>Conteúdo integral protegido</div><p className="mt-2 text-xs leading-relaxed text-violet-200/80">A demonstração apresenta somente um resumo dos documentos. Dados contratuais completos, identificação do fornecedor, cláusulas integrais e instrumentos vigentes ficam disponíveis ao contratar uma assinatura ou plano personalizado.</p></div>
          {doc.sections.slice(0,3).map(section=><section key={section.title}><h2 className="text-base font-black">{section.title}</h2><p className="text-sm text-neutral-400 leading-7 mt-2">{section.paragraphs[0]}</p></section>)}
          <div className="flex flex-wrap gap-2 pt-2"><a href="/cadastro" className="btn-primary">Assinar ADEGA PRO</a><a href="https://wa.me/5511939026928?text=Quero%20um%20plano%20personalizado%20do%20ADEGA%20PRO" target="_blank" rel="noreferrer" className="btn-secondary">Contratar personalizado</a></div>
        </div>:<>
          <div className="py-5 space-y-7">{doc.sections.map(section=><section key={section.title}><h2 className="text-base font-black text-white mb-2">{section.title}</h2><div className="space-y-3 text-sm leading-7 text-neutral-300">{section.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</div></section>)}</div>
          <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-2"><div className="flex items-center gap-2 text-white font-bold"><FileCheck2 size={15} className="text-amber-400"/>Responsável contratual</div><p>{LEGAL_PROVIDER.legalName} · CNPJ {LEGAL_PROVIDER.cnpj} · {LEGAL_PROVIDER.city}</p><p>{LEGAL_PROVIDER.email} · {LEGAL_PROVIDER.whatsapp}</p><a href={LEGAL_PROVIDER.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-400">atrstudio.com.br <ExternalLink size={12}/></a></div>
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-950/20 border border-amber-900/50 text-[11px] text-amber-100/80"><ShieldCheck size={16} className="shrink-0"/><span>Este conjunto documental reflete as condições vigentes do ADEGA PRO e não afasta direitos legalmente indisponíveis.</span></div>
        </>}
      </article>
    </main>
  </div>;
};
