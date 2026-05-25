'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' };
const COLORS: Record<ToastType, string> = {
  success: 'bg-stamp-green/15 border-stamp-green/30 text-stamp-green',
  error: 'bg-stamp-red/15 border-stamp-red/30 text-stamp-red',
  info: 'bg-teal/15 border-teal/30 text-teal',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 ${COLORS[toast.type]} ${
        toast.exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0 animate-[slideIn_0.3s_ease-out]'
      }`}
    >
      <span className="text-base font-bold">{ICONS[toast.type]}</span>
      <span className="text-[13px] text-text font-medium">{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 text-text-muted hover:text-text cursor-pointer bg-transparent border-none text-sm">×</button>
    </div>
  );
}
