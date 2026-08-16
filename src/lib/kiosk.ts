/**
 * Mode plein écran : masque la barre d'outils et la barre latérale de Home
 * Assistant quand le dashboard tourne en carte Lovelace.
 *
 * Sans ça, HA dessine toujours son en-tête au-dessus de la vue : le dashboard
 * n'occupe pas l'écran entier, ce qui ruine l'usage mural et mobile. Ces
 * éléments vivent dans des shadow DOM successifs, hors de portée d'une feuille
 * de style globale — il faut injecter un `<style>` dans chaque racine.
 *
 * Même principe que le plugin `kiosk-mode`, réduit à ce dont on a besoin, pour
 * ne pas imposer une dépendance HACS de plus à l'utilisateur.
 *
 * Le réglage est **par appareil** : la même maison peut vouloir le plein écran
 * sur la tablette murale et garder la navigation HA sur le portable. D'où
 * `localStorage` plutôt que la config du tableau de bord, partagée par tous.
 *
 * ponytail: dépend de la structure interne du frontend HA (`home-assistant` →
 * `home-assistant-main` → `hui-root`). Si HA la change, le masquage cesse
 * silencieusement — le dashboard reste utilisable, juste avec l'en-tête.
 */

const STYLE_ID = 'ha-react-dashboard-kiosk';
const STORAGE_KEY = 'ha-dashboard-kiosk';

// `--ha-sidebar-width` : nom de la variable depuis HA 2026.8. C'est elle qui
// pilote la gouttière `padding-inline-start` de `.app-content` dans la shadow
// root de `ha-drawer` — masquer la barre latérale ne la referme pas, le
// dashboard démarrait donc à x=256 alors que son fond, lui, couvrait tout
// l'écran. `--mdc-drawer-width` reste pour les versions antérieures.
// Les propriétés personnalisées héritent à travers les shadow roots : les
// poser ici suffit, inutile d'aller les répéter plus bas.
const MAIN_CSS = `
  :host { --ha-sidebar-width: 0px !important; --mdc-drawer-width: 0px !important; }
  ha-sidebar, ha-drawer > ha-sidebar { display: none !important; }
  ha-drawer > .mdc-drawer-app-content { margin-left: 0 !important; margin-inline-start: 0 !important; }
`;

// `ha-drawer` réserve la place de la barre latérale avec un `div.sidebar-shell`
// **dans sa propre shadow root** : la largeur zéro le réduit déjà à rien, on le
// masque en plus pour qu'il ne capte aucun clic sur le bord gauche.
const DRAWER_CSS = `
  .sidebar-shell { display: none !important; }
`;

const ROOT_CSS = `
  .header, app-header, .toolbar { display: none !important; }
  hui-view, #view { padding-top: 0 !important; min-height: 100vh !important; }
`;

function inject(root: ShadowRoot | null | undefined, css: string): HTMLStyleElement | null {
  if (!root || root.getElementById?.(STYLE_ID)) return null;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  root.appendChild(style);
  return style;
}

/** Applique le masquage. Renvoie la fonction de nettoyage. */
function applyKiosk(): () => void {
  const injected: HTMLStyleElement[] = [];
  let frame = 0;

  const tick = () => {
    const ha = document.querySelector('home-assistant');
    const main = ha?.shadowRoot?.querySelector('home-assistant-main');
    const drawer = main?.shadowRoot?.querySelector('ha-drawer');
    const lovelace = main?.shadowRoot?.querySelector('ha-panel-lovelace');
    const huiRoot = lovelace?.shadowRoot?.querySelector('hui-root');

    for (const style of [
      inject(main?.shadowRoot, MAIN_CSS),
      inject(drawer?.shadowRoot, DRAWER_CSS),
      inject(huiRoot?.shadowRoot, ROOT_CSS),
    ]) {
      if (style) injected.push(style);
    }

    // Le frontend monte ses panneaux en plusieurs passes : on retente une
    // seconde environ, puis on abandonne plutôt que de tourner en boucle.
    if (injected.length < 3 && frame < 60) {
      frame += 1;
      requestAnimationFrame(tick);
    }
  };
  tick();

  return () => {
    frame = Infinity;
    injected.forEach(s => s.remove());
    injected.length = 0;
  };
}

// ── État partagé ──────────────────────────────────────────────────────────────
// La carte vit hors de React (custom element) et le réglage se change depuis
// React : ce module est le point de rendez-vous des deux.

let cleanup: (() => void) | null = null;
let host: HTMLElement | null = null;

/** Préférence de cet appareil, `fallback` si l'utilisateur n'a jamais choisi. */
export function isKioskEnabled(fallback = true): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? fallback : stored === '1';
  } catch {
    // Navigateur en navigation privée stricte : le plein écran n'est pas une
    // raison de casser le dashboard.
    return fallback;
  }
}

/** L'élément hôte de la carte, dont la hauteur dépend de l'en-tête. */
export function registerKioskHost(element: HTMLElement | null): void {
  host = element;
}

/** Active ou coupe le plein écran. `persist: false` pour une simple application. */
export function setKiosk(enabled: boolean, persist = true): void {
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      /* stockage indisponible — le réglage ne survivra pas au rechargement */
    }
  }

  if (enabled && !cleanup) cleanup = applyKiosk();
  if (!enabled && cleanup) {
    cleanup();
    cleanup = null;
  }

  // Sans en-tête HA la vue fait tout l'écran ; avec, il faut lui laisser sa
  // place sinon le bas du dashboard passe sous le pli.
  if (host) {
    host.style.height = enabled ? '100dvh' : 'calc(100dvh - var(--header-height, 56px))';
  }
}
