import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WeatherEffects from './WeatherEffects';

/**
 * Ce que le test couvre : que chaque état météo dessine bien *quelque chose*,
 * et de la bonne forme. Le rendu réel n'est pas observable ici — jsdom n'a pas
 * de canvas — mais les appels au contexte 2D, eux, le sont, et c'est là que
 * vivent les fautes silencieuses (une forme jamais atteinte, un effet déclaré
 * mais jamais dessiné).
 */

type Calls = Record<string, number>;

let calls: Calls;
let frame: ((time: number) => void) | null;

function stubContext() {
  const bump = (name: string) => () => {
    calls[name] = (calls[name] ?? 0) + 1;
  };
  return {
    clearRect: bump('clearRect'),
    fillRect: bump('fillRect'),
    beginPath: bump('beginPath'),
    moveTo: bump('moveTo'),
    lineTo: bump('lineTo'),
    stroke: bump('stroke'),
    arc: bump('arc'),
    fill: bump('fill'),
    createRadialGradient: () => {
      calls.createRadialGradient = (calls.createRadialGradient ?? 0) + 1;
      return { addColorStop: () => {} };
    },
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

/** Joue `count` images de la boucle, à 100 ms d'intervalle (au-delà du pas de 30 ips). */
function runFrames(count: number) {
  for (let i = 1; i <= count; i++) {
    const next = frame;
    frame = null;
    next?.(i * 100);
  }
}

beforeEach(() => {
  calls = {};
  frame = null;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(stubContext() as never);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    frame = cb;
    return 1;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  // `useLowPowerMotion` refuse d'animer sans ces réponses.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as never;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('WeatherEffects', () => {
  it('ne pose rien sur un ciel dégagé', () => {
    const { container } = render(<WeatherEffects condition='sunny' />);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('trace des traits pour la pluie', () => {
    render(<WeatherEffects condition='rainy' />);
    runFrames(2);

    expect(calls.stroke).toBeGreaterThan(0);
    expect(calls.clearRect).toBeGreaterThan(0);
  });

  it('trace des disques pour la neige', () => {
    render(<WeatherEffects condition='snowy' />);
    runFrames(2);

    expect(calls.arc).toBeGreaterThan(0);
    expect(calls.stroke ?? 0).toBe(0);
  });

  it('trace des nappes dégradées pour le brouillard', () => {
    render(<WeatherEffects condition='fog' />);
    runFrames(2);

    expect(calls.createRadialGradient).toBeGreaterThan(0);
  });

  it("éclaire la card pendant l'orage, sans particules", () => {
    render(<WeatherEffects condition='lightning' />);
    // L'éclair tombe au bout de 60 à 240 images : il faut jouer la période
    // maximale pour être sûr d'en voir un.
    runFrames(340);

    expect(calls.fillRect).toBeGreaterThan(0);
    expect(calls.arc ?? 0).toBe(0);
  });
});
