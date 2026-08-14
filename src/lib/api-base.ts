/**
 * Detects the correct API base URL at runtime.
 *
 * Trois contextes de déploiement, trois bases différentes :
 *
 * 1. **Add-on / ingress** — servi sous
 *    `http://homeassistant.local:8123/api/hassio_ingress/<token>/`. Un `fetch`
 *    de `/api/config` tomberait sur l'API de HA (401/404) : il faut préfixer.
 * 2. **Carte Lovelace** — le bundle tourne sur l'origine HA elle-même. Le
 *    serveur Express n'est plus joignable : c'est l'intégration Python
 *    `ha_react_dashboard` qui répond, sous `/api/ha_react_dashboard/`.
 * 3. **Dev** — `pathname` vaut `/`, le proxy Vite route `/api/*`.
 */
function detectApiBase(): string {
  const path = window.location.pathname;
  const m = path.match(/^(\/api\/hassio_ingress\/[^/]+\/)/);
  return m ? m[1] : '/';
}

const API_BASE = detectApiBase();

/** Base de l'API de l'intégration, utilisée quand le bundle tourne en carte. */
const PANEL_API_BASE = '/api/ha_react_dashboard/';
/** Fichiers téléversés — servis en statique par l'intégration, sans auth. */
const PANEL_FILES_BASE = '/ha_react_dashboard_files/';

/**
 * Fournisseur de jeton, interrogé **à chaque appel**.
 *
 * `force` demande un renouvellement même si le jeton paraît encore valide —
 * utilisé après un 401.
 */
export type PanelTokenProvider = (force?: boolean) => Promise<string | undefined>;

let panelAuth: PanelTokenProvider | undefined;

/**
 * Bascule le client en mode « carte Lovelace » : les appels partent vers
 * l'intégration Python et portent le jeton HA.
 *
 * On garde un *fournisseur*, pas un jeton. Un jeton d'accès Home Assistant vit
 * trente minutes : le copier au montage, c'était garantir que tout revenait en
 * 401 dès qu'on rouvrait l'onglet une demi-heure plus tard, et l'écran de
 * chargement tournait alors indéfiniment.
 */
export function setPanelAuth(provider: PanelTokenProvider | undefined): void {
  panelAuth = provider;
}

/** Vrai quand le bundle tourne comme carte Lovelace sur l'origine HA. */
export function isPanelMode(): boolean {
  return panelAuth !== undefined;
}

/**
 * Build the correct absolute URL for an API path.
 * @param path - e.g. '/api/config' or `/api/profiles/${id}`
 */
export function apiUrl(path: string): string {
  const rest = path.replace(/^\/?api\//, '').replace(/^\//, '');
  return isPanelMode() ? PANEL_API_BASE + rest : API_BASE + path.replace(/^\//, '');
}

/**
 * Résout un fichier téléversé (`/uploads/…`) vers l'URL réellement servie.
 *
 * Les valeurs stockées en config gardent la forme `/uploads/x` dans les deux
 * modes, pour qu'une config reste portable. Mais une URL absolue depuis la
 * racine ne tombe ni sur le préfixe d'ingress, ni sur l'API de l'intégration :
 * il faut la reconstruire à l'affichage.
 */
export function assetUrl(path: string): string {
  if (!path.startsWith('/uploads/')) return path;
  return isPanelMode() ? PANEL_FILES_BASE + path.slice('/uploads/'.length) : API_BASE + path.replace(/^\//, '');
}

/**
 * `fetch` vers l'API du dashboard.
 *
 * En mode carte, les vues de l'intégration exigent l'authentification HA :
 * un `fetch` nu renverrait 401. Derrière l'ingress, c'est le superviseur qui
 * authentifie — pas d'en-tête à ajouter.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!panelAuth) return fetch(apiUrl(path), init);

  const url = apiUrl(path);
  const send = (token: string | undefined) => fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });

  const res = await send(await panelAuth());
  if (res.status !== 401) return res;

  // Le jeton a pu expirer entre sa lecture et l'arrivée de la requête, ou Home
  // Assistant a rendu la main avant d'avoir renouvelé. Un seul réessai, avec
  // renouvellement forcé : au-delà, c'est un vrai refus d'authentification et
  // le 401 doit remonter.
  return send(await panelAuth(true));
}
