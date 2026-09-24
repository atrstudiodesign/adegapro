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


export const AlertCard=({title,description,tone='warning',action}:{title:string;description:string;tone?:'warning'|'danger'|'success'|'info';action?:React.ReactNode})=>{
  const cls={warning:'border-amber-800/50 bg-amber-950/20',danger:'border-rose-800/50 bg-rose-950/20',success:'border-emerald-800/50 bg-emerald-950/20',info:'border-sky-800/50 bg-sky-950/20'}[tone];
  return <div className={`p-4 rounded-2xl border ${cls}`}><div className="font-black text-sm text-white">{title}</div><div className="text-xs text-neutral-400 mt-1 leading-relaxed">{description}</div>{action&&<div className="mt-3">{action}</div>}</div>;
};

export const SearchInput=({value,onChange,placeholder='Buscar...'}:{value:string;onChange:(value:string)=>void;placeholder?:string})=>
  <div className="relative"><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500 placeholder:text-neutral-600"/></div>;

export const FilterBar=({children}:{children:React.ReactNode})=>
  <div className="flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-neutral-900/80 border border-neutral-800">{children}</div>;

export const DataTableFrame=({children}:{children:React.ReactNode})=>
  <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden"><div className="overflow-x-auto">{children}</div></div>;

export const ModalShell=({open,title,description,onClose,children,maxWidth='max-w-3xl'}:{open:boolean;title:string;description?:string;onClose:()=>void;children:React.ReactNode;maxWidth?:string})=>{
  if(!open)return null;
  return <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-3 grid place-items-center" role="dialog" aria-modal="true"><div className={`w-full ${maxWidth} max-h-[94dvh] overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl flex flex-col`}><div className="p-4 border-b border-neutral-800 flex items-start justify-between gap-3"><div><div className="font-black text-white">{title}</div>{description&&<div className="text-[10px] text-neutral-500 mt-1">{description}</div>}</div><button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white">×</button></div><div className="p-4 overflow-y-auto">{children}</div></div></div>;
};

export const ConfirmDialog=({open,title,description,confirmLabel='Confirmar',cancelLabel='Cancelar',danger=false,onConfirm,onCancel}:{open:boolean;title:string;description:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean;onConfirm:()=>void;onCancel:()=>void})=>
  <ModalShell open={open} title={title} description={description} onClose={onCancel} maxWidth="max-w-md"><div className="flex justify-end gap-2"><button onClick={onCancel} className="px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold">{cancelLabel}</button><button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-xs font-black ${danger?'bg-rose-600 text-white':'bg-amber-500 text-neutral-950'}`}>{confirmLabel}</button></div></ModalShell>;

export const Drawer=({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode})=>{
  if(!open)return null;
  return <div className="fixed inset-0 z-50"><button aria-label="Fechar painel" onClick={onClose} className="absolute inset-0 bg-black/70"/><aside className="absolute inset-y-0 right-0 w-[92vw] max-w-xl bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col"><div className="p-4 border-b border-neutral-800 flex justify-between"><h2 className="font-black">{title}</h2><button onClick={onClose} className="text-neutral-400">×</button></div><div className="p-4 overflow-y-auto flex-1">{children}</div></aside></div>;
};
