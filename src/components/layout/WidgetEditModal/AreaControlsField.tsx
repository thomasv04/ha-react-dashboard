import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';
import { ChevronDown, ChevronUp, Search, X, Plus } from 'lucide-react';
import { useAreas } from '@hakit/core';
import { useI18n } from '@/i18n';
import { useArea, areaDomains, isEntityToken } from '@/hooks/useAreaControls';
import { friendlyName } from '@/lib/ha-service';

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
    <div className='space-y-2'>
      <label className='text-sm text-[var(--ds-ink-muted)] block'>{label}</label>

      <select
        value={area}
        onChange={e => onChange({ area: e.target.value, controls: [] })}
        className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] cursor-pointer'
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
          <div className='flex flex-wrap items-center gap-1.5'>
            {controls.map(token => (
              <span
                key={token}
                className='flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)]'
              >
                {isEntityToken(token) ? entityLabel(token) : domainLabel(token)}
                <button
                  onClick={() => onChange({ area, controls: controls.filter(c => c !== token) })}
                  className='p-0.5 rounded-full text-[var(--ds-ink-muted)]'
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <button
            ref={triggerRef}
            onClick={handleToggle}
            className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] text-sm transition-colors'
          >
            <Plus size={11} /> {t('layout.areaControls.add')}
            {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
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
              borderRadius: 8,
              border: '1px solid var(--ds-surface-3)',
              boxShadow: 'var(--ds-shadow-sheet)',
              overflow: 'hidden',
              maxHeight: 300,
            }}
          >
            <div className='p-2 border-b border-[var(--ds-surface-3)]'>
              <div className='flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--ds-surface-2)]'>
                <Search size={13} className='text-[var(--ds-ink-muted)]' />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className='bg-transparent text-sm text-[var(--ds-ink)] outline-none flex-1 placeholder:text-[var(--ds-ink-muted)]'
                  placeholder={t('layout.entitySearch')}
                />
              </div>
            </div>

            <div className='overflow-y-auto' style={{ maxHeight: 240 }}>
              {availableDomains.length > 0 && (
                <p className='px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-[var(--ds-ink-muted)]'>
                  {t('layout.areaControls.domains')}
                </p>
              )}
              {availableDomains.map(d => (
                <button key={d} onClick={() => add(d)} className='w-full text-left px-3 py-1.5 text-sm text-[var(--ds-ink-muted)]'>
                  {domainLabel(d)}
                </button>
              ))}

              {availableEntities.length > 0 && (
                <p className='px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-[var(--ds-ink-muted)]'>
                  {t('layout.areaControls.entities')}
                </p>
              )}
              {availableEntities.map(e => (
                <button key={e.entity_id} onClick={() => add(e.entity_id)} className='w-full text-left px-3 py-1.5 group'>
                  <span className='block text-sm text-[var(--ds-ink-muted)] truncate'>{friendlyName(e) ?? e.entity_id}</span>
                  <span className='block text-xs text-[var(--ds-ink-muted)] font-mono truncate'>{e.entity_id}</span>
                </button>
              ))}

              {!availableDomains.length && !availableEntities.length && (
                <p className='px-3 py-2 text-[var(--ds-ink-muted)] text-xs'>{t('layout.entityNoResult')}</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
