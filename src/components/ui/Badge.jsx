const TONES = {
  brand: 'bg-brand-100 text-brand-800',
  accent: 'bg-accent-100 text-accent-800',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  stone: 'bg-stone-100 text-stone-500',
};

export default function Badge({ tone = 'stone', className = '', children, ...props }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${TONES[tone] || TONES.stone} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
