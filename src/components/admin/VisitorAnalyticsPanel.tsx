import { requestVisitorAnalytics } from '../../services/analyticsRequest';
import React, { useEffect, useRef, useState } from 'react';
import { Activity, Globe2, MapPin, RefreshCw, Users, Eye } from 'lucide-react';
import { platformSupabase } from '../../services/platformSupabase';

type Aggregate = { name?: string; region?: string; country?: string; requestPath?: string; referrerHostname?: string; deviceType?: string; visitors?: number; pageviews?: number; count?: number };
type Day = { day: string; visitors: number; pageviews: number };
type Snapshot = {
 source: string; count: { visitors?: number; pageviews?: number };
 paths: Aggregate[]; referrers: Aggregate[]; devices: Aggregate[]; countries: Aggregate[];
 live?: { online: number | null; generatedAt?: string; liveUnavailable?: boolean; today?: { visitors: number; pageviews: number }; cities?: Aggregate[]; onlineCities?: Aggregate[]; onlinePaths?: Aggregate[]; timeline?: Day[] };
};
const count = (row: Aggregate) => Number(row.visitors ?? row.pageviews ?? row.count ?? 0);
const name = (row: Aggregate) => row.name || row.requestPath || row.referrerHostname || row.deviceType || row.country || 'Não identificada';
const place = (row: Aggregate) => [name(row), row.region, row.name ? row.country : null].filter(Boolean).join(' · ');
const format = (value: number) => value.toLocaleString('pt-BR');

