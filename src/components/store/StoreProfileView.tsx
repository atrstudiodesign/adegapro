import React, { useEffect, useRef, useState } from 'react';
import { db } from '../../services/db';
import { productionDb } from '../../services/productionDb';
import type { AppMode } from '../../services/appMode';
import type { Store } from '../../types';
import { Store as StoreIcon, Upload, Save, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { PageHeader, StatusBadge } from '../ui/ProUi';

interface StoreProfileViewProps { appMode?: AppMode; }

export const StoreProfileView: React.FC<StoreProfileViewProps> = ({ appMode = 'DEMO' }) => {
  const [store, setStore] = useState<Store>(db.getStore());
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(appMode === 'PRODUCTION');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (appMode === 'DEMO') {
      setStore(db.getStore());
      setBusy(false);
      return;
    }
    setBusy(true);
    productionDb.getStore()
      .then(data => alive && setStore(data))
      .catch(err => alive && setError(err?.message || 'Falha ao carregar o cadastro da adega.'))
      .finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [appMode]);

  const onLogo = async (file?: File) => {
    if (!file) return;
    setError('');
    if (appMode === 'DEMO') {
      if (!file.type.startsWith('image/')) return setError('Selecione uma imagem válida.');
      if (file.size > 1024 * 1024) return setError('Use uma imagem de até 1MB no modo demonstração.');
      const reader = new FileReader();
      reader.onload = () => setStore({ ...store, logoUrl: String(reader.result) });
      reader.readAsDataURL(file);
      return;
    }

    try {
      setBusy(true);
      const url = await productionDb.uploadStoreLogo(file);
      setStore(prev => ({ ...prev, logoUrl: url }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err:any) {
      setError(err?.message || 'Não foi possível enviar o logo.');
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setBusy(true);
      if (appMode === 'DEMO') {
        db.saveStore(store);
      } else {
        const updated = await productionDb.saveStore(store);
        setStore(updated);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err:any) {
      setError(err?.message || 'Não foi possível salvar os dados.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-5">
        <PageHeader eyebrow="Administração" title="Cadastro da adega" description="Identidade e dados da sua loja. A marca do estabelecimento permanece independente da marca ADEGA PRO." actions={<StatusBadge tone={appMode==='PRODUCTION'?'success':'info'}>{appMode==='PRODUCTION'?'SUPABASE':'DEMO LOCAL'}</StatusBadge>}/>

        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5"/>
          <div className="text-xs text-neutral-300">
            <strong className="text-white">Separação de marca:</strong> o logo enviado aqui identifica o estabelecimento. O logo ADEGA PRO permanece como identidade do software.
          </div>
        </div>

        {error && <div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
        {busy && appMode === 'PRODUCTION' && <div className="text-xs text-neutral-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Sincronizando com o ambiente de produção...</div>}

        <form onSubmit={save} className="grid lg:grid-cols-[280px_1fr] gap-5">
          <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h2 className="font-bold text-white text-sm mb-4">Logo do estabelecimento</h2>
            <div className="aspect-square rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden grid place-items-center">
              {store.logoUrl ? <img src={store.logoUrl} alt={store.tradeName} className="w-full h-full object-contain p-3"/> : <StoreIcon size={48} className="text-neutral-700"/>}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => void onLogo(e.target.files?.[0])}/>
            <button disabled={busy} type="button" onClick={() => fileRef.current?.click()} className="mt-3 w-full px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2">
              <Upload size={14}/> Enviar logo
            </button>
            <p className="text-[10px] text-neutral-500 mt-2">{appMode === 'PRODUCTION' ? 'PNG, JPG, WebP ou SVG · até 2MB · armazenado no Supabase Storage.' : 'No modo demo, o arquivo permanece apenas neste navegador.'}</p>
          </section>

          <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Razão social" value={store.name} onChange={v => setStore({...store,name:v})}/>
              <Field label="Nome fantasia" value={store.tradeName} onChange={v => setStore({...store,tradeName:v})}/>
              <Field label="CNPJ" value={store.cnpj} onChange={v => setStore({...store,cnpj:v})}/>
              <Field label="Inscrição estadual" value={store.stateRegistration} onChange={v => setStore({...store,stateRegistration:v})}/>
              <Field label="Telefone" value={store.phone} onChange={v => setStore({...store,phone:v})}/>
              <Field label="WhatsApp" value={store.whatsapp} onChange={v => setStore({...store,whatsapp:v})}/>
              <Field label="E-mail" value={store.email} onChange={v => setStore({...store,email:v})}/>
              <Field label="Instagram" value={store.instagram} onChange={v => setStore({...store,instagram:v})}/>
              <div className="md:col-span-2"><Field label="Endereço" value={store.address} onChange={v => setStore({...store,address:v})}/></div>
              <Field label="Cidade" value={store.city} onChange={v => setStore({...store,city:v})}/>
              <Field label="UF" value={store.state} onChange={v => setStore({...store,state:v.toUpperCase().slice(0,2)})}/>
              <Field label="CEP" value={store.zipCode} onChange={v => setStore({...store,zipCode:v})}/>
              <Field label="Horário de funcionamento" value={store.openingHours} onChange={v => setStore({...store,openingHours:v})}/>
            </div>
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-emerald-400">{saved ? 'Dados da adega salvos.' : ''}</span>
              <button disabled={busy} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-xs uppercase flex items-center gap-2">
                <Save size={15}/> Salvar cadastro
              </button>
            </div>
          </section>
        </form>

        <footer className="pt-4 border-t border-neutral-900 text-[11px] text-neutral-500 flex flex-wrap items-center justify-between gap-3">
          <span>© 2026 ADEGA PRO · Software de gestão.</span>
          <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300 flex items-center gap-1">
            Desenvolvido por ATR Studio · atrstudio.com.br <ExternalLink size={11}/>
          </a>
        </footer>
      </div>
    </div>
  );
};

const Field = ({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) => (
  <label className="block">
    <span className="text-[11px] text-neutral-400 block mb-1">{label}</span>
    <input value={value || ''} onChange={e=>onChange(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"/>
  </label>
);
