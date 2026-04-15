import type { ReactNode } from 'react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';

const HISTORY_OPTIONS = [6, 12, 24, 48, 72];
const EXCLUDED_ATTRIBUTES = ['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'];

interface InfoPanelProps {
  entityId: string;
  historyHours: number;
  onHistoryHoursChange: (h: number) => void;
  excludeAttributes?: string[];
  children?: ReactNode;
}

function formatDate(dateStr: string | number | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(typeof dateStr === 'number' ? dateStr * 1000 : dateStr);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatAttrValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function InfoPanel({ entityId, historyHours, onHistoryHoursChange, excludeAttributes = [], children }: InfoPanelProps) {
  const entity = useSafeEntity(entityId);
  // Access raw entity for last_changed / last_updated (top-level props, not in attributes)
  const rawEntity = useHass(s => s.entities?.[entityId] ?? null) as { last_changed?: string; last_updated?: string } | null;
  if (!entity) return null;

  const allExcluded = [...EXCLUDED_ATTRIBUTES, ...excludeAttributes];
  const attrs = Object.entries(entity.attributes).filter(([key]) => !allExcluded.includes(key));

  const lastChanged = rawEntity?.last_changed;
  const lastUpdated = rawEntity?.last_updated;

  return (
    <div className='space-y-6'>
      {/* Timeline */}
      <div>
        <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>Timeline</h3>
        <div className='relative pl-4 space-y-3 border-l border-white/10'>
          <div className='relative'>
            <div className='absolute -left-[calc(1rem+3px)] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-400' />
            <p className='text-xs text-white/60'>Dernier changement</p>
            <p className='text-xs text-white/90 font-medium'>{formatDate(lastChanged)}</p>
          </div>
          <div className='relative'>
            <div className='absolute -left-[calc(1rem+3px)] top-1.5 w-1.5 h-1.5 rounded-full bg-white/30' />
            <p className='text-xs text-white/60'>Dernière mise à jour</p>
            <p className='text-xs text-white/90 font-medium'>{formatDate(lastUpdated)}</p>
          </div>
        </div>
      </div>

      {/* History hours selector */}
      <div>
        <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>Historique (Heures)</h3>
        <div className='flex gap-1.5'>
          {HISTORY_OPTIONS.map(h => (
            <button
              key={h}
              onClick={() => onHistoryHoursChange(h)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                historyHours === h ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {h}H
            </button>
          ))}
        </div>
      </div>

      {/* Custom children */}
      {children}

      {/* Attributes */}
      {attrs.length > 0 && (
        <div>
          <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>Attributs</h3>
          <div className='space-y-2'>
            {attrs.map(([key, val]) => (
              <div key={key} className='flex items-start justify-between gap-2 text-xs'>
                <span className='text-white/50 uppercase shrink-0' style={{ wordSpacing: '0.1em' }}>
                  {key.replace(/_/g, ' ')}
                </span>
                <span className='text-white font-semibold text-right break-all'>{formatAttrValue(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity ID */}
      <p className='text-[10px] text-white/30 font-mono select-all'>{entityId}</p>
    </div>
  );
}
