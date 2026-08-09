import React, { lazy, memo, Suspense, type ComponentType } from 'react';
import { WIDGETS } from './registry';
import type { WidgetDefinition } from './define-widget';

import { LEGACY_WIDGET_COMPONENTS } from '@/config/widget-registry';
import { LEGACY_WIDGET_META, type WidgetMeta } from '@/components/layout/AddWidgetModal/widget-meta';
import { LEGACY_WIDGET_DISPOSITIONS, type WidgetDispositions } from '@/config/widget-dispositions';
import { LEGACY_SIZE_PRESETS } from '@/config/size-presets';
import { LEGACY_WIDGET_CATALOG, type WidgetCatalogEntry } from '@/config/widget-catalog';
import { LEGACY_WIDGET_FIELD_DEFS, LEGACY_DEFAULT_WIDGET_CONFIGS } from '@/types/widget-fields';
import type { WidgetFieldDef } from '@/types/widget-fields';
import type { WidgetConfig, WidgetConfigs } from '@/types/widget-types';
import type { GridWidget, WidgetSizePresets } from '@/context/DashboardLayoutContext';

export type { WidgetDefinition } from './define-widget';
export { defineWidget } from './define-widget';
export { WIDGETS } from './registry';

type WidgetType = GridWidget['type'];

/**
 * Registres dérivés.
 *
 * Chaque registre part des données historiques (les gros objets centraux, un
 * par facette) et applique par-dessus ce que déclarent les manifestes. Un
 * widget migré vers `defineWidget` fait donc autorité sur son entrée ; les
 * autres continuent de fonctionner sans changement.
 *
 * Conséquence pratique : **un nouveau widget ne touche aucun fichier central**
 * hors `registry.ts` et l'union de types. Cf. `CLAUDE.md` § « Créer un widget ».
 */

const defs = WIDGETS as readonly WidgetDefinition[];

// ── Composants (lazy + memo, un chunk par card) ──────────────────────────────

function lazyMemo(factory: () => Promise<{ default: ComponentType }>) {
  const Lazy = lazy(factory);
  return memo(function LazyWidget(props: Record<string, unknown>) {
    return React.createElement(Suspense, { fallback: null }, React.createElement(Lazy, props));
  });
}

export const WIDGET_COMPONENTS: Partial<Record<WidgetType, ComponentType>> = {
  ...LEGACY_WIDGET_COMPONENTS,
  ...Object.fromEntries(defs.map(d => [d.type, lazyMemo(d.component)])),
};

// ── Méta du catalogue « Ajouter un widget » ──────────────────────────────────

export const WIDGET_META: WidgetMeta[] = [
  ...LEGACY_WIDGET_META.filter(m => !defs.some(d => d.type === m.type)),
  ...defs.map((d): WidgetMeta => ({
    type: d.type as WidgetType,
    label: d.meta.label,
    description: d.meta.description,
    category: d.meta.category,
    icon: d.meta.icon,
    color: d.meta.color,
    entityDomain: d.meta.entityDomain,
  })),
];

// ── Catalogue (tailles posées à l'ajout) ─────────────────────────────────────

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  ...LEGACY_WIDGET_CATALOG.filter(c => !defs.some(d => d.type === c.type)),
  ...defs.map((d): WidgetCatalogEntry => ({
    type: d.type as WidgetType,
    // Le libellé du catalogue est une clé i18n pour les widgets déclarés,
    // là où l'historique stockait du français en dur.
    label: d.meta.label,
    lg: d.defaultSize.lg,
    md: d.defaultSize.md,
    sm: d.defaultSize.sm,
  })),
];

// ── Dispositions ─────────────────────────────────────────────────────────────

export const WIDGET_DISPOSITIONS: WidgetDispositions = {
  ...LEGACY_WIDGET_DISPOSITIONS,
  ...Object.fromEntries(
    defs
      .map(d => [
        d.type,
        d.dispositions ?? [
          {
            id: 'default',
            label: 'Par défaut',
            minSize: {
              lg: d.minSize?.lg ?? d.defaultSize.lg,
              md: d.minSize?.md ?? d.defaultSize.md,
              sm: d.minSize?.sm ?? d.defaultSize.sm,
            },
            defaultSize: d.defaultSize,
          },
        ],
      ])
      .filter(Boolean)
  ),
};

// ── Presets de taille ────────────────────────────────────────────────────────

export const SIZE_PRESETS: WidgetSizePresets = {
  ...LEGACY_SIZE_PRESETS,
  ...Object.fromEntries(defs.flatMap(d => (d.sizePresets ? [[d.type, d.sizePresets] as const] : []))),
};

// ── Champs d'édition ─────────────────────────────────────────────────────────

export const WIDGET_FIELD_DEFS: Record<string, WidgetFieldDef[]> = {
  ...LEGACY_WIDGET_FIELD_DEFS,
  ...Object.fromEntries(defs.flatMap(d => (d.fields ? [[d.type, d.fields] as const] : []))),
};

// ── Configurations par défaut ────────────────────────────────────────────────

export const DEFAULT_WIDGET_CONFIGS: WidgetConfigs = {
  ...LEGACY_DEFAULT_WIDGET_CONFIGS,
  ...Object.fromEntries(defs.map(d => [d.type, { type: d.type, ...d.defaults } as WidgetConfig])),
};

// ── Aperçu du catalogue ──────────────────────────────────────────────────────

/** Dimensions de l'aperçu, en unités de grille. */
export function getPreviewSize(type: string, legacy: { w: number; h: number } | undefined) {
  const def = defs.find(d => d.type === type);
  if (!def) return legacy;
  return def.previewSize ?? def.defaultSize.lg;
}

/** Le manifeste d'un type, s'il a été migré vers `defineWidget`. */
export function getWidgetDefinition(type: string): WidgetDefinition | undefined {
  return defs.find(d => d.type === type);
}

// ── Helpers de disposition ───────────────────────────────────────────────────
// Ils vivaient dans `@/config/widget-dispositions`, mais doivent lire le
// registre dérivé pour voir les widgets déclarés par manifeste.

/** Disposition active d'un widget ; à défaut, la première de son type. */
export function getDisposition(widgetType: string, dispositionId?: string) {
  const dispositions = WIDGET_DISPOSITIONS[widgetType];
  if (!dispositions?.length) return undefined;
  if (dispositionId) return dispositions.find(d => d.id === dispositionId) ?? dispositions[0];
  return dispositions[0];
}

/** Taille minimum d'un widget à un breakpoint donné. */
export function getMinSize(widgetType: string, breakpoint: 'lg' | 'md' | 'sm', dispositionId?: string): { w: number; h: number } {
  return getDisposition(widgetType, dispositionId)?.minSize[breakpoint] ?? { w: 1, h: 1 };
}
