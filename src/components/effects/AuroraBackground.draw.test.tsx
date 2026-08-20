import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuroraBackground } from './AuroraBackground';

/**
 * Ce que le test protège : le passage des orbes du dégradé recréé à chaque
 * image au sprite pré-rendu.
 *
 * Le rendu n'est pas observable — jsdom n'a pas de canvas — mais les appels au
 * contexte 2D le sont, et c'est exactement là que vit la régression qu'on
 * craint : un `createRadialGradient` par orbe **et par image**, soit une
 * centaine d'objets gradient par seconde téléversés au GPU. Le fond de la
 * tablette murale se recalcule derrière une vingtaine de cards en verre : ce
 * qu'on dessine ici coûte vingt fois son prix.
 */

type Calls = Record<string, number>;

let calls: Calls;
let frame: ((time: number) => void) | null;
/** Opacités passées à `globalAlpha` — le sprite est peint à alpha plein. */
let alphas: number[];

function stubContext() {
  const bump = (name: string) => () => {
    calls[name] = (calls[name] ?? 0) + 1;
  };
  return {
    clearRect: bump('clearRect'),
    fillRect: bump('fillRect'),
    beginPath: bump('beginPath'),
    arc: bump('arc'),
    fill: bump('fill'),
    setTransform: bump('setTransform'),
    scale: bump('scale'),
    drawImage: bump('drawImage'),
    createRadialGradient: () => {
      calls.createRadialGradient = (calls.createRadialGradient ?? 0) + 1;
      return { addColorStop: () => {} };
    },
    set globalAlpha(v: number) {
      alphas.push(v);
    },
    get globalAlpha() {
      return 1;
    },
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

/** Joue `count` images, à 100 ms d'intervalle — au-delà du pas de cadence. */
function runFrames(count: number) {
  for (let i = 1; i <= count; i++) {
    const next = frame;
    frame = null;
    next?.(i * 100);
  }
}

beforeEach(() => {
  calls = {};
  alphas = [];
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

const CONFIG = { palette: 'default', orbCount: 3, speed: 1, size: 1, opacity: 1, sway: 1 } as const;

describe('AuroraBackground', () => {
  it('peint un orbe par sprite, pas un dégradé par image', () => {
    render(<AuroraBackground config={CONFIG} />);
    // Un sprite par couleur de palette, créé au montage. L'affirmer évite que
    // l'assertion suivante passe à vide si les sprites disparaissaient.
    const afterMount = calls.createRadialGradient ?? 0;
    expect(afterMount).toBe(5);

    runFrames(10);

    // 3 orbes × 10 images
    expect(calls.drawImage).toBe(30);
    // Les sprites sont créés une fois pour toutes, au montage : cinq couleurs
    // de palette, quel que soit le nombre d'images jouées ensuite.
    expect(calls.createRadialGradient).toBe(afterMount);
  });

  it("module l'opacité par orbe plutôt que par dégradé", () => {
    render(<AuroraBackground config={CONFIG} />);
    runFrames(2);

    // Chaque orbe pose son alpha, et la boucle la remet à 1 en sortant : le
    // reste de la page ne doit pas hériter de la transparence du fond.
    expect(alphas.length).toBeGreaterThan(0);
    expect(alphas.some(a => a > 0 && a < 1)).toBe(true);
    expect(alphas.at(-1)).toBe(1);
  });

  it('efface avant chaque image — sinon les orbes laissent une traînée', () => {
    render(<AuroraBackground config={CONFIG} />);
    runFrames(4);

    expect(calls.clearRect).toBe(4);
  });
});
