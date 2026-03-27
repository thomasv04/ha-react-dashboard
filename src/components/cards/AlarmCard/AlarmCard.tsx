import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldOff, Delete, ChevronDown } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';

type AlarmState = 'disarmed' | 'armed_home' | 'armed_away' | 'armed_night' | 'pending' | 'triggered' | string;

function alarmConfig(state: AlarmState) {
  switch (state) {
    case 'armed_home':
      return {
        label: 'Armé — domicile',
        color: 'text-yellow-400',
        bg: 'bg-yellow-400/10',
        border: 'border-yellow-400/20',
        icon: <ShieldCheck size={18} />,
      };
    case 'armed_away':
      return {
        label: 'Armé — absent',
        color: 'text-red-400',
        bg: 'bg-red-400/10',
        border: 'border-red-400/20',
        icon: <ShieldAlert size={18} />,
      };
    case 'armed_night':
      return {
        label: 'Armé — nuit',
        color: 'text-purple-400',
        bg: 'bg-purple-400/10',
        border: 'border-purple-400/20',
        icon: <ShieldCheck size={18} />,
      };
    case 'triggered':
      return {
        label: 'ALERTE !',
        color: 'text-red-400 animate-pulse',
        bg: 'bg-red-400/20',
        border: 'border-red-400/30',
        icon: <ShieldAlert size={18} />,
      };
    case 'disarmed':
      return {
        label: 'Désarmé',
        color: 'text-green-400',
        bg: 'bg-green-400/10',
        border: 'border-green-400/20',
        icon: <ShieldOff size={18} />,
      };
    default:
      return { label: state, color: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10', icon: <ShieldCheck size={18} /> };
  }
}

export function AlarmCard() {
  const alarm = useSafeEntity('alarm_control_panel.alarmo');
  const { helpers } = useHass();
  const [code, setCode] = useState('');
  const [expanded, setExpanded] = useState(false);
  if (!alarm) return null;
  const cfg = alarmConfig(alarm.state);

  const MODES = [
    { label: 'Domicile', service: 'alarm_arm_home', color: 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20' },
    { label: 'Absent', service: 'alarm_arm_away', color: 'text-red-400 bg-red-400/10 hover:bg-red-400/20' },
    { label: 'Nuit', service: 'alarm_arm_night', color: 'text-purple-400 bg-purple-400/10 hover:bg-purple-400/20' },
  ];

  function arm(service: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (helpers.callService as any)({
      domain: 'alarm_control_panel',
      service,
      target: { entity_id: 'alarm_control_panel.alarmo' },
      serviceData: { code },
    });
    setCode('');
    setExpanded(false);
  }
  function disarm() {
    helpers.callService({
      domain: 'alarm_control_panel',
      service: 'alarm_disarm',
      target: { entity_id: 'alarm_control_panel.alarmo' },
      serviceData: { code },
    });
    setCode('');
    setExpanded(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className='gc rounded-3xl p-4'
    >
      {/* Status row */}
      <div className='flex items-center justify-between'>
        <div className={cn('flex items-center gap-2.5 rounded-2xl px-4 py-2.5 border flex-1 mr-2', cfg.bg, cfg.border)}>
          <span className={cfg.color}>{cfg.icon}</span>
          <span className={cn('font-semibold text-sm', cfg.color)}>{cfg.label}</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setExpanded(e => !e)}
          className='w-9 h-9 rounded-xl gc-btn flex items-center justify-center text-white/40 flex-shrink-0'
        >
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} />
          </motion.div>
        </motion.button>
      </div>

      {/* Expandable keypad */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='overflow-hidden'
          >
            <div className='pt-3 flex flex-col gap-2'>
              {/* Code input */}
              <div className='gc-inner rounded-2xl px-4 py-2 flex items-center justify-between'>
                <span className='text-white font-mono tracking-[0.3em] text-lg'>
                  {code ? '•'.repeat(code.length) : <span className='text-white/20 text-sm'>Code PIN</span>}
                </span>
                {code && (
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCode(c => c.slice(0, -1))}>
                    <Delete size={16} className='text-white/40' />
                  </motion.button>
                )}
              </div>

              {/* Numpad */}
              <div className='grid grid-cols-3 gap-1.5'>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => (
                  <motion.button
                    key={String(k)}
                    whileTap={{ scale: k !== '' ? 0.93 : 1 }}
                    onClick={() => {
                      if (k === '⌫') setCode(c => c.slice(0, -1));
                      else if (k !== '') setCode(c => (c.length < 8 ? c + String(k) : c));
                    }}
                    className={cn('h-10 rounded-xl text-sm font-semibold text-white transition-colors', k !== '' ? 'gc-btn' : 'invisible')}
                  >
                    {k}
                  </motion.button>
                ))}
              </div>

              {/* Actions */}
              <div className='grid grid-cols-2 gap-1.5'>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={disarm}
                  className='py-2 rounded-2xl bg-green-500/15 text-green-400 text-sm font-semibold hover:bg-green-500/25 transition-colors border border-green-500/20'
                >
                  Désarmer
                </motion.button>
                {MODES.map(({ label, service, color }) => (
                  <motion.button
                    key={service}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => arm(service)}
                    className={cn('py-2 rounded-2xl text-sm font-semibold transition-colors', color)}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
