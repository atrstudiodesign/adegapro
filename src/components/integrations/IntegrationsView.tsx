import React, { useState } from 'react';
import { db } from '../../services/db';
import { paymentService } from '../../services/paymentService';
import { fiscalService } from '../../services/fiscalService';
import { Cable, QrCode, CreditCard, FileCheck, CheckCircle2, Smartphone, Zap, ShieldCheck } from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState(db.getIntegrations());
  const [testPixUrl, setTestPixUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSavePix = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveIntegrations({ pix: integrations.pix });
    setFeedback('Configurações do PIX salvas com sucesso!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveTef = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveIntegrations({ tef: integrations.tef });
    setFeedback('Configurações do TEF salvas com sucesso!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveIntegrations({ fiscal: integrations.fiscal });
    setFeedback('Configurações fiscais salvas com sucesso!');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleTestPix = async () => {
    try {
      const res = await paymentService.generatePix(10.00, 'Teste Conectividade ADEGA PRO');
      setTestPixUrl(res.qrCodeDataUrl);
      setFeedback('QR Code de teste gerado com algoritmo CRC16 oficial!');
      setTimeout(() => setFeedback(null), 3500);
    } catch (e) {
      alert('Erro ao testar PIX');
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto space-y-4 sm:space-y-6 bg-neutral-950">
      <div className="pb-4 border-b border-neutral-800">
        <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <Cable size={22} className="text-amber-400" />
          <span>Integrações &amp; Pagamentos</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Delivery, pagamentos, PIX, SmartPOS/TEF, fiscal e webhooks em um único hub.
        </p>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="p-4 rounded-2xl border border-emerald-800/40 bg-emerald-950/15 flex items-start gap-3">
        <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm font-black text-white">Ecossistema de integrações ADEGA PRO</div>
          <div className="text-xs text-neutral-500 mt-1">
            Esta tela demonstra os conectores disponíveis. Nenhum provedor é tratado como conectado sem credenciais, webhook e homologação reais.
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[
          {name:'iFood',desc:'Pedidos, cardápio e catálogo após homologação oficial.',status:'HOMOLOGAÇÃO PENDENTE',tone:'bg-red-600',icon:Smartphone},
          {name:'Asaas',desc:'PIX, cobrança e recorrência via API e webhook.',status:'NÃO CONFIGURADO',tone:'bg-blue-700',icon:CreditCard},
          {name:'PagSeguro',desc:'Pagamentos e terminais conforme produto homologado.',status:'NÃO CONFIGURADO',tone:'bg-emerald-700',icon:CreditCard},
          {name:'Mercado Pago',desc:'PIX e pagamentos digitais via integração oficial.',status:'NÃO CONFIGURADO',tone:'bg-sky-700',icon:Zap},
          {name:'SmartPOS / TEF',desc:'Envio do valor ao terminal após homologação do provedor.',status:integrations.tef.status==='CONNECTED'?'CONECTADO':'CONFIGURANDO',tone:'bg-amber-600',icon:CreditCard},
          {name:'NFC-e / Fiscal',desc:'Certificado, CSC e transmissão devem permanecer no backend.',status:integrations.fiscal.status==='ACTIVE'?'CONECTADO':'HOMOLOGAÇÃO PENDENTE',tone:'bg-violet-700',icon:FileCheck}
        ].map(({name,desc,status,tone,icon:Icon})=>(
          <div key={name} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div className={`w-11 h-11 rounded-xl ${tone} grid place-items-center text-white`}><Icon size={19}/></div>
              <span className={`text-[9px] px-2 py-1 rounded-full border font-black ${status==='CONECTADO'?'text-emerald-300 border-emerald-800 bg-emerald-950/30':status==='CONFIGURANDO'?'text-sky-300 border-sky-800 bg-sky-950/30':'text-amber-300 border-amber-800 bg-amber-950/30'}`}>{status}</span>
            </div>
            <div className="mt-4 font-black text-white">{name}</div>
            <div className="text-[10px] text-neutral-500 mt-1 leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <div className="text-[10px] font-black uppercase tracking-[.18em] text-neutral-500 mb-3">Configuração local de demonstração</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PIX EMV Integration Card */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-400 mb-3">
              <QrCode size={20} />
              <h3 className="font-bold text-white text-base">PIX Banco Central</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Geração de QR Code estático ou dinâmico e Copia e Cola EMV com payload CRC16 oficial.
            </p>

            <form onSubmit={handleSavePix} className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Chave PIX da Loja</label>
                <input
                  type="text"
                  value={integrations.pix.pixKey}
                  onChange={e => setIntegrations({
                    ...integrations,
                    pix: { ...integrations.pix, pixKey: e.target.value }
                  })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nome do Favorecido</label>
                <input
                  type="text"
                  value={integrations.pix.merchantName}
                  onChange={e => setIntegrations({
                    ...integrations,
                    pix: { ...integrations.pix, merchantName: e.target.value }
                  })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Cidade do Favorecido</label>
                <input
                  type="text"
                  value={integrations.pix.merchantCity}
                  onChange={e => setIntegrations({
                    ...integrations,
                    pix: { ...integrations.pix, merchantCity: e.target.value }
                  })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs focus:border-teal-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Webhook de Notificação Automática</label>
                <input
                  readOnly
                  value={integrations.pix.webhookUrl}
                  className="w-full bg-neutral-950/60 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-400 text-[11px] font-mono select-all"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Salvar Chave
                </button>
                <button
                  type="button"
                  onClick={handleTestPix}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Testar QR Code
                </button>
              </div>
            </form>
          </div>

          {testPixUrl && (
            <div className="mt-4 p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center">
              <div className="text-[10px] text-teal-400 font-bold mb-1">QR Code de Teste (R$ 10,00)</div>
              <img src={testPixUrl} alt="QR Code Teste" className="w-28 h-28 mx-auto bg-white p-1 rounded-lg" />
            </div>
          )}
        </div>

        {/* TEF PinPad Integration Card */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-3">
              <CreditCard size={20} />
              <h3 className="font-bold text-white text-base">TEF (Terminal PinPad)</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Integração com SiTef / Client modular para leitura de cartões direto no balcão.
            </p>

            <form onSubmit={handleSaveTef} className="space-y-3">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300">Status da Conexão:</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      integrations.tef.status === 'CONNECTED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {integrations.tef.status}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-2">
                  {integrations.tef.status === 'NOT_CONFIGURED'
                    ? 'Aviso: O PDV aceitará cartões em modo manual até a configuração de um PinPad físico.'
                    : 'PinPad pronto para transações.'}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">IP do Concentrador TEF / PinPad</label>
                <input
                  type="text"
                  value={integrations.tef.terminalIp}
                  onChange={e => setIntegrations({
                    ...integrations,
                    tef: { ...integrations.tef, terminalIp: e.target.value }
                  })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">ID do Terminal PinPad</label>
                <input
                  type="text"
                  value={integrations.tef.terminalId}
                  onChange={e => setIntegrations({
                    ...integrations,
                    tef: { ...integrations.tef, terminalId: e.target.value }
                  })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tefTestMode"
                  checked={integrations.tef.testMode}
                  onChange={e => setIntegrations({
                    ...integrations,
                    tef: { ...integrations.tef, testMode: e.target.checked }
                  })}
                  className="rounded border-neutral-700 text-blue-500 focus:ring-0"
                />
                <label htmlFor="tefTestMode" className="text-xs text-neutral-300 cursor-pointer">
                  Modo de Teste / Homologação (Simula resposta PinPad)
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Salvar Configuração TEF
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Fiscal NFC-e / SAT Card */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-3">
              <FileCheck size={20} />
              <h3 className="font-bold text-white text-base">Fiscal (NFC-e / SAT)</h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Módulo de transmissão de Nota Fiscal de Consumidor Eletrônica Modelo 65 para SEFAZ.
            </p>

            <form onSubmit={handleSaveFiscal} className="space-y-3">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300">Certificado Digital A1:</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                    {integrations.fiscal.status}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-2">
                  Faça o upload do arquivo .pfx para habilitar a transmissão com assinatura eletrônica.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Ambiente</label>
                  <select
                    value={integrations.fiscal.environment}
                    onChange={e => setIntegrations({
                      ...integrations,
                      fiscal: { ...integrations.fiscal, environment: e.target.value as any }
                    })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2 text-white text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="HOMOLOGACAO">Homologação</option>
                    <option value="PRODUCAO">Produção</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Série NFC-e</label>
                  <input
                    type="number"
                    value={integrations.fiscal.series}
                    onChange={e => setIntegrations({
                      ...integrations,
                      fiscal: { ...integrations.fiscal, series: parseInt(e.target.value) || 1 }
                    })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Token CSC da SEFAZ</label>
                <input
                  type="password"
                  value={integrations.fiscal.cscToken}
                  onChange={e => setIntegrations({
                    ...integrations,
                    fiscal: { ...integrations.fiscal, cscToken: e.target.value }
                  })}
                  placeholder="Código de Segurança do Contribuinte"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Salvar Módulo Fiscal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
