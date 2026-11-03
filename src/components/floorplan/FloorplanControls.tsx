import { useState } from 'react';
import { Funnel, Home, Layers, Lightbulb, Sun } from 'lucide-react';
import { PillSlider } from '@/components/ds/PillSlider';
import { COLOR_TEMP_TRACK, HUE_TRACK, TRACK_MARKER } from '@/components/ds/light-tracks';
import { LightSwatches, lightState, useLightActions } from '@/components/ds/LightControls';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { friendlyName } from '@/lib/ha-service';
import type { ChipKind } from '@/lib/floorplan';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/** La puce « Ma maison » : le retour à la vue d'ensemble — la puce « maison » de l'Echo Show. */
export function HomePill({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      data-floorplan-home
      title={t('layout.floorplan.homeBack')}
      className='flex h-[52px] items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-home)] pl-4 pr-5 text-[17px] font-semibold text-[var(--ds-home-ink)] shadow-[var(--ds-shadow-pin)]'
    >
      <Home size={20} />
      {t('layout.floorplan.homePill')}
    </button>
  );
}

/** Une pastille ronde de la pile en bas à droite. */
const STACK = 'rounded-[28px] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] shadow-[var(--ds-shadow-pin)]';
const ACTIVE = 'bg-[var(--ds-ink)] text-[var(--ds-surface-1)]';

/**
 * Le sélecteur d'étages, en colonne : le plus haut en haut, comme un
 * ascenseur, puis « toute la maison ».
 */
export function LevelPicker({
  levels,
  level,
  onChange,
}: {
  levels: { id: string }[];
  level: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <div role='group' aria-label={t('layout.floorplan.levels')} data-floorplan-levels className={cn('flex flex-col gap-1.5 p-1.5', STACK)}>
      {levels
        .map((l, i) => ({
          id: l.id,
          short: i ? String(i) : t('layout.floorplan.levelGroundShort'),
          name: i ? t('layout.floorplan.levelN', { n: i }) : t('layout.floorplan.levelGround'),
        }))
        .reverse()
        .map(l => (
          <button
            key={l.id}
            onClick={() => onChange(l.id)}
            aria-pressed={level === l.id}
            aria-label={l.name}
            title={l.name}
            className={cn(
              'flex size-12 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition-colors',
              level === l.id && ACTIVE
            )}
          >
            {l.short}
          </button>
        ))}
      <button
        onClick={() => onChange(null)}
        aria-pressed={level === null}
        aria-label={t('layout.floorplan.levelAll')}
        title={t('layout.floorplan.levelAll')}
        className={cn('flex size-12 items-center justify-center rounded-full transition-colors', level === null && ACTIVE)}
      >
        <Layers size={20} />
      </button>
    </div>
  );
}

/**
 * Le filtre : quelles familles de pastilles la maison montre. Un toucher ouvre
 * la liste des familles présentes sur la page, chacune se coche ou se décoche.
 */
