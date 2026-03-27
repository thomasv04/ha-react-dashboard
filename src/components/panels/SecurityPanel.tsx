import { ShieldHalf } from 'lucide-react';
import { Panel } from '@/components/layout/Panel';
import { AlarmCard } from '@/components/cards/AlarmCard/AlarmCard';

const CAMERAS = [
  { id: 'camera.sonnette_frigate', label: 'Sonnette' },
  { id: 'camera.cuisine', label: 'Cuisine' },
  { id: 'camera.salon_frigate', label: 'Salon' },
  { id: 'camera.couloir_frigate', label: 'Couloir' },
];

export function SecurityPanel() {
  return (
    <Panel title='Sécurité' icon={<ShieldHalf size={18} />}>
      {/* Alarm control */}
      <AlarmCard />

      {/* Camera grid */}
      <div>
        <div className='text-white/50 text-xs uppercase tracking-wider mb-2 font-medium px-1'>Caméras</div>
        <div className='grid grid-cols-2 gap-2'>
          {CAMERAS.map(cam => (
            <div key={cam.id} className='gc-inner rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative'>
              {/* 
                Note: Pour afficher un flux caméra en direct, vous pouvez utiliser l'URL :
                <img src={`${import.meta.env.VITE_HA_URL}/api/camera_proxy/${cam.id}?token=...`} />
                Ou intégrer une solution comme go2rtc pour les flux HLS.
              */}
              <img
                src={`${import.meta.env.VITE_HA_URL}/api/camera_proxy/${cam.id}`}
                alt={cam.label}
                className='w-full h-full object-cover'
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 px-2 py-1'>
                <span className='text-white text-xs font-medium'>{cam.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
