import type { WidgetDefinition } from './define-widget';

// ── Widgets déclarés via `defineWidget` ──────────────────────────────────────
//
// Ajouter un widget = créer `src/components/cards/<Nom>/widget.ts` puis
// l'importer ici. C'est la seule ligne à ajouter dans un fichier partagé :
// tous les registres (composants, catalogue, méta, tailles, dispositions,
// champs, valeurs par défaut) en sont dérivés — cf. `./index.ts`.
//
// Import explicite plutôt que `import.meta.glob` : TypeScript voit alors les
// types littéraux, ce dont dérive l'union `WidgetType`, et le bundler garde un
// graphe statique.

import automation from '@/components/cards/AutomationCard/widget';
import automationList from '@/components/cards/AutomationListCard/widget';
import energyFlow from '@/components/cards/EnergyFlowCard/widget';

export const WIDGETS = [automation, automationList, energyFlow] satisfies readonly WidgetDefinition[];

/** Union des types de widgets déclarés par manifeste */
export type ManifestWidgetType = (typeof WIDGETS)[number]['type'];
