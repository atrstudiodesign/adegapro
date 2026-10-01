import React,{useEffect,useState} from 'react';
import { CheckCircle2, Gift, Moon, Printer, Save, Settings, SlidersHorizontal, Sun, Users } from 'lucide-react';
import { db } from '../../services/db';
import { productionDb } from '../../services/productionDb';
import type { AppMode } from '../../services/appMode';
import type { Store } from '../../types';
import { PageHeader,StatusBadge } from '../ui/ProUi';

export const SettingsView:React.FC<{appMode?:AppMode}>=({appMode='DEMO'})=>{
  const[store,setStore]=useState<Store>(db.getStore());
  const[busy,setBusy]=useState(appMode==='PRODUCTION');
  const[feedback,setFeedback]=useState('');
  const[error,setError]=useState('');
  const[referral,setReferral]=useState({name:'',phone:'',email:''});
  const[referralData,setReferralData]=useState<any>(null);
  const[referralBusy,setReferralBusy]=useState(false);
  const loadReferrals=()=>appMode==='PRODUCTION'&&productionDb.getMyCustomerReferralSnapshot().then(setReferralData).catch(()=>{});
  const sendReferral=async()=>{setReferralBusy(true);setError('');setFeedback('');try{await productionDb.createMyCustomerReferral(referral);setReferral({name:'',phone:'',email:''});setFeedback('Indicação enviada e sincronizada com o ATR Control.');await loadReferrals();}catch(e:any){setError(e?.message||'Não foi possível enviar a indicação.');}finally{setReferralBusy(false);}};
  const[theme,setTheme]=useState<'dark'|'light'>(()=>localStorage.getItem('adega_pro_theme')==='light'?'light':'dark');
  const applyTheme=(next:'dark'|'light')=>{setTheme(next);localStorage.setItem('adega_pro_theme',next);document.documentElement.dataset.theme=next;};

  useEffect(()=>{
    let alive=true;
    if(appMode==='DEMO'){setStore(db.getStore());setBusy(false);return;}
    setBusy(true);
    productionDb.getStore().then(s=>alive&&setStore(s)); productionDb.getMyCustomerReferralSnapshot().then(d=>alive&&setReferralData(d)).catch(()=>{}).catch((e:any)=>alive&&setError(e?.message||'Falha ao carregar configurações.')).finally(()=>alive&&setBusy(false));
    return()=>{alive=false;};
  },[appMode]);

  const save=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setFeedback('');
    try{
      if(appMode==='DEMO')db.saveStore(store);
      else setStore(await productionDb.saveStore(store));
      setFeedback('Configurações salvas para esta loja.');
    }catch(e:any){setError(e?.message||'Não foi possível salvar.');}
    finally{setBusy(false);}
  };

  const testPrint=()=>{
    const width=store.thermalWidth==='58mm'?'58mm':'80mm';
    const w=window.open('','_blank','width=420,height=680');
    if(!w){setError('O navegador bloqueou a janela de teste de impressão.');return;}
    w.document.write(`<!doctype html><html><head><title>Teste ADEGA PRO</title><style>body{font-family:monospace;width:${width};margin:0 auto;padding:10px;color:#000;background:#fff}hr{border:0;border-top:1px dashed #000}.c{text-align:center}</style></head><body><div class="c"><b>ADEGA PRO</b><br>TESTE DE IMPRESSÃO</div><hr><div>Loja: ${store.tradeName||'Loja'}</div><div>Impressora: ${store.printerModel||'Genérica ESC/POS'}</div><div>Bobina: ${width}</div><hr><div class="c">${store.receiptFooter||'Obrigado pela preferência!'}</div><script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
  };

  return <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto">
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader eyebrow="Operação" title="Configurações & Impressão" description="Preferências do PDV, cupom e impressão da loja ativa." actions={<StatusBadge tone={appMode==='PRODUCTION'?'success':'info'}>{appMode==='PRODUCTION'?'PRODUÇÃO':'DEMO'}</StatusBadge>}/>
      {error&&<div className="p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      {feedback&&<div className="p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2"><CheckCircle2 size={15}/>{feedback}</div>}
      <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-2"><Settings size={18} className="text-amber-400"/><h2 className="font-black text-white">Aparência</h2></div>
        <p className="text-xs text-neutral-500 mt-1">O tema é salvo neste dispositivo e mantém o layout responsivo.</p>
        <div className="flex gap-2 mt-4"><button type="button" onClick={()=>applyTheme('dark')} className={theme==='dark'?'btn-primary':'btn-secondary'}><Moon size={14} className="mr-2"/>Dark</button><button type="button" onClick={()=>applyTheme('light')} className={theme==='light'?'btn-primary':'btn-secondary'}><Sun size={14} className="mr-2"/>Claro</button></div>
      </section>

      {appMode==='PRODUCTION'&&<section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="flex items-center gap-2"><Users size={18} className="text-amber-400"/><h2 className="font-black text-white">Indique um cliente</h2></div><p className="text-xs text-neutral-500 mt-1">Exclusivo para clientes ativos. A indicação entra automaticamente no ATR Control para acompanhamento e benefício.</p><div className="grid md:grid-cols-3 gap-3 mt-4"><Field label="Nome"><input className="input" value={referral.name} onChange={e=>setReferral({...referral,name:e.target.value})} placeholder="Nome do indicado"/></Field><Field label="WhatsApp"><input className="input" value={referral.phone} onChange={e=>setReferral({...referral,phone:e.target.value})} placeholder="(11) 99999-9999"/></Field><Field label="E-mail (opcional)"><input className="input" type="email" value={referral.email} onChange={e=>setReferral({...referral,email:e.target.value})}/></Field></div><div className="flex items-center justify-between gap-3 mt-4"><div className="text-xs text-neutral-400"><Gift size={14} className="inline mr-1 text-amber-400"/>Saldo: <b className="text-white">{Number(referralData?.account?.cashback_points||0)} pts</b> · R$ {Number(referralData?.account?.cashback_balance||0).toFixed(2).replace('.',',')} · {referralData?.referrals?.length||0} indicação(ões)</div><button type="button" disabled={referralBusy||!referral.name.trim()||!referral.phone.trim()} onClick={sendReferral} className="btn-primary">{referralBusy?'Enviando...':'Enviar indicação'}</button></div>{referralData?.referrals?.length>0&&<div className="mt-4 border-t border-neutral-800 pt-3 space-y-2">{referralData.referrals.slice(0,5).map((r:any)=><div key={r.id} className="flex justify-between gap-3 text-xs"><span className="text-neutral-300">{r.lead_name} · {r.lead_phone}</span><StatusBadge tone={r.status==='CONVERTED'?'success':r.status==='CANCELLED'?'danger':'warning'}>{r.status}</StatusBadge></div>)}</div>}</section>}

      <form onSubmit={save} className="space-y-5">
        <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-2"><Printer size={18} className="text-amber-400"/><h2 className="font-black text-white">Impressão de cupom</h2></div>
          <p className="text-xs text-neutral-500 mt-1">Configure o padrão da loja. A impressão real depende do driver e das permissões do dispositivo.</p>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Field label="Modelo de impressora">
              <select value={store.printerModel||'GENERICA_ESC_POS'} onChange={e=>setStore({...store,printerModel:e.target.value})} className="input">
                <option value="GENERICA_ESC_POS">Genérica ESC/POS</option>
                <option value="EPSON_TM_T20">Epson TM-T20</option>
                <option value="EPSON_TM_T88">Epson TM-T88</option>
                <option value="ELGIN_I9">Elgin i9</option>
                <option value="BEMATECH_MP4200">Bematech MP-4200</option>
                <option value="DARUMA_DR800">Daruma DR800</option>
              </select>
            </Field>
            <Field label="Conexão">
              <select value={store.printerConnection||'NAVEGADOR'} onChange={e=>setStore({...store,printerConnection:e.target.value})} className="input">
                <option value="NAVEGADOR">Navegador / driver do sistema</option>
                <option value="USB">USB</option>
                <option value="REDE">Rede / Ethernet</option>
                <option value="BLUETOOTH">Bluetooth</option>
              </select>
            </Field>
            <Field label="Largura da bobina">
              <select value={store.thermalWidth} onChange={e=>setStore({...store,thermalWidth:e.target.value as '58mm'|'80mm'})} className="input">
                <option value="80mm">80 mm</option><option value="58mm">58 mm</option>
              </select>
            </Field>
            <Field label="Rodapé do cupom"><input value={store.receiptFooter||''} onChange={e=>setStore({...store,receiptFooter:e.target.value})} className="input"/></Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={!!store.autoPrintReceipt} onChange={e=>setStore({...store,autoPrintReceipt:e.target.checked})}/>Imprimir cupom automaticamente após a venda</label>
          <button type="button" onClick={testPrint} className="mt-4 btn-secondary"><Printer size={14} className="mr-2"/>Teste de impressão</button>
        </section>

        <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-amber-400"/><h2 className="font-black text-white">Regras do PDV</h2></div>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Field label="Desconto máximo sem autorização (%)"><input type="number" min="0" max="100" value={store.maxDiscountPercent} onChange={e=>setStore({...store,maxDiscountPercent:Number(e.target.value)||0})} className="input"/></Field>
            <div className="space-y-3 pt-6">
              <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={store.allowSellWithoutStock} onChange={e=>setStore({...store,allowSellWithoutStock:e.target.checked})}/>Permitir venda sem estoque</label>
              <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={store.requireCustomer} onChange={e=>setStore({...store,requireCustomer:e.target.checked})}/>Exigir cliente na venda</label>
              <label className="flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={store.requirePasswordForCancel} onChange={e=>setStore({...store,requirePasswordForCancel:e.target.checked})}/>Exigir autorização para cancelamento</label>
            </div>
          </div>
        </section>
        <div className="flex justify-end"><button disabled={busy} className="btn-primary"><Save size={15} className="mr-2"/>{busy?'Salvando...':'Salvar configurações'}</button></div>
      </form>
      <div className="p-4 rounded-2xl border border-sky-900/60 bg-sky-950/20 text-xs text-sky-200"><b>Ajuda:</b> para impressoras térmicas, instale o driver do fabricante no dispositivo, selecione a largura correta (58/80 mm) e use “Teste de impressão”. Em celular/tablet, a impressão depende do suporte do navegador e do método Bluetooth/rede disponível.</div>
    </div>
  </div>;
};

const Field=({label,children}:{label:string;children:React.ReactNode})=><label className="block"><span className="text-[11px] text-neutral-400 block mb-1">{label}</span>{children}</label>;
