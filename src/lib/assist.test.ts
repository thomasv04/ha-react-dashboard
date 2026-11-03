import { describe, expect, it, vi } from 'vitest';
import { AssistError, classifyAssistError, processConversation, speechOf, targetsOf, type ConversationResult } from './assist';

const result = (over: Partial<ConversationResult['response']> = {}): ConversationResult => ({
  conversation_id: 'c1',
  response: { response_type: 'action_done', speech: { plain: { speech: ' Fait ' } }, ...over },
});

describe('processConversation', () => {
  it('envoie la question et le fil de la conversation', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue(result());
    await processConversation({ sendMessagePromise }, 'allume', 'c0');
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: 'conversation/process', text: 'allume', conversation_id: 'c0' });
  });

  it("n'envoie pas de fil pour une première question", async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue(result());
    await processConversation({ sendMessagePromise }, 'allume', null);
    expect(sendMessagePromise.mock.calls[0][0]).not.toHaveProperty('conversation_id');
  });

  it('rejette « unreachable » sans connexion', async () => {
    await expect(processConversation(null, 'a', null)).rejects.toMatchObject({ kind: 'unreachable' });
  });

  it('rejette « unreachable » quand HA ne répond pas', async () => {
    const never = { sendMessagePromise: () => new Promise<never>(() => {}) };
    await expect(processConversation(never, 'a', null, 10)).rejects.toMatchObject({ kind: 'unreachable' });
  });
});

describe('classifyAssistError', () => {
  it('reconnaît la socket perdue', () => {
    expect(classifyAssistError(3).kind).toBe('unreachable');
    expect(classifyAssistError(1).kind).toBe('unreachable');
  });
  it("reconnaît l'absence d'agent", () => {
    expect(classifyAssistError({ code: 'unknown_command', message: 'Unknown command.' }).kind).toBe('noAgent');
    expect(classifyAssistError({ code: 'x', message: 'Conversation agent not found' }).kind).toBe('noAgent');
  });
  it('garde le reste en « unknown » et laisse passer une AssistError', () => {
    expect(classifyAssistError({ code: 'boom', message: 'oops' }).kind).toBe('unknown');
    expect(classifyAssistError('?').kind).toBe('unknown');
    const own = new AssistError('noAgent');
    expect(classifyAssistError(own)).toBe(own);
  });
});

describe('lecture de la réponse', () => {
  it('rend la phrase nettoyée, vide si absente', () => {
    expect(speechOf(result())).toBe('Fait');
    expect(speechOf(result({ speech: undefined }))).toBe('');
  });
  it('fusionne les cibles sans doublon', () => {
    const t = { type: 'entity', name: 'Lampe', id: 'light.a' };
    const r = result({ data: { success: [t], targets: [t, { type: 'area', name: 'Séjour' }, { type: 'area', name: '' }] } });
    expect(targetsOf(r).map(x => x.name)).toEqual(['Lampe', 'Séjour']);
  });
});
