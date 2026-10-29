import { RotateCcw } from 'lucide-react';
import { IconPicker } from '@/components/layout/WidgetPickers';
import type { WeatherCondition } from '@/types/widget-types';
import { useI18n } from '@/i18n';

// Les noms des conditions vivent déjà dans `widgets.weather.conditions` :
// seul l'emoji est propre à cet éditeur.
const WEATHER_CONDITIONS: { key: WeatherCondition; emoji: string }[] = [
  { key: 'sunny', emoji: '☀️' },
  { key: 'clear-night', emoji: '🌙' },
  { key: 'partlycloudy', emoji: '⛅' },
  { key: 'cloudy', emoji: '☁️' },
  { key: 'fog', emoji: '🌫️' },
  { key: 'rainy', emoji: '🌧️' },
  { key: 'pouring', emoji: '🌧️' },
  { key: 'snowy', emoji: '❄️' },
  { key: 'snowy-rainy', emoji: '🌨️' },
  { key: 'hail', emoji: '🧊' },
  { key: 'lightning', emoji: '⚡' },
  { key: 'lightning-rainy', emoji: '⛈️' },
  { key: 'windy', emoji: '💨' },
  { key: 'windy-variant', emoji: '💨' },
  { key: 'exceptional', emoji: '⚠️' },
];

export function WeatherIconsEditor({
  value,
  onChange,
}: {
  value: Partial<Record<WeatherCondition, string>> | undefined;
  onChange: (v: Partial<Record<WeatherCondition, string>>) => void;
}) {
  const { t } = useI18n();
  const icons = value ?? {};
  const customCount = Object.values(icons).filter(Boolean).length;

  return (
    <div className='space-y-3'>
      <div>
        <h3 className='text-sm text-[var(--ds-ink)] font-medium'>{t('layout.weatherIconsTitle')}</h3>
        <p className='text-[10px] text-[var(--ds-ink-muted)] mt-1'>
          {t('layout.weatherIconsHint')}
          {customCount > 0 && (
            <span className='ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] text-[10px]'>
              {t(customCount > 1 ? 'layout.weatherIconsCountPlural' : 'layout.weatherIconsCount', { count: customCount })}
            </span>
          )}
        </p>
      </div>
      <div className='space-y-2'>
        {WEATHER_CONDITIONS.map(cond => (
          <div key={cond.key} className='flex items-end gap-2'>
            <div className='flex-1'>
              <IconPicker
                value={icons[cond.key] ?? ''}
                onChange={v => {
                  const next = { ...icons };
                  if (v) next[cond.key] = v;
                  else delete next[cond.key];
                  onChange(next);
                }}
                label={`${cond.emoji} ${t(`widgets.weather.conditions.${cond.key}`)}`}
              />
            </div>
            {icons[cond.key] && (
              <button
                onClick={() => {
                  const next = { ...icons };
                  delete next[cond.key];
                  onChange(next);
                }}
                className='p-2 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors mb-[1px]'
                title='Réinitialiser'
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
