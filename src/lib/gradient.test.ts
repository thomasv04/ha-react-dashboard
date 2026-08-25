import { describe, it, expect } from 'vitest';
import { gradientCss, gradientColors, gradientAccent, customGradient, isCustomGradient, GRADIENT_PRESETS } from './gradient';

describe('gradientColors', () => {
  it('lit un préréglage par sa valeur historique', () => {
    expect(gradientColors('from-red-500 to-orange-400')).toEqual({ from: '#ef4444', to: '#fb923c' });
  });

  // Le champ « personnalisé » attendait des classes Tailwind, que Tailwind ne
  // génère jamais faute de les trouver dans les sources : le dégradé saisi ne
  // peignait rien. Deux couleurs, cette fois.
  it('lit un dégradé sur mesure', () => {
    expect(gradientColors('#112233,#445566')).toEqual({ from: '#112233', to: '#445566' });
  });

  it("ne devine rien d'une classe inconnue", () => {
    expect(gradientColors('from-nowhere-500 to-nothing-400')).toBeUndefined();
    expect(gradientColors('')).toBeUndefined();
  });
});

describe('gradientCss', () => {
  it('rend un dégradé CSS, ou rien à peindre en classe', () => {
    expect(gradientCss('#112233,#445566')).toBe('linear-gradient(135deg, #112233, #445566)');
    expect(gradientCss('from-inconnu-500')).toBeUndefined();
  });

  // La valeur par défaut de la card Pièce doit être lisible, sinon elle repart
  // sur le chemin des classes pour rien.
  it('connaît le dégradé par défaut de la card Pièce', () => {
    expect(gradientCss('from-blue-500 to-sky-400')).toBeDefined();
  });
});

describe('gradientAccent', () => {
  it('prend la couleur de départ, et un bleu par défaut', () => {
    expect(gradientAccent('from-red-500 to-orange-400')).toBe('#ef4444');
    expect(gradientAccent('n’importe quoi')).toBe('#3b82f6');
  });
});

describe('customGradient', () => {
  it('compose une valeur que le lecteur reconnaît', () => {
    const v = customGradient('#aabbcc', '#ddeeff');
    expect(isCustomGradient(v)).toBe(true);
    expect(gradientColors(v)).toEqual({ from: '#aabbcc', to: '#ddeeff' });
  });

  it("aucun préréglage n'est pris pour un dégradé sur mesure", () => {
    expect(GRADIENT_PRESETS.filter(p => isCustomGradient(p.value))).toEqual([]);
  });
});
