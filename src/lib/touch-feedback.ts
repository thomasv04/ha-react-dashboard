/**
 * Retour tactile dessiné hors React (des `div` posés sur `document.body`, en
 * style inline) : le suivre au doigt ne coûte aucun rendu.
 * - `ripple` : deux ondes qui partent du point de contact ;
 * - `showValueBubble` : la valeur au-dessus du doigt pendant le glisser ;
 * - une vibration de 8 ms chaque fois que la valeur change de cran.
 *
 * Porté de Paddock (https://github.com/paduction/paddock, licence MIT),
 * `packages/ui/src/feedback/feedback.ts`. Différence : pas de couleur en dur,
 * l'accent est lu sur l'élément touché à chaque geste (`readAccent`), si bien
 * qu'il suit la couleur primaire des Paramètres, y compris dans la shadow root
 * du mode carte HA.
 */

export interface AccentColors {
  accent: string;
  ink: string;
  font: string;
}

/** Couleurs du thème vues depuis `el` : à lire au début de chaque geste, jamais en cache. */
export function readAccent(el: Element): AccentColors {
  const style = getComputedStyle(el);
  return {
    accent: style.getPropertyValue('--ds-accent').trim(),
    ink: style.getPropertyValue('--ds-accent-ink').trim(),
    font: style.fontFamily,
  };
}

export function ripple(x: number, y: number, accent: string, size = 220): void {
  for (const i of [0, 1]) {
    const wave = document.createElement('div');
    wave.style.cssText = `position:fixed; z-index:9998; pointer-events:none; left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; border-radius:50%; border:5px solid ${accent}; background:radial-gradient(circle, transparent 55%, color-mix(in srgb, ${accent} 18%, transparent) 100%); box-sizing:border-box; opacity:0;`;
    document.body.appendChild(wave);
    try {
      const animation = wave.animate(
        [
          { transform: 'scale(.08)', opacity: 1 },
          { transform: 'scale(.55)', opacity: 0.75, offset: 0.45 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        { duration: 820, delay: i * 190, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'both' }
      );
      animation.onfinish = () => wave.remove();
    } catch {
      wave.remove();
    }
  }
}

/** Cran de 5 % de la course : la vibration marque chaque passage. */
export function valueStep(value: number, min: number, max: number): number {
  return max > min ? Math.round(((value - min) / (max - min)) * 20) : 0;
}

/**
 * Doigt à `x` sur une tuile (`left`, `width`) → valeur 0–100, comme la
 * `LightTile` de Paddock. `inset` : marge inerte de chaque côté ; `step` : crans
 * (volet : 5) ; `offEdge` (lumière) : à 1 % du bord gauche ou moins, 0 =
 * éteinte, sinon au moins 1.
 */
export function tileValueAt(
  x: number,
  left: number,
  width: number,
  { inset = 0, step = 1, offEdge = false }: { inset?: number; step?: number; offEdge?: boolean } = {}
): number {
  const span = width - 2 * inset;
  const ratio = span > 0 ? Math.min(Math.max((x - left - inset) / span, 0), 1) : 0;
  if (offEdge && ratio <= 0.01) return 0;
  const value = Math.round((ratio * 100) / step) * step;
  return offEdge ? Math.max(1, value) : value;
}

/**
 * Coin haut-gauche de la bulle, `gap` px au-dessus de (x, y), gardé à `margin`
 * px des bords de l'écran (téléphone : une pilule collée au bord).
 */
export function placeBubble(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  gap = 34,
  margin = 8
): { left: number; top: number } {
  const left = Math.min(Math.max(x - width / 2, margin), viewportWidth - width - margin);
  const top = Math.max(y - gap - height, margin);
  return { left, top };
}

let bubble: HTMLDivElement | null = null;
let lastStep: number | null = null;

export function showValueBubble(x: number, y: number, label: string, step: number, colors: AccentColors): void {
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.style.cssText =
      'position:fixed; z-index:9999; pointer-events:none; opacity:0; transform:scale(.7); transform-origin:50% 100%; transition:opacity .12s, transform .12s cubic-bezier(.2,.8,.2,1); padding:.3em .75em; border-radius:999px; font-size:16px; font-weight:800; letter-spacing:-0.01em; box-shadow:0 10px 28px rgba(0,0,0,.4); white-space:nowrap;';
    document.body.appendChild(bubble);
  }
  bubble.style.background = colors.accent;
  bubble.style.color = colors.ink;
  bubble.style.fontFamily = colors.font;
  bubble.textContent = label;
  const { left, top } = placeBubble(x, y, bubble.offsetWidth, bubble.offsetHeight, window.innerWidth);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  bubble.style.opacity = '1';
  bubble.style.transform = 'scale(1)';
  if (lastStep !== null && lastStep !== step) haptic();
  lastStep = step;
}

export function hideValueBubble(): void {
  lastStep = null;
  if (!bubble) return;
  bubble.style.opacity = '0';
  bubble.style.transform = 'scale(.7)';
}

export function haptic(ms = 8): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Safari iOS n'a pas de vibration : rien à faire.
  }
}
