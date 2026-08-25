/**
 * Dégradés choisis par l'utilisateur.
 *
 * Ils étaient stockés sous forme de classes Tailwind (`from-blue-500
 * to-sky-400`) et rendus par `className`. Ça ne pouvait pas marcher au-delà des
 * valeurs écrites en toutes lettres dans le code : Tailwind ne génère que les
 * classes qu'il **trouve dans les sources**. Une classe composée à l'exécution
 * — un dégradé saisi à la main, ou le `bg-${color}-500/15` que les raccourcis
 * dérivaient du dégradé choisi — n'existe nulle part dans la feuille de style,
 * et ne peignait donc rien.
 *
 * Les couleurs sont désormais résolues en vraies valeurs, appliquées en style.
 * Les anciennes configurations continuent de fonctionner : leurs classes sont
 * celles des préréglages, dont on connaît les couleurs.
 */

export interface GradientPreset {
  label: string;
  /** Valeur stockée. Historiquement une paire de classes Tailwind. */
  value: string;
  from: string;
  to: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { label: 'Rouge → Orange', value: 'from-red-500 to-orange-400', from: '#ef4444', to: '#fb923c' },
  { label: 'Rose → Pink', value: 'from-pink-500 to-rose-400', from: '#ec4899', to: '#fb7185' },
  { label: 'Orange → Amber', value: 'from-orange-500 to-amber-400', from: '#f97316', to: '#fbbf24' },
  { label: 'Jaune → Amber', value: 'from-yellow-500 to-amber-400', from: '#eab308', to: '#fbbf24' },
  { label: 'Lime → Vert', value: 'from-lime-500 to-green-400', from: '#84cc16', to: '#4ade80' },
  { label: 'Vert → Émeraude', value: 'from-green-500 to-emerald-400', from: '#22c55e', to: '#34d399' },
  { label: 'Émeraude → Teal', value: 'from-emerald-500 to-teal-400', from: '#10b981', to: '#2dd4bf' },
  { label: 'Teal → Cyan', value: 'from-teal-500 to-cyan-400', from: '#14b8a6', to: '#22d3ee' },
  { label: 'Cyan → Bleu clair', value: 'from-cyan-500 to-sky-400', from: '#06b6d4', to: '#38bdf8' },
  { label: 'Bleu → Cyan', value: 'from-blue-500 to-cyan-400', from: '#3b82f6', to: '#22d3ee' },
  { label: 'Bleu → Bleu clair', value: 'from-blue-500 to-sky-400', from: '#3b82f6', to: '#38bdf8' },
  { label: 'Bleu ciel → Bleu', value: 'from-sky-500 to-blue-400', from: '#0ea5e9', to: '#60a5fa' },
  { label: 'Indigo → Bleu', value: 'from-indigo-500 to-blue-400', from: '#6366f1', to: '#60a5fa' },
  { label: 'Violet → Indigo', value: 'from-violet-500 to-indigo-400', from: '#8b5cf6', to: '#818cf8' },
  { label: 'Purple → Violet', value: 'from-purple-500 to-violet-400', from: '#a855f7', to: '#a78bfa' },
  { label: 'Fuchsia → Pink', value: 'from-fuchsia-500 to-pink-400', from: '#d946ef', to: '#f472b6' },
  { label: 'Slate → Gris', value: 'from-slate-500 to-gray-400', from: '#64748b', to: '#9ca3af' },
];

/** Format d'un dégradé composé à la main : deux couleurs séparées par une virgule. */
const CUSTOM = /^(#[0-9a-f]{6}),(#[0-9a-f]{6})$/i;

export const isCustomGradient = (value: string | undefined): boolean => !!value && CUSTOM.test(value);

/** Compose la valeur stockée pour un dégradé sur mesure. */
export const customGradient = (from: string, to: string): string => `${from},${to}`;

/**
 * Les deux couleurs d'un dégradé, préréglage ou sur mesure.
 *
 * `undefined` pour une valeur qu'on ne sait pas lire — une ancienne classe
 * Tailwind hors préréglages. Les appelants la laissent alors au `className`,
 * comme avant.
 */
export function gradientColors(value: string | undefined): { from: string; to: string } | undefined {
  if (!value) return undefined;
  const preset = GRADIENT_PRESETS.find(g => g.value === value);
  if (preset) return { from: preset.from, to: preset.to };
  const custom = value.match(CUSTOM);
  return custom ? { from: custom[1], to: custom[2] } : undefined;
}

/** `background-image` d'un dégradé, ou `undefined` s'il faut s'en remettre aux classes. */
export function gradientCss(value: string | undefined): string | undefined {
  const colors = gradientColors(value);
  return colors && `linear-gradient(135deg, ${colors.from}, ${colors.to})`;
}

/** Couleur d'accent tirée d'un dégradé — celle de départ. */
export function gradientAccent(value: string | undefined): string {
  return gradientColors(value)?.from ?? '#3b82f6';
}
