import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

type Tone = 'default' | 'danger' | 'success';

type BaseOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
};

type PromptOptions = BaseOptions & {
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
};

const mountDialog = <T,>(render: (finish: (value: T) => void) => React.ReactNode) =>
  new Promise<T>((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    let closed = false;
    const finish = (value: T) => {
      if (closed) return;
      closed = true;
      root.unmount();
      host.remove();
      resolve(value);
    };
    root.render(render(finish));
  });

const Shell: React.FC<{
  title: string;
  message?: string;
  tone?: Tone;
  onClose?: () => void;
  children: React.ReactNode;
}> = ({ title, message, tone = 'default', onClose, children }) => {
  const accent = tone === 'danger' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    : tone === 'success' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden text-white">
        <div className="flex items-start gap-3 p-4 border-b border-neutral-800">
          <div className={`w-10 h-10 rounded-xl border grid place-items-center shrink-0 ${accent}`}>
            {tone === 'danger' ? <AlertTriangle size={19}/> : <CheckCircle2 size={19}/>}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-black tracking-tight">{title}</h2>
            {message && <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{message}</p>}
          </div>
          {onClose && <button type="button" onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800" aria-label="Fechar"><X size={17}/></button>}
        </div>
        {children}
      </div>
    </div>
  );
};

export const adegaPrompt = (options: PromptOptions): Promise<string | null> =>
  mountDialog<string | null>((finish) => {
    const PromptDialog = () => {
      const [value, setValue] = useState(options.defaultValue ?? '');
      const inputRef = useRef<HTMLInputElement>(null);
      useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
      const submit = (e: React.FormEvent) => { e.preventDefault(); finish(value); };
      return (
        <Shell title={options.title} message={options.message} tone={options.tone} onClose={() => finish(null)}>
          <form onSubmit={submit} className="p-4 space-y-4">
            {options.label && <label className="block text-xs font-bold text-neutral-300">{options.label}</label>}
            <input
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={options.placeholder}
              inputMode={options.inputMode}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10"
            />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => finish(null)} className="flex-1 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold hover:bg-neutral-700">{options.cancelLabel || 'Cancelar'}</button>
              <button type="submit" className="flex-[1.4] py-2.5 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black hover:bg-amber-400">{options.confirmLabel || 'Confirmar'}</button>
            </div>
          </form>
        </Shell>
      );
    };
    return <PromptDialog/>;
  });

export const adegaConfirm = (options: BaseOptions): Promise<boolean> =>
  mountDialog<boolean>((finish) => (
    <Shell title={options.title} message={options.message} tone={options.tone || 'danger'} onClose={() => finish(false)}>
      <div className="p-4 flex gap-2">
        <button type="button" onClick={() => finish(false)} className="flex-1 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold hover:bg-neutral-700">{options.cancelLabel || 'Cancelar'}</button>
        <button type="button" onClick={() => finish(true)} className={`flex-[1.4] py-2.5 rounded-xl text-xs font-black ${options.tone === 'danger' ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-amber-500 text-neutral-950 hover:bg-amber-400'}`}>{options.confirmLabel || 'Confirmar'}</button>
      </div>
    </Shell>
  ));

export const adegaAlert = (options: BaseOptions): Promise<void> =>
  mountDialog<void>((finish) => (
    <Shell title={options.title} message={options.message} tone={options.tone || 'default'} onClose={() => finish()}>
      <div className="p-4 flex justify-end">
        <button type="button" onClick={() => finish()} className="min-w-28 py-2.5 px-4 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black hover:bg-amber-400">{options.confirmLabel || 'Entendi'}</button>
      </div>
    </Shell>
  ));
