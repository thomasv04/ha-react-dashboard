/**
 * InfoSidebar modules — composable building blocks for the MoreInfo right panel.
 *
 * Each module is a self-contained component that renders a card-like section.
 * They receive data via props (no implicit context coupling).
 */
import type { ReactNode } from 'react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HISTORY_OPTIONS = [6, 12, 24, 48, 72];
const EXCLUDED_ATTRIBUTES = ['friendly_name', 'unit_of_measurement', 'entity_picture', 'icon'];

function formatDate(dateStr: string | number | undefined, language: string): string {
  if (!dateStr) return '—';
  const d = new Date(typeof dateStr === 'number' ? dateStr * 1000 : dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(language, { dateStyle: 'short', timeStyle: 'medium' });
}

function formatAttrValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/** Un bloc du panneau d'appareil : fond blanc en clair, bleu plus clair que la feuille en sombre. */
export function SheetSection({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-5', className)}>
      {title && <h3 className='mb-3 text-center text-[17px] font-bold'>{title}</h3>}
      {children}
    </section>
  );
}

/** Choix parmi quelques valeurs : la pastille choisie est pleine. */
function choice(active: boolean | undefined) {
  return cn(
    'h-10 rounded-[var(--ds-radius-pill)] px-4 text-sm font-semibold transition-colors',
    active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)]'
  );
}

// ─── Module: Timeline ─────────────────────────────────────────────────────────

export function TimelineModule({ entityId }: { entityId: string }) {
  const { t, language } = useI18n();
  const rawEntity = useHass(s => s.entities?.[entityId] ?? null) as { last_changed?: string; last_updated?: string } | null;
  if (!rawEntity) return null;

  return (
    <SheetSection title={t('common.moreInfo.timeline')}>
      <dl className='flex flex-col gap-2 text-[15px]'>
        <div className='flex justify-between gap-3'>
          <dt className='text-[var(--ds-ink-muted)]'>{t('common.moreInfo.lastChanged')}</dt>
          <dd className='font-semibold'>{formatDate(rawEntity.last_changed, language)}</dd>
        </div>
        <div className='flex justify-between gap-3'>
          <dt className='text-[var(--ds-ink-muted)]'>{t('common.moreInfo.lastUpdated')}</dt>
          <dd className='font-semibold'>{formatDate(rawEntity.last_updated, language)}</dd>
        </div>
      </dl>
    </SheetSection>
  );
}

// ─── Module: History hours selector ───────────────────────────────────────────

export function HistoryModule({ historyHours, onHistoryHoursChange }: { historyHours: number; onHistoryHoursChange: (h: number) => void }) {
  const { t } = useI18n();
  return (
    <SheetSection title={t('common.moreInfo.period')}>
      <div className='flex flex-wrap justify-center gap-2'>
        {HISTORY_OPTIONS.map(h => (
          <button key={h} onClick={() => onHistoryHoursChange(h)} aria-pressed={historyHours === h} className={choice(historyHours === h)}>
            {t('common.moreInfo.hours', { value: h })}
          </button>
        ))}
      </div>
    </SheetSection>
  );
}

// ─── Module: Attributes ───────────────────────────────────────────────────────

export function AttributesModule({ entityId, exclude = [] }: { entityId: string; exclude?: string[] }) {
  const { t } = useI18n();
  const entity = useSafeEntity(entityId);
  if (!entity) return null;

  const allExcluded = [...EXCLUDED_ATTRIBUTES, ...exclude];
  const attrs = Object.entries(entity.attributes).filter(([key]) => !allExcluded.includes(key));
  if (attrs.length === 0) return null;

  return (
    <SheetSection title={t('common.moreInfo.attributes')}>
      <dl className='flex flex-col gap-2 text-sm'>
        {attrs.map(([key, val]) => (
          <div key={key} className='flex items-start justify-between gap-3'>
            <dt className='shrink-0 text-[var(--ds-ink-muted)]'>{key.replace(/_/g, ' ')}</dt>
            <dd className='break-all text-right font-semibold'>{formatAttrValue(val)}</dd>
          </div>
        ))}
      </dl>
    </SheetSection>
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
    <SheetSection title={title}>
      <dl className='flex flex-col gap-2 text-[15px]'>
        {entries.map(e => (
          <div key={e.label} className='flex justify-between gap-3'>
            <dt className='text-[var(--ds-ink-muted)]'>{e.label}</dt>
            <dd className={cn('font-semibold', e.color)}>{e.value}</dd>
          </div>
        ))}
      </dl>
    </SheetSection>
  );
}

