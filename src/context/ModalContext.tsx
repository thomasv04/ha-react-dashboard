import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { playSound, type SoundPreset } from '@/lib/sounds';
import { isSoundEnabled } from '@/context/ThemeContext';

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

export type ModalContent = string | ReactNode | { type: 'markdown' | 'html' | 'plain'; value: string };

export interface Modal {
  id: string;
  title?: string;
  content?: ModalContent;
  /** Modal width preset */
  width?: 'sm' | 'md' | 'lg' | 'full';
  /** Sound to play when modal opens */
  sound?: SoundPreset | string | false;
  /** Can be dismissed via ESC or backdrop click — otherwise it stays until one of its actions. */
  dismissible?: boolean;
  actions?: ModalAction[];
}

interface ModalContextValue {
  modals: Modal[];
  openModal: (modal: Omit<Modal, 'id'>) => string;
  closeModal: (id: string) => void;
  clearAll: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<Modal[]>([]);

  const closeModal = useCallback((id: string) => {
    setModals(prev => prev.filter(m => m.id !== id));
  }, []);

  const openModal = useCallback((modal: Omit<Modal, 'id'>): string => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const full: Modal = {
      width: 'md',
      dismissible: true,
      sound: 'notification',
      ...modal,
      id,
    };

    setModals(prev => [...prev, full]);

    // Play sound if specified
    if (full.sound !== false && full.sound && isSoundEnabled()) {
      playSound(full.sound);
    }

    return id;
  }, []);

  const clearAll = useCallback(() => setModals([]), []);

  return <ModalContext.Provider value={{ modals, openModal, closeModal, clearAll }}>{children}</ModalContext.Provider>;
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
