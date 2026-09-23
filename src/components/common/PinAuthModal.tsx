import React, { useState } from 'react';
import { db } from '../../services/db';
import { User } from '../../types';
import { ShieldCheck, Delete, X, AlertCircle } from 'lucide-react';

interface PinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  title?: string;
  description?: string;
  requiredRole?: string;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Autenticação Rápida por PIN',
  description = 'Digite o seu PIN de 4 dígitos para continuar',
  requiredRole
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError(null);
      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const verifyPin = (candidatePin: string) => {
    const user = db.authenticateByPin(candidatePin);
    if (!user) {
      setError('PIN incorreto. Tente novamente.');
      setPin('');
      return;
    }

    if (requiredRole && user.role !== 'ADMINISTRADOR' && user.role !== requiredRole) {
      setError(`Acesso negado. Requer perfil de ${requiredRole} ou Administrador.`);
      setPin('');
      return;
    }

    db.setCurrentUserId(user.id);
    db.addAuditLog('LOGIN_PIN', 'User', user.id, `Login rápido via PIN realizado por ${user.name}`);
    setPin('');
    setError(null);
    onSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/30 bg-neutral-900 mx-auto mb-3 shadow-md">
          <img
            src="/adega-pro-icon.jpg"
            alt="ADEGA PRO"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-xs text-neutral-400 mb-6">{description}</p>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? 'bg-amber-400 border-amber-400 scale-110'
                  : 'border-neutral-700 bg-neutral-800'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg mb-4 text-left">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="h-14 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 active:bg-amber-500 active:text-neutral-950 text-white font-mono text-xl font-bold transition-all border border-neutral-700/40"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-xl bg-neutral-800/40 hover:bg-neutral-800 text-neutral-400 font-semibold text-xs transition-colors border border-neutral-800"
          >
            Limpar
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 active:bg-amber-500 active:text-neutral-950 text-white font-mono text-xl font-bold transition-all border border-neutral-700/40"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-xl bg-neutral-800/40 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors border border-neutral-800"
          >
            <Delete size={20} />
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-800/80">
          PINs Padrão: <span className="font-mono text-amber-300">9999</span> (Admin) · <span className="font-mono text-amber-300">1234</span> (Caixa)
        </div>
      </div>
    </div>
  );
};
