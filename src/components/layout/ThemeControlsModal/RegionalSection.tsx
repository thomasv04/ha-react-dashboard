import { useState } from 'react';
import { MonitorSmartphone, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { apiFetch } from '@/lib/api-base';
import { PerfToggle } from './PerfToggle';
import { BUTTON_SECONDARY, INPUT, Segmented } from './controls';
import { FIELD_LABEL, SECTION_HEADING, SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-2'>
      <span className={FIELD_LABEL}>{label}</span>
      {children}
    </div>
  );
}

/**
 * Formats régionaux et comportements propres à l'appareil.
 *
 * Ces réglages sont enregistrés par appareil : une tablette murale peut
 * verrouiller son mode édition et revenir à l'accueil, sans que le téléphone
 * du salon en hérite.
 */
export function RegionalSection() {
  const { t } = useI18n();
  const { regionalSettings, setRegionalSettings, behaviourSettings, setBehaviourSettings } = useTheme();

  const r = (patch: Partial<typeof regionalSettings>) => setRegionalSettings({ ...regionalSettings, ...patch });
  const b = (patch: Partial<typeof behaviourSettings>) => setBehaviourSettings({ ...behaviourSettings, ...patch });

  const auto = t('settings.regional_section.auto');
  const minutes = behaviourSettings.returnHomeAfter;

  return (
    <div className='flex flex-col gap-3'>
      {/* ── Formats ── */}
      <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')}>
        <div>
          <h3 className={SECTION_HEADING}>{t('settings.regional_section.formats')}</h3>
          <p className='mt-1 text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.regional_section.intro')}</p>
        </div>

        <Field label={t('settings.regional_section.hourFormat')}>
          <Segmented
            value={regionalSettings.hourFormat}
            onChange={v => r({ hourFormat: v })}
            options={[
              { value: 'auto' as const, label: auto },
              { value: '24' as const, label: '24 h' },
              { value: '12' as const, label: '12 h (AM/PM)' },
            ]}
          />
        </Field>

        <Field label={t('settings.regional_section.dateStyle')}>
          <Segmented
            value={regionalSettings.dateStyle}
            onChange={v => r({ dateStyle: v })}
            options={[
              { value: 'short' as const, label: t('settings.regional_section.dateShort') },
              { value: 'medium' as const, label: t('settings.regional_section.dateMedium') },
              { value: 'long' as const, label: t('settings.regional_section.dateLong') },
            ]}
          />
        </Field>

        <Field label={t('settings.regional_section.tempUnit')}>
          <Segmented
            value={regionalSettings.tempUnit}
            onChange={v => r({ tempUnit: v })}
            options={[
              { value: 'auto' as const, label: auto },
              { value: 'C' as const, label: '°C' },
              { value: 'F' as const, label: '°F' },
            ]}
          />
        </Field>

        <Field label={t('settings.regional_section.firstDay')}>
          <Segmented
            value={regionalSettings.firstDayOfWeek}
            onChange={v => r({ firstDayOfWeek: v })}
            options={[
              { value: 'auto' as const, label: auto },
              { value: 1 as const, label: t('settings.regional_section.monday') },
              { value: 0 as const, label: t('settings.regional_section.sunday') },
            ]}
          />
        </Field>
      </section>

      {/* ── Retour automatique à l'accueil ── */}
      <section className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}>
        <div className='flex items-baseline justify-between gap-4'>
          <h3 className={SECTION_HEADING}>{t('settings.regional_section.returnHome')}</h3>
          <span className='text-[28px] font-bold tabular-nums text-[var(--ds-accent)]'>
            {minutes === 0 ? t('settings.regional_section.never') : t('settings.regional_section.minutes', { value: minutes })}
          </span>
        </div>
        <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.regional_section.returnHomeDesc')}</p>
        <input
          type='range'
          min={0}
          max={30}
          step={1}
          value={minutes}
          aria-label={t('settings.regional_section.returnHome')}
          onChange={e => b({ returnHomeAfter: parseInt(e.target.value, 10) })}
          className='h-8 w-full accent-[var(--ds-accent)]'
        />
      </section>

      {/* ── Ne pas déranger ── */}
      <PerfToggle
        checked={behaviourSettings.doNotDisturb}
        onChange={doNotDisturb => b({ doNotDisturb })}
        label={t('settings.regional_section.dnd')}
        description={t('settings.regional_section.dndDesc')}
      />

      {/* ── Code de verrouillage ── */}
      <section className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}>
        <h3 className={SECTION_HEADING}>{t('settings.regional_section.pin')}</h3>
        <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.regional_section.pinDesc')}</p>
        <input
          type='text'
          inputMode='numeric'
          maxLength={4}
          value={behaviourSettings.editPin}
          aria-label={t('settings.regional_section.pin')}
          // Chiffres uniquement : le champ de saisie du code est numérique, une
          // lettre y serait impossible à retaper.
          onChange={e => b({ editPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          placeholder={t('settings.regional_section.pinPlaceholder')}
          className={cn(INPUT, 'w-40 text-center font-mono tracking-[0.4em]')}
        />
        <p className='text-[15px] leading-relaxed text-[var(--ds-warm-light)]'>{t('settings.regional_section.pinWarning')}</p>
      </section>

      <BroadcastButton />
    </div>
  );
}

/**
 * Recopie les réglages de cet appareil sur tous les autres.
 *
 * Reconfigurer quatre tablettes à la main, quatre fois, était le prix à payer
 * pour des réglages par appareil. Le bouton demande confirmation en deux temps :
 * l'action écrase les choix des autres et n'est pas annulable.
 */
function BroadcastButton() {
  const { t } = useI18n();
  const theme = useTheme();
  const [state, setState] = useState<'idle' | 'confirm' | 'done' | 'error'>('idle');
  const [count, setCount] = useState(0);

  const broadcast = async () => {
    if (state !== 'confirm') return setState('confirm');
    try {
      const res = await apiFetch('/api/settings/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Exactement ce que cet appareil enregistre pour lui-même.
        body: JSON.stringify({
          data: {
            themeId: theme.themeId,
            perfSettings: theme.perfSettings,
            autoTheme: theme.autoTheme,
            soundSettings: theme.soundSettings,
            regionalSettings: theme.regionalSettings,
            behaviourSettings: theme.behaviourSettings,
          },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCount((await res.json()).devices ?? 0);
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <section className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}>
      <h3 className={SECTION_HEADING}>{t('settings.regional_section.broadcast')}</h3>
      <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.regional_section.broadcastDesc')}</p>

      {state === 'confirm' && (
        <p className='flex items-center gap-2 text-[15px] text-[var(--ds-warm-light)]'>
          <AlertTriangle size={16} /> {t('settings.regional_section.broadcastConfirm')}
        </p>
      )}
      {state === 'done' && (
        <p className='text-[15px] text-[var(--ds-good)]'>{t('settings.regional_section.broadcastDone', { value: count })}</p>
      )}
      {state === 'error' && <p className='text-[15px] text-[var(--ds-alert)]'>{t('settings.regional_section.broadcastError')}</p>}

      <button
        onClick={broadcast}
        disabled={state === 'done'}
        className={cn(BUTTON_SECONDARY, 'self-start', state === 'confirm' && 'text-[var(--ds-warm-light)]')}
      >
        <MonitorSmartphone size={18} />
        {state === 'confirm' ? t('settings.regional_section.broadcastConfirmBtn') : t('settings.regional_section.broadcastBtn')}
      </button>
    </section>
  );
}