function Ranking({ title, rows = [], cities = false }: { title: string; rows?: Aggregate[]; cities?: boolean }) {
 rows = Array.isArray(rows) ? rows : [];
 const max = Math.max(1, ...rows.map(count));
 return <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><h3 className="font-black text-sm">{title}</h3><div className="mt-4 space-y-3">{rows.slice(0,20).map((row,i) => <div key={`${place(row)}-${i}`}><div className="flex justify-between gap-3 text-xs mb-1.5"><span className="text-neutral-300 truncate" title={place(row)}>{cities ? place(row) : name(row)}</span><b className="text-amber-300 tabular-nums">{format(count(row))}</b></div><div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-amber-200 rounded-full transition-all duration-500" style={{width:`${count(row)/max*100}%`}}/></div></div>)}{rows.length === 0 && <p className="py-8 text-center text-neutral-500 text-xs">Nenhum registro nesta janela.</p>}</div></section>;
}

export function VisitorAnalyticsPanel() {
 const [days,setDays] = useState(30);
 const [data,setData] = useState<Snapshot | null>(null);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState('');
 const [updated,setUpdated] = useState<Date | null>(null);
 const [refresh,setRefresh] = useState(0);
 const sequence = useRef(0);
 useEffect(() => {
  const id = ++sequence.current;
  let pending = false;
  let controller: AbortController | null = null;
  const load = async () => {
   if (pending || document.visibilityState !== 'visible') return;
   pending = true; setBusy(true);
   const requestController = new AbortController();
   controller = requestController;
   const timeout = window.setTimeout(() => requestController.abort(), 25_000);
   try {
    const {data:{session}} = await platformSupabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessão administrativa expirada.');
    const payload = await requestVisitorAnalytics(days,session.access_token,requestController.signal);
    if (sequence.current === id) {setData(payload);setUpdated(new Date());setError('');}
   } catch (e) {if (sequence.current === id && !requestController.signal.aborted) setError(e instanceof TypeError ? 'Falha de conexão. Reconexão automática ativa; os últimos dados foram preservados.' : e instanceof Error ? e.message : 'Falha de sincronização.');else if(sequence.current === id) setError('A consulta demorou demais. Reconexão automática ativa.');}
   finally {window.clearTimeout(timeout);pending=false;if(sequence.current === id)setBusy(false);}
  };
  void load();
  const timer = window.setInterval(() => void load(),15_000);
  const onVisible = () => void load();
  document.addEventListener('visibilitychange',onVisible);
  return () => {sequence.current++;controller?.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
 }, [days,refresh]);
 const live = data?.live;
 const visitors = Number(data?.count?.visitors || 0);
 const views = Number(data?.count?.pageviews || 0);
 const timeline = live?.timeline || [];
 const max = Math.max(1,...timeline.map(d=>d.visitors));
 const stats = [
  {label:'Online agora',value:error || live?.online == null ? '—' : format(live.online),icon:Activity,detail:'Atividade nos últimos 90 segundos',color:'text-emerald-300'},
  {label:'Visitantes no período',value:data ? format(visitors) : '—',icon:Users,detail:`${days} dias · visitantes únicos`,color:'text-sky-300'},
  {label:'Visualizações',value:data ? format(views) : '—',icon:Eye,detail:'Heartbeats não somam acessos',color:'text-amber-300'},
  {label:'Visitantes hoje',value:live?.today ? format(live.today.visitors) : '—',icon:Globe2,detail:'Analytics próprio · Brasília',color:'text-violet-300'}
 ];
 return <div className="space-y-5">
  <header className="p-5 sm:p-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-neutral-900 to-neutral-950"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-[10px] tracking-[.2em] font-black text-amber-400 uppercase">ATR Control · audiência</p><h2 className="text-xl sm:text-2xl font-black mt-2">Visitantes do site ADEGA PRO</h2><p className="text-xs text-neutral-400 mt-2">{data?.source === 'VERCEL' ? 'Totais: Vercel Analytics. Presença, cidades e evolução: analytics próprio.' : 'Analytics próprio · presença, cidades e acessos sincronizados.'}</p></div><div className="flex flex-wrap items-center gap-2">{[7,30,90].map(n=><button key={n} aria-pressed={days===n} onClick={()=>setDays(n)} className={`px-3 py-2.5 rounded-xl border text-xs font-bold ${days===n?'bg-amber-400 text-neutral-950 border-amber-300':'border-neutral-700 text-neutral-300'}`}>{n} dias</button>)}<button disabled={busy} onClick={()=>setRefresh(n=>n+1)} className="p-2.5 border border-neutral-700 rounded-xl disabled:opacity-50" aria-label="Atualizar visitantes"><RefreshCw size={16} className={busy?'animate-spin':''}/></button></div></div><div role="status" className="flex items-center gap-2 mt-4 text-xs text-neutral-400"><span className={`w-2 h-2 rounded-full ${error || live?.liveUnavailable ? 'bg-amber-400':'bg-emerald-400'}`}/>{busy?'Sincronizando…':error?'Sincronização interrompida · exibindo última consulta':updated?`Atualizado às ${updated.toLocaleTimeString('pt-BR')} · sincroniza a cada 15s`:'Aguardando dados'}</div></header>
  {error && <p role="alert" className="p-4 rounded-xl bg-rose-950/30 border border-rose-900 text-rose-300 text-xs">{error}</p>}
  {live?.liveUnavailable && <p className="text-xs text-amber-300">Presença e cidades temporariamente indisponíveis. Os totais históricos continuam separados.</p>}
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">{stats.map(s=><section key={s.label} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="flex justify-between items-center"><span className="text-xs text-neutral-400">{s.label}</span><s.icon size={19} className={s.color}/></div><p className={`text-3xl font-black tabular-nums mt-4 ${s.color}`}>{s.value}</p><p className="text-[10px] text-neutral-500 mt-2">{s.detail}</p></section>)}</div>
  <div className="grid lg:grid-cols-2 gap-4"><Ranking title="Cidades online agora · visitantes" rows={live?.onlineCities} cities/><Ranking title="Páginas abertas agora · visitantes" rows={live?.onlinePaths}/></div>
  <section className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800"><div className="flex justify-between gap-3"><div><h3 className="font-black text-sm">Evolução diária de visitantes</h3><p className="text-[10px] text-neutral-500 mt-1">Analytics próprio · dias no horário de Brasília</p></div><Activity size={18} className="text-amber-400"/></div><div className="flex items-end gap-1 h-36 mt-6" role="img" aria-label={`Gráfico de visitantes por dia nos últimos ${days} dias`}>{timeline.map(d=><div key={d.day} className="flex-1 min-w-0 h-full flex items-end"><div title={`${d.day}: ${d.visitors} visitantes · ${d.pageviews} visualizações`} className="w-full rounded-t bg-gradient-to-t from-amber-600 to-amber-300" style={{height:`${d.visitors ? Math.max(3,d.visitors/max*100):0}%`}}/></div>)}</div><div className="flex justify-between text-[10px] text-neutral-500 mt-2"><span>{timeline[0]?.day}</span><span>{timeline.at(-1)?.day}</span></div><details className="mt-3 text-xs text-neutral-400"><summary className="cursor-pointer">Ver valores por dia</summary><div className="max-h-56 overflow-auto mt-2"><table className="w-full text-left"><thead><tr><th>Data</th><th>Visitantes</th><th>Visualizações</th></tr></thead><tbody>{timeline.map(d=><tr key={d.day}><td>{d.day}</td><td>{d.visitors}</td><td>{d.pageviews}</td></tr>)}</tbody></table></div></details></section>
  <div className="grid lg:grid-cols-2 gap-4"><Ranking title="Cidades no período · visitantes únicos por cidade" rows={live?.cities} cities/><Ranking title="Páginas mais acessadas · visualizações" rows={data?.paths}/><Ranking title="Principais origens" rows={data?.referrers}/><Ranking title="Dispositivos" rows={data?.devices}/><Ranking title="Países" rows={data?.countries}/></div>
  <p className="text-[10px] text-neutral-500 flex gap-2"><MapPin size={14} className="shrink-0"/>Cidade aproximada pela conexão, coletada a partir desta atualização; histórico sem cidade fica como “Não identificada”. Online é uma estimativa por navegador, sem IP ou dados internos das empresas. Abas ocultas deixam de enviar presença.</p>
 </div>;
}
