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
  const main = shadowHost('home-assistant-main', '<ha-sidebar></ha-sidebar>');
  main.shadowRoot!.appendChild(lovelace);
  const ha = shadowHost('home-assistant');
  ha.shadowRoot!.appendChild(main);
  document.body.appendChild(ha);

  return {
    mainStyles: () => main.shadowRoot!.querySelectorAll('style').length,
    rootStyles: () => huiRoot.shadowRoot!.querySelectorAll('style').length,
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
