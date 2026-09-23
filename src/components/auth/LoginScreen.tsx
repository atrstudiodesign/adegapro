import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { User, CashSession } from '../../types';
import {
  ShoppingCart,
  Boxes,
  TrendingUp,
  FileText,
  Lock,
  Unlock,
  ShieldCheck,
  Store,
  CheckCircle2,
  AlertCircle,
  Delete,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  currentSession?: CashSession;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, currentSession }) => {
  const users = db.getUsers().filter(u => u.active);
  const store = db.getStore();

  const [selectedUser, setSelectedUser] = useState<User>(users[0] || db.getCurrentUser());
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg(null);
      if (newPin.length === 4) {
        verifyPin(newPin, selectedUser);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const verifyPin = (pinToTest: string, user: User) => {
    if (user.pin === pinToTest) {
      db.setCurrentUserId(user.id);
      db.addAuditLog(
        'USER_LOGIN',
        'AUTH',
        user.id,
        `Operador ${user.name} autenticou-se via PIN no terminal de frente de loja.`
      );
      onLogin(user);
    } else {
      setErrorMsg('PIN incorreto. Tente novamente.');
      setPin('');
    }
  };

  return (
    <div className="min-h-dvh bg-neutral-950 text-white flex flex-col justify-between selection:bg-amber-500 selection:text-neutral-950 relative overflow-x-hidden overflow-y-auto">
      {/* Background Ambience & Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/10 via-neutral-950 to-neutral-950 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Bar with Store Status & Live Clock */}
      <header className="relative z-10 w-full px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-neutral-900 bg-neutral-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/30 bg-neutral-900 shadow-md">
            <img
              src="/adega-pro-icon.jpg"
              alt="ADEGA PRO"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
              <span>{store.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                SaaS v1.0
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">CNPJ: {store.cnpj}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-neutral-500">Status Caixa:</span>
            {currentSession ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold text-[11px] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {currentSession.cashRegisterNumber} (ABERTO)
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 font-bold text-[11px] flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                CAIXA FECHADO
              </span>
            )}
          </div>

          <div className="text-right">
            <div className="font-mono text-base font-bold text-amber-400 tracking-wide">{currentTime}</div>
            <div className="text-[10px] text-neutral-400 capitalize hidden md:block">{currentDate}</div>
          </div>
        </div>
      </header>

      {/* Main Front Content */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center p-3 sm:p-6 gap-5 lg:gap-8 max-w-7xl mx-auto w-full">
        {/* Left Side: Stunning ADEGA PRO Brand Artwork & Pillars */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl">
          {/* Logo Showcase with Amber Aura */}
          <div className="relative mb-6">
            <div className="w-36 min-[420px]:w-44 sm:w-56 md:w-64 aspect-square rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.25)] border-2 border-amber-500/40 bg-neutral-900 group">
              <img
                src="/adega-pro-logo.jpg"
                alt="ADEGA PRO - Gestão Completa para Adegas e Conveniências"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-amber-400/30 rounded-3xl pointer-events-none" />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-amber-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg border border-yellow-300 flex items-center gap-1">
              <Sparkles size={11} />
              <span>SISTEMA OFICIAL</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
            ADEGA <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">PRO</span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 font-bold tracking-widest uppercase mt-1 mb-6 text-amber-400/90">
            GESTÃO COMPLETA PARA ADEGAS E CONVENIÊNCIAS
          </p>

          {/* 4 Feature Pillars directly from the image */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full pt-2">
            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1.5">
                <ShoppingCart size={16} />
              </div>
              <span className="font-extrabold text-[11px] text-white uppercase tracking-wider">PDV</span>
              <span className="text-[9px] text-neutral-400 mt-0.5">Alta Velocidade</span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1.5">
                <Boxes size={16} />
              </div>
              <span className="font-extrabold text-[11px] text-white uppercase tracking-wider">ESTOQUE</span>
              <span className="text-[9px] text-neutral-400 mt-0.5">Combos &amp; Kardex</span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1.5">
                <TrendingUp size={16} />
              </div>
              <span className="font-extrabold text-[11px] text-white uppercase tracking-wider">FINANCEIRO</span>
              <span className="text-[9px] text-neutral-400 mt-0.5">DRE &amp; Fiado</span>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1.5">
                <FileText size={16} />
              </div>
              <span className="font-extrabold text-[11px] text-white uppercase tracking-wider">RELATÓRIOS</span>
              <span className="text-[9px] text-neutral-400 mt-0.5">Curva ABC &amp; DRE</span>
            </div>
          </div>
        </div>

        {/* Right Side: Fast Operator Selection & Security PIN Keypad */}
        <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800/90 rounded-3xl p-4 sm:p-7 shadow-2xl backdrop-blur-xl relative">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Lock size={18} className="text-amber-400" />
                <span>Autenticação de Operador</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Selecione seu perfil e digite seu PIN de 4 dígitos.
              </p>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          </div>

          {/* Operator Selector Carousel/Cards */}
          <div className="py-4">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
              Selecione o Operador
            </label>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
              {users.map(u => {
                const isSelected = selectedUser.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setPin('');
                      setErrorMsg(null);
                    }}
                    className={`p-2.5 rounded-2xl text-left transition-all border cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400/80 text-white shadow-md'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-neutral-950 font-black'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate leading-tight text-white">{u.name}</div>
                      <div className="text-[10px] text-amber-400 font-mono">{u.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Input Display */}
          <div className="py-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                PIN de Segurança (4 dígitos)
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Operador: {selectedUser.name.split(' ')[0]}
              </span>
            </div>

            <div className="h-12 bg-neutral-950 border border-neutral-700/80 rounded-2xl flex items-center justify-center gap-3 px-4 shadow-inner">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    idx < pin.length
                      ? 'bg-amber-400 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                      : 'bg-neutral-800 border border-neutral-700'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <div className="mt-2 text-xs text-rose-400 flex items-center justify-center gap-1 font-medium animate-in fade-in">
                <AlertCircle size={13} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Tactile Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="h-12 rounded-xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white font-mono text-lg font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                {num}
              </button>
            ))}

            <button
              onClick={handleClear}
              className="h-12 rounded-xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white font-mono text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              Limpar
            </button>

            <button
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white font-mono text-lg font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              0
            </button>

            <button
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Security notice */}
          <div className="mt-4 pt-3 border-t border-neutral-800 text-center">
            <span className="text-[10px] text-neutral-500 font-mono">
              Digite o PIN completo para autenticar. O sistema não exibe nem preenche PINs automaticamente.
            </span>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full px-3 sm:px-6 py-3 border-t border-neutral-900 bg-neutral-950/70 text-center text-[11px] text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-amber-500" />
          <span>ADEGA PRO · Terminal Homologado e Criptografado</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px]">
          <span>Frente de Loja · Versão 1.0.0</span>
          <span>·</span>
          <a href="https://atrstudio.com.br" target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">
            Desenvolvido por ATR Studio · atrstudio.com.br
          </a>
        </div>
      </footer>
    </div>
  );
};
