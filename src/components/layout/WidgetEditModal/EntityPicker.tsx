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
      {label && <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{label}</label>}
      <div
        ref={triggerRef}
        className='flex h-12 cursor-pointer items-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4'
        onClick={handleToggle}
      >
        <span className={`flex-1 truncate text-base ${value ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]'}`}>
          {value || t('layout.entitySelect')}
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
              background: 'var(--ds-sheet)',
              borderRadius: 20,
              boxShadow: 'var(--ds-shadow-sheet)',
              overflow: 'hidden',
              maxHeight: 320,
            }}
          >
            <div className='sticky top-0 p-2' style={{ background: 'var(--ds-sheet)' }}>
              <div className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-4'>
                <Search size={16} className='text-[var(--ds-ink-muted)]' />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className='flex-1 bg-transparent text-base text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
                  placeholder={t('layout.entitySearch')}
                />
              </div>
            </div>
            <div className='overflow-y-auto px-2 pb-2' style={{ maxHeight: 250 }}>
              {filtered.map(id => (
                <button
                  key={id}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`h-11 w-full truncate rounded-[var(--ds-radius-md)] px-3 text-left text-base ${
                    id === value ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'text-[var(--ds-ink)]'
                  }`}
                >
                  {id}
                </button>
              ))}
              {filtered.length === 0 && <p className='px-3 py-2 text-sm text-[var(--ds-ink-muted)]'>{t('layout.entityNoResult')}</p>}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
