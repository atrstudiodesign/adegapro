import React from 'react';
import { ArrowLeft, ExternalLink, FileCheck2, Scale, ShieldCheck } from 'lucide-react';
import { LEGAL_DOCS, LEGAL_EFFECTIVE_DATE, LEGAL_PROVIDER, LegalDocKey } from '../../legal/legalDocuments';

interface LegalCenterProps {
  active: LegalDocKey;
  onSelect: (key: LegalDocKey) => void;
  onBack: () => void;
}

export const LegalCenter: React.FC<LegalCenterProps> = ({ active, onSelect, onBack }) => {
  const doc = LEGAL_DOCS[active];

  return (
    <div className="min-h-dvh bg-neutral-950 text-white">
      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-neutral-300 hover:text-white">
            <ArrowLeft size={17}/> Voltar
          </button>
          <div className="text-right">
            <div className="text-sm font-black">ADEGA <span className="text-amber-400">PRO</span></div>
            <div className="text-[10px] text-neutral-500">Documentos legais · versão {doc.version}</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[250px_1fr] gap-6">
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-2">
          {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map(key => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`w-full text-left px-3.5 py-3 rounded-xl text-xs font-bold border transition-colors ${
                active === key
                  ? 'bg-amber-500 text-neutral-950 border-amber-400'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {LEGAL_DOCS[key].shortTitle}
            </button>
          ))}
        </aside>

        <article className="min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-7 shadow-2xl">
          <div className="pb-5 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Scale size={16}/> Instrumento contratual eletrônico
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">{doc.title}</h1>
            <p className="text-xs text-neutral-500 mt-2">Vigência: {LEGAL_EFFECTIVE_DATE} · Versão {doc.version}</p>
          </div>

          <div className="py-5 space-y-7">
            {doc.sections.map(section => (
              <section key={section.title}>
                <h2 className="text-base font-black text-white mb-2">{section.title}</h2>
                <div className="space-y-3 text-sm leading-7 text-neutral-300">
                  {section.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold"><FileCheck2 size={15} className="text-amber-400"/> Responsável contratual</div>
            <p>{LEGAL_PROVIDER.legalName} · CNPJ {LEGAL_PROVIDER.cnpj} · {LEGAL_PROVIDER.city}</p>
            <p>{LEGAL_PROVIDER.email} · {LEGAL_PROVIDER.whatsapp}</p>
            <a href={LEGAL_PROVIDER.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300">
              atrstudio.com.br <ExternalLink size={12}/>
            </a>
          </div>

          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-950/20 border border-amber-900/50 text-[11px] leading-relaxed text-amber-100/80">
            <ShieldCheck size={16} className="shrink-0 mt-0.5"/>
            <span>Este conjunto documental foi estruturado para refletir obrigações legais e contratuais aplicáveis ao ADEGA PRO. Cláusulas não afastam direitos indisponíveis nem substituem revisão jurídica individualizada para situações específicas.</span>
          </div>
        </article>
      </main>
    </div>
  );
};
