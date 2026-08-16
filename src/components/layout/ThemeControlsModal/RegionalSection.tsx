import { useState } from 'react';
import { Clock, Home, BellOff, Lock, MonitorSmartphone, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { apiFetch } from '@/lib/api-base';

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-blue-500/40 placeholder:text-white/20';

/** Rangée de boutons exclusifs — le patron déjà utilisé pour les palettes. */
function Choice<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className='flex gap-1.5'>
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            value === o.value
              ? 'bg-blue-500/25 border-blue-500/40 text-blue-200'
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-white/45 text-xs'>{label}</span>
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

  return (
    <div className='flex flex-col gap-7'>
      {/* ── Formats ── */}
      <div className='flex flex-col gap-4'>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-2'>
          <Clock size={12} /> {t('settings.regional_section.formats')}
        </h3>
        <p className='text-white/40 text-xs leading-relaxed'>{t('settings.regional_section.intro')}</p>

        <Field label={t('settings.regional_section.hourFormat')}>
          <Choice
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
          <Choice
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
          <Choice
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
          <Choice
            value={regionalSettings.firstDayOfWeek}
            onChange={v => r({ firstDayOfWeek: v })}
            options={[
              { value: 'auto' as const, label: auto },
              { value: 1 as const, label: t('settings.regional_section.monday') },
              { value: 0 as const, label: t('settings.regional_section.sunday') },
            ]}
          />
        </Field>
      </div>

      {/* ── Retour automatique à l'accueil ── */}
      <div className='flex flex-col gap-3'>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-2'>
          <Home size={12} /> {t('settings.regional_section.returnHome')}
        </h3>
        <p className='text-white/40 text-xs leading-relaxed'>{t('settings.regional_section.returnHomeDesc')}</p>
        <div className='flex items-center gap-3'>
          <input
            type='range'
            min={0}
            max={30}
            step={1}
            value={behaviourSettings.returnHomeAfter}
            onChange={e => b({ returnHomeAfter: parseInt(e.target.value, 10) })}
            className='flex-1 accent-blue-500'
          />
          <span className='text-white/40 text-xs w-16 tabular-nums text-right'>
            {behaviourSettings.returnHomeAfter === 0
              ? t('settings.regional_section.never')
              : t('settings.regional_section.minutes', { value: behaviourSettings.returnHomeAfter })}
          </span>
        </div>
      </div>

      {/* ── Ne pas déranger ── */}
      <div className='flex flex-col gap-3'>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-2'>
          <BellOff size={12} /> {t('settings.regional_section.dnd')}
        </h3>
        <label className='flex items-start gap-3 cursor-pointer'>
          <input
            type='checkbox'
            checked={behaviourSettings.doNotDisturb}
            onChange={e => b({ doNotDisturb: e.target.checked })}
            className='mt-0.5 accent-blue-500'
          />
          <span className='text-white/40 text-xs leading-relaxed'>{t('settings.regional_section.dndDesc')}</span>
        </label>
      </div>

      {/* ── Code de verrouillage ── */}
      <div className='flex flex-col gap-3'>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-2'>
          <Lock size={12} /> {t('settings.regional_section.pin')}
        </h3>
        <p className='text-white/40 text-xs leading-relaxed'>{t('settings.regional_section.pinDesc')}</p>
        <input
          type='text'
          inputMode='numeric'
          maxLength={4}
          value={behaviourSettings.editPin}
          // Chiffres uniquement : le champ de saisie du code est numérique, une
          // lettre y serait impossible à retaper.
          onChange={e => b({ editPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          placeholder={t('settings.regional_section.pinPlaceholder')}
          className={`${inputClass} w-32 text-center tracking-[0.4em] font-mono`}
        />
        <p className='text-amber-400/60 text-[11px] leading-relaxed'>{t('settings.regional_section.pinWarning')}</p>
      </div>

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
            background: theme.background,
            cardOpacity: theme.cardOpacity,
            perfSettings: theme.perfSettings,
            autoTheme: theme.autoTheme,
            layoutSettings: theme.layoutSettings,
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
    <div className='flex flex-col gap-3'>
      <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-2'>
        <MonitorSmartphone size={12} /> {t('settings.regional_section.broadcast')}
      </h3>
      <p className='text-white/40 text-xs leading-relaxed'>{t('settings.regional_section.broadcastDesc')}</p>

      {state === 'confirm' && (
        <p className='text-amber-400 text-xs flex items-center gap-2'>
          <AlertTriangle size={12} /> {t('settings.regional_section.broadcastConfirm')}
        </p>
      )}
      {state === 'done' && (
        <p className='text-emerald-400 text-xs'>{t('settings.regional_section.broadcastDone', { value: count })}</p>
      )}
      {state === 'error' && <p className='text-red-400 text-xs'>{t('settings.regional_section.broadcastError')}</p>}

      <button
        onClick={broadcast}
        disabled={state === 'done'}
        className={`self-start flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          state === 'confirm'
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
            : 'bg-white/8 border-white/12 text-white/70 hover:bg-white/12 hover:text-white'
        }`}
      >
        <MonitorSmartphone size={12} />
        {state === 'confirm' ? t('settings.regional_section.broadcastConfirmBtn') : t('settings.regional_section.broadcastBtn')}
      </button>
    </div>
  );
}
