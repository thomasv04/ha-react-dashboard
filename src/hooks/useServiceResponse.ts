import { useCallback, useEffect, useState } from 'react';
import { useHass } from '@hakit/core';

interface ServiceResponseOptions {
  domain: string;
  service: string;
  /** Cible du service ; une liste interroge plusieurs entités en un appel */
  entityId: string | string[];
  serviceData?: Record<string, unknown>;
  /**
   * Valeur qui, en changeant, redéclenche l'appel — typiquement l'état de
   * l'entité. Les listes (agenda, tâches) ne transitent pas par le WebSocket
   * d'état : seul le *résumé* publié par l'entité bouge, et c'est ce qui sert
   * ici de signal de péremption.
   */
  revision?: string;
  /** Rafraîchissement périodique, en ms. `0` = aucun. */
  refreshInterval?: number;
}

export interface ServiceResponseResult<T> {
  /** Réponse brute du service, indexée par entité */
  data: Record<string, T> | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Appelle un service Home Assistant qui **retourne des données**
 * (`calendar.get_events`, `todo.get_items`…) et en expose la réponse.
 *
 * Ces listes n'existent pas dans le store d'entités : l'entité ne publie qu'un
 * résumé (nombre de tâches, évènement en cours). Le contenu se lit uniquement
 * en appelant le service avec `return_response`.
 */
export function useServiceResponse<T>({
  domain,
  service,
  entityId,
  serviceData,
  revision,
  refreshInterval = 0,
}: ServiceResponseOptions): ServiceResponseResult<T> {
  const connection = useHass(s => s.connection);
  const [state, setState] = useState<Omit<ServiceResponseResult<T>, 'refresh'>>({ data: null, loading: false, error: null });
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce(n => n + 1), []);

  // Clés sérialisées : la cible et les données sont recréées à chaque rendu,
  // seul leur *contenu* doit relancer l'appel.
  const targetKey = (Array.isArray(entityId) ? entityId : [entityId]).filter(Boolean).join(',');
  const dataKey = serviceData ? JSON.stringify(serviceData) : '';

  useEffect(() => {
    if (!connection || !targetKey) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState(s => ({ ...s, loading: true }));
      try {
        const res = await connection.sendMessagePromise<{ response?: Record<string, T> }>({
          type: 'call_service',
          domain,
          service,
          target: { entity_id: targetKey.split(',') },
          service_data: dataKey ? JSON.parse(dataKey) : {},
          return_response: true,
        });
        if (!cancelled) setState({ data: res?.response ?? {}, loading: false, error: null });
      } catch (err) {
        console.error(`[useServiceResponse] ${domain}.${service} sur ${targetKey} :`, err);
        if (!cancelled) setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'error' });
      }
    };

    run();
    if (!refreshInterval) {
      return () => {
        cancelled = true;
      };
    }
    const id = setInterval(run, refreshInterval);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connection, domain, service, targetKey, dataKey, revision, refreshInterval, nonce]);

  return { ...state, refresh };
}
