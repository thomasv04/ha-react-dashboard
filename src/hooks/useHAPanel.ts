import { useCallback, useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { usePanel } from '@/context/PanelContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { useToast } from '@/context/ToastContext';
import { isSoundEnabled } from '@/context/ThemeContext';
import { playSound } from '@/lib/sounds';
import { asText, findPanel, HA_EVENT_TYPES, type HAModalEvent } from '@/lib/ha-events';
import { useI18n } from '@/i18n';

/**
 * Ouvre la modale du dashboard que désigne `panel` — celle de la sonnette, avec
 * sa caméra. L'écran de veille passerait par-dessus : on le lève d'abord.
 * Partagé par l'abonnement et l'aperçu des Outils de développement.
 */
export function useOpenPanelFromEvent() {
  const { t } = useI18n();
  const { panels } = useCustomPanels();
  const { openPanel } = usePanel();
  const { isActive, deactivate } = useWallPanel();
  const { addToast } = useToast();

  return useCallback(
    (data: HAModalEvent) => {
      const panel = findPanel(data.panel, panels);
      // Rien d'affiché serait muet : on dit quelle modale manque.
      if (!panel) {
        addToast({ title: t('help.events.panelNotFound', { value: asText(data.panel) ?? '' }), durationMs: 8000 });
        return;
      }
      if (isActive) deactivate();
      const ms = Number(data.duration_ms);
      openPanel(`custom:${panel.id}`, ms > 0 ? ms : undefined);
      const sound = data.sound === undefined ? 'notification' : data.sound;
      if (sound && isSoundEnabled()) playSound(sound);
    },
    [panels, openPanel, isActive, deactivate, addToast, t]
  );
}

/** `ha_dashboard_modal` avec `panel` — le reste de l'événement passe par `useHAModal`. */
export function useHAPanel() {
  const connection = useHass(s => s.connection);
  const open = useOpenPanelFromEvent();
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!connection) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    connection
      .subscribeEvents((event: { data: HAModalEvent }) => {
        if (event.data?.panel) openRef.current(event.data);
      }, HA_EVENT_TYPES.modal)
      .then(unsub => {
        const fn = unsub as unknown as () => void;
        if (cancelled) fn();
        else unsubscribe = fn;
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [connection]);
}
