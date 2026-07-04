import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

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
      <Modal open={!!dialog} onClose={() => handleResolve(false)} title={dialog?.title} maxWidth="max-w-sm">
        {dialog && (
          <>
            <p className="text-sm text-stone-600 mb-5">{dialog.message}</p>
            <div className="flex gap-2">
              <Button
                variant={dialog.danger ? 'danger' : 'primary'}
                fullWidth
                onClick={() => handleResolve(true)}
              >
                {dialog.confirmLabel}
              </Button>
              <Button variant="secondary" onClick={() => handleResolve(false)}>
                {dialog.cancelLabel}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
}
