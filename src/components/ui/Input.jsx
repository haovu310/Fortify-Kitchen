/**
 * Shared text/number/date/etc input. Wraps a <label> + <input> + optional
 * inline error message so every form field looks and behaves the same way.
 */
export default function Input({ label, error, className = '', required = false, id, ...props }) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-stone-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 transition-smooth
          ${error
            ? 'border-red-300 focus:ring-red-500/40 focus:border-red-500'
            : 'border-stone-200 focus:ring-brand-500/40 focus:border-brand-500'
          }
          ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
