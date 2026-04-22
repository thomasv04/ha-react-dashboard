import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Gauge, Thermometer } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { MoreInfoHeader } from './MoreInfoHeader';
import { HistoryGraph } from '@/components/charts/HistoryGraph';

interface ForecastEntry {
  datetime: string;
  temperature?: number;
  templow?: number;
  condition?: string;
  precipitation_probability?: number;
}

function conditionLabel(condition: string): string {
  const MAP: Record<string, string> = {
    'clear-night': 'Nuit claire',
    cloudy: 'Nuageux',
    sunny: 'Ensoleillé',
    rainy: 'Pluvieux',
    snowy: 'Neigeux',
    partlycloudy: 'Partiellement nuageux',
    fog: 'Brouillard',
    windy: 'Venteux',
    lightning: 'Orageux',
    'lightning-rainy': 'Orage pluvieux',
    hail: 'Grêle',
    exceptional: 'Exceptionnel',
    pouring: 'Fortes pluies',
  };
  return MAP[condition] ?? condition.replace(/_/g, ' ');
}

function tempColor(temp: number): string {
  if (temp <= 0) return '#60a5fa';
  if (temp <= 10) return '#22d3ee';
  if (temp <= 20) return '#34d399';
  if (temp <= 28) return '#fbbf24';
  return '#ef4444';
}

export default function WeatherMoreInfo({ entityId }: { entityId: string; widgetId: string }) {
  const entity = useSafeEntity(entityId);
  const { connection } = useHass();
  const [forecastType, setForecastType] = useState<'hourly' | 'daily'>('hourly');
  const [forecasts, setForecasts] = useState<ForecastEntry[]>([]);

  // Weather entity states are conditions (cloudy, sunny...) not numeric
  // Try to find a linked temperature sensor for history graph
  const tempSensorId = entityId.replace('weather.', 'sensor.') + '_temperature';
  const { data: historyData } = useEntityHistory(tempSensorId, 24);

  // Fetch forecasts
  useEffect(() => {
    if (!connection || !entityId) return;
    connection
      .sendMessagePromise<Record<string, { forecast: ForecastEntry[] }>>({
        type: 'call_service',
        domain: 'weather',
        service: 'get_forecasts',
        target: { entity_id: entityId },
        service_data: { type: forecastType },
        return_response: true,
      })
      .then(result => {
        const fc = result?.[entityId]?.forecast ?? [];
        setForecasts(fc);
      })
      .catch(() => setForecasts([]));
  }, [connection, entityId, forecastType]);

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

  const temp = entity.attributes.temperature as number | undefined;
  const humidity = entity.attributes.humidity as number | undefined;
  const pressure = entity.attributes.pressure as number | undefined;
  const windSpeed = entity.attributes.wind_speed as number | undefined;
  const windGust = entity.attributes.wind_gust_speed as number | undefined;
  const dewPoint = entity.attributes.dew_point as number | undefined;
  const precipitation = entity.attributes.precipitation as number | undefined;
  const condition = entity.state;
  const color = temp != null ? tempColor(temp) : '#60a5fa';

  const details = [
    { icon: Droplets, label: 'Humidité', value: humidity != null ? `${humidity}%` : '—' },
    { icon: Gauge, label: 'Pression', value: pressure != null ? `${pressure} hPa` : '—' },
    { icon: Wind, label: 'Vent', value: windSpeed != null ? `${windSpeed} km/h` : '—' },
    { icon: Wind, label: 'Rafales', value: windGust != null ? `${windGust} km/h` : '—' },
    { icon: Thermometer, label: 'Point rosée', value: dewPoint != null ? `${dewPoint}°C` : '—' },
    { icon: Droplets, label: 'Précip.', value: precipitation != null ? `${precipitation} mm` : '—' },
  ];

  return (
    <div className='p-8 md:p-12'>
      <MoreInfoHeader
        icon={Cloud}
        name={(entity.attributes.friendly_name as string) ?? entityId}
        state={conditionLabel(condition)}
        stateColor={color}
      />

      {/* Temperature */}
      {temp != null && (
        <div className='text-6xl font-light text-white mt-4 mb-2'>
          {temp}
          <span className='text-3xl text-white/50'>°C</span>
        </div>
      )}

      {/* Toggle hourly/daily */}
      <div className='flex gap-1 bg-white/5 rounded-xl p-1 w-fit mt-4 mb-6'>
        {(['hourly', 'daily'] as const).map(t => (
          <button
            key={t}
            onClick={() => setForecastType(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              forecastType === t ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t === 'hourly' ? 'HORAIRE' : 'JOURNALIER'}
          </button>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Left: Graph + Forecasts (2 cols) */}
        <div className='lg:col-span-2 space-y-6'>
          {historyData.length >= 2 ? (
            <HistoryGraph data={historyData} color={color} />
          ) : (
            <div className='flex items-center justify-center h-40 text-white/20 text-sm rounded-xl bg-white/[0.02]'>
              Pas d&apos;historique de température disponible
            </div>
          )}

          {/* Forecast cards */}
          {forecasts.length > 0 && (
            <div className='flex gap-2 overflow-x-auto pb-2 scrollbar-thin'>
              {forecasts.slice(0, 12).map(fc => {
                const d = new Date(fc.datetime);
                const label =
                  forecastType === 'hourly'
                    ? `${d.getHours().toString().padStart(2, '0')}h`
                    : d.toLocaleDateString('fr-FR', { weekday: 'short' });
                return (
                  <div
                    key={fc.datetime}
                    className='flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 min-w-[60px] shrink-0'
                  >
                    <span className='text-[10px] text-white/40 uppercase'>{label}</span>
                    <span className='text-sm text-white font-semibold'>{fc.temperature}°</span>
                    {fc.templow != null && <span className='text-[10px] text-white/30'>{fc.templow}°</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Details (1 col) */}
        <div className='space-y-3'>
          <h3 className='text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3'>Détails</h3>
          {details.map(d => (
            <div key={d.label} className='flex items-center gap-3 text-sm'>
              <d.icon size={16} className='text-white/30 shrink-0' />
              <span className='text-white/50'>{d.label}</span>
              <span className='text-white font-medium ml-auto'>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
