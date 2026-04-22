import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, ChevronUp, Upload, Trash2 } from 'lucide-react';
import { getIconNames, resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';

interface UploadedIcon {
  filename: string;
  originalName: string;
  mimeType: string;
  url: string;
}

/**
 * Icon picker with visual preview grid.
 * Supports both Lucide icons and custom uploaded icons (PNG, WebP, SVG).
 * Custom icons are stored as "custom:/uploads/icons/{filename}" in config values.
 */
export function IconPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'lucide' | 'custom'>(() => (isCustomIcon(value) ? 'custom' : 'lucide'));
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const [customIcons, setCustomIcons] = useState<UploadedIcon[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(v => !v);
  };

  // Fetch custom icons when opening on the custom tab
  const fetchCustomIcons = useCallback(async () => {
    try {
      const res = await fetch('/api/uploads/icons');
      if (res.ok) setCustomIcons(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (open && tab === 'custom') fetchCustomIcons();
  }, [open, tab, fetchCustomIcons]);

  // Upload handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('icon', file);
      const res = await fetch('/api/uploads/icons', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload');
      onChange(`custom:${json.url}`);
      await fetchCustomIcons();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Delete handler
  async function handleDeleteIcon(filename: string) {
    try {
      await fetch(`/api/uploads/icons/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      setCustomIcons(prev => prev.filter(i => i.filename !== filename));
      if (value === `custom:/uploads/icons/${filename}`) onChange('');
    } catch {
      /* ignore */
    }
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on scroll outside dropdown, or resize
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const allNames = useMemo(() => getIconNames(), []);

  const filtered = useMemo(() => {
    if (!search) return allNames.slice(0, 120);
    const q = search.toLowerCase();
    return allNames.filter(n => n.toLowerCase().includes(q)).slice(0, 120);
  }, [allNames, search]);

  const SelectedIcon = resolveIcon(value);
  const isCustom = isCustomIcon(value);

  return (
    <div ref={triggerRef}>
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors'
        onClick={handleToggle}
      >
        {SelectedIcon ? (
          <SelectedIcon size={16} className='text-white/70 shrink-0' />
        ) : isCustom ? (
          <img src={getCustomIconUrl(value)} alt='' className='w-4 h-4 object-contain shrink-0' />
        ) : (
          <div className='w-4 h-4 rounded bg-white/10 shrink-0' />
        )}
        <span className={`text-sm flex-1 truncate ${value ? 'text-white/80' : 'text-white/30'}`}>
          {isCustom ? 'Icône custom' : value || 'Choisir une icône...'}
        </span>
        {open ? <ChevronUp size={14} className='text-white/30' /> : <ChevronDown size={14} className='text-white/30' />}
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropPos.top,
              left: dropPos.left,
              width: Math.max(dropPos.width, 320),
              zIndex: 9999,
              background: 'rgba(12, 16, 40, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Tabs: Lucide | Custom */}
            <div className='flex border-b border-white/8'>
              <button
                onClick={() => setTab('lucide')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === 'lucide' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/60'
                }`}
              >
                Lucide
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === 'custom' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/60'
                }`}
              >
                Custom
              </button>
            </div>

            {tab === 'lucide' && (
              <>
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
                          onClick={() => {
                            onChange(name);
                            setOpen(false);
                            setSearch('');
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                              : 'hover:bg-white/8 text-white/50 hover:text-white/80 border border-transparent'
                          }`}
                        >
                          <Ico size={20} />
                          <span className='text-[8px] mt-1 truncate w-full text-center leading-tight'>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {filtered.length === 0 && <p className='text-center text-white/25 text-xs py-4'>Aucune icône trouvée</p>}
                </div>
              </>
            )}

            {tab === 'custom' && (
              <div className='p-2 space-y-2'>
                {/* Upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className='flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-medium bg-white/5 border border-dashed border-white/20 text-white/50 hover:bg-white/10 hover:text-white/70 hover:border-white/30 transition-all disabled:opacity-40'
                >
                  <Upload size={13} />
                  {uploading ? 'Envoi en cours…' : 'Uploader une icône'}
                </button>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/png,image/webp,image/svg+xml'
                  onChange={handleFileUpload}
                  className='hidden'
                />
                {uploadError && <p className='text-red-400 text-[10px] px-1'>{uploadError}</p>}
                <p className='text-white/25 text-[10px] px-1'>PNG · WebP · SVG — max 2 Mo (redimensionné à 128×128)</p>

                {/* Custom icons grid */}
                <div className='overflow-y-auto' style={{ maxHeight: 200 }}>
                  <div className='grid grid-cols-5 gap-1'>
                    {customIcons.map(icon => {
                      const iconValue = `custom:${icon.url}`;
                      const isActive = value === iconValue;
                      return (
                        <div key={icon.filename} className='relative group'>
                          <button
                            title={icon.originalName}
                            onClick={() => {
                              onChange(iconValue);
                              setOpen(false);
                            }}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors w-full ${
                              isActive ? 'bg-blue-500/20 border border-blue-500/40' : 'hover:bg-white/8 border border-transparent'
                            }`}
                          >
                            <img src={icon.url} alt={icon.originalName} className='w-6 h-6 object-contain' />
                            <span className='text-[7px] mt-1 truncate w-full text-center text-white/40 leading-tight'>
                              {icon.originalName.replace(/\.[^.]+$/, '')}
                            </span>
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteIcon(icon.filename);
                            }}
                            className='absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity'
                            title='Supprimer'
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {customIcons.length === 0 && <p className='text-center text-white/25 text-xs py-4'>Aucune icône custom</p>}
                </div>
              </div>
            )}
          </div>,
          document.body
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

export function GradientPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
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
                    onClick={() => {
                      onChange(preset.value);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left ${
                      isActive ? 'bg-blue-500/15 border border-blue-500/40' : 'hover:bg-white/6 border border-transparent'
                    }`}
                  >
                    <div
                      className='w-8 h-8 rounded-lg shrink-0'
                      style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                    />
                    <span className={`text-xs leading-tight ${isActive ? 'text-blue-300' : 'text-white/60'}`}>{preset.label}</span>
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
