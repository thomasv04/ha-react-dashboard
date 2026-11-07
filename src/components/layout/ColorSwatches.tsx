import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

/** Couleurs proposées d'un toucher ; le champ natif couvre le reste. */
const COLOR_PRESETS = ['#3b74e8', '#7a5cf0', '#c04fd6', '#e8466b', '#f07b2e', '#e0b03a', '#2f9e5c', '#14a3a3'];

/**
 * Choix d'une couleur `#rrggbb` : « Par défaut » (valeur vide), les pastilles
 * prédéfinies, puis le sélecteur natif pour toute autre teinte.
 */
export function ColorSwatches({
  value,
  onChange,
  label,
  defaultColor,
}: {
  value: string;
  onChange: (c: string) => void;
  label: string;
  /** Ce que donne « Par défaut », pour sa pastille. */
  defaultColor: string;
}) {
  const { t } = useI18n();
  const ring = (on: boolean) => on && 'outline-[3px] outline-offset-2 outline-[var(--ds-ink)]';
  const swatch = (on: boolean) => cn('flex size-11 shrink-0 items-center justify-center rounded-full', ring(on));

  return (
    <div role='radiogroup' aria-label={label} className='flex flex-wrap items-center gap-3'>
      <button
        role='radio'
        aria-checked={!value}
        onClick={() => onChange('')}
        className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] pr-4 pl-1.5 text-[15px] font-semibold text-[var(--ds-ink)]'
      >
        <span className={cn('size-8 rounded-full', ring(!value))} style={{ background: defaultColor }} />
        {t('common.defaultColor')}
      </button>
      {COLOR_PRESETS.map(c => (
        <button
          key={c}
          role='radio'
          aria-checked={value === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={swatch(value === c)}
          style={{ background: c }}
        />
      ))}
      <label
        className={swatch(!!value && !COLOR_PRESETS.includes(value))}
        title={t('common.otherColor')}
        style={{ background: 'conic-gradient(#e8466b, #f6cf72, #3ecf7a, #14a3a3, #3b74e8, #c04fd6, #e8466b)' }}
      >
        <input
          type='color'
          aria-label={t('common.otherColor')}
          value={value || '#3b74e8'}
          onChange={e => onChange(e.target.value)}
          className='size-0 opacity-0'
        />
      </label>
    </div>
  );
}
