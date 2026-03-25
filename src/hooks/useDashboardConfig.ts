import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LAYOUT, type DashboardLayout } from '@/context/DashboardLayoutContext';

export function useDashboardConfig() {
  // On utilise directement ton type et ta configuration par défaut !
  const [config, setConfig] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Charger la configuration au démarrage
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        // Si le serveur renvoie un layout vide, on garde le DEFAULT_LAYOUT
        if (data.message === "No config yet") {
          setConfig(DEFAULT_LAYOUT);
        } else {
          setConfig(data);
        }
      })
      .catch(err => console.error("Erreur de chargement de la config:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // 2. Fonction pour sauvegarder
  const saveConfig = useCallback(async (newConfig: DashboardLayout) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      
      if (response.ok) {
        setConfig(newConfig);
        console.log("Configuration sauvegardée avec succès !");
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { config, isLoading, isSaving, saveConfig };
}