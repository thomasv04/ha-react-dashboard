/**
 * Point d'entrée chargé par l'intégration `ha_react_dashboard`.
 *
 * Home Assistant injecte ce fichier dans **chaque page** du frontend : il doit
 * rester minuscule. Tout le dashboard (React, hls.js, les icônes…) vit derrière
 * un import dynamique déclenché seulement quand la carte est réellement montée.
 *
 * Le même élément sert de carte Lovelace (`type: custom:ha-react-dashboard-panel`)
 * et de panneau custom. C'est la carte qui compte : elle permet au dashboard
 * d'être un vrai tableau de bord Lovelace, donc d'être « défini par défaut sur
 * cet appareil » — ce qu'un panneau d'add-on ne permet pas.
 */
import type { DashboardHandle } from './ha-panel';
import { isKioskEnabled, registerKioskHost, setKiosk } from './lib/kiosk';

// Résolue depuis l'URL de ce module : marche sous HA
// (`/ha_react_dashboard_static/`) comme en développement, sans rien coder en dur.
// `@vite-ignore` : le fichier est émis par le build CSS, pas par cette
// expression — sa résolution est volontairement laissée à l'exécution.
// `?v=` : le nom du fichier est fixe (pas de hash) et HA le sert en
// `cache-control: max-age=2678400`. Sans ça le navigateur garde la feuille d'une
// version précédente pendant un mois pendant que le JS, lui, se met à jour — un
// balisage neuf sur du CSS périmé (les modales perdaient `.gc-overlay`).
const CSS_URL = new URL(/* @vite-ignore */ './assets/dashboard.css', import.meta.url).href + `?v=${__BUILD_VERSION__}`;

// La SPA charge cette police depuis son `index.html`, fichier qui n'existe pas
// en mode carte : sans ça, le dashboard tombe sur la police par défaut de HA.
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&display=swap';

function addLink(parent: Node & ParentNode, href: string, marker: string): void {
  if ((parent as Element).querySelector(`link[${marker}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute(marker, '');
  parent.appendChild(link);
}

/**
 * Attache la feuille de style là où le dashboard en a besoin.
 *
 * Deux endroits, et il les faut tous les deux : la shadow root de `hui-root`,
 * où vit la carte et où les styles du document ne pénètrent pas ; et
 * `document.head`, pour les modales et menus que l'app rend en portail sur
 * `document.body`, hors de la shadow root.
 *
 * La police, elle, ne va que dans le document : une `@font-face` est de portée
 * globale et traverse les shadow roots, contrairement aux règles de style.
 */
function attachStylesheet(container: Document | ShadowRoot): void {
  const parent = container instanceof Document ? container.head : container;
  addLink(parent, CSS_URL, 'data-ha-react-dashboard');
  if (container instanceof Document) addLink(parent, FONT_URL, 'data-ha-react-dashboard-font');
}

interface CardConfig {
  /** Plein écran par défaut. Chaque appareil peut ensuite trancher lui-même
   *  depuis les réglages du dashboard (Apparence → Mise en page). */
  kiosk?: boolean;
}

class HaReactDashboardPanel extends HTMLElement {
  private _handle: DashboardHandle | null = null;
  private _config: CardConfig = {};
  private _hass: Record<string, unknown> | null = null;
  private _loading = false;

  connectedCallback() {
    // `isolation:isolate` : le fond du dashboard est posé en `z-index:-10`,
    // pensé pour la SPA où le `body` est transparent. Dans une vue Lovelace,
    // HA peint un `hui-view-background` opaque — sans contexte d'empilement
    // propre à la carte, le fond passait derrière et n'apparaissait jamais.
    this.style.cssText = 'display:block;position:relative;isolation:isolate;width:100%;';
    attachStylesheet(document);
    const root = this.getRootNode();
    if (root instanceof ShadowRoot) attachStylesheet(root);
    registerKioskHost(this);
    this._applyLayout();
    void this._load();
  }

  disconnectedCallback() {
    setKiosk(false, false);
    registerKioskHost(null);
    this._handle?.destroy();
    this._handle = null;
  }

  set hass(hass: Record<string, unknown>) {
    this._hass = hass;
    this._handle?.setHass(hass);
  }

  /** Contrat carte Lovelace *et* panneau custom. */
  setConfig(config: CardConfig | null) {
    this._config = config ?? {};
    if (this.isConnected) this._applyLayout();
  }

  /** Contrat carte Lovelace : le dashboard prend toute la vue. */
  getCardSize() {
    return 100;
  }

  private async _load() {
    if (this._handle || this._loading) return;
    this._loading = true;
    try {
      const { mountDashboard } = await import('./ha-panel');
      // L'élément a pu être retiré du DOM pendant le chargement du bundle.
      if (!this.isConnected) return;
      this._handle = mountDashboard(this);
      if (this._hass) this._handle.setHass(this._hass);
    } catch (err) {
      console.error('[ha-react-dashboard] chargement du dashboard impossible', err);
    } finally {
      this._loading = false;
    }
  }

  private _applyLayout() {
    // La carte fixe le défaut, l'appareil a le dernier mot : c'est le réglage
    // « Plein écran » du dashboard qui décide, pas le YAML.
    setKiosk(isKioskEnabled(this._config.kiosk !== false), false);
  }
}

if (!customElements.get('ha-react-dashboard-panel')) {
  customElements.define('ha-react-dashboard-panel', HaReactDashboardPanel);
}

// Fait apparaître la carte dans le sélecteur « Ajouter une carte » de Lovelace.
interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
}
const customCards = ((window as unknown as { customCards?: CustomCardEntry[] }).customCards ??= []);
if (!customCards.some(card => card.type === 'ha-react-dashboard-panel')) {
  customCards.push({
    type: 'ha-react-dashboard-panel',
    name: 'HA React Dashboard',
    description: 'Tableau de bord React plein écran',
    preview: false,
  });
}
