import { useState, useMemo } from 'react';
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

  return (
    <div className='relative'>
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer'
        onClick={() => setOpen(!open)}
      >
        <span className={`text-sm flex-1 truncate ${value ? 'text-white/80' : 'text-white/30'}`}>
          {value || 'Sélectionner...'}
        </span>
        {open ? <ChevronUp size={14} className='text-white/30' /> : <ChevronDown size={14} className='text-white/30' />}
      </div>
      {open && (
        <div className='absolute z-50 mt-1 w-full rounded-lg border border-white/12 shadow-xl overflow-hidden'
          style={{ background: 'rgba(12, 16, 40, 0.98)', backdropFilter: 'blur(20px)', maxHeight: 240 }}
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
                onClick={() => { onChange(id); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/8 transition-colors truncate ${
                  id === value ? 'text-blue-400 bg-blue-500/10' : 'text-white/60'
                }`}
              >
                {id}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className='px-3 py-2 text-white/25 text-xs'>Aucune entité trouvée</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
