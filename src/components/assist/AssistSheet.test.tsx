import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssistSheet } from './AssistSheet';

// L'espion délègue à `reply`, changé par test : `mockRejectedValue` sur l'espion
// de cette version de vitest fait remonter le rejet comme une erreur du test.
let reply: () => Promise<unknown> = () => Promise.resolve(undefined);
const send = vi.fn((_message: unknown) => reply());
vi.mock('@hakit/core', () => ({ useHass: (select: (s: unknown) => unknown) => select({ connection: { sendMessagePromise: send } }) }));

const ok = (speech: string, extra: object = {}) => ({
  conversation_id: 'conv-1',
  response: { response_type: 'action_done', speech: { plain: { speech } }, ...extra },
});

const setup = () => render(<AssistSheet open onClose={() => {}} />);
const ask = (text: string) => {
  fireEvent.change(screen.getByLabelText('layout.assist.inputLabel'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'layout.assist.send' }));
};

beforeEach(() => {
  send.mockClear();
  reply = () => Promise.resolve(undefined);
});

describe('AssistSheet', () => {
  it('montre les suggestions et un micro désactivé', () => {
    setup();
    expect(screen.getByRole('button', { name: 'layout.assist.suggestions.lights' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'layout.assist.micLabel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'layout.assist.send' })).toBeDisabled();
  });

  it('affiche la question puis la réponse en bulle, avec les entités touchées', async () => {
    reply = () => Promise.resolve(ok('Lumières allumées', { data: { success: [{ type: 'entity', name: 'Plafonnier', id: 'light.p' }] } }));
    setup();
    ask('allume');
    expect(screen.getByText('allume')).toBeInTheDocument();
    expect(await screen.findByText('Lumières allumées')).toBeInTheDocument();
    expect(screen.getByText('Plafonnier')).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith({ type: 'conversation/process', text: 'allume' });
  });

  it('une suggestion envoie sa phrase, et le fil continue à la question suivante', async () => {
    reply = () => Promise.resolve(ok('ok'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'layout.assist.suggestions.temperature' }));
    await screen.findByText('ok');
    ask('et la cuisine ?');
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send.mock.calls[1][0]).toMatchObject({ conversation_id: 'conv-1' });
  });

  it('dit que HA est injoignable', async () => {
    reply = () => Promise.reject(3);
    setup();
    ask('allume');
    expect(await screen.findByRole('alert')).toHaveTextContent('layout.assist.errors.unreachable');
  });

  it("dit qu'aucun agent n'est configuré", async () => {
    reply = () => Promise.reject({ code: 'unknown_command', message: 'Unknown command.' });
    setup();
    ask('allume');
    expect(await screen.findByRole('alert')).toHaveTextContent('layout.assist.errors.noAgent');
  });

  it('« nouvelle conversation » vide le fil', async () => {
    reply = () => Promise.resolve(ok('ok'));
    setup();
    ask('allume');
    await screen.findByText('ok');
    fireEvent.click(screen.getByRole('button', { name: 'layout.assist.newConversation' }));
    expect(screen.queryByText('ok')).not.toBeInTheDocument();
    expect(screen.getByText('layout.assist.emptyTitle')).toBeInTheDocument();
  });
});
