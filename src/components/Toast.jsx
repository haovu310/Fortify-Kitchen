import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

const VARIANT_STYLES = {
  success: {
    icon: '✓',
    bar: 'bg-green-500',
    iconWrap: 'bg-green-100 text-green-600',
  },
  error: {
    icon: '✕',
    bar: 'bg-red-500',
    iconWrap: 'bg-red-100 text-red-600',
  },
  info: {
    icon: 'ℹ',
    bar: 'bg-brand-500',
    iconWrap: 'bg-brand-100 text-brand-600',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message, variant = 'info', duration = 3500) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, variant }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const toast = {
    success: (message, duration) => push(message, 'success', duration),
    error: (message, duration) => push(message, 'error', duration),
    info: (message, duration) => push(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map(t => {
          const style = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto bg-white rounded-xl shadow-warm-lg border border-stone-100 overflow-hidden animate-fade-in flex items-stretch"
            >
              <div className={`w-1.5 ${style.bar}`} />
              <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${style.iconWrap}`}>
                  {style.icon}
                </span>
                <p className="text-sm text-stone-700 flex-1 min-w-0 break-words">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-stone-300 hover:text-stone-500 cursor-pointer bg-transparent border-0 text-sm shrink-0"
                  aria-label="Đóng thông báo"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