// ─── Module: Power balance (energy-specific) ─────────────────────────────────

export function PowerBalanceModule({ production, consumption }: { production: number; consumption: number }) {
  const { t } = useI18n();
  const balance = production - consumption;
  const Icon = balance > 0 ? ArrowUp : balance < 0 ? ArrowDown : Minus;
  const tone = balance > 0 ? 'text-[var(--ds-good)]' : balance < 0 ? 'text-[var(--ds-heat-ink)]' : '';
  return (
    <SheetSection title={t('common.moreInfo.energyBalance')}>
      <div className='flex items-center justify-center gap-3'>
        <Icon size={28} aria-hidden='true' className={tone} />
        <div>
          <p className={cn('text-[28px] font-semibold leading-none', tone)}>
            {balance > 0 ? '+' : ''}
            {balance.toFixed(0)} W
          </p>
          <p className='mt-1 text-sm text-[var(--ds-ink-muted)]'>
            {balance > 0
              ? t('common.moreInfo.solarSurplus')
              : balance < 0
                ? t('common.moreInfo.netConsumption')
                : t('common.moreInfo.balanced')}
          </p>
        </div>
      </div>
    </SheetSection>
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
  const { t } = useI18n();
  const maxVal = Math.max(...entries.map(e => e.value), 1);
  return (
    <SheetSection title={t('common.moreInfo.breakdown')}>
      <div className='flex flex-col gap-3'>
        {entries.map(e => (
          <div key={e.label}>
            <div className='mb-1.5 flex justify-between text-[15px]'>
              <span className='text-[var(--ds-ink-muted)]'>{e.label}</span>
              <span className='font-semibold'>
                {e.value} <span className='text-[var(--ds-ink-muted)]'>{e.unit}</span>
              </span>
            </div>
            <div className='h-2.5 overflow-hidden rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)]'>
              <div
                className='h-full rounded-[var(--ds-radius-pill)] transition-[width] duration-700'
                style={{ width: `${(e.value / maxVal) * 100}%`, backgroundColor: e.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </SheetSection>
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
    <SheetSection title={title}>
      <div className='flex flex-wrap justify-center gap-2'>
        {presets.map(p => (
          <button key={String(p.value)} onClick={() => onSelect(p.value)} aria-pressed={p.active} className={choice(p.active)}>
            {p.label}
          </button>
        ))}
      </div>
    </SheetSection>
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
  // Peu d'options : des pastilles, comme sur l'Echo Show, plutôt qu'une liste déroulante.
  return (
    <SheetSection title={title}>
      <div className='flex flex-wrap justify-center gap-2'>
        {options.map(m => (
          <button key={m} onClick={() => onChange(m)} aria-pressed={m === value} className={choice(m === value)}>
            {m}
          </button>
        ))}
      </div>
    </SheetSection>
  );
}

// ─── Module: Entity ID footer ─────────────────────────────────────────────────

export function EntityIdModule({ entityIds }: { entityIds: string[] }) {
  const ids = entityIds.filter(Boolean);
  if (ids.length === 0) return null;
  return (
    <div className='flex flex-col gap-0.5 px-2'>
      {ids.map(eid => (
        <p key={eid} className='select-all truncate font-mono text-xs text-[var(--ds-ink-muted)]'>
          {eid}
        </p>
      ))}
    </div>
  );
}
