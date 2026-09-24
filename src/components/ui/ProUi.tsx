import React from 'react';
import { PackageOpen } from 'lucide-react';

export const PageHeader=({eyebrow,title,description,actions}:{eyebrow?:string;title:string;description?:string;actions?:React.ReactNode})=>
  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/5">
    <div>{eyebrow&&<div className="text-[9px] uppercase tracking-[.18em] font-black text-amber-400">{eyebrow}</div>}<h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">{title}</h1>{description&&<p className="text-xs text-neutral-500 mt-1 max-w-2xl">{description}</p>}</div>
    {actions&&<div className="flex flex-wrap gap-2">{actions}</div>}
  </div>;

export const MetricCard=({label,value,detail,icon:Icon,onClick,tone='amber'}:{label:string;value:React.ReactNode;detail?:string;icon?:React.ElementType;onClick?:()=>void;tone?:'amber'|'emerald'|'rose'|'sky'|'violet'})=>{
  const tones={amber:'text-amber-400 bg-amber-500/10 border-amber-500/20',emerald:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',rose:'text-rose-400 bg-rose-500/10 border-rose-500/20',sky:'text-sky-400 bg-sky-500/10 border-sky-500/20',violet:'text-violet-400 bg-violet-500/10 border-violet-500/20'} as const;
  const C=onClick?'button':'div';
  return <C {...(onClick?{onClick}:{})} className="text-left p-4 rounded-2xl bg-gradient-to-b from-neutral-900 to-[#0c0c0c] border border-neutral-800 hover:border-amber-500/30 transition-colors">
    {Icon&&<div className={`w-9 h-9 rounded-xl border grid place-items-center mb-3 ${tones[tone]}`}><Icon size={17}/></div>}
    <div className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</div><div className="mt-1 text-xl sm:text-2xl font-black text-white tabular-nums">{value}</div>{detail&&<div className="text-[10px] text-neutral-600 mt-1">{detail}</div>}
  </C>
};

export const EmptyState=({title,description,action}:{title:string;description:string;action?:React.ReactNode})=>
  <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/50 text-center"><PackageOpen size={34} className="mx-auto text-neutral-700"/><div className="mt-3 font-black text-white">{title}</div><div className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">{description}</div>{action&&<div className="mt-5 flex justify-center">{action}</div>}</div>;

export const StatusBadge=({children,tone='neutral'}:{children:React.ReactNode;tone?:'neutral'|'success'|'warning'|'danger'|'info'})=>{
  const cls={neutral:'border-neutral-700 bg-neutral-800 text-neutral-300',success:'border-emerald-800 bg-emerald-950/50 text-emerald-300',warning:'border-amber-800 bg-amber-950/50 text-amber-300',danger:'border-rose-800 bg-rose-950/50 text-rose-300',info:'border-sky-800 bg-sky-950/50 text-sky-300'}[tone];
  return <span className={`inline-flex items-center px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-wide ${cls}`}>{children}</span>;
};

export const ProductThumb=({src,alt,size='md'}:{src?:string;alt:string;size?:'sm'|'md'|'lg'})=>{
  const sz={sm:'w-10 h-10',md:'w-14 h-14',lg:'w-20 h-20'}[size];
  return <div className={`${sz} shrink-0 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 grid place-items-center`}>{src?<img src={src} alt={alt} className="w-full h-full object-contain p-1" loading="lazy"/>:<PackageOpen size={18} className="text-neutral-700"/>}</div>
};
