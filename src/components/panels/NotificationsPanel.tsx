import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, WashingMachine } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { Panel } from '@/components/layout/Panel';
import { cn } from '@/lib/utils';

interface NotifConfig {
  entityId: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const NOTIFICATIONS: NotifConfig[] = [
  {
    entityId: 'input_boolean.display_notification_trash',
    label: 'Sortir les poubelles',
    icon: <Trash2 size={18} />,
    color: 'text-green-400 bg-green-400/10 border-green-400/20',
  },
  {
    entityId: 'input_boolean.display_notification_washing_machine',
    label: 'Machine à laver terminée',
    icon: <WashingMachine size={18} />,
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  },
];

function NotifCard({ config }: { config: NotifConfig }) {
  const entity = useSafeEntity(config.entityId);
  const { helpers } = useHass();
  if (!entity || entity.state !== 'on') return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      layout
      className={cn('flex items-center justify-between rounded-2xl px-4 py-3 border', config.color)}
    >
      <div className='flex items-center gap-3'>
        {config.icon}
        <span className='text-white font-medium text-sm'>{config.label}</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => helpers.callService({ domain: 'input_boolean', service: 'turn_off', target: { entity_id: config.entityId } })}
        className='text-white/40 hover:text-white/70 transition-colors'
      >
        ✕
      </motion.button>
    </motion.div>
  );
}

export function NotificationsPanel() {
  const hasAny = NOTIFICATIONS.some(() => true); // always render panel

  return (
    <Panel title='Notifications' icon={<Bell size={18} />}>
      <AnimatePresence>
        {NOTIFICATIONS.map(n => (
          <NotifCard key={n.entityId} config={n} />
        ))}
      </AnimatePresence>

      {!hasAny && (
        <div className='text-center text-white/30 py-8'>
          <Bell size={32} className='mx-auto mb-2 opacity-30' />
          <p>Aucune notification active</p>
        </div>
      )}
    </Panel>
  );
}
