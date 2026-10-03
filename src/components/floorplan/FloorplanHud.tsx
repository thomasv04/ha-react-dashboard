import type { HassEntity } from 'home-assistant-js-websocket';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';

/** Lisible sur un ciel clair comme sur un ciel de nuit. */
const ON_SKY = { textShadow: '0 1px 2px rgb(0 0 0 / 0.45), 0 0 18px rgb(0 0 0 / 0.4)' };

/**
 * La météo écrite sur le ciel, en haut à droite, sans card : la température en
 * grand, l'état du ciel, le prochain coucher — ou lever — du soleil, le vent
 * et l'humidité.
 */
export function SkyWeather({ weather, sun }: { weather: HassEntity; sun: HassEntity | undefined }) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const a = weather.attributes;
  // `partly-cloudy` : l'orthographe de quelques intégrations, pour le `partlycloudy` de HA.
  const condition =
    [weather.state, weather.state.replace(/-/g, '')]
      .map(state => t(`widgets.weather.conditions.${state}`))
      .find(text => !text.startsWith('widgets.')) ?? weather.state.replace(/[-_]/g, ' ');
  // Le soleil levé, son coucher ; couché, son lever.
  const up = sun?.state === 'above_horizon';
  const next = sun?.attributes?.[up ? 'next_setting' : 'next_rising'];
  const details = [
    typeof next === 'string' && t(up ? 'layout.floorplan.skySunset' : 'layout.floorplan.skySunrise', { time: formatTime(new Date(next)) }),
    typeof a.wind_speed === 'number' &&
      t('layout.floorplan.skyWind', { value: `${Math.round(a.wind_speed)} ${a.wind_speed_unit ?? 'km/h'}` }),
    typeof a.humidity === 'number' && t('layout.floorplan.skyHumidity', { value: Math.round(a.humidity) }),
  ].filter(Boolean);

  return (
    <div data-floorplan-weather className='text-right text-white pointer-events-none select-none' style={ON_SKY}>
      {typeof a.temperature === 'number' && (
        <p className='text-[clamp(3rem,7cqi,5.5rem)] font-extralight leading-none tabular-nums'>{Math.round(a.temperature)}°</p>
      )}
      <p className='mt-1 text-lg font-semibold'>{condition}</p>
      {details.length > 0 && <p className='text-sm text-white/85'>{details.join(' · ')}</p>}
    </div>
  );
}