export function ChipFilter({
  kinds,
  hidden,
  onToggle,
}: {
  kinds: ChipKind[];
  hidden: ReadonlySet<ChipKind>;
  onToggle: (kind: ChipKind) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const filtering = kinds.some(k => hidden.has(k));
  return (
    <div className='relative' data-floorplan-filter>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-pressed={filtering}
        aria-label={t('layout.floorplan.filter')}
        title={t('layout.floorplan.filter')}
        className={cn('flex size-12 items-center justify-center rounded-full', STACK, filtering && ACTIVE)}
      >
        <Funnel size={20} />
      </button>
      {open && (
        <>
          {/* Un toucher ailleurs referme la liste. */}
          <div className='fixed inset-0 z-10' onClick={() => setOpen(false)} />
          <ul
            role='group'
            aria-label={t('layout.floorplan.filter')}
            className='absolute bottom-0 right-full z-20 mr-3 min-w-52 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-1.5 text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]'
          >
            {kinds.map(kind => {
              const shown = !hidden.has(kind);
              return (
                <li key={kind}>
                  <button
                    role='switch'
                    aria-checked={shown}
                    onClick={() => onToggle(kind)}
                    className='flex w-full items-center gap-3 rounded-[var(--ds-radius-md)] px-3 py-2.5 text-left text-[15px]'
                  >
                    <span className='flex-1'>{t(`layout.floorplan.filterKind.${kind}`)}</span>
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-6 w-11 items-center rounded-full p-0.5 transition-colors',
                        shown ? 'justify-end bg-[var(--ds-tile-on)]' : 'justify-start bg-[var(--ds-surface-3)]'
                      )}
                    >
                      <span className='size-5 rounded-full bg-white' />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Le popover d'une lampe, posé à côté de sa pastille (`at`, en px dans le
 * plan) : l'interrupteur, la luminosité, une rangée de couleurs et la roue —
 * la teinte au curseur —, ou la température de blanc d'une lampe qui n'a que ça.
 */
export function LightPopover({
  entityId,
  at,
  bounds,
  onClose,
}: {
  entityId: string;
  at: { x: number; y: number };
  /** Largeur et hauteur du plan, pour ne pas en sortir. */
  bounds: { w: number; h: number };
  onClose: () => void;
}) {
  const { t } = useI18n();
  const entity = useSafeEntity(entityId);
  const actions = useLightActions(entityId);
  const [wheel, setWheel] = useState(false);
  if (!entity) return null;

  const name = friendlyName(entity) ?? entityId;
  const s = lightState(entity);
  const WIDTH = 288;
  const left = Math.min(Math.max(at.x - WIDTH / 2, 8), Math.max(bounds.w - WIDTH - 8, 8));
  // Sous la pastille ; au-dessus quand il n'y a pas la place.
  const below = at.y < bounds.h / 2;

  return (
    <>
      <div className='fixed inset-0 z-30' onClick={onClose} />
      <div
        role='dialog'
        aria-label={name}
        data-floorplan-light-popover={entityId}
        className='absolute z-40 flex flex-col gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-4 text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]'
        style={{ width: WIDTH, left, ...(below ? { top: at.y + 28 } : { bottom: bounds.h - at.y + 28 }) }}
      >
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            <p className='truncate text-[17px] font-semibold'>{name}</p>
            <p className='text-sm text-[var(--ds-ink-muted)]'>
              {s.isOn ? (s.dimmable ? `${s.brightnessPct} %` : t('widgets.light.on')) : t('widgets.light.off')}
            </p>
          </div>
          <button
            role='switch'
            aria-checked={s.isOn}
            aria-label={name}
            onClick={actions.toggle}
            className={cn(
              'flex h-12 w-[88px] shrink-0 items-center rounded-[var(--ds-radius-pill)] p-1 transition-colors',
              s.isOn ? 'justify-end bg-[var(--ds-tile-on)]' : 'justify-start bg-[var(--ds-surface-3)]'
            )}
          >
            <span className='flex size-10 items-center justify-center rounded-full bg-white'>
              <Lightbulb
                size={20}
                aria-hidden
                className={s.isOn ? 'text-[var(--ds-tile-on)]' : 'text-[#7a8597]'}
                fill={s.isOn ? 'currentColor' : 'none'}
              />
            </span>
          </button>
        </div>

        {s.dimmable && (
          <PillSlider
            value={s.brightnessPct}
            onChange={actions.brightness}
            label={t('widgets.light.brightness')}
            valueText={`${s.brightnessPct} %`}
            icon={Sun}
          />
        )}

        {s.color && (
          <>
            <div className='flex flex-wrap items-center justify-center gap-2.5'>
              <LightSwatches hue={s.hue} isOn={s.isOn} onPick={actions.hue} ring='var(--ds-surface-2)' className='gap-2.5 *:size-9' />
              <button
                onClick={() => setWheel(w => !w)}
                aria-pressed={wheel}
                aria-label={t('layout.floorplan.colorWheel')}
                title={t('layout.floorplan.colorWheel')}
                className={cn('size-9 shrink-0 rounded-full', wheel && 'shadow-[0_0_0_3px_var(--ds-surface-2),0_0_0_6px_var(--ds-ink)]')}
                style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
              />
            </div>
            {wheel && (
              <PillSlider
                value={s.hue}
                max={359}
                track={HUE_TRACK}
                fill={TRACK_MARKER}
                label={t('widgets.light.hue')}
                valueText={`${s.hue}°`}
                onChange={actions.hue}
              />
            )}
          </>
        )}

        {!s.color && s.colorTemp && (
          <PillSlider
            value={s.kelvin ?? s.minKelvin}
            min={s.minKelvin}
            max={s.maxKelvin}
            track={COLOR_TEMP_TRACK}
            fill={TRACK_MARKER}
            label={t('widgets.light.colorTemp')}
            valueText={`${s.kelvin ?? s.minKelvin} K`}
            onChange={actions.kelvin}
          />
        )}
      </div>
    </>
  );
}
