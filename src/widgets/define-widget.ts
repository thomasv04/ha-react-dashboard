import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { WidgetDisposition } from '@/config/widget-dispositions';
import type { WidgetFieldDef } from '@/types/widget-fields';
import type { SizePreset } from '@/config/size-presets';
import type { Category } from '@/components/layout/AddWidgetModal/widget-meta';

export type Breakpoint = 'lg' | 'md' | 'sm';
export type GridSize = { w: number; h: number };
export type SizeByBreakpoint = Record<Breakpoint, GridSize>;

/** Onglets de la modale « Ajouter un widget » (hors `all`, qui est virtuel) */
export type WidgetCategory = Exclude<Category, 'all'>;

/**
 * Tout ce qu'il faut savoir sur un widget, en un seul endroit.
 *
 * Avant, ces informations étaient éparpillées dans sept registres centraux
 * (composants, méta, catalogue, dispositions, tailles, champs, valeurs par
 * défaut) qu'il fallait tenir en phase à la main — un script scannait le code
 * source pour détecter les oublis, et il échouait. Ici, chaque widget se
 * décrit lui-même à côté de son composant, et les registres en sont dérivés.
 *
 * Voir `CLAUDE.md` § « Créer un widget » et `npm run new:widget`.
 */
export interface WidgetDefinition {
  /** Identifiant du type, unique. Doit figurer dans `GridWidget['type']`. */
  type: string;

  /**
   * Import différé du composant. Rester sur un `() => import(...)` : c'est ce
   * qui garde chaque card dans son propre chunk.
   */
  component: () => Promise<{ default: ComponentType }>;

  /** Ce qui s'affiche dans la modale « Ajouter un widget » */
  meta: {
    /** Clé i18n, ex. `widgets.sensor.label` */
    label: string;
    /** Clé i18n, ex. `widgets.sensor.description` */
    description: string;
    category: WidgetCategory;
    icon: LucideIcon;
    /** Couleur d'accent de la vignette du catalogue */
    color: string;
    /** Domaine HA proposé en priorité dans le sélecteur d'entité */
    entityDomain?: string;
    /**
     * Clé de configuration qui reçoit l'entité choisie à l'ajout. Défaut
     * `entityId` ; une card qui en agrège plusieurs vise sa propre liste.
     */
    entityConfigKey?: string;
    /** Mots-clés de recherche supplémentaires (hors label / description) */
    keywords?: string[];
  };

  /** Taille posée à l'ajout du widget, par breakpoint */
  defaultSize: SizeByBreakpoint;

  /** Taille en dessous de laquelle le contenu devient illisible */
  minSize?: Partial<SizeByBreakpoint>;

  /** Dimensions de l'aperçu du catalogue (défaut : `defaultSize.lg`) */
  previewSize?: GridSize;

  /** Presets Compact / Normal / Large proposés dans l'éditeur */
  sizePresets?: Partial<Record<Breakpoint, SizePreset[]>>;

  /**
   * Variantes de mise en page (« horizontale », « verticale »…). Facultatif :
   * sans dispositions, `defaultSize` / `minSize` font foi.
   */
  dispositions?: WidgetDisposition[];

  /** Champs proposés dans la modale d'édition du widget */
  fields?: WidgetFieldDef[];

  /**
   * Configuration initiale d'un nouveau widget. `type` est ajouté
   * automatiquement.
   *
   * Pour faire vérifier ces valeurs par l'interface de configuration du
   * widget, annoter avec `satisfies` :
   *
   * ```ts
   * defaults: { entityId: 'automation.example' } satisfies WidgetDefaults<AutomationCardConfig>,
   * ```
   */
  defaults: Record<string, unknown>;
}

/** Forme attendue de `defaults` pour une config de widget donnée. */
export type WidgetDefaults<TConfig> = Omit<TConfig, 'type'>;

/**
 * Identité typée : ne fait que fixer l'inférence (`const`) pour que
 * `WIDGETS[number]['type']` produise une union de littéraux plutôt que
 * `string` — c'est ce dont dérive l'union des types de widgets.
 */
export function defineWidget<const TDef extends WidgetDefinition>(def: TDef): TDef {
  return def;
}
