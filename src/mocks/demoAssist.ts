import type { AssistConnection, ConversationResult } from '@/lib/assist';

/**
 * Mode mock (`vite --mode mock`) et e2e : un agent Assist de démonstration.
 * Il joue le rôle de Home Assistant — ses phrases sont celles que HA
 * renverrait, dans la langue de la question, pas des textes de l'interface.
 *
 *  - « lumière » / « light » : une action réussie, avec la pièce touchée ;
 *  - « température » / « temperature » : une réponse à une question ;
 *  - « agent » : l'intégration `conversation` absente (aucun agent) ;
 *  - « panne » / « offline » : HA ne répond plus ;
 *  - le reste : l'agent n'a pas compris.
 */
const french = (text: string) => /[àâçéèêëîïôûù]|\b(le|la|les|du|de|quelle|allume|éteins)\b/i.test(text);

function reply(text: string, conversationId: string): ConversationResult {
  const fr = french(text);
  if (/lumi|light/i.test(text)) {
    return {
      conversation_id: conversationId,
      response: {
        response_type: 'action_done',
        speech: { plain: { speech: fr ? 'Lumières du séjour allumées' : 'Turned on the living room lights' } },
        data: {
          targets: [{ type: 'area', name: fr ? 'Séjour' : 'Living room', id: 'sejour' }],
          success: [{ type: 'entity', name: fr ? 'Plafonnier' : 'Ceiling light', id: 'light.sejour' }],
          failed: [],
        },
      },
    };
  }
  if (/temp/i.test(text)) {
    return {
      conversation_id: conversationId,
      response: {
        response_type: 'query_answer',
        speech: { plain: { speech: fr ? 'Il fait 21,6 °C dans le séjour' : 'It is 21.6 °C in the living room' } },
        data: { targets: [], success: [{ type: 'entity', name: fr ? 'Température séjour' : 'Living room temperature' }], failed: [] },
      },
    };
  }
  return {
    conversation_id: conversationId,
    response: {
      response_type: 'error',
      speech: { plain: { speech: fr ? 'Désolé, je n’ai pas compris' : 'Sorry, I couldn’t understand that' } },
      data: { code: 'no_intent_match' },
    },
  };
}

export const demoAssistConnection: AssistConnection = {
  async sendMessagePromise<T>(message: Record<string, unknown>): Promise<T> {
    const text = String(message.text ?? '');
    await new Promise(resolve => setTimeout(resolve, 400));
    if (/agent/i.test(text)) throw { code: 'unknown_command', message: 'Unknown command.' };
    if (/panne|offline/i.test(text)) throw 3; // ERR_CONNECTION_LOST
    const id = typeof message.conversation_id === 'string' ? message.conversation_id : 'demo-conversation';
    return reply(text, id) as T;
  },
};
