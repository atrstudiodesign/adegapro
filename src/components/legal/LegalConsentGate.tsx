import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { LEGAL_DOCS, LEGAL_EFFECTIVE_DATE, REQUIRED_LEGAL_ACCEPTANCES, LegalDocKey } from '../../legal/legalDocuments';
import { LegalCenter } from './LegalCenter';

interface LegalConsentGateProps {
  onAccepted: () => void;
}

export const LegalConsentGate: React.FC<LegalConsentGateProps> = ({ onAccepted }) => {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [legalOpen, setLegalOpen] = useState<LegalDocKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('legal_acceptances')
        .select('document_key, version')
        .eq('user_id', auth.user.id);

      if (error) {
        setError('Não foi possível validar os documentos legais.');
        setLoading(false);
        return;
      }

      const accepted = new Set((data || []).map(x => `${x.document_key}:${x.version}`));
      const allCurrent = REQUIRED_LEGAL_ACCEPTANCES.every(
        d => accepted.has(`${d.document_key}:${d.version}`)
      );
      if (allCurrent) {
        onAccepted();
        return;
      }

      const initial: Record<string, boolean> = {};
      REQUIRED_LEGAL_ACCEPTANCES.forEach(d => {
        initial[d.document_key] = accepted.has(`${d.document_key}:${d.version}`);
      });
      setChecks(initial);
      setLoading(false);
    })();
  }, [onAccepted]);

  if (legalOpen) {
    return <LegalCenter active={legalOpen} onSelect={setLegalOpen} onBack={() => setLegalOpen(null)} />;
  }

  const allChecked = REQUIRED_LEGAL_ACCEPTANCES.every(d => checks[d.document_key]);

  const accept = async () => {
    if (!allChecked) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.rpc('accept_legal_documents', {
      p_documents: REQUIRED_LEGAL_ACCEPTANCES,
      p_user_agent: navigator.userAgent,
      p_metadata: {
        source: 'legal_consent_gate',
        locale: navigator.language,
        accepted_at_client: new Date().toISOString()
      }
    });
    setSaving(false);
    if (error) {
      setError(error.message || 'Não foi possível registrar o aceite.');
      return;
    }
    onAccepted();
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-neutral-950 text-white grid place-items-center">
        <div className="text-center text-sm text-neutral-400">Validando documentos legais vigentes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-neutral-950 text-white px-4 py-8 grid place-items-center">
      <div className="w-full max-w-3xl rounded-3xl border border-neutral-800 bg-neutral-900/90 shadow-2xl p-4 sm:p-7">
        <div className="flex items-start gap-3 pb-5 border-b border-neutral-800">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 grid place-items-center shrink-0">
            <FileCheck2 size={21}/>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">Aceite contratual obrigatório</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Antes de acessar o ambiente de produção, confirme a leitura e concordância com os documentos vigentes do ADEGA PRO.
            </p>
            <p className="text-[11px] text-neutral-500 mt-2">Vigência: {LEGAL_EFFECTIVE_DATE}</p>
          </div>
        </div>

        {error && <div className="mt-4 p-3 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-300 text-xs">{error}</div>}

        <div className="mt-5 space-y-2.5">
          {REQUIRED_LEGAL_ACCEPTANCES.map(doc => {
            const key = doc.document_key as LegalDocKey;
            return (
              <label key={key} className="flex items-start gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/70">
                <input
                  type="checkbox"
                  checked={Boolean(checks[key])}
                  onChange={e => setChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-1"
                />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); setLegalOpen(key); }}
                    className="text-left text-sm font-bold text-white hover:text-amber-400"
                  >
                    {LEGAL_DOCS[key].title}
                  </button>
                  <div className="text-[11px] text-neutral-500">Versão {LEGAL_DOCS[key].version} · clique no título para ler o documento integral.</div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
          <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5"/>
          <span>O aceite é registrado de forma versionada no banco, vinculado à conta autenticada, com data/hora e informações técnicas do navegador para prova de consentimento contratual. Direitos legais indisponíveis permanecem preservados.</span>
        </div>

        <button
          onClick={accept}
          disabled={!allChecked || saving}
          className="mt-5 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-black text-sm flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={17}/>
          {saving ? 'Registrando aceite...' : 'Concordo e continuar para o ADEGA PRO'}
        </button>
      </div>
    </div>
  );
};
