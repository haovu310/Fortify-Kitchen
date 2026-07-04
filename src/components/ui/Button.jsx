import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-500 hover:bg-brand-400 text-white',
  secondary: 'bg-stone-100 hover:bg-stone-200 text-stone-600',
  accent: 'border border-accent-300 text-accent-600 hover:bg-accent-50 bg-transparent',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-stone-100 text-stone-600',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'py-2.5 text-sm',
};

/**
 * Shared button primitive. Use instead of hand-rolled Tailwind button strings
 * so every button in the app is guaranteed the same styling + loading behavior.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`
        ${VARIANTS[variant] || VARIANTS.primary}
        ${SIZES[size] || SIZES.md}
        ${fullWidth ? 'w-full' : ''}
        rounded-xl font-medium cursor-pointer border-0 transition-smooth
        disabled:opacity-50 disabled:cursor-not-allowed
        inline-flex items-center justify-center gap-1.5
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
