import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RippleItem {
  id: number;
  x: number;
  y: number;
}

interface RippleProps {
  color?: string;
  duration?: number;
}

export function useRipple() {
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const trigger = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  }, []);

  return { ripples, trigger };
}

export function RippleLayer({ ripples, color = 'rgba(255,255,255,0.25)', duration = 0.5 }: RippleProps & { ripples: RippleItem[] }) {
  return (
    <AnimatePresence>
      {ripples.map(r => (
        <motion.span
          key={r.id}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: r.x - 20,
            top: r.y - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: color,
            pointerEvents: 'none',
          }}
        />
      ))}
    </AnimatePresence>
  );
}
