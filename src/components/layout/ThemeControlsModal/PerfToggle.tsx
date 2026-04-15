// ── Toggle switch ──────────────────────────────────────────────────────────────
export function PerfToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3.5 border-b border-white/5 last:border-0 text-left"
    >
      <div className="flex flex-col gap-0.5 pr-4">
        <span className={`text-sm font-medium transition-colors ${checked ? 'text-white' : 'text-white/65'}`}>
          {label}
        </span>
        {description && (
          <span className="text-white/30 text-xs leading-relaxed">{description}</span>
        )}
      </div>
      <div
        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
          checked ? 'bg-blue-500' : 'bg-white/15'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}
