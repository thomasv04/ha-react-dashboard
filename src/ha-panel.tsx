/**
 * HA React Dashboard — Web Component entry point
 *
 * Chargé par l'intégration `ha_react_dashboard`, ce bundle enregistre l'élément
 * `<ha-react-dashboard-panel>`. HA lui injecte l'objet `hass` (URL + jeton) sans
 * aucune configuration manuelle.
 *
 * Le même élément sert de **carte Lovelace** (`type: custom:ha-react-dashboard-panel`) :
 * c'est ce qui permet au dashboard d'être un vrai tableau de bord Lovelace, donc
 * d'être « défini par défaut » sur un appareil — un panneau d'add-on ou un panneau
 * custom ne peut pas l'être.
 */
import { createRoot } from 'react-dom/client';
import { HassConnect } from '@hakit/core';
import { ToastProvider } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ui/Toast/components/Toast';
import { useHAToast } from '@/hooks/useHAToast';
import { useHAModal } from '@/hooks/useHAModal';
import Dashboard from './Dashboard';
import { ThemeContextProvider } from '@/context/ThemeContext';
import { BackgroundLayer } from '@/components/layout/BackgroundLayer';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { I18nProvider } from '@/i18n';
import { setPanelAuth } from '@/lib/api-base';
import './index.css';

function HAToastBridge() {
  useHAToast();
  // `ha_dashboard_modal` était implémenté mais jamais abonné : l'événement
  // n'apparaissait même pas dans les écouteurs actifs de Home Assistant.
  useHAModal();
  return null;
}

interface PanelAppProps {
  hassUrl: string;
  hassToken?: string;
}

function PanelApp({ hassUrl, hassToken }: PanelAppProps) {
  return (
    // `I18nProvider` manquait entièrement dans la build panneau : `useI18n`
    // lève hors provider, donc le premier composant traduit faisait planter le
    // panneau. Même arbre que `App.tsx` : i18n et thème au-dessus de HassConnect.
    <I18nProvider>
      <ThemeContextProvider>
        <BackgroundLayer />
        <HassConnect hassUrl={hassUrl} hassToken={hassToken} loading={<LoadingScreen stage='connect' />}>
          <ToastProvider>
            <HAToastBridge />
            <Dashboard />
            <ToastContainer />
          </ToastProvider>
        </HassConnect>
      </ThemeContextProvider>
    </I18nProvider>
  );
}

/** Poignée rendue au chargeur (`ha-card.ts`) pour piloter l'app montée. */
export interface DashboardHandle {
  setHass(hass: Record<string, unknown>): void;
  destroy(): void;
}

/**
 * Monte le dashboard dans un élément hôte.
 *
 * Ce module pèse plusieurs mégaoctets : il n'est importé qu'au moment où la
 * carte apparaît réellement à l'écran, jamais au chargement du frontend HA.
 */
export function mountDashboard(host: HTMLElement): DashboardHandle {
  const mountPoint = document.createElement('div');
  mountPoint.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';
  host.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  let hassUrl = window.location.origin;
  let hassToken: string | undefined;

  const render = () => root.render(<PanelApp hassUrl={hassUrl} hassToken={hassToken} />);
  render();

  return {
    setHass(hass) {
      const data = (hass?.auth as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;
      if (!data) return;
      hassUrl = (data['hassUrl'] as string) || window.location.origin;
      hassToken = data['access_token'] as string | undefined;
      // Les vues de l'intégration exigent l'auth HA : sans ce jeton, tous les
      // appels de config partiraient en 401. Le jeton tourne, on le remet à
      // chaque injection.
      setPanelAuth(hassToken);
      render();
    },
    destroy() {
      root.unmount();
      mountPoint.remove();
    },
  };
}
