import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getIconNames, resolveIcon } from '@/lib/lucide-icon-map';

/**
 * Icon picker with visual preview grid.
 * Shows a searchable grid of Lucide icons with live preview.
 */
export function IconPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allNames = useMemo(() => getIconNames(), []);

  const filtered = useMemo(() => {
    if (!search) return allNames.slice(0, 120);
    const q = search.toLowerCase();
    return allNames.filter(n => n.toLowerCase().includes(q)).slice(0, 120);
  }, [allNames, search]);

  const SelectedIcon = resolveIcon(value);

  return (
    <div className='relative' ref={containerRef}>
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors'
        onClick={() => setOpen(!open)}
      >
        {SelectedIcon ? (
          <SelectedIcon size={16} className='text-white/70 shrink-0' />
        ) : (
          <div className='w-4 h-4 rounded bg-white/10 shrink-0' />
        )}
        <span className={`text-sm flex-1 truncate ${value ? 'text-white/80' : 'text-white/30'}`}>
          {value || 'Choisir une icône...'}
        </span>
        {open ? <ChevronUp size={14} className='text-white/30' /> : <ChevronDown size={14} className='text-white/30' />}
      </div>

      {open && (
        <div
          className='absolute z-50 mt-1 w-full rounded-xl border border-white/12 shadow-2xl overflow-hidden'
          style={{ background: 'rgba(12, 16, 40, 0.98)', backdropFilter: 'blur(20px)' }}
        >
          {/* Search */}
          <div className='sticky top-0 p-2 border-b border-white/8' style={{ background: 'rgba(12, 16, 40, 0.98)' }}>
            <div className='flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5'>
              <Search size={13} className='text-white/30' />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='bg-transparent text-sm text-white/80 outline-none flex-1 placeholder:text-white/20'
                placeholder='Rechercher icône...'
              />
            </div>
            <div className='text-[10px] text-white/25 mt-1 px-1'>{filtered.length} icônes</div>
          </div>

          {/* Icon grid */}
          <div className='overflow-y-auto p-2' style={{ maxHeight: 240 }}>
            <div className='grid grid-cols-6 gap-1'>
              {filtered.map(name => {
                const Ico = resolveIcon(name);
                if (!Ico) return null;
                const isActive = name === value;
                return (
                  <button
                    key={name}
                    title={name}
                    onClick={() => { onChange(name); setOpen(false); setSearch(''); }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                        : 'hover:bg-white/8 text-white/50 hover:text-white/80 border border-transparent'
                    }`}
                  >
                    <Ico size={20} />
                    <span className='text-[8px] mt-1 truncate w-full text-center leading-tight'>
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
            {filtered.length === 0 && (
              <p className='text-center text-white/25 text-xs py-4'>Aucune icône trouvée</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gradient / Color Picker ──────────────────────────────────────────────────

/** Pre-defined gradient palette used in the dashboard */
const GRADIENT_PRESETS: { label: string; value: string; from: string; to: string }[] = [
  { label: 'Rouge → Orange', value: 'from-red-500 to-orange-400', from: '#ef4444', to: '#fb923c' },
  { label: 'Rose → Pink', value: 'from-pink-500 to-rose-400', from: '#ec4899', to: '#fb7185' },
  { label: 'Orange → Amber', value: 'from-orange-500 to-amber-400', from: '#f97316', to: '#fbbf24' },
  { label: 'Jaune → Amber', value: 'from-yellow-500 to-amber-400', from: '#eab308', to: '#fbbf24' },
  { label: 'Lime → Vert', value: 'from-lime-500 to-green-400', from: '#84cc16', to: '#4ade80' },
  { label: 'Vert → Émeraude', value: 'from-green-500 to-emerald-400', from: '#22c55e', to: '#34d399' },
  { label: 'Émeraude → Teal', value: 'from-emerald-500 to-teal-400', from: '#10b981', to: '#2dd4bf' },
  { label: 'Teal → Cyan', value: 'from-teal-500 to-cyan-400', from: '#14b8a6', to: '#22d3ee' },
  { label: 'Cyan → Bleu clair', value: 'from-cyan-500 to-sky-400', from: '#06b6d4', to: '#38bdf8' },
  { label: 'Bleu → Cyan', value: 'from-blue-500 to-cyan-400', from: '#3b82f6', to: '#22d3ee' },
  { label: 'Bleu ciel → Bleu', value: 'from-sky-500 to-blue-400', from: '#0ea5e9', to: '#60a5fa' },
  { label: 'Indigo → Bleu', value: 'from-indigo-500 to-blue-400', from: '#6366f1', to: '#60a5fa' },
  { label: 'Violet → Indigo', value: 'from-violet-500 to-indigo-400', from: '#8b5cf6', to: '#818cf8' },
  { label: 'Purple → Violet', value: 'from-purple-500 to-violet-400', from: '#a855f7', to: '#a78bfa' },
  { label: 'Fuchsia → Pink', value: 'from-fuchsia-500 to-pink-400', from: '#d946ef', to: '#f472b6' },
  { label: 'Slate → Gris', value: 'from-slate-500 to-gray-400', from: '#64748b', to: '#9ca3af' },
];

export function GradientPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = GRADIENT_PRESETS.find(g => g.value === value);

  return (
    <div className='relative' ref={containerRef}>
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors'
        onClick={() => setOpen(!open)}
      >
        {/* Preview swatch */}
        <div
          className='w-5 h-5 rounded-md shrink-0'
          style={{
            background: current
              ? `linear-gradient(135deg, ${current.from}, ${current.to})`
              : value
                ? 'linear-gradient(135deg, #6366f1, #60a5fa)'
                : 'rgba(255,255,255,0.1)',
          }}
        />
        <span className={`text-sm flex-1 truncate ${value ? 'text-white/80' : 'text-white/30'}`}>
          {current?.label ?? (value || 'Choisir un dégradé...')}
        </span>
        {open ? <ChevronUp size={14} className='text-white/30' /> : <ChevronDown size={14} className='text-white/30' />}
      </div>

      {open && (
        <div
          className='absolute z-50 mt-1 w-full rounded-xl border border-white/12 shadow-2xl overflow-hidden'
          style={{ background: 'rgba(12, 16, 40, 0.98)', backdropFilter: 'blur(20px)' }}
        >
          <div className='overflow-y-auto p-2' style={{ maxHeight: 280 }}>
            <div className='grid grid-cols-2 gap-1.5'>
              {GRADIENT_PRESETS.map(preset => {
                const isActive = preset.value === value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => { onChange(preset.value); setOpen(false); }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left ${
                      isActive
                        ? 'bg-blue-500/15 border border-blue-500/40'
                        : 'hover:bg-white/6 border border-transparent'
                    }`}
                  >
                    <div
                      className='w-8 h-8 rounded-lg shrink-0'
                      style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                    />
                    <span className={`text-xs leading-tight ${isActive ? 'text-blue-300' : 'text-white/60'}`}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom input */}
          <div className='border-t border-white/8 p-2'>
            <label className='text-[10px] text-white/30 mb-1 block'>Personnalisé (classes Tailwind)</label>
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              className='w-full px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-white/70 outline-none focus:border-blue-500/50'
              placeholder='from-xxx-500 to-yyy-400'
            />
          </div>
        </div>
      )}
    </div>
  );
}
