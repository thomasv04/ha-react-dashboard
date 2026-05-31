import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Play, Check, AlertTriangle, X } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { ButtonCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { useRipple, RippleLayer } from '@/components/ui/Ripple';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';

type FeedbackState = 'idle' | 'confirming' | 'running' | 'success' | 'error';

export function ButtonCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ButtonCardConfig>(widgetId || 'button');
  const { helpers } = useHass();
  const { ripples, trigger: triggerRipple } = useRipple();
  const playFeedback = useSoundFeedback('button', config?.soundOverrides);

  const [feedback, setFeedback] = useState<FeedbackState>('idle');

  const label = config?.label ?? t('widgets.button.label');
  const subtitle = config?.subtitle;
  const color = config?.color ?? '#3b82f6';
  const domain = config?.domain ?? 'script';
  const service = config?.service ?? 'turn_on';
  const requireConfirm = config?.requireConfirm ?? false;
  const confirmText = config?.confirmText ?? t('widgets.button.confirmDefault');

  const iconName = config?.icon;
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;
  // eslint-disable-next-line react-hooks/static-components
  const IconComponent = iconName && !isCustomIcon(iconName) ? (resolveIcon(iconName) ?? Play) : Play;

  const callService = useCallback(async () => {
    setFeedback('running');
    playFeedback('press');
    try {
      let serviceData: Record<string, unknown> = {};
      if (config?.serviceData) {
        try { serviceData = JSON.parse(config.serviceData); } catch { /* ignore invalid JSON */ }
      }
      await helpers.callService({
        domain: domain as never,
        service: service as never,
        target: config?.entityId ? { entity_id: config.entityId } : undefined,
        serviceData: Object.keys(serviceData).length ? serviceData : undefined,
      });
      setFeedback('success');
      setTimeout(() => setFeedback('idle'), 1800);
    } catch {
      setFeedback('error');
      setTimeout(() => setFeedback('idle'), 2500);
    }
  }, [helpers, domain, service, config]);

  const handlePress = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    if (feedback === 'running') return;
    if (requireConfirm && feedback !== 'confirming') {
      setFeedback('confirming');
      return;
    }
    setFeedback('idle');
    callService();
  }, [feedback, requireConfirm, callService]);

  const cancelConfirm = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFeedback('idle');
  }, []);

  // Derive colors from accent
  const bgActive = `${color}18`;
  const borderActive = `${color}30`;
  const bgIdle = 'rgba(255,255,255,0.05)';
  const borderIdle = 'rgba(255,255,255,0.08)';

  const isActive = feedback !== 'idle' && feedback !== 'confirming';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className='gc rounded-3xl p-3.5 flex flex-col h-full relative overflow-hidden select-none'
    >
      <RippleLayer ripples={ripples} color={`${color}22`} />

      {/* Confirm overlay */}
      <AnimatePresence>
        {feedback === 'confirming' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 z-10 rounded-3xl flex flex-col items-center justify-center gap-3 px-4'
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <AlertTriangle size={22} style={{ color }} />
            <p className='text-white/80 text-xs text-center font-medium leading-snug'>{confirmText}</p>
            <div className='flex gap-2'>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={cancelConfirm}
                className='px-3 py-1.5 rounded-xl border text-xs font-semibold text-white/50 border-white/12 bg-white/6'
              >
                {t('widgets.button.cancel')}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handlePress}
                onPointerDown={triggerRipple}
                className='px-3 py-1.5 rounded-xl border text-xs font-bold'
                style={{ background: bgActive, borderColor: borderActive, color }}
              >
                {t('widgets.button.confirm')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button body */}
      <motion.button
        className='flex-1 flex flex-col items-center justify-center gap-2 w-full rounded-2xl border transition-all duration-300 cursor-pointer'
        style={isActive ? { background: bgActive, borderColor: borderActive } : { background: bgIdle, borderColor: borderIdle }}
        onPointerDown={triggerRipple}
        onClick={handlePress}
        whileTap={feedback !== 'running' ? { scale: 0.95 } : undefined}
        disabled={feedback === 'running'}
      >
        {/* Icon area */}
        <AnimatePresence mode='wait'>
          {feedback === 'running' && (
            <motion.div
              key='running'
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className='w-12 h-12 rounded-2xl flex items-center justify-center border'
              style={{ background: bgActive, borderColor: borderActive }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className='w-5 h-5 rounded-full border-2 border-t-transparent'
                style={{ borderColor: `${color}60`, borderTopColor: color }}
              />
            </motion.div>
          )}
          {feedback === 'success' && (
            <motion.div
              key='success'
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className='w-12 h-12 rounded-2xl flex items-center justify-center border'
              style={{ background: 'rgba(74,222,128,0.14)', borderColor: 'rgba(74,222,128,0.28)' }}
            >
              <Check size={22} className='text-green-400' />
            </motion.div>
          )}
          {feedback === 'error' && (
            <motion.div
              key='error'
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className='w-12 h-12 rounded-2xl flex items-center justify-center border'
              style={{ background: 'rgba(248,113,113,0.14)', borderColor: 'rgba(248,113,113,0.28)' }}
            >
              <X size={22} className='text-red-400' />
            </motion.div>
          )}
          {(feedback === 'idle' || feedback === 'confirming') && (
            <motion.div
              key='idle'
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className='w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300'
              style={{ background: bgActive, borderColor: borderActive }}
            >
              {customIconUrl
                ? <img src={customIconUrl} alt='' className='w-6 h-6 object-contain' />
                : <IconComponent size={24} style={{ color }} />
              }
            </motion.div>
          )}
        </AnimatePresence>

        {/* Label */}
        <div className='flex flex-col items-center gap-0.5 px-2'>
          <span
            className={cn('text-sm font-semibold text-center leading-tight transition-colors duration-300',
              feedback === 'success' ? 'text-green-400'
              : feedback === 'error' ? 'text-red-400'
              : 'text-white/80'
            )}
          >
            {feedback === 'success' ? t('widgets.button.done')
             : feedback === 'error' ? t('widgets.button.error')
             : label}
          </span>
          {subtitle && feedback === 'idle' && (
            <span className='text-[10px] text-white/30 text-center leading-tight'>{subtitle}</span>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}
