import { describe, it, expect, beforeEach } from 'vitest';
import { isKioskEnabled, registerKioskHost, setKiosk } from './kiosk';

/** Reproduit la cascade de shadow DOM de HA que `applyKiosk` doit traverser. */
function mountFakeHomeAssistant() {
  document.body.innerHTML = '';
  const shadowHost = (tag: string, html = '') => {
    const el = document.createElement(tag);
    el.attachShadow({ mode: 'open' }).innerHTML = html;
    return el;
  };

  const huiRoot = shadowHost('hui-root', '<div class="header"></div><div id="view"></div>');
  const lovelace = shadowHost('ha-panel-lovelace');
  lovelace.shadowRoot!.appendChild(huiRoot);
  // `ha-drawer` garde la gouttière de la barre latérale dans sa propre shadow
  // root (`div.sidebar-shell` + `div.app-content`), et c'est lui qui accueille
  // le panneau Lovelace.
  const drawer = shadowHost('ha-drawer', '<div class="sidebar-shell"></div><div class="app-content"></div>');
  drawer.appendChild(lovelace);
  const main = shadowHost('home-assistant-main', '<ha-sidebar></ha-sidebar>');
  main.shadowRoot!.appendChild(drawer);
  const ha = shadowHost('home-assistant');
  ha.shadowRoot!.appendChild(main);
  document.body.appendChild(ha);

  const text = (el: Element) => [...el.shadowRoot!.querySelectorAll('style')].map(s => s.textContent).join('');
  return {
    mainStyles: () => main.shadowRoot!.querySelectorAll('style').length,
    rootStyles: () => huiRoot.shadowRoot!.querySelectorAll('style').length,
    mainCss: () => text(main),
    drawerCss: () => text(drawer),
  };
}

describe('mode plein écran', () => {
  beforeEach(() => {
    localStorage.clear();
    setKiosk(false, false);
    registerKioskHost(null);
  });

  it('est actif par défaut tant que rien n’a été choisi', () => {
    expect(isKioskEnabled()).toBe(true);
    expect(isKioskEnabled(false)).toBe(false);
  });

  it('retient le choix de cet appareil', () => {
    setKiosk(false);
    // Le défaut de la carte ne doit plus l'emporter une fois l'utilisateur passé.
    expect(isKioskEnabled()).toBe(false);
    expect(isKioskEnabled(true)).toBe(false);

    setKiosk(true);
    expect(isKioskEnabled()).toBe(true);
  });

  it('n’écrit rien quand on applique sans persister', () => {
    setKiosk(false, false);
    expect(localStorage.getItem('ha-dashboard-kiosk')).toBeNull();
  });

  it('injecte puis retire les styles dans les shadow roots de HA', () => {
    const ha = mountFakeHomeAssistant();
    expect(ha.mainStyles()).toBe(0);

    setKiosk(true, false);
    expect(ha.mainStyles()).toBe(1);
    expect(ha.rootStyles()).toBe(1);

    setKiosk(false, false);
    expect(ha.mainStyles()).toBe(0);
    expect(ha.rootStyles()).toBe(0);
  });

  // Régression : masquer la barre latérale ne referme pas la gouttière que
  // `ha-drawer` lui réserve — `.app-content { padding-inline-start:
  // var(--ha-sidebar-width) }`. Sans cette mise à zéro, le dashboard démarrait
  // 256 px trop à droite pendant que son fond, en `position:fixed`, couvrait
  // bien tout l'écran.
  it('referme la gouttière de la barre latérale, pas seulement la barre', () => {
    const ha = mountFakeHomeAssistant();
    setKiosk(true, false);

    expect(ha.mainCss()).toMatch(/--ha-sidebar-width:\s*0px/); // HA ≥ 2026.8
    expect(ha.mainCss()).toMatch(/--mdc-drawer-width:\s*0px/); // versions antérieures
    expect(ha.drawerCss()).toMatch(/\.sidebar-shell/);
  });

  it('n’injecte pas deux fois si on réactive', () => {
    const ha = mountFakeHomeAssistant();
    setKiosk(true, false);
    setKiosk(true, false);
    expect(ha.mainStyles()).toBe(1);
  });

  it('ajuste la hauteur de l’hôte selon la présence de l’en-tête', () => {
    const host = document.createElement('div');
    registerKioskHost(host);

    setKiosk(true, false);
    expect(host.style.height).toBe('100dvh');

    setKiosk(false, false);
    expect(host.style.height).toContain('var(--header-height');
  });
});
