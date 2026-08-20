import { useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { useI18n } from '@/i18n';

/**
 * Rend visibles les commandes que Home Assistant refuse.
 *
 * Les quarante-six appels à `helpers.callService` de l'application rendent une
 * promesse, et aucun ne la rattrapait. Un refus de HA — consigne hors bornes,
 * entité indisponible, service inconnu — ne laissait donc qu'un
 * `Uncaught (in promise)` dans la console : sur une tablette murale, personne
 * ne le voit, et l'utilisateur croit que son geste a été pris en compte.
 *
 * Un écouteur global plutôt qu'un `catch` par appel : c'est le seul endroit qui
 * couvre les quarante-six sites **et** ceux qu'on écrira demain, sans compter
 * sur la discipline de chacun.
 *
 * Le filtre est délibérément étroit — seulement les objets qui portent la forme
 * d'une erreur de service HA. Une promesse rejetée par un bug de l'application
 * n'a rien à faire dans un toast : elle doit rester bruyante dans la console,
 * là où on la corrige.
 */

/** La forme que renvoie `home-assistant-js-websocket` sur un service refusé. */
interface HAServiceError {
  code?: string;
  message?: string;
  translation_key?: string;
  translation_domain?: string;
}

/** Distingue un refus de Home Assistant d'un rejet quelconque. */
export function asServiceError(reason: unknown): HAServiceError | null {
  if (typeof reason !== 'object' || reason === null) return null;
  const e = reason as HAServiceError;
  // `code` seul ne suffit pas : `DOMException` en a un aussi. On exige la forme
  // complète — un code **et** un message, tous deux textuels.
  const looksLikeHA = typeof e.code === 'string' && typeof e.message === 'string';
  return looksLikeHA || typeof e.translation_key === 'string' ? e : null;
}

export function useServiceErrorToast() {
  const { addToast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const err = asServiceError(event.reason);
      if (!err) return;

      // La console reste servie : le message de HA est en anglais et technique,
      // le toast n'en est qu'un résumé lisible.
      console.warn('[ha-dashboard] Home Assistant a refusé une commande :', event.reason);
      event.preventDefault();

      addToast({
        title: t('common.serviceRejected'),
        description: err.message ?? err.translation_key ?? err.code,
        sound: 'warning',
      });
    };

    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, [addToast, t]);
}
