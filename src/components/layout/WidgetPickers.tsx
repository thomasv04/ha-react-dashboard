import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, ChevronUp, Upload, Trash2 } from 'lucide-react';
import { resolveIcon, isCustomIcon, getCustomIconUrl, useIconNames } from '@/lib/lucide-icon-map';
import { GRADIENT_PRESETS, gradientCss, gradientColors, customGradient, isCustomGradient } from '@/lib/gradient';
import { apiFetch, assetUrl } from '@/lib/api-base';
import { useI18n } from '@/i18n';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';
import { cn } from '@/lib/utils';

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
      {/* Même gabarit que le sélecteur d'entité : les deux se côtoient dans les formulaires. */}
      {label && <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{label}</label>}
      <div
        className='flex h-12 cursor-pointer items-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 transition-colors'
        onClick={handleToggle}
      >
        {SelectedIcon ? (
          // eslint-disable-next-line react-hooks/static-components
          <SelectedIcon size={18} className='text-[var(--ds-ink)] shrink-0' />
        ) : isCustom ? (
          <img src={getCustomIconUrl(value)} alt='' className='size-[18px] object-contain shrink-0' />
        ) : (
          <div className='size-[18px] rounded bg-[var(--ds-surface-2)] shrink-0' />
        )}
        <span className={`text-base flex-1 truncate ${value ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]'}`}>
          {isCustom ? t('layout.iconCustom') : value || t('layout.iconChoose')}
        </span>
        {open ? (
          <ChevronUp size={18} className='text-[var(--ds-ink-muted)]' />
        ) : (
          <ChevronDown size={18} className='text-[var(--ds-ink-muted)]' />
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
                  <div className='text-xs text-[var(--ds-ink-muted)] mt-1 px-1'>{t('layout.iconCount', { count: filtered.length })}</div>
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
                {uploadError && <p className='text-[var(--ds-alert)] text-xs px-1'>{uploadError}</p>}
                <p className='text-[var(--ds-ink-muted)] text-xs px-1'>PNG · WebP · SVG — max 2 Mo (redimensionné à 128×128)</p>

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

/**
 * Dégradé d'une card : une grille de pastilles, comme les couleurs d'une
 * lumière sur l'Echo, et deux couleurs au choix pour un dégradé sur mesure.
 */
export function GradientPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { t } = useI18n();
  // Portail : dans la fiche d'édition, le menu était rogné par son défilement.
  const { open, toggle, close, triggerRef, dropRef, dropStyle } = useDropdownPortal<HTMLButtonElement>({ minWidth: 300 });

  const presetIndex = GRADIENT_PRESETS.findIndex(g => g.value === value);
  // Les deux sélecteurs de couleur partent du dégradé courant : on règle celui
  // qu'on a sous les yeux plutôt que de repartir d'un noir arbitraire.
  const custom = gradientColors(value) ?? { from: '#6366f1', to: '#60a5fa' };
  const currentLabel =
    presetIndex >= 0
      ? t('layout.gradientPreset', { n: presetIndex + 1 })
      : isCustomGradient(value)
        ? t('layout.gradientCustom')
        : value || t('layout.gradientChoose');

  return (
    <div>
      {label && <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{label}</label>}
      <button
        ref={triggerRef}
        type='button'
        onClick={toggle}
        aria-expanded={open}
        className='flex h-12 w-full items-center gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] pl-2.5 pr-4 text-left'
      >
        <span
          className='size-7 shrink-0 rounded-[var(--ds-radius-sm)]'
          style={{ background: gradientCss(value) ?? 'var(--ds-surface-2)' }}
        />
        <span className={cn('flex-1 truncate text-base', value ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]')}>
          {currentLabel}
        </span>
        {open ? (
          <ChevronUp size={18} className='text-[var(--ds-ink-muted)]' />
        ) : (
          <ChevronDown size={18} className='text-[var(--ds-ink-muted)]' />
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={dropRef}
            className='fixed rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-1)] p-3 text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]'
            style={{ ...dropStyle, zIndex: 9999 }}
          >
            <div className='grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2'>
              {GRADIENT_PRESETS.map((preset, i) => {
                const isActive = preset.value === value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => {
                      onChange(preset.value);
                      close();
                    }}
                    aria-label={t('layout.gradientPreset', { n: i + 1 })}
                    aria-pressed={isActive}
                    className={cn(
                      'aspect-square min-h-11 rounded-[var(--ds-radius-sm)]',
                      isActive && 'ring-2 ring-[var(--ds-ink)] ring-offset-2 ring-offset-[var(--ds-surface-1)]'
                    )}
                    style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                  />
                );
              })}
            </div>

            {/* Sur mesure — deux sélecteurs de couleur natifs plutôt qu'un champ de
              classes Tailwind : ces classes-là n'étaient jamais générées, et le
              dégradé saisi ne peignait rien. */}
            <p className='mb-2 mt-4 text-sm font-semibold text-[var(--ds-ink-muted)]'>{t('layout.gradientCustom')}</p>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                aria-label={t('layout.gradientFrom')}
                value={custom.from}
                onChange={e => onChange(customGradient(e.target.value, custom.to))}
                className='size-11 shrink-0 cursor-pointer rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] p-1'
              />
              <div
                className='h-11 flex-1 rounded-[var(--ds-radius-sm)]'
                style={{ background: `linear-gradient(135deg, ${custom.from}, ${custom.to})` }}
              />
              <input
                type='color'
                aria-label={t('layout.gradientTo')}
                value={custom.to}
                onChange={e => onChange(customGradient(custom.from, e.target.value))}
                className='size-11 shrink-0 cursor-pointer rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] p-1'
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
