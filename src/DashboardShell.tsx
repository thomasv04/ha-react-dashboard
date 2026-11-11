import type { ReactNode } from 'react';
import { HassConnect } from '@hakit/core';
import { MotionConfig } from 'framer-motion';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeContextProvider, useTheme } from '@/context/ThemeContext';
import { I18nProvider } from '@/i18n';
import { ToastContainer } from '@/components/ui/Toast/components/Toast';
import { ModalContainer } from '@/components/ui/Modal/components/Modal';
import { BackgroundLayer } from '@/components/layout/BackgroundLayer';
import { ChristmasSnow, ChristmasStars } from '@/components/layout/ChristmasDecor';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { HAThrottlePatch } from '@/components/HAThrottlePatch';
import { ConnectionBanner } from '@/components/shell/ConnectionBanner';
import { useHAToast } from '@/hooks/useHAToast';
import { useHAModal } from '@/hooks/useHAModal';
import { useHANotification } from '@/hooks/useHANotification';
import { useServiceErrorToast } from '@/hooks/useServiceErrorToast';
import { useAutoTheme } from '@/hooks/useAutoTheme';
import Dashboard from './Dashboard';

function MotionConfigBridge({ children }: { children: ReactNode }) {
  const { perfSettings } = useTheme();
  return <MotionConfig reducedMotion={perfSettings.reduceAnimations ? 'always' : 'user'}>{children}</MotionConfig>;
}

/** Les abonnements aux événements de Home Assistant, montés dans les providers. */
function HABridges() {
  useHAToast();
  // `ha_dashboard_modal` était implémenté mais jamais abonné : l'événement
  // n'apparaissait même pas dans les écouteurs actifs de Home Assistant.
  useHAModal();
  useHANotification();
  // Rend visibles les commandes que HA refuse, au lieu de les laisser en
  // `Uncaught (in promise)` dans une console que personne ne regarde.
  useServiceErrorToast();
  useAutoTheme();
  return null;
}

/**
 * L'arbre de l'application, commun à l'application autonome (`App.tsx`) et à
 * la carte Lovelace (`ha-panel.tsx`). Ils en tenaient chacun une copie, et la
 * carte — le mode principal — avait perdu en route le thème automatique,
 * « Réduire les animations », le cache des entités et l'alerte des commandes
 * refusées (#85). `children` : ce qu'un point d'entrée ajoute sous les
 * providers (la carte : son `LiveAuth`).
 *
 * I18n et thème sont **au-dessus** de HassConnect : ni l'un ni l'autre ne
 * dépend de Home Assistant, et l'écran d'attente du slot `loading` doit pouvoir
 * se traduire et adopter les couleurs du thème.
 */
export function DashboardShell({ hassUrl, hassToken, children }: { hassUrl: string; hassToken?: string; children?: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeContextProvider>
        <BackgroundLayer />
        {/* `loading` : sans lui, l'écran d'attente par défaut de @hakit — un
            spinner muet, impossible à distinguer d'un blocage. */}
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
                  <HABridges />
                  {children}
                  <Dashboard />
                  <ConnectionBanner />
                  <ToastContainer />
                  <ModalContainer />
                </NotificationProvider>
              </ModalProvider>
            </ToastProvider>
          </MotionConfigBridge>
        </HassConnect>
        <ChristmasStars />
        <ChristmasSnow />
      </ThemeContextProvider>
    </I18nProvider>
  );
}
