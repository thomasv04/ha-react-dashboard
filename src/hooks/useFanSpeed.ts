import { useCallback, useEffect, useRef, useState } from 'react';
import { useHass } from '@hakit/core';

/**
 * Vitesse d'un ventilateur, lissée pendant le glissement.
 *
 * La valeur locale ne sert qu'à suivre le curseur : dès que Home Assistant
 * confirme, c'est lui qui fait foi. L'appel est différé de 150 ms, sinon un
 * glissement en envoie un par pixel.
 *
 * Partagé par la card et sa fiche — le curseur y est le même.
 */
export function useFanSpeed(entityId: string, haPercentage: number | undefined) {
  const helpers = useHass(s => s.helpers);
  // `from` retient la valeur HA du moment : dès qu'elle bouge, la confirmation
  // est arrivée et c'est elle qui fait foi. Comparé au rendu plutôt que remis à
  // zéro par un effet, qui ferait un rendu de plus à chaque confirmation.
  const [local, setLocal] = useState<{ pct: number; from: number | undefined } | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const setPercentage = useCallback(
    (percentage: number) => {
      setLocal({ pct: percentage, from: haPercentage });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        helpers.callService({ domain: 'fan', service: 'set_percentage', target: { entity_id: entityId }, serviceData: { percentage } });
      }, 150);
    },
    [helpers, entityId, haPercentage]
  );

  return { percentage: local && local.from === haPercentage ? local.pct : (haPercentage ?? 0), setPercentage };
}
