import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Blinds, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, Square } from 'lucide-react';
import { useAreas, useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { coverArrowMotion } from '@/lib/cover-motion';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { PillSlider } from '@/components/ds/PillSlider';
import { ROUND_BUTTON, useCover } from '@/components/cards/CoverCard/useCover';
import type { CoverSectionsCardConfig } from '@/types/widget-configs';
import { allTargets, isCoverOpen, resolveSections, type ResolvedSection } from './cover-sections';

type GroupCommand = 'open_cover' | 'stop_cover' | 'close_cover';

/**
 * Volets groupés par section (une pièce, une façade…), à la manière de la page
 * Volets de Paddock : chaque section a ses commandes de groupe, chaque volet sa
 * pilule couchée, et un bloc « Tout ouvrir / Tout fermer » vise les volets
 * choisis. Le titre d'une section passe à gauche quand la card est assez large
 * (container query), au-dessus sinon.
 */
export function CoverSectionsCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CoverSectionsCardConfig>(widgetId || 'cover_sections');
  const areas = useAreas();
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();

  const sections = useMemo(() => resolveSections(config?.sections, areas), [config?.sections, areas]);
  const targets = useMemo(() => allTargets(config?.allCovers, sections), [config?.allCovers, sections]);
  const showAll = (config?.showAll ?? true) && targets.length > 0;
  const separator = config?.separator ?? 'line';

  const command = (entityIds: string[], service: GroupCommand) => {
    helpers.callService({ domain: 'cover', service, target: { entity_id: entityIds } });
    playFeedback(service === 'open_cover' ? 'door_open' : service === 'close_cover' ? 'door_close' : 'warning');
  };

  if (!sections.length && !showAll) {
    return (
      <div className='h-full rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-4 text-[var(--ds-ink)]'>
        <CardPlaceholder icon={Blinds} text={t('widgets.cover_sections.empty')} />
      </div>
    );
  }

  const allBlock = showAll && (
    <AllCoversBlock
      key='all'
      title={config?.allTitle || t('widgets.cover_sections.allTitle')}
      entityIds={targets}
      onCommand={service => command(targets, service)}
    />
  );

  return (
    <div
      className={cn(
        '@container flex h-full select-none flex-col overflow-y-auto text-[var(--ds-ink)]',
        separator === 'line' ? 'divide-y divide-[var(--ds-surface-3)]' : separator === 'space' ? 'gap-8' : 'gap-3'
      )}
    >
      {sections.map((section, i) => (
        <SectionRow
          key={i}
          section={section}
          padded={separator === 'line'}
          onCommand={service => command(section.covers, service)}
          extra={i === sections.length - 1 ? allBlock : undefined}
        />
      ))}
      {!sections.length && allBlock}
    </div>
  );
}

function SectionRow({
  section,
  padded,
  onCommand,
  extra,
}: {
  section: ResolvedSection;
  padded: boolean;
  onCommand: (service: GroupCommand) => void;
  extra?: ReactNode;
}) {
  return (
    <section className={cn('flex flex-col gap-3 @2xl:flex-row @2xl:items-start @2xl:gap-5', padded && 'py-4 first:pt-0 last:pb-0')}>
      <SectionHeader section={section} onCommand={onCommand} />
      <div className='grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3'>
        {section.covers.map(id => (
          <CoverTile key={id} entityId={id} />
        ))}
        {extra}
      </div>
    </section>
  );
}

