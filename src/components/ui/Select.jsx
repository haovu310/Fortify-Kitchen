export default function Select({ label, error, className = '', required = false, id, children, ...props }) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-stone-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 transition-smooth
          ${error
            ? 'border-red-300 focus:ring-red-500/40 focus:border-red-500'
            : 'border-stone-200 focus:ring-brand-500/40 focus:border-brand-500'
          }
          ${className}`}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
