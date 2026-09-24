import React, { useEffect, useMemo, useState } from 'react';
import { Delete, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { productionDb } from '../../services/productionDb';
import type { User } from '../../types';

interface ProductionOperatorLockProps {
  onLogin: (user: User) => void;
}

type Operator = {
  id: string;
  tenant_id: string;
  store_id: string;
  name: string;
  role: User['role'];
  active: boolean;
};

const ROLE_PERMISSIONS: Record<string, User['permissions']> = {
  ADMINISTRADOR: [
    'products.view','products.create','products.edit','products.delete',
    'sales.view','sales.create','sales.cancel','sales.discount',
    'cash.view','cash.open','cash.close','cash.movement','cash.operate',
    'inventory.view','inventory.adjust','finance.view','finance.edit',
    'reports.view','settings.edit','employees.manage'
  ],
  GERENTE: [
    'products.view','products.create','products.edit',
    'sales.view','sales.create','sales.cancel','sales.discount',
    'cash.view','cash.open','cash.close','cash.movement','cash.operate',
    'inventory.view','inventory.adjust','finance.view','reports.view'
  ],
  CAIXA: ['products.view','sales.view','sales.create','cash.view','cash.operate'],
  ESTOQUISTA: ['products.view','products.edit','inventory.view','inventory.adjust'],
  FINANCEIRO: ['sales.view','cash.view','finance.view','finance.edit','reports.view']
};

export const ProductionOperatorLock: React.FC<ProductionOperatorLockProps> = ({ onLogin }) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    productionDb.getOperators()
      .then(rows => {
        if (!alive) return;
        const active = (rows || []).filter((o:any) => o.active) as Operator[];
        setOperators(active);
        setSelectedId(active[0]?.id || '');
      })
      .catch(err => alive && setError(err?.message || 'Não foi possível carregar os operadores.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const selected = useMemo(() => operators.find(o => o.id === selectedId), [operators, selectedId]);

  const createFirstOperator = async () => {
    const name = window.prompt('Nome do primeiro operador/administrador:')?.trim();
    if (!name) return;
    const pin = window.prompt('Defina um PIN de 4 a 8 dígitos:') || '';
    if (!/^\d{4,8}$/.test(pin)) {
      setError('O PIN deve conter de 4 a 8 dígitos.');
      return;
    }
    setChecking(true);
    setError('');
    try {
      await productionDb.saveOperator({ name, role: 'ADMINISTRADOR', pin, active: true });
      const rows = await productionDb.getOperators();
      const active = (rows || []).filter((o:any) => o.active) as Operator[];
      setOperators(active);
      setSelectedId(active[0]?.id || '');
      setPin('');
    } catch (err:any) {
      setError(err?.message || 'Não foi possível criar o primeiro operador.');
    } finally {
      setChecking(false);
    }
  };

  const submit = async () => {
    if (!selected || pin.length < 4) return;
    setChecking(true);
    setError('');
    try {
      const result = await productionDb.verifyOperatorPin(selected.id, pin);
      if (!result?.ok) {
        if (result?.code === 'LOCKED') {
          const min = Math.max(1, Math.ceil(Number(result.retry_after_seconds || 60) / 60));
          setError(`Operador temporariamente bloqueado. Tente novamente em aproximadamente ${min} minuto(s).`);
        } else {
          setError('PIN inválido.');
        }
        setPin('');
        return;
      }

      const op = result.operator;
      onLogin({
        id: op.id,
        tenantId: op.tenant_id,
        storeId: op.store_id,
        name: op.name,
        email: '',
        phone: '',
        role: op.role,
        pin: '',
        active: true,
        permissions: ROLE_PERMISSIONS[op.role] || [],
        createdAt: new Date().toISOString()
      });
    } catch (err:any) {
      setError(err?.message || 'Falha ao validar operador.');
      setPin('');
    } finally {
      setChecking(false);
    }
  };

  const key = (value: string) => {
    if (checking) return;
    if (value === 'DEL') return setPin(p => p.slice(0, -1));
    if (pin.length < 8) setPin(p => p + value);
  };

  if (loading) {
    return <div className="min-h-dvh bg-neutral-950 text-white grid place-items-center text-sm text-neutral-400">Carregando operadores seguros...</div>;
  }

  return (
    <div className="min-h-dvh bg-neutral-950 text-white grid place-items-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/95 shadow-2xl p-5 sm:p-7">
        <div className="flex items-start gap-3 pb-5 border-b border-neutral-800">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-400"><LockKeyhole size={21}/></div>
          <div>
            <h1 className="text-xl font-black">Desbloqueio do operador</h1>
            <p className="text-xs text-neutral-400 mt-1">Camada interna do PDV. O PIN é validado no servidor e nunca é armazenado em texto puro.</p>
          </div>
        </div>

        {operators.length === 0 ? (
          <div className="mt-5 p-4 rounded-xl border border-amber-800/60 bg-amber-950/20 text-sm text-amber-200">
            <p>Nenhum operador de produção foi cadastrado. Como esta conta é a administradora inicial, crie o primeiro operador para concluir a ativação.</p>
            {error && <div className="mt-3 p-2 rounded-lg border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}
            <button
              disabled={checking}
              onClick={() => void createFirstOperator()}
              className="mt-4 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-sm"
            >
              {checking ? 'Criando operador...' : 'Criar primeiro operador'}
            </button>
          </div>
        ) : (
          <>
            <label className="block mt-5">
              <span className="text-xs font-bold text-neutral-300">Operador</span>
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-3">
                <UserRound size={16} className="text-neutral-500"/>
                <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setPin(''); }} className="w-full bg-transparent py-3 text-sm outline-none">
                  {operators.map(op => <option key={op.id} value={op.id}>{op.name} · {op.role}</option>)}
                </select>
              </div>
            </label>

            <div className="mt-5 flex items-center justify-center gap-2">
              {Array.from({length: 8}).map((_,i) => (
                <span key={i} className={`w-3 h-3 rounded-full border ${i < pin.length ? 'bg-amber-400 border-amber-300' : 'bg-neutral-950 border-neutral-700'}`}/>
              ))}
            </div>

            {error && <div className="mt-4 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}

            <div className="grid grid-cols-3 gap-2 mt-5">
              {['1','2','3','4','5','6','7','8','9'].map(n => (
                <button key={n} onClick={() => key(n)} className="h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-black text-lg">{n}</button>
              ))}
              <button onClick={() => setPin('')} className="h-12 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-bold text-neutral-400">LIMPAR</button>
              <button onClick={() => key('0')} className="h-12 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-black text-lg">0</button>
              <button onClick={() => key('DEL')} className="h-12 rounded-xl bg-neutral-950 border border-neutral-800 grid place-items-center text-neutral-400"><Delete size={18}/></button>
            </div>

            <button onClick={submit} disabled={!selected || pin.length < 4 || checking} className="mt-4 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-black">
              {checking ? 'Validando no servidor...' : 'Desbloquear ambiente'}
            </button>

            <div className="mt-4 flex items-start gap-2 text-[11px] text-neutral-500">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5"/>
              <span>Após cinco tentativas inválidas, o operador é bloqueado temporariamente. A sessão interna expira e pode ser revogada.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
