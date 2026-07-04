import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: opts.title || 'Xác nhận',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Xác nhận',
        cancelLabel: opts.cancelLabel || 'Hủy',
        danger: opts.danger || false,
      });
    });
  }, []);

  const handleResolve = (value) => {
    setDialog(null);
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) handleResolve(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-800 mb-2">{dialog.title}</h2>
            <p className="text-sm text-slate-600 mb-5">{dialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleResolve(true)}
                className={`flex-1 py-2 text-white font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm ${
                  dialog.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'
                }`}
              >
                {dialog.confirmLabel}
              </button>
              <button
                onClick={() => handleResolve(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl transition-smooth cursor-pointer border-0 text-sm"
              >
                {dialog.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
