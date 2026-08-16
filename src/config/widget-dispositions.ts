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


// getDisposition / getMinSize vivent désormais dans `@/widgets` : ils doivent
// lire le registre **dérivé** (manifestes inclus), et le lire d'ici créerait
// un cycle à l'exécution.
