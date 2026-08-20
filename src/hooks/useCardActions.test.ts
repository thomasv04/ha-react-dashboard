import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const callService = vi.fn();
const setCurrentPage = vi.fn();
const openPanel = vi.fn();

vi.mock('@hakit/core', () => ({
  // Le bouchon doit appliquer le sélecteur : le code de production passe
  // `useHass(s => s.helpers)` pour ne pas s'abonner au store entier.
  useHass: (selector?: (s: { helpers: { callService: typeof callService } }) => unknown) => {
    const state = { helpers: { callService: callService } };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));
vi.mock('@/context/PageContext', () => ({
  usePages: () => ({ setCurrentPage, pages: [{ id: 'home' }, { id: 'salon' }] }),
}));
vi.mock('@/context/PanelContext', () => ({ usePanel: () => ({ openPanel }) }));

import { useCardActions } from './useCardActions';

function run() {
  return renderHook(() => useCardActions()).result.current;
}

beforeEach(() => vi.clearAllMocks());

describe('useCardActions', () => {
  it('rend la main sur « default » — le comportement historique reste à la card', () => {
    expect(run()({ action: 'default' }, 'light.salon')).toBe(false);
    expect(run()(undefined, 'light.salon')).toBe(false);
  });

  it("rend la main sur « more-info » — seule la card connaît sa position à l'écran", () => {
    expect(run()({ action: 'more-info' }, 'light.salon')).toBe(false);
  });

  it('« none » consomme le geste sans rien faire', () => {
    expect(run()({ action: 'none' }, 'light.salon')).toBe(true);
    expect(callService).not.toHaveBeenCalled();
    expect(setCurrentPage).not.toHaveBeenCalled();
  });

  it('navigue vers une page, ouvre un panneau', () => {
    run()({ action: 'navigate', target: 'salon' }, '');
    expect(setCurrentPage).toHaveBeenCalledWith('salon');

    run()({ action: 'navigate', target: 'custom:cuisine' }, '');
    expect(openPanel).toHaveBeenCalledWith('custom:cuisine');
  });

  it("ignore une page inconnue au lieu de vider l'écran", () => {
    run()({ action: 'navigate', target: 'nexiste-pas' }, '');
    expect(setCurrentPage).not.toHaveBeenCalled();
  });

  it("appelle un service, en retombant sur l'entité de la card", () => {
    run()({ action: 'call-service', service: 'light.turn_on' }, 'light.salon');

    expect(callService).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'light', service: 'turn_on', target: { entity_id: 'light.salon' } })
    );
  });

  it("préfère l'entité explicitement choisie", () => {
    run()({ action: 'call-service', service: 'switch.toggle', entityId: 'switch.prise' }, 'light.salon');
    expect(callService).toHaveBeenCalledWith(expect.objectContaining({ target: { entity_id: 'switch.prise' } }));
  });

  it('transmet les données JSON', () => {
    run()({ action: 'call-service', service: 'light.turn_on', serviceData: '{"brightness":180}' }, 'light.salon');
    expect(callService).toHaveBeenCalledWith(expect.objectContaining({ serviceData: { brightness: 180 } }));
  });

  it('appelle quand même le service si le JSON est mal formé', () => {
    // Une accolade oubliée ne doit pas empêcher d'allumer la lumière.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    run()({ action: 'call-service', service: 'light.turn_on', serviceData: '{oops' }, 'light.salon');

    expect(callService).toHaveBeenCalledWith(expect.objectContaining({ serviceData: undefined }));
  });

  it('ignore un service mal écrit', () => {
    run()({ action: 'call-service', service: 'pasdepoint' }, 'light.salon');
    expect(callService).not.toHaveBeenCalled();
  });

  it('ouvre une URL sans laisser de prise sur le dashboard', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    run()({ action: 'url', url: 'https://exemple.fr' }, '');

    // `noopener` : sans lui la page ouverte peut rediriger le dashboard.
    expect(open).toHaveBeenCalledWith('https://exemple.fr', '_blank', 'noopener,noreferrer');
  });
});
