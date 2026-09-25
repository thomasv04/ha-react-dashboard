import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useI18n } from '@/i18n';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';

export function EntityPicker({
  value,
  onChange,
  domain,
  label,
  autoOpen,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Un domaine, ou plusieurs (`['cover', 'binary_sensor']`). */
  domain?: string | string[];
  label: string;
  /** Ouvre la liste dès l'affichage — quand le sélecteur apparaît *pour* choisir. */
  autoOpen?: boolean;
}) {
  const allEntities = useHass(s => s.entities);
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const {
    open,
    setOpen,
    toggle: handleToggle,
    show,
    triggerRef,
    dropRef: dropdownRef,
    dropStyle,
  } = useDropdownPortal<HTMLDivElement>({ minWidth: 260 });

  // Au montage seulement : c'est l'apparition du sélecteur qui vaut demande.
  // `show` et non `toggle` : en StrictMode l'effet passe deux fois, et deux
  // bascules refermaient la liste aussitôt ouverte.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void (autoOpen && show()), []);

  // Clé textuelle : un tableau passé en ligne serait neuf à chaque rendu.
  const domains = [domain ?? []].flat().join(',');
  const entities = useMemo(() => {
    const list = Object.keys(allEntities ?? {}).sort();
    if (!domains) return list;
    const prefixes = domains.split(',').map(d => `${d}.`);
    return list.filter(id => prefixes.some(p => id.startsWith(p)));
  }, [allEntities, domains]);

  const filtered = useMemo(() => {
    if (!search) return entities.slice(0, 50);
    const q = search.toLowerCase();
    return entities.filter(id => id.toLowerCase().includes(q)).slice(0, 50);
  }, [entities, search]);

  return (
    <div>
      {/* Pas d'étiquette vide : dans une rangée de liste, elle réservait sa
          hauteur et décalait le sélecteur du bouton de suppression. */}
      {label && <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>}
      <div
        ref={triggerRef}
        className='flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors'
        onClick={handleToggle}
      >
        <span className={`text-sm flex-1 truncate ${value ? 'text-white/80' : 'text-white/30'}`}>{value || t('layout.entitySelect')}</span>
        {open ? <ChevronUp size={14} className='text-white/30' /> : <ChevronDown size={14} className='text-white/30' />}
      </div>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              ...dropStyle,
              zIndex: 9999,
              background: 'rgba(12, 16, 40, 0.98)',
              backdropFilter: 'blur(20px)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              maxHeight: 240,
            }}
          >
            <div className='sticky top-0 p-2 border-b border-white/8' style={{ background: 'rgba(12, 16, 40, 0.98)' }}>
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
            <div className='overflow-y-auto' style={{ maxHeight: 180 }}>
              {filtered.map(id => (
                <button
                  key={id}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/8 transition-colors truncate ${
                    id === value ? 'text-blue-400 bg-blue-500/10' : 'text-white/60'
                  }`}
                >
                  {id}
                </button>
              ))}
              {filtered.length === 0 && <p className='px-3 py-2 text-white/25 text-xs'>{t('layout.entityNoResult')}</p>}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
