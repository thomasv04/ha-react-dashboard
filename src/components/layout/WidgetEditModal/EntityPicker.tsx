import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useHass } from '@hakit/core';

export function EntityPicker({
  value,
  onChange,
  domain,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  domain?: string;
  label: string;
}) {
  const allEntities = useHass(s => s.entities);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const entities = useMemo(() => {
    const list = Object.keys(allEntities ?? {}).sort();
    if (domain) return list.filter(id => id.startsWith(`${domain}.`));
    return list;
  }, [allEntities, domain]);

  const filtered = useMemo(() => {
    if (!search) return entities.slice(0, 50);
    const q = search.toLowerCase();
    return entities.filter(id => id.toLowerCase().includes(q)).slice(0, 50);
  }, [entities, search]);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(v => !v);
  };

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

  return (
    <div>
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <div
        ref={triggerRef}
        className='flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors'
        onClick={handleToggle}
      >
        <span className={`text-sm flex-1 truncate ${value ? 'text-white/80' : 'text-white/30'}`}>{value || 'Sélectionner...'}</span>
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
              width: dropPos.width,
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
                  placeholder='Rechercher...'
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
              {filtered.length === 0 && <p className='px-3 py-2 text-white/25 text-xs'>Aucune entité trouvée</p>}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
