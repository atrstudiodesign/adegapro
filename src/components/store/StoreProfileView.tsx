import React, { useRef, useState } from 'react';
import { db } from '../../services/db';
import { Store as StoreIcon, Upload, Save, ShieldCheck, ExternalLink } from 'lucide-react';

export const StoreProfileView: React.FC = () => {
  const [store, setStore] = useState(db.getStore());
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Selecione uma imagem válida.');
    if (file.size > 1024 * 1024) return alert('Use uma imagem de até 1MB.');
    const reader = new FileReader();
    reader.onload = () => setStore({ ...store, logoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveStore(store);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto bg-neutral-950">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="pb-4 border-b border-neutral-800">
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <StoreIcon size={22} className="text-amber-400"/> Cadastro da Adega
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Identidade e dados da sua loja. A marca da adega é independente da marca do sistema ADEGA PRO.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5"/>
          <div className="text-xs text-neutral-300">
            <strong className="text-white">Separação de marca:</strong> o logo enviado aqui aparece como identidade do estabelecimento em áreas próprias e cupons. O logo ADEGA PRO permanece como identidade do software e não é substituído.
          </div>
        </div>

        <form onSubmit={save} className="grid lg:grid-cols-[280px_1fr] gap-5">
          <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
            <h2 className="font-bold text-white text-sm mb-4">Logo do estabelecimento</h2>
            <div className="aspect-square rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden grid place-items-center">
              {store.logoUrl ? <img src={store.logoUrl} alt={store.tradeName} className="w-full h-full object-contain p-3"/> : <StoreIcon size={48} className="text-neutral-700"/>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onLogo(e.target.files?.[0])}/>
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 w-full px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2">
              <Upload size={14}/> Enviar logo
            </button>
            <p className="text-[10px] text-neutral-500 mt-2">PNG, JPG ou WebP · até 1MB. No backend definitivo, o arquivo será salvo em storage privado/público controlado.</p>
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
              <Field label="UF" value={store.state} onChange={v => setStore({...store,state:v})}/>
              <Field label="CEP" value={store.zipCode} onChange={v => setStore({...store,zipCode:v})}/>
              <Field label="Horário de funcionamento" value={store.openingHours} onChange={v => setStore({...store,openingHours:v})}/>
            </div>
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-emerald-400">{saved ? 'Dados da adega salvos.' : ''}</span>
              <button className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase flex items-center gap-2">
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