function SectionHeader({ section, onCommand }: { section: ResolvedSection; onCommand: (service: GroupCommand) => void }) {
  const { t } = useI18n();
  const summary = useOpenSummary(section.covers);
  return (
    <div className='flex items-center justify-between gap-3 @2xl:w-44 @2xl:shrink-0 @2xl:flex-col @2xl:items-start @2xl:pt-2'>
      <div className='min-w-0'>
        {section.name && <h3 className='truncate text-xl font-semibold leading-snug'>{section.name}</h3>}
        <span className='block text-sm text-[var(--ds-ink-muted)]'>{summary}</span>
      </div>
      {section.covers.length > 1 && (
        <div className='flex shrink-0 gap-2'>
          <button
            onClick={() => onCommand('open_cover')}
            aria-label={t('widgets.cover_sections.openSection')}
            title={t('widgets.cover_sections.openSection')}
            className={ROUND_BUTTON}
          >
            <ChevronsUp size={20} />
          </button>
          <button
            onClick={() => onCommand('stop_cover')}
            aria-label={t('widgets.cover.stopAction')}
            title={t('widgets.cover.stopAction')}
            className={ROUND_BUTTON}
          >
            <Square size={14} />
          </button>
          <button
            onClick={() => onCommand('close_cover')}
            aria-label={t('widgets.cover_sections.closeSection')}
            title={t('widgets.cover_sections.closeSection')}
            className={ROUND_BUTTON}
          >
            <ChevronsDown size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

/** « Tous ouverts », « 1 ouvert sur 2 »… Le décompte se lit d'un coup dans le store HA. */
function useOpenSummary(entityIds: string[]): string {
  const { t } = useI18n();
  const open = useHass(s => entityIds.filter(id => isCoverOpen(s.entities?.[id])).length);
  const total = entityIds.length;
  if (total === 1) return open ? t('widgets.cover.open') : t('widgets.cover.closed');
  if (open === 0) return t('widgets.cover_sections.allClosed');
  if (open === total) return t('widgets.cover_sections.allOpen');
  return t('widgets.cover_sections.someOpen', { open, total });
}

/** Un volet : la variante couchée de la card Volet — nom, état, pilule horizontale, ↑ ■ ↓. */
function CoverTile({ entityId }: { entityId: string }) {
  const { t } = useI18n();
  const motionAllowed = useLowPowerMotion();
  const { entity, state, position, supportsPosition, isOpen, stateWithPosition, holdPosition, sendPosition, call } = useCover(entityId);

  if (!entity) {
    return (
      <div className='flex min-h-[132px] items-center rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-4'>
        <CardPlaceholder icon={Blinds} text={t('widgets.cover.notFound')} />
      </div>
    );
  }

  const name = friendlyName(entity) ?? entityId;
  return (
    <div className='flex min-w-0 flex-col gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-4'>
      <div className='min-w-0'>
        <span className='block truncate text-[17px] font-semibold leading-tight'>{name}</span>
        <span className={cn('block truncate text-sm', isOpen ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]')}>
          {stateWithPosition}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        {supportsPosition ? (
          <PillSlider
            value={position}
            // Doigt posé : tenue jusqu'au relâchement, même immobile.
            onChange={value => holdPosition(value, 60_000)}
            onCommit={sendPosition}
            bubble={value => t('widgets.cover.percentOpen', { value: Math.round(value) })}
            label={name}
            valueText={t('widgets.cover.percentOpen', { value: Math.round(position) })}
            icon={Blinds}
            className='min-w-0 flex-1'
          />
        ) : (
          <div className='flex-1' />
        )}
        <motion.button
          {...coverArrowMotion(state, 'up', motionAllowed)}
          onClick={() => call('open_cover')}
          aria-label={t('widgets.cover.openAction')}
          title={t('widgets.cover.openAction')}
          className={ROUND_BUTTON}
        >
          <ChevronUp size={20} />
        </motion.button>
        <button
          onClick={() => call('stop_cover')}
          aria-label={t('widgets.cover.stopAction')}
          title={t('widgets.cover.stopAction')}
          className={ROUND_BUTTON}
        >
          <Square size={14} />
        </button>
        <motion.button
          {...coverArrowMotion(state, 'down', motionAllowed)}
          onClick={() => call('close_cover')}
          aria-label={t('widgets.cover.closeAction')}
          title={t('widgets.cover.closeAction')}
          className={ROUND_BUTTON}
        >
          <ChevronDown size={20} />
        </motion.button>
      </div>
    </div>
  );
}

/** « Toute la maison » : ouvrir ou fermer d'un coup les volets choisis. */
function AllCoversBlock({
  title,
  entityIds,
  onCommand,
}: {
  title: string;
  entityIds: string[];
  onCommand: (service: GroupCommand) => void;
}) {
  const { t } = useI18n();
  const open = useHass(s => entityIds.filter(id => isCoverOpen(s.entities?.[id])).length);
  const button =
    'flex h-14 min-w-0 items-center justify-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 text-base font-semibold active:scale-[0.98] transition-transform';
  return (
    <div className='flex min-w-0 flex-col justify-between gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-4'>
      <div className='flex items-baseline justify-between gap-3'>
        <span className='truncate text-[17px] font-semibold'>{title}</span>
        <span className='shrink-0 text-sm text-[var(--ds-ink-muted)]'>
          {t('widgets.cover_sections.openCount', { open, total: entityIds.length })}
        </span>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <button onClick={() => onCommand('open_cover')} className={button}>
          <ChevronsUp size={20} className='shrink-0' />
          <span className='truncate'>{t('widgets.cover_sections.openAll')}</span>
        </button>
        <button onClick={() => onCommand('close_cover')} className={button}>
          <ChevronsDown size={20} className='shrink-0' />
          <span className='truncate'>{t('widgets.cover_sections.closeAll')}</span>
        </button>
      </div>
    </div>
  );
}
