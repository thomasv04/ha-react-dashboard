import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Où en est l'enregistrement automatique.
 *
 * - `saved`   : ce qui est affiché est ce que le serveur a.
 * - `pending` : une modification attend la fin du délai pour partir.
 * - `saving`  : une requête est en vol.
 * - `error`   : la dernière tentative a échoué ; rien ne repart seul.
 */
export type AutoSaveStatus = 'saved' | 'pending' | 'saving' | 'error';

interface AutoSaveOptions<T> {
  /** La valeur éditée. Chaque changement réarme le délai. */
  value: T;
  /** Écrit la valeur ; `true` seulement si le serveur l'a acceptée. */
  save: (value: T) => Promise<boolean>;
  /** Délai d'inactivité avant l'envoi, en millisecondes. */
  delay?: number;
}

export interface AutoSave<T> {
  status: AutoSaveStatus;
  /**
   * Vrai tant que des modifications ne sont pas sur le serveur : en attente,
   * en vol ou en échec. Lu par la garde de fermeture — une fonction plutôt
   * qu'une valeur, pour répondre juste même dans le rendu qui suit un `flush`.
   */
  isBusy: () => boolean;
  /** Envoie tout de suite ce qui attend, et dit si c'est enregistré. */
  flush: () => Promise<boolean>;
  /** Après un échec, retente l'envoi de la valeur courante. */
  retry: () => Promise<boolean>;
  /** Dernière valeur acceptée par le serveur. */
  lastSaved: T;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Enregistre une valeur quelques instants après sa dernière modification.
 *
 * Une seule requête à la fois : une modification faite pendant un envoi
 * attend sa fin, puis part à son tour. Un échec arrête tout — réessayer en
 * boucle sur un serveur qui refuse (conflit, config trop lourde) ne ferait
 * qu'empiler les alertes ; l'utilisateur relance, ou modifie à nouveau.
 */
export function useAutoSave<T>({ value, save, delay = 800 }: AutoSaveOptions<T>): AutoSave<T> {
  const [lastSaved, setLastSaved] = useState(value);
  const [status, setStatusState] = useState<AutoSaveStatus>('saved');

  // Les refs portent la vérité ; l'état n'est là que pour le rendu.
  const statusRef = useRef<AutoSaveStatus>('saved');
  const lastSavedRef = useRef(value);
  const valueRef = useRef(value);
  const saveRef = useRef(save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    valueRef.current = value;
    saveRef.current = save;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setStatus = useCallback((next: AutoSaveStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatusState(next);
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const run = useCallback(async (): Promise<boolean> => {
    // Une requête déjà en vol : on l'attend, puis on renvoie si la valeur a bougé.
    if (inflightRef.current) await inflightRef.current;
    clearTimer();
    const target = valueRef.current;
    if (same(target, lastSavedRef.current)) {
      setStatus('saved');
      return true;
    }

    setStatus('saving');
    const attempt = (async () => {
      try {
        return await saveRef.current(target);
      } catch {
        return false;
      }
    })();
    inflightRef.current = attempt;
    const ok = await attempt;
    inflightRef.current = null;

    if (!ok) {
      setStatus('error');
      return false;
    }
    lastSavedRef.current = target;
    if (mountedRef.current) setLastSaved(target);

    // Modifiée pendant l'envoi : elle repart après un nouveau délai.
    if (!same(valueRef.current, target)) {
      setStatus('pending');
      timerRef.current = setTimeout(() => void run(), delay);
      return false;
    }
    setStatus('saved');
    return true;
  }, [delay, setStatus]);

  // Chaque modification réarme le délai. Pendant un envoi, la fin de celui-ci
  // s'en charge ; après un échec aussi, une nouvelle modification relance.
  useEffect(() => {
    if (same(value, lastSavedRef.current)) {
      if (!inflightRef.current) {
        clearTimer();
        setStatus('saved');
      }
      return;
    }
    if (inflightRef.current) return;
    clearTimer();
    setStatus('pending');
    timerRef.current = setTimeout(() => void run(), delay);
  }, [value, delay, run, setStatus]);

  const isBusy = useCallback(() => statusRef.current !== 'saved', []);

  const flush = useCallback(async () => {
    // Ce qui attend part ; une requête en vol suivie d'une modification aussi.
    for (;;) {
      const ok = await run();
      if (ok) return true;
      if (statusRef.current === 'error') return false;
    }
  }, [run]);

  return { status, isBusy, flush, retry: flush, lastSaved };
}
