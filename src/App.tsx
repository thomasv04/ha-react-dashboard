import { HassConnect } from '@hakit/core';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastContainer } from '@/components/ui/Toast/components/Toast';
import { useHAToast } from '@/hooks/useHAToast';
import { useHAModal } from '@/hooks/useHAModal';
import { useHANotification } from '@/hooks/useHANotification';
import { useServiceErrorToast } from '@/hooks/useServiceErrorToast';
import Dashboard from './Dashboard';
import { ModalContainer } from './components/ui/Modal/components/Modal';
import { ThemeContextProvider, useTheme } from '@/context/ThemeContext';
import { I18nProvider } from '@/i18n';
import { BackgroundLayer } from '@/components/layout/BackgroundLayer';
import { MotionConfig } from 'framer-motion';
import { useState, useEffect, type ReactNode } from 'react';
import { useAutoTheme } from '@/hooks/useAutoTheme';
import { apiFetch } from '@/lib/api-base';
import { HAThrottlePatch } from '@/components/HAThrottlePatch';
import { LoadingScreen } from '@/components/layout/LoadingScreen';

function MotionConfigBridge({ children }: { children: ReactNode }) {
  const { perfSettings } = useTheme();
  return <MotionConfig reducedMotion={perfSettings.reduceAnimations ? 'always' : 'user'}>{children}</MotionConfig>;
}

/** Mounts the HA event subscription inside the providers */
function HAToastBridge() {
  useHAToast();
  // `ha_dashboard_modal` était implémenté mais jamais abonné : l'événement
  // n'apparaissait même pas dans les écouteurs actifs de Home Assistant.
  useHAModal();
  useHANotification();
  // Rend visibles les commandes que HA refuse, au lieu de les laisser en
  // `Uncaught (in promise)` dans une console que personne ne regarde.
  useServiceErrorToast();
  return null;
}

function AutoThemeBridge() {
  useAutoTheme();
  return null;
}

/**
 * Resolve the HA URL the browser should connect to.
 *
 * - Ingress mode: `window.location.origin` (user is already on homeassistant.local:8123)
 * - Dev / VITE_HA_URL set: use the env value
 * - Fallback: http://homeassistant:8123
 */
function resolveHassUrl(): string {
  // When loaded via ingress the pathname starts with /api/hassio_ingress/<token>/
  if (window.location.pathname.startsWith('/api/hassio_ingress/')) {
    return window.location.origin;
  }
  return import.meta.env.VITE_HA_URL ?? 'http://homeassistant:8123';
}

interface AppProps {
  hassUrl?: string;
  hassToken?: string;
}

function App({ hassUrl: propHassUrl, hassToken: propHassToken }: AppProps = {}) {
  // VITE_HA_TOKEN is only used in dev mode — never bake it into production builds
  const [hassToken, setHassToken] = useState<string | undefined>(
    propHassToken ?? (import.meta.env.DEV ? import.meta.env.VITE_HA_TOKEN : undefined) ?? undefined
  );
  const hassUrl = propHassUrl ?? resolveHassUrl();

  // Fetch the HA token from the add-on server (reads /data/options.json ha_token).
  // Only runs when no token was provided via props/env.
  useEffect(() => {
    if (hassToken) return;
    // Délai maximal : sans lui, un serveur qui ne répond pas laissait la
    // promesse en suspens et le jeton n'arrivait jamais — HassConnect restait
    // sur son écran d'attente sans que rien ne l'indique.
    apiFetch('/api/system/ha-config', { signal: AbortSignal.timeout(6_000) })
      .then(r => r.json())
      .then((data: { hassToken?: string | null }) => {
        if (data.hassToken) {
          setHassToken(data.hassToken);
        } else {
          console.info('[ha-dashboard] No token in options — HassConnect will open the HA login dialog.');
        }
      })
      .catch(() => {
        console.info('[ha-dashboard] Could not reach server for ha-config, proceeding without token.');
      });
  }, []);

  return (
    // I18n et thème sont remontés **au-dessus** de HassConnect : ni l'un ni
    // l'autre ne dépend de Home Assistant, et l'écran d'attente rendu par le
    // slot `loading` doit pouvoir se traduire et adopter les couleurs du thème.
    <I18nProvider>
      <ThemeContextProvider>
        <BackgroundLayer />
        {/* `loading` : le slot existait mais n'était pas utilisé, on héritait de
            l'écran d'attente par défaut de @hakit — un spinner muet, impossible
            à distinguer d'un blocage. C'est la première des trois étapes. */}
        <HassConnect
          hassUrl={hassUrl}
          hassToken={hassToken}
          loading={<LoadingScreen stage='connect' onRetry={() => window.location.reload()} />}
        >
          <HAThrottlePatch />
          <MotionConfigBridge>
            <ToastProvider>
              <ModalProvider>
                <NotificationProvider>
                  <HAToastBridge />
                  <AutoThemeBridge />
                  <Dashboard />
                  <ToastContainer />
                  <ModalContainer />
                </NotificationProvider>
              </ModalProvider>
            </ToastProvider>
          </MotionConfigBridge>
        </HassConnect>
      </ThemeContextProvider>
    </I18nProvider>
  );
}

export default App;
