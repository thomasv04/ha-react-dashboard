import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Layers, LayoutGrid } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { cn } from '@/lib/utils';

const BUILTIN_PANELS = [
  { value: 'volets', label: 'Volets', emoji: '🪟' },
  { value: 'lumieres', label: 'Lumières', emoji: '💡' },
  { value: 'security', label: 'Sécurité', emoji: '🛡️' },
  { value: 'aspirateur', label: 'Aspirateur', emoji: '🤖' },
  { value: 'flowers', label: 'Plantes', emoji: '🌿' },
  { value: 'notifications', label: 'Notifications', emoji: '🔔' },
  { value: 'cameras', label: 'Caméras', emoji: '📷' },
  { value: 'alarme', label: 'Alarme', emoji: '🚨' },
];

function getLabel(value: string, customPanels: { id: string; name: string }[]): string {
  if (!value) return '';
  if (value.startsWith('custom:')) {
    const id = value.slice(7);
    return customPanels.find(p => p.id === id)?.name ?? value;
  }
  return BUILTIN_PANELS.find(p => p.value === value)?.label ?? value;
}

export function PanelSelectField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { panels } = useCustomPanels();
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const displayLabel = getLabel(value, panels);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(v => !v);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const dropdown =
    open &&
    createPortal(
      <div
        ref={dropRef}
        className='fixed z-[200] rounded-xl border border-white/12 shadow-2xl overflow-hidden'
        style={{
          top: dropPos.top,
          left: dropPos.left,
          width: dropPos.width,
          background: 'rgba(12, 16, 40, 0.98)',
          backdropFilter: 'blur(20px)',
          maxHeight: 320,
          overflowY: 'auto',
        }}
      >
        <div className='p-1.5 space-y-0.5'>
          {/* None option */}
          <button
            onClick={() => select('')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors',
              !value ? 'bg-white/10 text-white/60' : 'text-white/35 hover:bg-white/6 hover:text-white/60'
            )}
          >
            <span className='text-base leading-none'>—</span>
            <span>Aucun panneau</span>
          </button>

          {/* Separator + built-in label */}
          <div className='flex items-center gap-2 px-3 pt-2 pb-1'>
            <LayoutGrid size={11} className='text-white/25' />
            <span className='text-[10px] font-semibold text-white/25 uppercase tracking-wider'>Panneaux intégrés</span>
          </div>

          {BUILTIN_PANELS.map(opt => (
            <button
              key={opt.value}
              onClick={() => select(opt.value)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                value === opt.value
                  ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                  : 'border border-transparent text-white/70 hover:bg-white/6 hover:text-white/90'
              )}
            >
              <span className='text-base leading-none w-5 text-center'>{opt.emoji}</span>
              <span className='flex-1'>{opt.label}</span>
            </button>
          ))}

          {/* Custom panels */}
          {panels.length > 0 && (
            <>
              <div className='flex items-center gap-2 px-3 pt-2 pb-1'>
                <Layers size={11} className='text-white/25' />
                <span className='text-[10px] font-semibold text-white/25 uppercase tracking-wider'>Panneaux personnalisés</span>
              </div>
              {panels.map(p => {
                const ref = `custom:${p.id}`;
                return (
                  <button
                    key={p.id}
                    onClick={() => select(ref)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                      value === ref
                        ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300'
                        : 'border border-transparent text-white/70 hover:bg-white/6 hover:text-white/90'
                    )}
                  >
                    <Layers size={14} className='text-violet-400/60 flex-shrink-0' />
                    <span className='flex-1'>{p.name}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div>
      {label && <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border cursor-pointer transition-colors select-none',
          open ? 'border-blue-500/40 bg-white/8' : 'border-white/10 hover:border-white/20'
        )}
      >
        {value ? (
          value.startsWith('custom:') ? (
            <Layers size={14} className='text-violet-400/70 flex-shrink-0' />
          ) : (
            <span className='text-base leading-none'>{BUILTIN_PANELS.find(p => p.value === value)?.emoji ?? '📋'}</span>
          )
        ) : null}
        <span className={cn('text-sm flex-1 truncate', value ? 'text-white/80' : 'text-white/30')}>
          {displayLabel || '— Aucun panneau —'}
        </span>
        {open ? (
          <ChevronUp size={14} className='text-white/30 flex-shrink-0' />
        ) : (
          <ChevronDown size={14} className='text-white/30 flex-shrink-0' />
        )}
      </div>
      {dropdown}
    </div>
  );
}
