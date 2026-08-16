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
import { createRoot, type Root } from 'react-dom/client';
import { HassConnect } from '@hakit/core';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { ToastContainer } from '@/components/ui/Toast/components/Toast';
import { ModalContainer } from '@/components/ui/Modal/components/Modal';
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
        <HassConnect
          hassUrl={hassUrl}
          hassToken={hassToken}
          loading={<LoadingScreen stage='connect' onRetry={() => window.location.reload()} />}
        >
          <ToastProvider>
            {/* `ModalProvider` manquait dans la build panneau : `HAToastBridge`
                s'abonne à `ha_dashboard_modal` via `useModal`, qui lève hors
                provider — le panneau plantait au montage. Même arbre qu'App.tsx. */}
            <ModalProvider>
              <HAToastBridge />
              <Dashboard />
              <ToastContainer />
              <ModalContainer />
            </ModalProvider>
          </ToastProvider>
        </HassConnect>
      </ThemeContextProvider>
    </I18nProvider>
  );
}

/**
 * Sous-ensemble de l'objet `Auth` de home-assistant-js-websocket dont on se
 * sert. `hass` arrive non typé depuis le frontend HA.
 */
interface HassAuth {
  data?: { hassUrl?: string; access_token?: string };
  readonly accessToken?: string;
  readonly expired?: boolean;
  refreshAccessToken(): Promise<void>;
}

/** Poignée rendue au chargeur (`ha-card.ts`) pour piloter l'app montée. */
export interface DashboardHandle {
  setHass(hass: Record<string, unknown>): void;
  destroy(): void;
}

/**
 * Racine React **unique**, partagée par toutes les instances de l'élément.
 *
 * Home Assistant détruit et recrée la carte à chaque reconstruction de vue :
 * changement d'onglet Lovelace, reconnexion du frontend, retour d'arrière-plan
 * sur l'application mobile. Remonter l'arbre condamnait le dashboard —
 * `HassConnect` remet son magasin à zéro en se démontant (`ready` repasse à
 * faux, les abonnements sont coupés) mais ne retente **jamais** la connexion
 * pour une URL déjà tentée dans la page (`attemptedUrls`, module de @hakit).
 * On restait sur « Connexion à Home Assistant » jusqu'au rechargement complet.
 *
 * On garde donc l'arbre vivant — **pour toute la vie de la page** — et on
 * déplace simplement son nœud d'accueil. Il y avait ici un démontage différé de
 * cinq secondes « au cas où la carte ne revienne pas » : c'était un pari sur le
 * délai de reconstruction de HA, et il est perdu dès qu'on quitte l'onglet
 * quelques minutes. Le dashboard revenait alors bloqué sur « Connexion à Home
 * Assistant », sans autre issue qu'un rechargement complet.
 */
let mountPoint: HTMLDivElement | null = null;
let root: Root | null = null;
/** Hôte qui détient l'arbre : une poignée périmée ne doit pas le détacher. */
let owner: HTMLElement | null = null;

let hassUrl = window.location.origin;
let hassToken: string | undefined;
/** Objet `Auth` de Home Assistant — vivant, contrairement au jeton. */
let hassAuth: HassAuth | undefined;

const render = () => root?.render(<PanelApp hassUrl={hassUrl} hassToken={hassToken} />);

/**
 * Monte le dashboard dans un élément hôte.
 *
 * Ce module pèse plusieurs mégaoctets : il n'est importé qu'au moment où la
 * carte apparaît réellement à l'écran, jamais au chargement du frontend HA.
 */
export function mountDashboard(host: HTMLElement): DashboardHandle {
  if (!mountPoint) {
    mountPoint = document.createElement('div');
    // `overflow-y:auto` : le dashboard défile **dans** la carte. Sans ça son
    // contenu débordait de l'hôte (haut d'un écran) et faisait défiler le
    // document de Home Assistant, dont le `body` ne fait qu'un écran de haut :
    // passé ce premier écran, plus rien de l'application ne peignait et le fond
    // laissait voir celui de HA — une bande sombre en bas. Le glisser-déposer
    // suit tout seul, `findScroller` remonte au premier ancêtre scrollable.
    mountPoint.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;overflow-y:auto;';
    root = createRoot(mountPoint);
  }

  // `appendChild` *déplace* le nœud si un autre hôte le détenait : l'arbre React
  // ne se démonte pas, il change simplement de parent.
  host.appendChild(mountPoint);
  owner = host;
  render();

  return {
    setHass(hass) {
      const auth = hass?.auth as HassAuth | undefined;
      const data = auth?.data;
      if (!data) return;

      hassAuth = auth;
      hassUrl = data.hassUrl || window.location.origin;

      // Les vues de l'intégration exigent l'auth HA. On enregistre un
      // *fournisseur* : un jeton d'accès HA vit trente minutes, en copier la
      // valeur ici condamnait tous les appels au 401 dès qu'on revenait sur
      // l'onglet plus tard.
      setPanelAuth(async force => {
        if (!hassAuth) return undefined;
        if (force || hassAuth.expired) {
          try {
            await hassAuth.refreshAccessToken();
          } catch {
            // Renouvellement refusé (session révoquée) : on renvoie le dernier
            // jeton connu, l'appelant verra le 401 et pourra le signaler.
          }
        }
        return hassAuth.accessToken ?? hassAuth.data?.access_token;
      });

      // `HassConnect` reçoit un jeton figé en propriété : il doit être frais au
      // moment du rendu, sinon la connexion WebSocket échoue et l'écran de
      // chargement reste bloqué sur « Connexion à Home Assistant ».
      const applyToken = (token: string | undefined) => {
        if (token === hassToken) return;
        hassToken = token;
        render();
      };

      if (auth.expired) {
        auth
          .refreshAccessToken()
          .then(() => applyToken(auth.accessToken ?? auth.data?.access_token))
          .catch(() => applyToken(data.access_token));
      } else {
        applyToken(auth.accessToken ?? data.access_token);
      }
    },
    destroy() {
      // Un autre hôte a déjà repris l'arbre : cette poignée est périmée.
      if (owner !== host) return;
      owner = null;
      // Détacher, jamais démonter. Un nœud détaché ne coûte rien : les flux
      // caméra s'arrêtent d'eux-mêmes, leur `IntersectionObserver` ne voit plus
      // aucune intersection (`useStreamActive`).
      mountPoint?.remove();
    },
  };
}
