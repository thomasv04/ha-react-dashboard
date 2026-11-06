import { useState, useEffect } from 'react';
import { apiFetch, isPanelMode } from '@/lib/api-base';
import { DashboardShell } from './DashboardShell';

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
    // `/api/system/*` n'existe que sur le serveur Express de l'add-on ;
    // l'intégration Python ne sert pas ces routes. En carte Lovelace, le jeton
    // arrive de toute façon en propriété (`ha-panel.tsx`) — au premier rendu il
    // manque encore, et cet appel partait alors chercher un 404 à chaque
    // montage. Même garde que `SystemSection` pour `/api/system/ingress-url`.
    if (isPanelMode()) return;
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

  return <DashboardShell hassUrl={hassUrl} hassToken={hassToken} />;
}

export default App;
