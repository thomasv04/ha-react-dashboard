import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Search, X, Plus } from 'lucide-react';
import { useAreas } from '@hakit/core';
import { useI18n } from '@/i18n';
import { useArea, areaDomains, isEntityToken } from '@/hooks/useAreaControls';

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const domains = useMemo(() => areaDomains(selectedArea), [selectedArea]);
  const entities = useMemo(() => selectedArea?.entities ?? [], [selectedArea]);

  const q = search.toLowerCase();
  const domainLabel = (d: string) => t(`widgets.room.domains.${d}`);
  const entityLabel = (id: string) => (entities.find(e => e.entity_id === id)?.attributes.friendly_name as string | undefined) ?? id;

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

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className='space-y-2'>
      <label className='text-[11px] text-white/40 block'>{label}</label>

      <select
        value={area}
        onChange={e => onChange({ area: e.target.value, controls: [] })}
        className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 cursor-pointer'
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
                className='flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70'
              >
                {isEntityToken(token) ? entityLabel(token) : domainLabel(token)}
                <button
                  onClick={() => onChange({ area, controls: controls.filter(c => c !== token) })}
                  className='p-0.5 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10'
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <button
            ref={triggerRef}
            onClick={handleToggle}
            className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[11px] transition-colors'
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
              top: dropPos.top,
              left: dropPos.left,
              width: dropPos.width,
              zIndex: 9999,
              background: 'rgba(12, 16, 40, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              maxHeight: 300,
            }}
          >
            <div className='p-2 border-b border-white/8'>
              <div className='flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5'>
                <Search size={13} className='text-white/30' />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className='bg-transparent text-sm text-white/80 outline-none flex-1 placeholder:text-white/20'
                  placeholder={t('layout.entitySearch')}
                />
              </div>
            </div>

            <div className='overflow-y-auto' style={{ maxHeight: 240 }}>
              {availableDomains.length > 0 && (
                <p className='px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/25'>{t('layout.areaControls.domains')}</p>
              )}
              {availableDomains.map(d => (
                <button
                  key={d}
                  onClick={() => add(d)}
                  className='w-full text-left px-3 py-1.5 text-sm text-white/60 hover:bg-white/8 hover:text-white/90'
                >
                  {domainLabel(d)}
                </button>
              ))}

              {availableEntities.length > 0 && (
                <p className='px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/25'>{t('layout.areaControls.entities')}</p>
              )}
              {availableEntities.map(e => (
                <button key={e.entity_id} onClick={() => add(e.entity_id)} className='w-full text-left px-3 py-1.5 hover:bg-white/8 group'>
                  <span className='block text-sm text-white/60 group-hover:text-white/90 truncate'>
                    {(e.attributes.friendly_name as string | undefined) ?? e.entity_id}
                  </span>
                  <span className='block text-[10px] text-white/25 font-mono truncate'>{e.entity_id}</span>
                </button>
              ))}

              {!availableDomains.length && !availableEntities.length && (
                <p className='px-3 py-2 text-white/25 text-xs'>{t('layout.entityNoResult')}</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
