import { ArrowUp } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useTheme } from '@/context/ThemeContext';
import { SwitchTrack } from '@/components/ds/Switch';
import { availableCameras, shownCameras } from '@/lib/phone-cameras';
import { friendlyName } from '@/lib/ha-service';
import { useI18n } from '@/i18n';
import { SECTION_HEADING, SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';

/**
 * Les caméras de l'onglet Caméras du téléphone : lesquelles, et dans quel
 * ordre — la première passe en direct, en grand. Sans choix, les caméras
 * Frigate (`shownCameras`). Réglage propre à l'appareil, comme les autres de
 * la Disposition.
 */
export function PhoneCamerasField() {
  const { t } = useI18n();
  const { behaviourSettings, setBehaviourSettings } = useTheme();
  const chosen = behaviourSettings.phoneCameras;
  // En texte : une liste neuve à chaque mise à jour de HA re-rendrait les réglages pour rien.
  const allJoined = useHass(s => availableCameras(s.entities).join(','));
  const autoJoined = useHass(s => shownCameras(s.entities, []).join(','));
  const names = useHass(s => (allJoined ? allJoined.split(',') : []).map(id => friendlyName(s.entities[id]) ?? id).join('\n'));
  const all = allJoined ? allJoined.split(',') : [];
  if (all.length === 0) return null;

  const nameOf = (id: string) => names.split('\n')[all.indexOf(id)] ?? id;
  // Ce qui s'affiche aujourd'hui : le choix, ou le défaut automatique.
  const shown = chosen.length > 0 ? chosen.filter(id => all.includes(id)) : autoJoined ? autoJoined.split(',') : [];
  const save = (next: string[]) => setBehaviourSettings({ ...behaviourSettings, phoneCameras: next });
  const toggle = (id: string) => save(shown.includes(id) ? shown.filter(c => c !== id) : [...shown, id]);
  const moveUp = (id: string) => {
    const i = shown.indexOf(id);
    const next = [...shown];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    save(next);
  };
  // Les cochées d'abord, dans leur ordre ; les autres ensuite.
  const rows = [...shown, ...all.filter(id => !shown.includes(id))];

  return (
    <section className='flex flex-col gap-3'>
      <h3 className={cn(SECTION_HEADING, 'mt-3 px-1')}>{t('layout.phone.cameras.settingsTitle')}</h3>
      <div className={cn(SETTINGS_CARD, 'flex flex-col gap-1')}>
        <p className='mb-2 text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>
          {t(chosen.length > 0 ? 'layout.phone.cameras.settingsChosen' : 'layout.phone.cameras.settingsAuto')}
        </p>
        <ul className='flex flex-col'>
          {rows.map(id => {
            const on = shown.includes(id);
            const index = shown.indexOf(id);
            return (
              <li key={id} className='flex min-h-14 items-center gap-2'>
                <button
                  role='switch'
                  aria-checked={on}
                  onClick={() => toggle(id)}
                  className='flex min-w-0 flex-1 items-center gap-3 py-2 text-left'
                >
                  <SwitchTrack on={on} />
                  <span className='min-w-0'>
                    <span className='block truncate text-[17px] font-semibold'>{nameOf(id)}</span>
                    <span className='block truncate text-[13px] text-[var(--ds-ink-muted)]'>{id}</span>
                  </span>
                </button>
                {on && index > 0 && (
                  <button
                    onClick={() => moveUp(id)}
                    aria-label={t('layout.phone.cameras.moveUp', { name: nameOf(id) })}
                    title={t('layout.phone.cameras.moveUp', { name: nameOf(id) })}
                    className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
                  >
                    <ArrowUp size={18} aria-hidden='true' />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {chosen.length > 0 && (
          <button
            onClick={() => save([])}
            className='mt-2 h-11 self-start rounded-full bg-[var(--ds-surface-3)] px-5 text-[15px] font-semibold'
          >
            {t('layout.phone.cameras.settingsReset')}
          </button>
        )}
      </div>
    </section>
  );
}
