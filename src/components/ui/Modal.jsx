import { useEffect, useRef } from 'react';

/**
 * Shared modal shell: backdrop click / Escape to close, focus trap while open,
 * aria-modal for screen readers. Use for every create/edit dialog in the app.
 */
export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md', align = 'center' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;

    const focusable = () => panelRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    // Focus the first focusable element in the panel on open.
    const first = focusable()?.[0];
    first?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const nodes = Array.from(focusable() || []);
        if (nodes.length === 0) return;
        const firstEl = nodes[0];
        const lastEl = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 z-50 flex ${align === 'top' ? 'items-start pt-8' : 'items-center'} justify-center p-4 overflow-y-auto animate-fade-in`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-2xl shadow-warm-lg w-full ${maxWidth} p-6 animate-fade-in mb-8`}
      >
        {title && <h2 className="text-lg font-bold text-stone-800 mb-4 font-display">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
