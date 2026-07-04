export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="relative text-center py-12 bg-white rounded-3xl border border-stone-100 shadow-warm overflow-hidden">
      <svg className="absolute w-[300px] h-[300px] opacity-5 text-accent-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M45,-58.5C58.5,-49.8,69.6,-36.4,73.9,-21.2C78.2,-6,75.6,10.9,68.1,25.3C60.6,39.6,48.1,51.4,33.9,59.6C19.7,67.8,3.7,72.4,-12.6,71.3C-28.9,70.2,-45.5,63.4,-56.8,51.5C-68.1,39.6,-74.1,22.6,-75.3,5.1C-76.5,-12.4,-72.9,-30.4,-62.8,-43.8C-52.7,-57.2,-36.1,-66,-19.9,-70.4C-3.7,-74.8,12.1,-74.8,26.4,-70.4C40.7,-66,31.5,-67.2,45,-58.5Z" transform="translate(100 100)" />
      </svg>
      <div className="relative">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-stone-50 text-stone-300 flex items-center justify-center mx-auto mb-3">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <p className="text-stone-500 font-medium">{title}</p>
        {subtitle && <p className="text-stone-400 text-sm mt-1">{subtitle}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
