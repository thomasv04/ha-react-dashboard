export interface WidgetDisposition {
  id: string;
  label: string;
  description?: string;
  /** Taille minimum (on ne peut pas aller en dessous) */
  minSize: Record<'lg' | 'md' | 'sm', { w: number; h: number }>;
  /** Taille par défaut pour un nouveau widget */
  defaultSize: Record<'lg' | 'md' | 'sm', { w: number; h: number }>;
}

export type WidgetDispositions = Record<string, WidgetDisposition[]>;

/**
 * Dispositions disponibles par type de widget.
 * Chaque type a au moins une disposition.
 * Les tailles min garantissent que le contenu reste lisible.
 */
export const LEGACY_WIDGET_DISPOSITIONS: WidgetDispositions = {
  // ── Weather ────────────────────────────────────
  weather: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      description: 'Température + prévisions côte à côte',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Température au-dessus, prévisions en dessous',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 2, h: 4 }, md: { w: 2, h: 4 }, sm: { w: 2, h: 4 } },
    },
  ],

  // ── Thermostat ─────────────────────────────────
  thermostat: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 2, h: 4 }, md: { w: 2, h: 4 }, sm: { w: 2, h: 4 } },
    },
  ],

  // ── Camera ─────────────────────────────────────
  camera: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 6, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 2 } },
    },
  ],

  // ── Sensor ─────────────────────────────────────
  sensor: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      description: 'Icône + valeur côte à côte',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Icône au-dessus, valeur en dessous',
      minSize: { lg: { w: 1, h: 2 }, md: { w: 1, h: 2 }, sm: { w: 1, h: 2 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
    },
  ],

  // ── Light ──────────────────────────────────────
  light: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      minSize: { lg: { w: 1, h: 2 }, md: { w: 1, h: 2 }, sm: { w: 1, h: 2 } },
      defaultSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
    },
  ],

  // ── Media Player ───────────────────────────────
  media_player: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      description: 'Cover + infos côte à côte',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Cover au-dessus, contrôles en dessous',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 3, h: 4 }, md: { w: 3, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  // ── Cover ──────────────────────────────────────
  cover: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
      defaultSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
    },
  ],

  // ── Person ─────────────────────────────────────
  person: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 4, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
      defaultSize: { lg: { w: 6, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },
    },
  ],

  shortcuts: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 4, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 3 } },
    },
  ],
  tempo: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
      defaultSize: { lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
    },
  ],
  energy: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
      defaultSize: { lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
    },
  ],
  activity: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 6, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 3, h: 1 } },
      defaultSize: { lg: { w: 11, h: 1 }, md: { w: 7, h: 1 }, sm: { w: 3, h: 1 } },
    },
  ],
  greeting: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
      defaultSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
    },
  ],
  template: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 1 }, md: { w: 3, h: 1 }, sm: { w: 4, h: 1 } },
    },
  ],

  // ── Automation ─────────────────────────────────
  automation: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
    },
  ],

  // ── Group ──────────────────────────────────────
  group: [
    {
      id: 'default',
      label: 'Groupe',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
      defaultSize: { lg: { w: 4, h: 4 }, md: { w: 6, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  // ── Room ───────────────────────────────────────
  room: [
    {
      id: 'default',
      label: 'Pièce',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 3, h: 2 }, sm: { w: 4, h: 2 } },
    },
  ],

  // ── Button ─────────────────────────────────────
  button: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
    },
  ],

  // ── Alarm ──────────────────────────────────────
  alarm: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
    },
  ],

  // ── Vacuum ─────────────────────────────────────
  vacuum: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 4, h: 3 } },
      defaultSize: { lg: { w: 3, h: 4 }, md: { w: 4, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],
  // ── Pellet stove ───────────────────────────────────────────────────────────
  pellet: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
      defaultSize: { lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 4, h: 3 } },
    },
  ],
};

// getDisposition / getMinSize vivent désormais dans `@/widgets` : ils doivent
// lire le registre **dérivé** (manifestes inclus), et le lire d'ici créerait
// un cycle à l'exécution.
