import { useCallback } from 'react';
import { useHass } from '@hakit/core';
import { usePages } from '@/context/PageContext';
import { usePanel } from '@/context/PanelContext';
import { callHAService } from '@/lib/ha-service';
import type { CardAction } from '@/types/card-actions';

/**
 * Exécute les actions configurées sur une card (`tapAction`, `holdAction`,
 * `doubleTapAction`).
 *
 * Un seul point d'exécution, appelé par `GridItem` : les trente composants de
 * card n'ont rien à connaître de tout ça, et une action ajoutée ici vaut
 * aussitôt pour tous.
 *
 * `default` n'est pas géré ici — c'est l'appelant qui décide de son
 * comportement historique (ouvrir la fiche « more info », le plus souvent).
 */
export function useCardActions() {
  const helpers = useHass(s => s.helpers);
  const { setCurrentPage, pages } = usePages();
  const { openPanel } = usePanel();

  /** @returns `false` si l'action n'a pas été prise en charge (à l'appelant de jouer). */
  return useCallback(
    (action: CardAction | undefined, fallbackEntityId: string): boolean => {
      if (!action || action.action === 'default') return false;
      if (action.action === 'none') return true;

      switch (action.action) {
        case 'navigate': {
          const target = action.target;
          if (!target) return true;
          // Un panneau se superpose à la page courante ; une page la remplace.
          if (target.startsWith('custom:')) openPanel(target as `custom:${string}`);
          else if (pages.some(p => p.id === target)) setCurrentPage(target);
          return true;
        }

        case 'call-service': {
          const [domain, service] = (action.service ?? '').split('.');
          if (!domain || !service) return true;
          const entityId = action.entityId || fallbackEntityId;

          // Données de service saisies en JSON : une frappe de travers ne doit
          // pas empêcher l'appel, seulement les données optionnelles.
          let data: Record<string, unknown> | undefined;
          if (action.serviceData?.trim()) {
            try {
              data = JSON.parse(action.serviceData);
            } catch {
              console.warn('[cardActions] serviceData illisible, ignoré:', action.serviceData);
            }
          }

          callHAService(helpers, domain, service, entityId ? { entity_id: entityId } : {}, data);
          return true;
        }

        case 'url': {
          // `noopener` : sans lui, la page ouverte garde une référence sur
          // `window.opener` et peut rediriger le dashboard.
          if (action.url) window.open(action.url, '_blank', 'noopener,noreferrer');
          return true;
        }

        // `more-info` est rendu par l'appelant, qui seul connaît la position de
        // la card — la modale s'anime depuis son cadre.
        default:
          return false;
      }
    },
    [helpers, setCurrentPage, pages, openPanel]
  );
}
