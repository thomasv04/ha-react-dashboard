import { useCallback, useRef, useState } from 'react';
import { useHass } from '@hakit/core';
import {
  classifyAssistError,
  processConversation,
  speechOf,
  targetsOf,
  type AssistConnection,
  type AssistErrorKind,
  type AssistResponseType,
  type AssistTarget,
} from '@/lib/assist';

/** Une ligne de l'historique : la question, puis la réponse ou l'erreur. */
export type AssistMessage =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; text: string; type: AssistResponseType; targets: AssistTarget[] }
  | { id: number; role: 'error'; kind: AssistErrorKind };

// Le mode mock et les e2e n'ont pas de Home Assistant : un agent de démonstration répond.
const DEMO = import.meta.env.MODE === 'mock' || import.meta.env.VITE_MOCK_HA === 'true';

async function connectionFor(live: AssistConnection | null | undefined): Promise<AssistConnection | null | undefined> {
  return DEMO ? (await import('@/mocks/demoAssist')).demoAssistConnection : live;
}

/**
 * La conversation avec Assist : l'historique, la question en cours, et le fil
 * (`conversation_id`) que HA renvoie pour enchaîner les questions. Une seule
 * question à la fois — l'agent répond dans l'ordre.
 */
export function useAssist() {
  const connection = useHass(s => (s as { connection?: AssistConnection | null }).connection);
  const [messages, setMessages] = useState<AssistMessage[]>([]);
  const [pending, setPending] = useState(false);
  const conversationId = useRef<string | null>(null);
  const nextId = useRef(0);
  // Une réponse arrivée après « Nouvelle conversation » n'a plus sa place.
  const generation = useRef(0);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || pending) return;
      const gen = generation.current;
      setMessages(list => [...list, { id: nextId.current++, role: 'user', text }]);
      setPending(true);
      try {
        const result = await processConversation(await connectionFor(connection), text, conversationId.current);
        if (gen !== generation.current) return;
        conversationId.current = result.conversation_id ?? conversationId.current;
        setMessages(list => [
          ...list,
          {
            id: nextId.current++,
            role: 'assistant',
            text: speechOf(result),
            type: result.response.response_type,
            targets: targetsOf(result),
          },
        ]);
      } catch (error) {
        if (gen !== generation.current) return;
        setMessages(list => [...list, { id: nextId.current++, role: 'error', kind: classifyAssistError(error).kind }]);
      } finally {
        if (gen === generation.current) setPending(false);
      }
    },
    [connection, pending]
  );

  const reset = useCallback(() => {
    generation.current++;
    conversationId.current = null;
    setMessages([]);
    setPending(false);
  }, []);

  return { messages, pending, send, reset };
}
