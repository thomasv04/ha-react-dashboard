import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';
import { ChevronDown, ChevronUp, Search, X, Plus } from 'lucide-react';
import { useAreas } from '@hakit/core';
import { useI18n } from '@/i18n';
import { useArea, areaDomains, isEntityToken } from '@/hooks/useAreaControls';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { INPUT, LABEL } from './ui';

/**
 * Choix d'une zone Home Assistant et des commandes qu'elle apporte : un domaine
 * entier (« Lumières ») ou une entité précise, comme la card « zone » native.
 *
 * Les deux vivent dans la même liste de jetons — un point dans le jeton veut
 * dire « entité ».
 */
export function AreaControlsField({
  area,
  controls,
  onChange,
  label,
}: {
  area: string;
  controls: string[];
  onChange: (next: { area: string; controls: string[] }) => void;
  label: string;
}) {
  const { t } = useI18n();
  const areas = useAreas();
  const selectedArea = useArea(area);
  const [search, setSearch] = useState('');
  const {
    open,
    setOpen,
    toggle: handleToggle,
    triggerRef,
    dropRef: dropdownRef,
    dropStyle,
  } = useDropdownPortal<HTMLButtonElement>({ minWidth: 280 });

  const domains = useMemo(() => areaDomains(selectedArea), [selectedArea]);
  const entities = useMemo(() => selectedArea?.entities ?? [], [selectedArea]);

  const q = search.toLowerCase();
  const domainLabel = (d: string) => t(`widgets.room.domains.${d}`);
  const entityLabel = (id: string) => friendlyName(entities.find(e => e.entity_id === id)) ?? id;

  const availableDomains = domains.filter(d => !controls.includes(d) && domainLabel(d).toLowerCase().includes(q));
  const availableEntities = entities
    .filter(e => !controls.includes(e.entity_id))
    .filter(
      e =>
        e.entity_id.toLowerCase().includes(q) ||
        String(e.attributes.friendly_name ?? '')
          .toLowerCase()
          .includes(q)
    )
    .slice(0, 50);

  const add = (token: string) => {
    onChange({ area, controls: [...controls, token] });
    setOpen(false);
    setSearch('');
  };

  return (
    <div className='space-y-3'>
      <label className={cn(LABEL, 'mb-0')}>{label}</label>

      <select
        value={area}
        onChange={e => onChange({ area: e.target.value, controls: [] })}
        aria-label={label}
        className={cn(INPUT, 'cursor-pointer px-3')}
        style={{ colorScheme: 'dark' }}
      >
        <option value='' className='bg-[#0c1028]'>
          {t('layout.areaControls.none')}
        </option>
        {areas.map(a => (
          <option key={a.area_id} value={a.area_id} className='bg-[#0c1028]'>
            {a.name}
          </option>
        ))}
      </select>

      {area && (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            {controls.map(token => (
              <span
                key={token}
                className='flex h-10 items-center gap-1 rounded-full bg-[var(--ds-surface-3)] pl-4 pr-1 text-[15px] font-semibold'
              >
                {isEntityToken(token) ? entityLabel(token) : domainLabel(token)}
                <button
                  onClick={() => onChange({ area, controls: controls.filter(c => c !== token) })}
                  aria-label={t('common.delete')}
                  className='flex size-8 items-center justify-center rounded-full text-[var(--ds-ink-muted)]'
                >
                  <X size={16} />
                </button>
              </span>
            ))}
          </div>

          <button
            ref={triggerRef}
            onClick={handleToggle}
            aria-expanded={open}
            className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-tile-on)] px-5 text-[15px] font-semibold text-[var(--ds-tile-on-ink)]'
          >
            <Plus size={16} /> {t('layout.areaControls.add')}
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </>
      )}

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              ...dropStyle,
              zIndex: 9999,
              background: 'var(--ds-surface-1)',
              borderRadius: 22,
              boxShadow: 'var(--ds-shadow-sheet)',
              overflow: 'hidden',
              maxHeight: 340,
            }}
          >
            <div className='p-2'>
              <div className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-4'>
                <Search size={16} className='text-[var(--ds-ink-muted)]' />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className='flex-1 bg-transparent text-[15px] text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
                  placeholder={t('layout.entitySearch')}
                />
              </div>
            </div>

            <div className='overflow-y-auto px-2 pb-2' style={{ maxHeight: 270 }}>
              {availableDomains.length > 0 && (
                <p className='px-3 pb-1 pt-2 text-sm font-semibold text-[var(--ds-ink-muted)]'>{t('layout.areaControls.domains')}</p>
              )}
              {availableDomains.map(d => (
                <button
                  key={d}
                  onClick={() => add(d)}
                  className='flex min-h-11 w-full items-center rounded-[var(--ds-radius-sm)] px-3 text-left text-[15px]'
                >
                  {domainLabel(d)}
                </button>
              ))}

              {availableEntities.length > 0 && (
                <p className='px-3 pb-1 pt-3 text-sm font-semibold text-[var(--ds-ink-muted)]'>{t('layout.areaControls.entities')}</p>
              )}
              {availableEntities.map(e => (
                <button
                  key={e.entity_id}
                  onClick={() => add(e.entity_id)}
                  className='w-full rounded-[var(--ds-radius-sm)] px-3 py-2 text-left'
                >
                  <span className='block truncate text-[15px]'>{friendlyName(e) ?? e.entity_id}</span>
                  <span className='block truncate font-mono text-xs text-[var(--ds-ink-muted)]'>{e.entity_id}</span>
                </button>
              ))}

              {!availableDomains.length && !availableEntities.length && (
                <p className='px-3 py-2 text-sm text-[var(--ds-ink-muted)]'>{t('layout.entityNoResult')}</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
