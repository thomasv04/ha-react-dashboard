import { motion } from 'framer-motion';
import { DURATION_CINEMATIC } from '@/lib/motion-tokens';
import { Play, Square, LocateFixed, Home, Cpu } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { Panel } from '@/components/layout/Panel';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

const VACUUM_ID = 'vacuum.roborock_qrevo_maxv';

const ROOMS_BOOLEANS = [
  { id: 'input_boolean.laver_cuisine', label: 'Cuisine' },
  { id: 'input_boolean.laver_cellier', label: 'Cellier' },
  { id: 'input_boolean.laver_salle_a_manger', label: 'Salle à manger' },
  { id: 'input_boolean.laver_salon', label: 'Salon' },
  { id: 'input_boolean.laver_chambre_amis', label: 'Ch. invités' },
  { id: 'input_boolean.laver_salle_de_bain', label: 'Salle de bain' },
  { id: 'input_boolean.laver_chambre', label: 'Chambre' },
  { id: 'input_boolean.laver_bureau', label: 'Bureau' },
  { id: 'input_boolean.laver_repos', label: 'Repos' },
];

const STATE_LABEL_KEYS: Record<string, string> = {
  cleaning: 'panels.vacuum_panel.cleaning',
  segment_cleaning: 'panels.vacuum_panel.segmented',
  returning_home: 'panels.vacuum_panel.returning',
  docked: 'panels.vacuum_panel.charging',
  idle: 'panels.vacuum_panel.idle',
  paused: 'panels.vacuum_panel.paused',
  error: 'panels.vacuum_panel.error',
};

function RoomToggle({ entityId, label }: { entityId: string; label: string }) {
  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();
  if (!entity) return null;
  const isOn = entity.state === 'on';

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => helpers.callService({ domain: 'input_boolean', service: 'toggle', target: { entity_id: entityId } })}
      className={cn(
        'py-2.5 px-3 rounded-2xl text-xs font-semibold transition-colors border',
        isOn ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'gc-inner border-transparent text-white/40 hover:text-white/60'
      )}
    >
      {label}
    </motion.button>
  );
}

export function VacuumPanel() {
  const { t } = useI18n();
  const vacuum = useSafeEntity(VACUUM_ID);
  const { helpers } = useHass();

  const battery = vacuum?.attributes.battery_level as number | undefined;
  const stateLabel = vacuum
    ? STATE_LABEL_KEYS[vacuum.state]
      ? t(STATE_LABEL_KEYS[vacuum.state])
      : vacuum.state
    : t('panels.vacuum_panel.unavailable');

  function call(service: string) {
    helpers.callService({ domain: 'vacuum', service: service as never, target: { entity_id: VACUUM_ID } });
  }

  return (
    <Panel title={t('panels.vacuum_panel.title')} icon={<Cpu size={18} />}>
      {/* Status */}
      <div className='gc-inner rounded-2xl p-4 flex items-center justify-between'>
        <div>
          <div className='text-white font-semibold'>{stateLabel}</div>
          {battery !== undefined && (
            <div className='text-white/40 text-xs mt-1'>
              {t('panels.vacuum_panel.battery', { value: battery })}
              <span className='ml-2 inline-block w-20 h-1.5 bg-white/8 rounded-full overflow-hidden align-middle'>
                <motion.span
                  animate={{ width: `${battery}%` }}
                  transition={{ duration: DURATION_CINEMATIC }}
                  className={cn('block h-full rounded-full', battery > 50 ? 'bg-green-400' : battery > 20 ? 'bg-yellow-400' : 'bg-red-400')}
                />
              </span>
            </div>
          )}
        </div>
        <Cpu size={24} className='text-white/20' />
      </div>

      {/* Controls */}
      <div className='grid grid-cols-4 gap-2'>
        {[
          {
            icon: <Play size={16} />,
            action: 'start',
            label: t('panels.vacuum_panel.start'),
            color: 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
          },
          {
            icon: <Square size={16} />,
            action: 'stop',
            label: t('panels.vacuum_panel.stop'),
            color: 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
          },
          {
            icon: <LocateFixed size={16} />,
            action: 'locate',
            label: t('panels.vacuum_panel.locate'),
            color: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
          },
          { icon: <Home size={16} />, action: 'return_to_base', label: t('panels.vacuum_panel.dock'), color: 'gc-btn text-white/60' },
        ].map(({ icon, action, label, color }) => (
          <motion.button
            key={action}
            whileTap={{ scale: 0.93 }}
            onClick={() => call(action)}
            className={cn('flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-colors', color)}
          >
            {icon}
            {label}
          </motion.button>
        ))}
      </div>

      {/* Room selection */}
      <div>
        <div className='text-white/50 text-xs uppercase tracking-wider mb-2 font-medium px-1'>{t('panels.vacuum_panel.rooms')}</div>
        <div className='grid grid-cols-3 gap-2'>
          {ROOMS_BOOLEANS.map(room => (
            <RoomToggle key={room.id} entityId={room.id} label={room.label} />
          ))}
        </div>
      </div>

      {/* Launch */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() =>
          helpers.callService({ domain: 'input_boolean', service: 'turn_on', target: { entity_id: 'input_boolean.lancer_le_lavage' } })
        }
        className='w-full py-3 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold text-sm flex items-center justify-center gap-2'
      >
        <Play size={16} />
        {t('panels.vacuum_panel.launch')}
      </motion.button>
    </Panel>
  );
}
