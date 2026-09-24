import React,{useEffect,useState} from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserPlus } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { productionDb } from '../../services/productionDb';
import { PlatformControlView } from './PlatformControlView';

export const PlatformAdminAccessScreen:React.FC=()=>{
  const[ready,setReady]=useState(false);
  const[allowed,setAllowed]=useState(false);
  const[mode,setMode]=useState<'LOGIN'|'FIRST_ACCESS'>('LOGIN');
  const[email,setEmail]=useState('atrstudiodesign@gmail.com');
  const[password,setPassword]=useState('');
  const[confirmPassword,setConfirmPassword]=useState('');
  const[show,setShow]=useState(false);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');

  const claimAndValidate=async()=>{
    let ok=await productionDb.isPlatformAdmin();
    if(!ok){
      const {error:claimError}=await supabase.rpc('claim_platform_admin_invite');
      if(claimError) throw new Error('Conta autenticada, mas sem autorização administrativa.');
      ok=await productionDb.isPlatformAdmin();
    }
    if(!ok) throw new Error('Conta sem privilégio de administrador da plataforma.');
    setAllowed(true);
  };

  const validate=async()=>{
    const {data}=await supabase.auth.getSession();
    if(!data.session){setAllowed(false);setReady(true);return;}
    try{await claimAndValidate();}
    catch{
      await supabase.auth.signOut();
      setAllowed(false);
      setError('Acesso não autorizado para esta conta.');
    }
    setReady(true);
  };

  useEffect(()=>{void validate();},[]);

  const login=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const {error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(authError)throw authError;
      await claimAndValidate();
    }catch(err:any){
      setError(err?.message||'Não foi possível autenticar.');
    }finally{setBusy(false);setReady(true);}
  };

  const firstAccess=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      if(password.length<8) throw new Error('Crie uma senha com pelo menos 8 caracteres.');
      if(password!==confirmPassword) throw new Error('As senhas não conferem.');
      const {data,error:signupError}=await supabase.auth.signUp({
        email:email.trim(),
        password,
        options:{emailRedirectTo:window.location.origin+'/atr-control'}
      });
      if(signupError) throw signupError;

      if(data.session){
        await claimAndValidate();
        return;
      }
      setMessage('Primeiro acesso criado. Abra o e-mail de confirmação enviado para '+email.trim()+'. Depois volte a esta tela e entre com a senha que acabou de criar.');
      setMode('LOGIN');
      setConfirmPassword('');
    }catch(err:any){
      setError(err?.message||'Não foi possível criar o primeiro acesso.');
    }finally{setBusy(false);setReady(true);}
  };

  if(!ready)return <div className="min-h-dvh bg-neutral-950 text-white grid place-items-center"><div className="text-sm text-neutral-500">Validando acesso administrativo...</div></div>;

  if(allowed)return <PlatformControlView onClose={()=>{void supabase.auth.signOut();window.history.pushState({}, '', '/');window.location.reload();}}/>;

  return <div className="min-h-dvh bg-neutral-950 text-white grid place-items-center p-4">
    <div className="w-full max-w-md p-6 sm:p-7 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center mb-5"><ShieldCheck size={22} className="text-amber-400"/></div>
      <h1 className="text-2xl font-black">ATR Control</h1>
      <p className="text-sm text-neutral-500 mt-1">{mode==='FIRST_ACCESS'?'Crie a senha inicial da conta administrativa autorizada.':'Acesso administrativo restrito da plataforma ADEGA PRO.'}</p>

      {error&&<div className="mt-4 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
      {message&&<div className="mt-4 p-3 rounded-xl border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs">{message}</div>}

      <form onSubmit={mode==='FIRST_ACCESS'?firstAccess:login} className="mt-6 space-y-4">
        <label className="block"><span className="text-xs font-bold text-neutral-300">E-mail administrativo</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><Mail size={16} className="text-neutral-500"/><input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm"/></div></label>
        <label className="block"><span className="text-xs font-bold text-neutral-300">{mode==='FIRST_ACCESS'?'Criar senha':'Senha'}</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><LockKeyhole size={16} className="text-neutral-500"/><input required type={show?'text':'password'} autoComplete={mode==='FIRST_ACCESS'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm"/><button type="button" onClick={()=>setShow(v=>!v)} className="text-neutral-500">{show?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
        {mode==='FIRST_ACCESS'&&<label className="block"><span className="text-xs font-bold text-neutral-300">Confirmar senha</span><div className="mt-1.5 flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-700 px-3"><LockKeyhole size={16} className="text-neutral-500"/><input required type={show?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full bg-transparent py-3 outline-none text-sm"/></div></label>}
        <button disabled={busy} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-sm flex items-center justify-center gap-2">{mode==='FIRST_ACCESS'?<UserPlus size={16}/>:null}{busy?'Processando...':mode==='FIRST_ACCESS'?'Criar primeiro acesso':'Entrar no ATR Control'}</button>
      </form>

      <button type="button" onClick={()=>{setMode(v=>v==='LOGIN'?'FIRST_ACCESS':'LOGIN');setError('');setMessage('');setPassword('');setConfirmPassword('');}} className="mt-4 w-full text-xs text-amber-400 hover:text-amber-300">
        {mode==='LOGIN'?'Primeiro acesso / criar senha':'Já criei minha senha'}
      </button>

      <div className="mt-5 text-[10px] text-neutral-600 leading-relaxed">Somente e-mails previamente autorizados no backend conseguem reivindicar privilégios administrativos. Criar uma conta Auth por si só não concede acesso ao ATR Control.</div>
    </div>
  </div>;
};