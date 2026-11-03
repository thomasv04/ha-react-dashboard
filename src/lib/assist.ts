/**
 * Assist — l'assistant de Home Assistant, en texte.
 *
 * Passe par la commande WebSocket `conversation/process`, celle qu'utilise le
 * frontend de HA (le service `conversation.process` y mène aussi, avec
 * `return_response`, mais sans renvoyer le fil de la conversation). L'agent est
 * celui que HA désigne par défaut : on ne choisit ni agent ni langue ici.
 */

/** Ce que l'on attend de la connexion de `@hakit/core` — rien de plus. */
export interface AssistConnection {
  sendMessagePromise<T>(message: Record<string, unknown>): Promise<T>;
}

export type AssistResponseType = 'action_done' | 'query_answer' | 'error';

/** Une entité, une pièce… que l'agent a touchée ou citée. */
export interface AssistTarget {
  type: string;
  name: string;
  id?: string | null;
}

/** Réponse de `conversation/process`, réduite à ce que l'écran affiche. */
export interface ConversationResult {
  conversation_id: string | null;
  continue_conversation?: boolean;
  response: {
    response_type: AssistResponseType;
    language?: string;
    speech?: { plain?: { speech: string } };
    data?: {
      code?: string;
      targets?: AssistTarget[];
      success?: AssistTarget[];
      failed?: AssistTarget[];
    };
  };
}

/** Pourquoi une question n'a pas abouti — chaque cas a son message. */
export type AssistErrorKind = 'unreachable' | 'noAgent' | 'unknown';

export class AssistError extends Error {
  readonly kind: AssistErrorKind;

  constructor(kind: AssistErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = 'AssistError';
  }
}

/** Au-delà, HA ne répondra plus : mieux vaut le dire que laisser tourner. */
export const ASSIST_TIMEOUT_MS = 20_000;

// Codes de `home-assistant-js-websocket` quand la socket ne peut pas servir.
const ERR_CANNOT_CONNECT = 1;
const ERR_CONNECTION_LOST = 3;

/**
 * Range une erreur de la WebSocket dans un des cas que l'écran sait dire.
 * `unknown_command` : l'intégration `conversation` n'est pas chargée — aucun
 * agent pour répondre. Un agent introuvable (supprimé, renommé) aussi.
 */
export function classifyAssistError(error: unknown): AssistError {
  if (error instanceof AssistError) return error;
  if (error === ERR_CANNOT_CONNECT || error === ERR_CONNECTION_LOST) return new AssistError('unreachable');
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: unknown; message?: unknown };
    const text = typeof message === 'string' ? message : undefined;
    if (code === 'unknown_command') return new AssistError('noAgent', text);
    if (text && /agent/i.test(text) && /not found|invalid|unknown/i.test(text)) return new AssistError('noAgent', text);
    return new AssistError('unknown', text);
  }
  return new AssistError('unknown', typeof error === 'string' ? error : undefined);
}

/**
 * Pose une question à l'agent de HA. Sans connexion, ou si HA tarde trop,
 * rejette avec une `AssistError` « unreachable » ; toute autre erreur est
 * classée par `classifyAssistError`.
 */
export async function processConversation(
  connection: AssistConnection | null | undefined,
  text: string,
  conversationId: string | null,
  timeoutMs = ASSIST_TIMEOUT_MS
): Promise<ConversationResult> {
  if (!connection) throw new AssistError('unreachable');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AssistError('unreachable')), timeoutMs);
  });
  try {
    return await Promise.race([
      connection.sendMessagePromise<ConversationResult>({
        type: 'conversation/process',
        text,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      }),
      timeout,
    ]);
  } catch (error) {
    throw classifyAssistError(error);
  } finally {
    clearTimeout(timer);
  }
}

/** Le texte à afficher dans la bulle, s'il y en a un. */
export function speechOf(result: ConversationResult): string {
  return result.response.speech?.plain?.speech?.trim() ?? '';
}

/** Les entités touchées, sans doublon — elles deviennent des cartes sous la bulle. */
export function targetsOf(result: ConversationResult): AssistTarget[] {
  const data = result.response.data;
  const all = [...(data?.success ?? []), ...(data?.targets ?? [])];
  const seen = new Set<string>();
  return all.filter(target => {
    const key = target.id ?? target.name;
    if (!target.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
