import { RotateCcw } from 'lucide-react';
import { IconPicker } from '@/components/layout/WidgetPickers';
import type { WeatherCondition } from '@/types/widget-types';

const WEATHER_CONDITIONS: { key: WeatherCondition; label: string }[] = [
  { key: 'sunny', label: '☀️ Ensoleillé' },
  { key: 'clear-night', label: '🌙 Nuit claire' },
  { key: 'partlycloudy', label: '⛅ Partiellement nuageux' },
  { key: 'cloudy', label: '☁️ Nuageux' },
  { key: 'fog', label: '🌫️ Brouillard' },
  { key: 'rainy', label: '🌧️ Pluvieux' },
  { key: 'pouring', label: '🌧️ Forte pluie' },
  { key: 'snowy', label: '❄️ Enneigé' },
  { key: 'snowy-rainy', label: '🌨️ Neige et pluie' },
  { key: 'hail', label: '🧊 Grêle' },
  { key: 'lightning', label: '⚡ Orage' },
  { key: 'lightning-rainy', label: '⛈️ Orage pluvieux' },
  { key: 'windy', label: '💨 Venteux' },
  { key: 'windy-variant', label: '💨 Très venteux' },
  { key: 'exceptional', label: '⚠️ Exceptionnel' },
];

export function WeatherIconsEditor({
  value,
  onChange,
}: {
  value: Partial<Record<WeatherCondition, string>> | undefined;
  onChange: (v: Partial<Record<WeatherCondition, string>>) => void;
}) {
  const icons = value ?? {};
  const customCount = Object.values(icons).filter(Boolean).length;

  return (
    <div className='space-y-3'>
      <div>
        <h3 className='text-sm text-white/70 font-medium'>Icônes météo personnalisées</h3>
        <p className='text-[10px] text-white/30 mt-1'>
          Personnalisez l'icône de chaque condition. Laissez vide pour l'icône par défaut.
          {customCount > 0 && (
            <span className='ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px]'>
              {customCount} personnalisée{customCount > 1 ? 's' : ''}
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
                label={cond.label}
              />
            </div>
            {icons[cond.key] && (
              <button
                onClick={() => {
                  const next = { ...icons };
                  delete next[cond.key];
                  onChange(next);
                }}
                className='p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors mb-[1px]'
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
