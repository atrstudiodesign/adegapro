import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { APP_RELEASE, APP_VERSION_LABEL } from '../../config/release';

const storageKey = `adega_pro_release_seen_${APP_RELEASE.version}`;

export const ReleaseUpdateModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) !== '1') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const close = () => {
    try { localStorage.setItem(storageKey, '1'); } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-neutral-900 shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-neutral-800 bg-gradient-to-r from-amber-500/10 to-transparent flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 grid place-items-center shrink-0">
            <Sparkles size={20}/>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-400 font-black">{APP_VERSION_LABEL}</div>
            <h2 className="text-lg font-black text-white mt-1">{APP_RELEASE.title}</h2>
            <p className="text-xs text-neutral-400 mt-1">{APP_RELEASE.subtitle}</p>
          </div>
          <button onClick={close} aria-label="Fechar" className="w-8 h-8 rounded-lg grid place-items-center text-neutral-500 hover:text-white hover:bg-neutral-800">
            <X size={17}/>
          </button>
        </div>

        <div className="p-5 space-y-3">
          {APP_RELEASE.notes.map(note => (
            <div key={note} className="flex gap-3 text-sm text-neutral-300">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5"/>
              <span>{note}</span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-950/70 flex items-center justify-between gap-3">
          <div className="text-[10px] text-neutral-500">Este aviso aparece uma vez por versão neste dispositivo.</div>
          <button onClick={close} className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black">
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
