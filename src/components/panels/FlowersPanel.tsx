import { Flower2, Droplets, Thermometer, Sun } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { Panel } from '@/components/layout/Panel';

export function FlowersPanel() {
  const moisture = useSafeEntity('sensor.plante_moisture');
  const temperature = useSafeEntity('sensor.plante_temperature');
  const illuminance = useSafeEntity('sensor.plante_illuminance');
  const humidity = useSafeEntity('sensor.plante_humidity');
  const battery = useSafeEntity('sensor.plante_battery');

  const stats = [
    {
      label: 'Humidité sol',
      value: moisture?.state ?? '—',
      unit: '%',
      icon: <Droplets size={16} />,
      color: 'text-blue-400',
      threshold: { low: 20, high: 80 },
    },
    {
      label: 'Température',
      value: temperature?.state ?? '—',
      unit: '°C',
      icon: <Thermometer size={16} />,
      color: 'text-orange-400',
      threshold: { low: 15, high: 30 },
    },
    {
      label: 'Luminosité',
      value: illuminance?.state ?? '—',
      unit: ' lux',
      icon: <Sun size={16} />,
      color: 'text-yellow-400',
      threshold: { low: 500, high: 50000 },
    },
    {
      label: 'Humidité air',
      value: humidity?.state ?? '—',
      unit: '%',
      icon: <Droplets size={16} />,
      color: 'text-teal-400',
      threshold: { low: 30, high: 80 },
    },
  ];

  return (
    <Panel title='Plantes' icon={<Flower2 size={18} />}>
      <div className='gc-inner rounded-2xl p-4 mb-2'>
        <div className='flex items-center justify-between mb-1'>
          <span className='text-white font-semibold'>Orchidée</span>
          {battery?.state && <span className='text-white/40 text-xs'>🔋 {battery.state}%</span>}
        </div>
        <Flower2 size={20} className='text-pink-400 mb-3' />
        <div className='grid grid-cols-2 gap-3'>
          {stats.map(({ label, value, unit, icon, color, threshold }) => {
            const num = Number(value);
            const low = !isNaN(num) && num < threshold.low;
            const high = !isNaN(num) && num > threshold.high;
            return (
              <div key={label} className='gc rounded-xl p-3'>
                <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
                  {icon}
                  <span className='text-xs text-white/50'>{label}</span>
                </div>
                <div className={`text-lg font-bold ${low ? 'text-red-400' : high ? 'text-orange-400' : 'text-white'}`}>
                  {value}
                  {unit}
                </div>
                {(low || high) && <div className='text-xs text-orange-400 mt-0.5'>{low ? '⚠️ Trop bas' : '⚠️ Trop haut'}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <p className='text-white/20 text-xs text-center'>
        Adapte les entity IDs dans <code>FlowersPanel.tsx</code> selon ton capteur Xiaomi/BT
      </p>
    </Panel>
  );
}
