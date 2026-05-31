import { useCallback } from 'react';
import { playSound, type SoundPreset } from '@/lib/sounds';
import { isSoundEnabled } from '@/context/ThemeContext';
import { resolveSound } from '@/config/widget-sound-actions';

/**
 * Hook that plays a sound preset only when sound feedback is enabled in settings.
 * Supports per-widget sound overrides from config.
 *
 * @param widgetType - The widget type (e.g. 'light', 'cover') for action resolution
 * @param soundOverrides - Optional per-action sound overrides from widget config
 */
export function useSoundFeedback(widgetType?: string, soundOverrides?: Record<string, SoundPreset>) {
  const play = useCallback(
    (actionOrPreset: string) => {
      if (!isSoundEnabled()) return;
      // If widgetType is provided, resolve via WIDGET_SOUND_ACTIONS + overrides
      if (widgetType) {
        const preset = resolveSound(widgetType, actionOrPreset, soundOverrides);
        if (preset !== 'none') playSound(preset);
      } else {
        // Direct preset usage (backwards compat)
        if (actionOrPreset !== 'none') playSound(actionOrPreset);
      }
    },
    [widgetType, soundOverrides]
  );

  return play;
}
