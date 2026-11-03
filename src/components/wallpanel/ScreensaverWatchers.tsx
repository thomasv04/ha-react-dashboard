import { useEffect, useRef } from 'react';
import { useWallPanel } from '@/context/WallPanelContext';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { useSafeEntity } from '@/hooks/useSafeEntity';

/**
 * Watcher d'inactivité — doit être monté à l'intérieur du WallPanelProvider
 */
export function IdleWatcher() {
  const { config, enabled, activate, isActive } = useWallPanel();
  useIdleDetector({
    idleTime: config.idle_time,
    enabled: enabled && !isActive,
    onIdle: activate,
    onActive: () => {},
  });
  return null;
}

/**
 * Surveille l'entité HA `screensaver_entity` pour déclencher l'écran de veille
 * depuis Home Assistant.
 *
 * L'entité est un *déclencheur*, pas un état imposé : on ne réagit qu'à ses
 * transitions (passage à `on` → activer, passage à `off` → désactiver). Lire
 * `isActive` en dépendance de l'effet le rejouerait à chaque activation ou
 * sortie venue d'ailleurs (inactivité, toucher, `?hrd_screensaver=true`) et
 * renverserait aussitôt la veille (issue #46). `isActive` passe donc par une ref.
 */
export function ScreensaverEntityWatcher() {
  const { config, activate, deactivate, isActive } = useWallPanel();
  const entityId = config.screensaver_entity ?? '';
  const entity = useSafeEntity(entityId);
  const state = entity?.state;

  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const previousRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = state;
    // Premier relevé de l'entité : on ne force que si elle est déjà sur `on`
    // (HA demande la veille au chargement), jamais un `off` initial.
    if (state === previous) return;
    if (state === 'on' && !isActiveRef.current) activate();
    else if (state === 'off' && previous === 'on' && isActiveRef.current) deactivate();
  }, [state, activate, deactivate]);

  return null;
}
