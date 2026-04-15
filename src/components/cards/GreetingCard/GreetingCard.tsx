import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { GreetingCardConfig } from '@/types/widget-configs';

function getGreeting(h: number): string {
  if (h >= 18) return 'Bonsoir';
  if (h >= 12) return 'Bon après-midi';
  if (h >= 5) return 'Bonjour';
  return 'Bonne nuit';
}

/** Full-width header bar: greeting on the left, big clock on the right. */
export function GreetingCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<GreetingCardConfig>(widgetId || 'greeting');
  const locale = config?.locale ?? 'fr-FR';

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hm = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const sec = String(now.getSeconds()).padStart(2, '0');
  const greeting = getGreeting(now.getHours());
  const date = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className='flex items-center justify-between px-1'
    >
      {/* Greeting + date */}
      <div>
        <div className='text-white/60 text-sm font-medium'>{greeting}</div>
        <div className='text-white/30 text-xs mt-0.5 capitalize'>{date}</div>
      </div>

      {/* Live clock */}
      <div className='flex items-baseline gap-1 tabular-nums'>
        <span className='text-5xl font-thin text-white tracking-tight leading-none'>{hm}</span>
        <span className='text-xl font-thin text-white/30 leading-none'>{sec}</span>
      </div>
    </motion.div>
  );
}

/** Compact inline clock + date used in the top header row. */
export function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hm = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sec = String(now.getSeconds()).padStart(2, '0');
  const date = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className='flex flex-col items-end shrink-0'>
      <div className='flex items-baseline gap-1 tabular-nums'>
        <span className='text-4xl font-thin text-white tracking-tight leading-none'>{hm}</span>
        <span className='text-base font-thin text-white/30 leading-none'>{sec}</span>
      </div>
      <div className='text-[11px] text-white/35 capitalize mt-0.5 font-medium'>{date}</div>
    </div>
  );
}
