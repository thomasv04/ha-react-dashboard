/**
 * InfoSidebar modules — composable building blocks for the MoreInfo right panel.
 *
 * Each module is a self-contained component that renders a card-like section.
 * They receive data via props (no implicit context coupling).
 */
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HISTORY_OPTIONS = [6, 12, 24, 48, 72];
const EXCLUDED_ATTRIBUTES = ['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'];

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

// ─── Module: Timeline ─────────────────────────────────────────────────────────

export function TimelineModule({ entityId }: { entityId: string }) {
  const rawEntity = useHass(s => s.entities?.[entityId] ?? null) as { last_changed?: string; last_updated?: string } | null;
  if (!rawEntity) return null;

  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>Timeline</h3>
      <div className='relative pl-4 space-y-3 border-l border-white/10'>
        <div className='relative'>
          <div className='absolute -left-[calc(1rem+3px)] top-1.5 w-1.5 h-1.5 rounded-full bg-blue-400' />
          <p className='text-xs text-white/60'>Dernier changement</p>
          <p className='text-xs text-white/90 font-medium'>{formatDate(rawEntity.last_changed)}</p>
        </div>
        <div className='relative'>
          <div className='absolute -left-[calc(1rem+3px)] top-1.5 w-1.5 h-1.5 rounded-full bg-white/30' />
          <p className='text-xs text-white/60'>Dernière mise à jour</p>
          <p className='text-xs text-white/90 font-medium'>{formatDate(rawEntity.last_updated)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Module: History hours selector ───────────────────────────────────────────

export function HistoryModule({ historyHours, onHistoryHoursChange }: { historyHours: number; onHistoryHoursChange: (h: number) => void }) {
  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>Période</h3>
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
  );
}

// ─── Module: Attributes ───────────────────────────────────────────────────────

export function AttributesModule({ entityId, exclude = [] }: { entityId: string; exclude?: string[] }) {
  const entity = useSafeEntity(entityId);
  if (!entity) return null;

  const allExcluded = [...EXCLUDED_ATTRIBUTES, ...exclude];
  const attrs = Object.entries(entity.attributes).filter(([key]) => !allExcluded.includes(key));
  if (attrs.length === 0) return null;

  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
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
  );
}

// ─── Module: Key-Value details ────────────────────────────────────────────────

export interface DetailEntry {
  label: string;
  value: string;
  color?: string;
}

export function DetailsModule({ title, entries }: { title: string; entries: DetailEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>{title}</h3>
      <div className='space-y-2'>
        {entries.map(e => (
          <div key={e.label} className='flex justify-between text-xs'>
            <span className='text-white/50'>{e.label}</span>
            <span className={`font-semibold ${e.color ?? 'text-white'}`}>{e.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Module: Power balance (energy-specific) ─────────────────────────────────

export function PowerBalanceModule({ production, consumption }: { production: number; consumption: number }) {
  const balance = production - consumption;
  const isPositive = balance > 0;
  const Icon = balance > 0 ? ArrowUp : balance < 0 ? ArrowDown : Minus;
  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4'>Bilan énergétique</h3>
      <div className='flex items-center justify-center gap-3'>
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-500/15' : balance < 0 ? 'bg-orange-500/15' : 'bg-white/5'}`}
        >
          <Icon size={20} className={isPositive ? 'text-green-400' : balance < 0 ? 'text-orange-400' : 'text-zinc-400'} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : balance < 0 ? 'text-orange-400' : 'text-white'}`}>
            {isPositive ? '+' : ''}
            {balance.toFixed(0)} W
          </p>
          <p className='text-[10px] text-white/40 uppercase tracking-wider'>
            {isPositive ? 'Surplus solaire' : balance < 0 ? 'Consommation nette' : 'Équilibré'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Module: Power bars (proportional) ────────────────────────────────────────

export interface PowerBarEntry {
  label: string;
  value: number;
  unit: string;
  color: string;
}

export function PowerBarsModule({ entries }: { entries: PowerBarEntry[] }) {
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4'>Répartition</h3>
      <div className='space-y-3'>
        {entries.map(e => (
          <div key={e.label}>
            <div className='flex justify-between text-xs mb-1'>
              <span className='text-white/60'>{e.label}</span>
              <span className='text-white font-semibold'>
                {e.value} <span className='text-white/40'>{e.unit}</span>
              </span>
            </div>
            <div className='h-2 rounded-full bg-white/[0.04] overflow-hidden'>
              <div
                className='h-full rounded-full transition-all duration-700'
                style={{
                  width: `${(e.value / maxVal) * 100}%`,
                  backgroundColor: e.color,
                  boxShadow: `0 0 8px ${e.color}40`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Module: Presets (button group) ───────────────────────────────────────────

export interface PresetEntry {
  label: string;
  value: number | string;
  active?: boolean;
}

export function PresetsModule({
  title,
  presets,
  onSelect,
}: {
  title: string;
  presets: PresetEntry[];
  onSelect: (value: number | string) => void;
}) {
  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>{title}</h3>
      <div className='flex flex-wrap gap-1.5'>
        {presets.map(p => (
          <button
            key={String(p.value)}
            onClick={() => onSelect(p.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              p.active ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Module: Select (dropdown) ────────────────────────────────────────────────

export function SelectModule({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className='rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2'>{title}</h3>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none'
      >
        {options.map(m => (
          <option key={m} value={m} className='bg-slate-900'>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Module: Entity ID footer ─────────────────────────────────────────────────

export function EntityIdModule({ entityIds }: { entityIds: string[] }) {
  const ids = entityIds.filter(Boolean);
  if (ids.length === 0) return null;
  return (
    <div className='space-y-0.5'>
      {ids.map(eid => (
        <p key={eid} className='text-[10px] text-white/20 font-mono select-all truncate'>
          {eid}
        </p>
      ))}
    </div>
  );
}
