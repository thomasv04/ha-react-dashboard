import { User } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { PersonStatusConfig, PersonEntry } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { friendlyName } from '@/lib/ha-service';

// ── Zone normalization ────────────────────────────────────────────────────────
function normalizeZone(zone: string | undefined): string {
  if (!zone) return 'unknown';
  const lower = zone.toLowerCase().trim();
  if (lower === 'home' || lower === 'maison' || lower === 'domicile') return 'home';
  if (lower === 'not_home' || lower === 'away') return 'away';
  return zone;
}

function getZoneLabel(zone: string, t: (key: string) => string): string {
  const normalized = normalizeZone(zone);
  if (normalized === 'home') return t('widgets.person.home');
  if (normalized === 'away') return t('widgets.person.away');
  if (normalized === 'unknown') return '—';
  return zone;
}

// ── Single person pill ────────────────────────────────────────────────────────
function PersonPill({ entry, haBaseUrl }: { entry: PersonEntry; haBaseUrl: string | undefined }) {
  const { t } = useI18n();
  const entity = useSafeEntity(entry.entityId);

  if (!entity) return null;

  const name = entry.name ?? friendlyName(entity) ?? entry.entityId;
  const zone = entity.state;
  const isHome = normalizeZone(zone) === 'home';
  const rawPicture = entity.attributes.entity_picture as string | undefined;
  const zoneLabel = getZoneLabel(zone, t);

  // Resolve relative HA picture URLs to absolute (e.g. /api/image/person.xxx/...)
  const picture = rawPicture
    ? rawPicture.startsWith('http')
      ? rawPicture
      : haBaseUrl
        ? `${haBaseUrl}${rawPicture}`
        : rawPicture
    : undefined;

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-[var(--ds-radius-pill)] py-2 pl-2 pr-5',
        isHome ? 'bg-[var(--ds-surface-2)]' : 'bg-[var(--ds-surface-2)] opacity-60'
      )}
    >
      {/* Avatar, cerclé de vert quand la personne est à la maison */}
      {picture ? (
        <img
          src={picture}
          alt=''
          className={cn('size-12 shrink-0 rounded-full object-cover', isHome ? 'ring-[3px] ring-[var(--ds-good)]' : 'grayscale')}
        />
      ) : (
        <span
          aria-hidden='true'
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]',
            isHome && 'ring-[3px] ring-[var(--ds-good)]'
          )}
        >
          <User size={20} className='text-[var(--ds-ink-muted)]' />
        </span>
      )}

      <div className='flex min-w-0 flex-col'>
        <span className='truncate text-[17px] font-semibold leading-tight text-[var(--ds-ink)]'>{name}</span>
        <span className={cn('truncate text-sm', isHome ? 'text-[var(--ds-good)]' : 'text-[var(--ds-ink-muted)]')}>{zoneLabel}</span>
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
export function PersonStatusCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<PersonStatusConfig>(widgetId || 'person');
  const persons = config?.persons ?? [];

  const wsUrl = useHass(s => s.connection?.socket?.url as string | undefined);
  const haBaseUrl = wsUrl
    ? wsUrl.replace(/^wss?:\/\//, 'http' + (wsUrl.startsWith('wss') ? 's' : '') + '://').replace(/\/api\/websocket$/, '')
    : undefined;

  if (persons.length === 0) {
    return <div className='flex h-full items-center justify-center text-sm text-[var(--ds-ink-muted)]'>{t('widgets.person.noPeople')}</div>;
  }

  return (
    <div className='flex h-full items-center gap-3 overflow-x-auto px-1 scrollbar-none'>
      {persons.map(entry => (
        <PersonPill key={entry.entityId} entry={entry} haBaseUrl={haBaseUrl} />
      ))}
    </div>
  );
}
