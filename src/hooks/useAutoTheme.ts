import { useEffect } from 'react';
import { useHass } from '@hakit/core';
import { useTheme } from '@/context/ThemeContext';

export function useAutoTheme() {
  const { autoTheme, setTheme, themeId } = useTheme();
  const { entities } = useHass();

  useEffect(() => {
    if (!autoTheme.enabled) return;

    const sun = entities['sun.sun' as keyof typeof entities] as { state?: string } | undefined;
    if (!sun) return;

    const targetTheme = sun.state === 'above_horizon' ? autoTheme.lightTheme : autoTheme.darkTheme;
    if (themeId !== targetTheme) {
      setTheme(targetTheme);
    }
  }, [autoTheme, entities, themeId, setTheme]);
}
