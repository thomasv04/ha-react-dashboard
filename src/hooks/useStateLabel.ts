import { useEffect, useSyncExternalStore } from 'react';
import { useHass } from '@hakit/core';
import type { Connection } from 'home-assistant-js-websocket';
import { useI18n } from '@/i18n';

/**
 * Libellé d'un état tel que Home Assistant l'affiche : « Détecté » pour un
 * capteur de mouvement, « Ouverte » pour une porte — selon la `device_class`,
 * dans la langue du dashboard.
 *
 * `formatter.stateValue` de @hakit ne connaît que l'état brut (`on` →
 * « Activé »). Les vrais libellés viennent de HA lui-même
 * (`frontend/get_translations`, catégorie `entity_component`), chargés une fois
 * par domaine : aucune table à tenir ici, et toutes les langues de HA d'office.
 *
 * `undefined` tant que rien n'est chargé, ou pour un état sans libellé (une
 * valeur numérique) — à l'appelant de formater.
 */

const resources = new Map<string, Record<string, string>>();
const requested = new Set<string>();
const listeners = new Set<() => void>();
let revision = 0;

function load(connection: Connection, language: string, domain: string) {
  const key = `${language}:${domain}`;
  if (requested.has(key)) return;
  requested.add(key);
  connection
    .sendMessagePromise<{ resources?: Record<string, string> }>({
      type: 'frontend/get_translations',
      language,
      category: 'entity_component',
      integration: [domain],
    })
    .then(result => {
      resources.set(key, result.resources ?? {});
      revision++;
      listeners.forEach(l => l());
    })
    // HA injoignable ou trop ancien : l'état reste formaté par l'appelant, sans
    // réessai en boucle.
    .catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStateLabel(entityId: string, state: string | undefined, deviceClass: string | undefined): string | undefined {
  const connection = useHass(s => s.connection);
  const { language } = useI18n();
  const domain = entityId.split('.')[0];
  useSyncExternalStore(
    subscribe,
    () => revision,
    () => revision
  );

  useEffect(() => {
    if (connection?.sendMessagePromise && domain) load(connection, language, domain);
  }, [connection, language, domain]);

  if (!state) return undefined;
  const r = resources.get(`${language}:${domain}`);
  const base = `component.${domain}.entity_component`;
  return r?.[`${base}.${deviceClass ?? '_'}.state.${state}`] ?? r?.[`${base}._.state.${state}`];
}
