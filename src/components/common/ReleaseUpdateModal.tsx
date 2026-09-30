import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import { APP_RELEASE, APP_VERSION_LABEL } from '../../config/release';

const storageKey = `adega_pro_release_seen_${APP_RELEASE.releaseId}`;

export const ReleaseUpdateModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  const previewNotes = useMemo(() => APP_RELEASE.notes.slice(0, 3), []);

  if (!open) return null;

  return (
    <aside
      className="fixed right-3 top-16 sm:right-4 sm:top-20 z-[210] w-[calc(100vw-1.5rem)] max-w-sm"
      aria-live="polite"
      aria-label="Novidades do Adega Pro"
    >
      <div className="rounded-2xl border border-amber-500/25 bg-neutral-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-amber-500/10 to-transparent flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 grid place-items-center shrink-0">
            <Bell size={18}/>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.16em] text-amber-400 font-black">{APP_VERSION_LABEL}</div>
            <h2 className="text-sm font-black text-white mt-1">{APP_RELEASE.title}</h2>
            <p className="text-[11px] text-neutral-400 mt-1">
              {APP_RELEASE.notes.length} melhorias disponíveis. O sistema continua liberado para uso normal.
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Fechar notificação"
            className="w-8 h-8 rounded-lg grid place-items-center text-neutral-500 hover:text-white hover:bg-neutral-800"
          >
            <X size={16}/>
          </button>
        </div>

        {!expanded && (
          <div className="px-4 pb-3 space-y-2">
            {previewNotes.map(note => (
              <div key={note} className="flex gap-2 text-[11px] text-neutral-300">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5"/>
                <span className="line-clamp-2">{note}</span>
              </div>
            ))}
          </div>
        )}

        {expanded && (
          <div className="px-4 pb-3 max-h-[52vh] overflow-y-auto overscroll-contain space-y-2 pr-2">
            {APP_RELEASE.notes.map(note => (
              <div key={note} className="flex gap-2 text-[11px] leading-relaxed text-neutral-300">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5"/>
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-3 border-t border-neutral-800 bg-neutral-950/75 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[9px] text-neutral-500">
            <Sparkles size={11} className="text-amber-400"/>
            Aviso não bloqueia o sistema
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(v => !v)}
              className="px-3 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-[10px] font-black text-neutral-200 flex items-center gap-1"
            >
              {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
              {expanded ? 'Recolher' : 'Ver novidades'}
            </button>
            <button
              onClick={close}
              className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[10px] font-black"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
