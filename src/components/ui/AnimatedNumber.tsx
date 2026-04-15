import { motion, AnimatePresence } from 'framer-motion';
import { usePrevious } from '@/hooks/usePrevious';

/**
 * Apple-style animated number — each digit slides up/down independently
 * when the value changes, like the ThermostatCard counter.
 *
 * Usage: <AnimatedNumber value={19.5} decimals={1} suffix="°" />
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
  className = '',
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  const prev = usePrevious(value);
  const direction = prev !== undefined && value > prev ? 1 : -1;

  return (
    <span className={`inline-flex items-baseline ${className}`} style={{ lineHeight: 1 }}>
      {display.split('').map((char, i) => {
        const isDigit = char >= '0' && char <= '9';
        if (!isDigit) {
          return (
            <span key={`sep-${i}`} className='inline-block'>
              {char}
            </span>
          );
        }
        return (
          <span key={`pos-${i}`} className='relative inline-block overflow-hidden' style={{ width: '0.62em' }}>
            {/* Invisible baseline anchor — normal flow sets correct height & baseline */}
            <span className='invisible' aria-hidden='true'>
              0
            </span>
            <AnimatePresence mode='popLayout' initial={false}>
              <motion.span
                key={`${i}-${char}`}
                initial={{ y: direction * 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: direction * -18, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.5 }}
                className='absolute inset-0 flex items-center justify-center'
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
      {suffix && <span>{suffix}</span>}
    </span>
  );
}
