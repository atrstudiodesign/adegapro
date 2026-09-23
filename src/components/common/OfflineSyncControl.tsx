import React, { useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { offlineSyncService, SyncItem } from '../../services/offlineSyncService';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cloud,
  X,
  Clock,
  ShieldCheck,
  Play
} from 'lucide-react';

export const OfflineSyncControl: React.FC = () => {
  const { isOnline, syncState, pendingCount, lastSyncTime, isSimulatedOffline, syncNow, setSimulatedOffline } = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    setIsProcessing(true);
    setSyncFeedback(null);
    try {
      const res = await syncNow();
      if (res.success) {
        setSyncFeedback(
          res.syncedCount > 0
            ? `${res.syncedCount} item(s) sincronizado(s) com sucesso na nuvem!`
            : 'Todos os registros já estão atualizados na nuvem.'
        );
      } else {
        setSyncFeedback(res.error || 'Falha ao sincronizar. Verifique a conexão.');
      }
    } catch (e: any) {
      setSyncFeedback(e.message || 'Erro inesperado durante a sincronização.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingItems: SyncItem[] = offlineSyncService.getPendingItems();

  return (
    <>
      {/* Top Bar Trigger Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
          !isOnline
            ? 'bg-amber-950/80 border-amber-600/70 text-amber-300 hover:bg-amber-900 shadow-md shadow-amber-950/40'
            : pendingCount > 0
            ? 'bg-amber-950/60 border-amber-600/50 text-amber-400 hover:bg-amber-900/60'
            : syncState === 'SYNCING'
            ? 'bg-blue-950/70 border-blue-600/60 text-blue-300'
            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
        }`}
        title="Status da Conexão e Sincronização Offline do PDV"
      >
        {!isOnline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <WifiOff size={13} className="text-amber-400" />
            <span className="font-mono text-[11px] font-bold">
              OFFLINE {pendingCount > 0 && `(${pendingCount})`}
            </span>
          </>
        ) : syncState === 'SYNCING' ? (
          <>
            <RefreshCw size={13} className="text-blue-400 animate-spin" />
            <span className="font-mono text-[11px] text-blue-300 font-bold">Sincronizando...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <Cloud size={13} className="text-amber-400" />
            <span className="font-mono text-[11px] text-amber-400 font-bold">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <Wifi size={13} className="text-emerald-400" />
            <span className="hidden md:inline font-mono text-[11px] text-emerald-400">
              Online
            </span>
          </>
        )}
      </button>

      {/* Floating Offline Notification when connection is lost */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-40 max-w-sm bg-neutral-900/95 border border-amber-500/50 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <HardDrive size={18} />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Operando em Modo Offline
                </span>
                <button
                  onClick={() => setIsOpen(true)}
                  className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
                >
                  Ver Fila
                </button>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                O PDV e o Service Worker estão ativos. Suas vendas são salvas localmente e sincronizadas assim que a internet retornar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sync Details Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    !isOnline
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {!isOnline ? <WifiOff size={20} /> : <Wifi size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    Persistência Local &amp; Sincronização
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        !isOnline
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {!isOnline ? 'OFFLINE' : 'ONLINE'}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Service Worker com cache de aplicação e fila de vendas com reconciliação automática.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Feedback Alert if available */}
              {syncFeedback && (
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-700 text-xs font-medium text-amber-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              {/* Status Overview Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Connection Box */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-medium">
                    <Cloud size={14} className={isOnline ? 'text-emerald-400' : 'text-neutral-500'} />
                    <span>Conexão Nuvem</span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'}`}
                    />
                    <span>{isOnline ? 'Conectado' : 'Sem Conexão'}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {isSimulatedOffline ? 'Simulação manual ativa' : isOnline ? 'Latência baixa' : 'Queda de sinal'}
                  </div>
                </div>

                {/* Queue Box */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-1">
                  <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-medium">
                    <HardDrive size={14} className="text-amber-400" />
                    <span>Fila Local (Pendente)</span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="font-mono text-amber-400">{pendingCount}</span>
                    <span className="text-xs font-normal text-neutral-400">operações</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {pendingCount === 0 ? 'Tudo reconciliado' : 'Aguardando sincronismo'}
                  </div>
                </div>
              </div>

              {/* Service Worker Architecture Info */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span>Proteção Contínua via Service Worker</span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-[11px]">
                  Todos os arquivos do sistema (interface do PDV, tabelas de produtos, preços, códigos de barras e sintetizadores sonoros) estão cacheados no navegador pelo <strong>Service Worker</strong>. Em caso de corte de energia na rede ou queda do provedor, o caixa continua operando sem travar.
                </p>
              </div>

              {/* Pending Queue List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Operações na Fila de Espera ({pendingItems.length})
                  </span>
                  {lastSyncTime && (
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                      <Clock size={11} />
                      Última sinc: {new Date(lastSyncTime).toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                </div>

                {pendingItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/80 text-center space-y-1">
                    <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                    <div className="text-xs font-semibold text-neutral-300">
                      Nenhuma venda pendente na fila
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Todas as transações estão 100% sincronizadas com a nuvem.
                    </div>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {pendingItems.map((item, i) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>
                              {item.type === 'SALE' ? 'Venda de PDV' : 'Movimento de Caixa'}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500">
                              #{item.dataId.slice(-6)}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            {new Date(item.timestamp).toLocaleTimeString('pt-BR')} •{' '}
                            {item.type === 'SALE' && item.payload?.total
                              ? `R$ ${Number(item.payload.total).toFixed(2)}`
                              : item.payload?.amount
                              ? `R$ ${Number(item.payload.amount).toFixed(2)}`
                              : 'Registro gravado'}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Salvo Local
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Simulation switch for testing */}
              <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Simular Queda de Conexão</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                      TESTE
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Ative para testar o PDV operando 100% offline sem desligar o Wi-Fi.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSimulatedOffline(!isSimulatedOffline)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSimulatedOffline
                      ? 'bg-rose-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  {isSimulatedOffline ? 'Desativar Teste' : 'Simular Queda'}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isProcessing || !isOnline}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-amber-950/30"
              >
                <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                <span>{isProcessing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
