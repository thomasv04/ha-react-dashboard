import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LAYOUT, type DashboardLayout } from '@/context/DashboardLayoutContext';

// 👉 NOUVEAU : Le vrai format "Tunet" avec tous les tiroirs
export interface GlobalDashboardConfig {
  theme: {
    darkMode: 'auto' | 'light' | 'dark';
    primaryColor?: string;
  };
  layout: DashboardLayout; // Ton layout intact va ici !
}

const DEFAULT_GLOBAL_CONFIG: GlobalDashboardConfig = {
  theme: { darkMode: 'auto' },
  layout: DEFAULT_LAYOUT,
};

export function useDashboardConfig() {
  const [config, setConfig] = useState<GlobalDashboardConfig>(DEFAULT_GLOBAL_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.message === 'No config yet') {
          setConfig(DEFAULT_GLOBAL_CONFIG);
        } else {
          // On s'assure que si le serveur renvoie un vieux format, ça ne crashe pas
          if (!data.layout) {
            setConfig({ theme: DEFAULT_GLOBAL_CONFIG.theme, layout: data as DashboardLayout });
          } else {
            setConfig(data);
          }
        }
      })
      .catch(err => console.error('Erreur de chargement de la config:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const saveConfig = useCallback(async (newConfig: GlobalDashboardConfig) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        setConfig(newConfig);
        console.log('Configuration globale sauvegardée avec succès !');
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { config, isLoading, isSaving, saveConfig };
}
