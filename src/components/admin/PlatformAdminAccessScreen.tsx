import React,{useEffect,useState} from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { productionDb } from '../../services/productionDb';
import { PlatformControlView } from './PlatformControlView';

export const PlatformAdminAccessScreen:React.FC=()=>{
  const[ready,setReady]=useState(false);
  const[allowed,setAllowed]=useState(false);
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[show,setShow]=useState(false);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');

  const validate=async()=>{
    const {data}=await supabase.auth.getSession();
    if(!data.session){setAllowed(false);setReady(true);return;}
    const ok=await productionDb.isPlatformAdmin();
    if(!ok){
      await supabase.auth.signOut();
      setAllowed(false);
      setError('Acesso não autorizado para esta conta.');
    }else{
      setAllowed(true);
    }
    setReady(true);
  };

  useEffect(()=>{void validate();},[]);

  const login=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');
    try{
      const {error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(authError)throw authError;
      const ok=await productionDb.isPlatformAdmin();
      if(!ok){
        await supabase.auth.signOut();
        throw new Error('Conta autenticada, mas sem privilégio de administrador da plataforma.');
      }
      setAllowed(true);
    }catch(err:any){
      setError(err?.message||'Não foi possível autenticar.');
    }finally{setBusy(false);setReady(true);}
  };

  if(!ready)return <div className="min-h-dvh bg-neutral-950 text-white grid place-items-center"><div className="text-sm text-neutral-500">Validando acesso administrativo...</div></div>;

  if(allowed)return <PlatformControlView onClose={()=>{window.location.hash='';}}/>;

  return <div className="min-h-dvh bg-neutral-950 text-white grid place-items-center p-4">
    <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center mb-5"><ShieldCheck size={22} className="text-amber-400"/></div>
      <h1 className="text-2xl font-black">ATR Control</h1>
      <p className="text-sm text-neutral-500 mt-1">Acesso administrativo restrito da plataforma ADEGA PRO.</p>
      {error&&<div className="mt-4 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      <form onSubmit={login} className="mt-6 space-y-4">
        <label className="block"><span className="text-xs font-bold text-neutral-300">E-mail administrativo</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><Mail size={16} className="text-neutral-500"/><input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm"/></div></label>
        <label className="block"><span className="text-xs font-bold text-neutral-300">Senha</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><LockKeyhole size={16} className="text-neutral-500"/><input required type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm"/><button type="button" onClick={()=>setShow(v=>!v)} className="text-neutral-500">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
        <button disabled={busy} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-sm">{busy?'Validando...':'Entrar no ATR Control'}</button>
      </form>
      <div className="mt-5 text-[10px] text-neutral-600 leading-relaxed">Sem cadastro público. Contas administrativas são autorizadas diretamente no backend da ATR Studio.</div>
    </div>
  </div>;
};