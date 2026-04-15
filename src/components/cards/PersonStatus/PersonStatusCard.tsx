import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { PersonStatusConfig, PersonEntry } from '@/types/widget-configs';
import { cn } from '@/lib/utils';

// ── Zone normalization ────────────────────────────────────────────────────────
function normalizeZone(zone: string | undefined): string {
  if (!zone) return 'unknown';
  const lower = zone.toLowerCase().trim();
  if (lower === 'home' || lower === 'maison' || lower === 'domicile') return 'home';
  if (lower === 'not_home' || lower === 'away') return 'away';
  return zone;
}

function getZoneLabel(zone: string): string {
  const normalized = normalizeZone(zone);
  if (normalized === 'home') return 'MAISON';
  if (normalized === 'away') return 'ABSENT';
  if (normalized === 'unknown') return '—';
  return zone.toUpperCase();
}

// ── Single person pill ────────────────────────────────────────────────────────
function PersonPill({ entry, haBaseUrl }: { entry: PersonEntry; haBaseUrl: string | undefined }) {
  const entity = useSafeEntity(entry.entityId);

  if (!entity) return null;

  const name = entry.name ?? (entity.attributes.friendly_name as string) ?? entry.entityId;
  const zone = entity.state;
  const isHome = normalizeZone(zone) === 'home';
  const rawPicture = entity.attributes.entity_picture as string | undefined;
  const zoneLabel = getZoneLabel(zone);

  // Resolve relative HA picture URLs to absolute (e.g. /api/image/person.xxx/...)
  const picture = rawPicture
    ? rawPicture.startsWith('http')
      ? rawPicture
      : haBaseUrl
        ? `${haBaseUrl}${rawPicture}`
        : rawPicture
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-2xl transition-all',
        isHome ? 'bg-white/5' : 'bg-white/[0.02]',
      )}
    >
      {/* Avatar */}
      <div className="relative">
        {picture ? (
          <img
            src={picture}
            alt={name}
            className={cn(
              'w-9 h-9 rounded-full object-cover border-2',
              isHome ? 'border-green-400' : 'border-white/10 grayscale',
            )}
          />
        ) : (
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center',
              isHome
                ? 'bg-green-500/20 border-2 border-green-400'
                : 'bg-white/5 border-2 border-white/10',
            )}
          >
            <User size={16} className={isHome ? 'text-green-400' : 'text-white/30'} />
          </div>
        )}

        {/* Dot indicateur */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a14]',
            isHome ? 'bg-green-400' : 'bg-white/20',
          )}
        />
      </div>

      {/* Texte */}
      <div className="flex flex-col min-w-0">
        <span
          className={cn(
            'text-sm font-medium truncate',
            isHome ? 'text-white' : 'text-white/40',
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider',
            isHome ? 'text-green-400' : 'text-white/20',
          )}
        >
          {zoneLabel}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
export function PersonStatusCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<PersonStatusConfig>(widgetId || 'person');
  const persons = config?.persons ?? [];

  const wsUrl = useHass(s => s.connection?.socket?.url as string | undefined);
  const haBaseUrl = wsUrl
    ? wsUrl
        .replace(/^wss?:\/\//, 'http' + (wsUrl.startsWith('wss') ? 's' : '') + '://')
        .replace(/\/api\/websocket$/, '')
    : undefined;

  if (persons.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        Aucune personne configurée
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 h-full overflow-x-auto scrollbar-none px-1">
      {persons.map((entry) => (
        <PersonPill key={entry.entityId} entry={entry} haBaseUrl={haBaseUrl} />
      ))}
    </div>
  );
}
