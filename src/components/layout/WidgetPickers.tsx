import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, ChevronUp, Upload, Trash2 } from 'lucide-react';
import { resolveIcon, isCustomIcon, getCustomIconUrl, useIconNames } from '@/lib/lucide-icon-map';
import { GRADIENT_PRESETS, gradientCss, gradientColors, customGradient, isCustomGradient } from '@/lib/gradient';
import { apiFetch, assetUrl } from '@/lib/api-base';
import { useI18n } from '@/i18n';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';

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
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'lucide' | 'custom'>(() => (isCustomIcon(value) ? 'custom' : 'lucide'));

  const [customIcons, setCustomIcons] = useState<UploadedIcon[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    open,
    setOpen,
    toggle: handleToggle,
    triggerRef,
    dropRef: dropdownRef,
    dropStyle,
  } = useDropdownPortal<HTMLDivElement>({ minWidth: 320 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch custom icons when opening on the custom tab
  const fetchCustomIcons = useCallback(async () => {
    try {
      const res = await apiFetch('/api/uploads/icons');
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
      const res = await apiFetch('/api/uploads/icons', { method: 'POST', body: formData });
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
      await apiFetch(`/api/uploads/icons/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      setCustomIcons(prev => prev.filter(i => i.filename !== filename));
      if (value === `custom:/uploads/icons/${filename}`) onChange('');
    } catch {
      /* ignore */
    }
  }

  // Le catalogue complet arrive de façon asynchrone ; ce hook le demande et
  // re-rend à son arrivée. Auparavant le sélecteur lisait la liste une fois au
  // montage et n'affichait donc jamais que les 49 icônes du noyau.
  const allNames = useIconNames();

  const filtered = useMemo(() => {
    if (!search) return allNames;
    const q = search.toLowerCase();
    return allNames.filter(n => n.toLowerCase().includes(q));
  }, [allNames, search]);

  // Virtual scroll state for icon grid
  const COLS = 6;
  const ROW_H = 60; // px per row
  const GRID_H = 240; // visible viewport height
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const rows = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < filtered.length; i += COLS) {
      result.push(filtered.slice(i, i + COLS));
    }
    return result;
  }, [filtered]);

  const totalH = rows.length * ROW_H;
  const firstVisible = Math.max(0, Math.floor(scrollTop / ROW_H) - 1);
  const lastVisible = Math.min(rows.length - 1, Math.ceil((scrollTop + GRID_H) / ROW_H) + 1);
  const visibleRows = rows.slice(firstVisible, lastVisible + 1);

  const SelectedIcon = resolveIcon(value);
  const isCustom = isCustomIcon(value);

  return (
    <div ref={triggerRef}>
      <label className='text-[11px] text-[var(--ds-ink-muted)] mb-1 block'>{label}</label>
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] cursor-pointer transition-colors'
        onClick={handleToggle}
      >
        {SelectedIcon ? (
          // eslint-disable-next-line react-hooks/static-components
          <SelectedIcon size={16} className='text-[var(--ds-ink)] shrink-0' />
        ) : isCustom ? (
          <img src={getCustomIconUrl(value)} alt='' className='w-4 h-4 object-contain shrink-0' />
        ) : (
          <div className='w-4 h-4 rounded bg-[var(--ds-surface-3)] shrink-0' />
        )}
        <span className={`text-sm flex-1 truncate ${value ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]'}`}>
          {isCustom ? t('layout.iconCustom') : value || t('layout.iconChoose')}
        </span>
        {open ? (
          <ChevronUp size={14} className='text-[var(--ds-ink-muted)]' />
        ) : (
          <ChevronDown size={14} className='text-[var(--ds-ink-muted)]' />
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              ...dropStyle,
              zIndex: 9999,
              background: 'var(--ds-surface-1)',
              borderRadius: 12,
              border: '1px solid var(--ds-surface-3)',
              boxShadow: 'var(--ds-shadow-sheet)',
              overflow: 'hidden',
            }}
          >
            {/* Tabs: Lucide | Custom */}
            <div className='flex border-b border-[var(--ds-surface-3)]'>
              <button
                onClick={() => setTab('lucide')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === 'lucide' ? 'text-[var(--ds-accent)] border-b-2 border-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]'
                }`}
              >
                {t('layout.tabLucide')}
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === 'custom' ? 'text-[var(--ds-accent)] border-b-2 border-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]'
                }`}
              >
                {t('layout.tabCustom')}
              </button>
            </div>

            {tab === 'lucide' && (
              <>
                {/* Search */}
                <div className='sticky top-0 p-2 border-b border-[var(--ds-surface-3)]' style={{ background: 'var(--ds-surface-1)' }}>
                  <div className='flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--ds-surface-2)]'>
                    <Search size={13} className='text-[var(--ds-ink-muted)]' />
                    <input
                      autoFocus
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className='bg-transparent text-sm text-[var(--ds-ink)] outline-none flex-1 placeholder:text-[var(--ds-ink-muted)]'
                      placeholder={t('layout.iconSearch')}
                    />
                  </div>
                  <div className='text-[10px] text-[var(--ds-ink-muted)] mt-1 px-1'>
                    {t('layout.iconCount', { count: filtered.length })}
                  </div>
                </div>

                {/* Icon grid — virtualized */}
                <div
                  ref={scrollRef}
                  className='overflow-y-auto p-2'
                  style={{ maxHeight: GRID_H }}
                  onScroll={e => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
                >
                  {filtered.length === 0 ? (
                    <p className='text-center text-[var(--ds-ink-muted)] text-xs py-4'>{t('layout.noIconFound')}</p>
                  ) : (
                    <div style={{ height: totalH, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: firstVisible * ROW_H, left: 0, right: 0 }}>
                        {visibleRows.map((row, ri) => (
                          <div key={firstVisible + ri} className='grid grid-cols-6 gap-1' style={{ height: ROW_H }}>
                            {row.map(name => {
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
                                  className={`flex flex-col items-center justify-center p-2 rounded-[var(--ds-radius-sm)] transition-colors ${
                                    isActive
                                      ? 'bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                                      : 'text-[var(--ds-ink-muted)] border border-transparent'
                                  }`}
                                >
                                  <Ico size={20} />
                                  <span className='text-[8px] mt-1 truncate w-full text-center leading-tight'>{name}</span>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'custom' && (
              <div className='p-2 space-y-2'>
                {/* Upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className='flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-[var(--ds-radius-sm)] text-xs font-medium bg-[var(--ds-surface-2)] border border-dashed border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] transition-all disabled:opacity-40'
                >
                  <Upload size={13} />
                  {uploading ? t('layout.iconUploading') : t('layout.uploadIcon')}
                </button>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/png,image/webp,image/svg+xml'
                  onChange={handleFileUpload}
                  className='hidden'
                />
                {uploadError && <p className='text-[var(--ds-alert)] text-[10px] px-1'>{uploadError}</p>}
                <p className='text-[var(--ds-ink-muted)] text-[10px] px-1'>PNG · WebP · SVG — max 2 Mo (redimensionné à 128×128)</p>

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
                            className={`flex flex-col items-center justify-center p-2 rounded-[var(--ds-radius-sm)] transition-colors w-full ${
                              isActive
                                ? 'bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                                : 'border border-transparent'
                            }`}
                          >
                            <img src={assetUrl(icon.url)} alt={icon.originalName} className='w-6 h-6 object-contain' />
                            <span className='text-[7px] mt-1 truncate w-full text-center text-[var(--ds-ink-muted)] leading-tight'>
                              {icon.originalName.replace(/\.[^.]+$/, '')}
                            </span>
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteIcon(icon.filename);
                            }}
                            className='absolute -top-1 -right-1 p-0.5 rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-alert)] opacity-0 group-hover:opacity-100 transition-opacity'
                            title='Supprimer'
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {customIcons.length === 0 && (
                    <p className='text-center text-[var(--ds-ink-muted)] text-xs py-4'>{t('layout.noCustomIcon')}</p>
                  )}
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
  // Les deux sélecteurs de couleur partent du dégradé courant : on règle celui
  // qu'on a sous les yeux plutôt que de repartir d'un noir arbitraire.
  const custom = gradientColors(value) ?? { from: '#6366f1', to: '#60a5fa' };

  return (
    <div className='relative' ref={containerRef}>
      <label className='text-[11px] text-[var(--ds-ink-muted)] mb-1 block'>{label}</label>
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] cursor-pointer transition-colors'
        onClick={() => setOpen(!open)}
      >
        {/* Preview swatch */}
        <div className='w-5 h-5 rounded-md shrink-0' style={{ background: gradientCss(value) ?? 'var(--ds-surface-3)' }} />
        <span className={`text-sm flex-1 truncate ${value ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]'}`}>
          {current?.label ?? (isCustomGradient(value) ? 'Sur mesure' : value || 'Choisir un dégradé...')}
        </span>
        {open ? (
          <ChevronUp size={14} className='text-[var(--ds-ink-muted)]' />
        ) : (
          <ChevronDown size={14} className='text-[var(--ds-ink-muted)]' />
        )}
      </div>

      {open && (
        <div
          className='absolute z-50 mt-1 w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-surface-3)] shadow-[var(--ds-shadow-sheet)] overflow-hidden'
          style={{ background: 'var(--ds-surface-1)' }}
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
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-[var(--ds-radius-sm)] transition-colors text-left ${
                      isActive
                        ? 'bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                        : 'border border-transparent'
                    }`}
                  >
                    <div
                      className='w-8 h-8 rounded-[var(--ds-radius-sm)] shrink-0'
                      style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                    />
                    <span className={`text-xs leading-tight ${isActive ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]'}`}>
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sur mesure — deux sélecteurs de couleur natifs plutôt qu'un champ de
              classes Tailwind : ces classes-là n'étaient jamais générées, et le
              dégradé saisi ne peignait rien. */}
          <div className='border-t border-[var(--ds-surface-3)] p-2'>
            <label className='text-[10px] text-[var(--ds-ink-muted)] mb-1.5 block'>Sur mesure</label>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                aria-label='Couleur de départ'
                value={custom.from}
                onChange={e => onChange(customGradient(e.target.value, custom.to))}
                className='w-8 h-8 rounded-md bg-transparent border border-[var(--ds-surface-3)] cursor-pointer'
              />
              <div className='flex-1 h-8 rounded-md' style={{ background: `linear-gradient(135deg, ${custom.from}, ${custom.to})` }} />
              <input
                type='color'
                aria-label="Couleur d'arrivée"
                value={custom.to}
                onChange={e => onChange(customGradient(custom.from, e.target.value))}
                className='w-8 h-8 rounded-md bg-transparent border border-[var(--ds-surface-3)] cursor-pointer'
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
