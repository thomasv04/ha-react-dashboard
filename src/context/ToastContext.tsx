import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { playSound, type SoundPreset } from '@/lib/sounds';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** If true, toast stays until manually dismissed */
  persistent?: boolean;
  /** Auto-dismiss after ms (default 5000). Ignored if persistent=true */
  durationMs?: number;
  /** Sound to play when toast appears. Preset name or URL to audio file. */
  sound?: SoundPreset | string | false;
  actions?: ToastAction[];
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const full: Toast = { durationMs: 5000, sound: 'notification', ...toast, id };
      setToasts(prev => [full, ...prev]);
      if (full.sound !== false && full.sound) {
        playSound(full.sound);
      }
      if (!full.persistent) {
        setTimeout(() => removeToast(id), full.durationMs);
      }
      return id;
    },
    [removeToast]
  );

  const clearAll = useCallback(() => setToasts([]), []);

  return <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
