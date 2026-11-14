import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMessagePromise = vi.fn();
// Référence stable, comme le vrai store : sinon l'effet repart à chaque rendu.
const hassState = { connection: { sendMessagePromise } };

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => (typeof selector === 'function' ? selector(hassState) : hassState),
}));

import { massPlay, useMassBrowse, useMassEntryId, useMassLibrary, useMassSearch } from './useMusicAssistant';

describe('useMusicAssistant', () => {
  // Accolades : un beforeEach qui renvoie une fonction en fait son nettoyage,
  // et mockReset() renvoie le mock.
  beforeEach(() => {
    sendMessagePromise.mockReset();
  });

  it("lit l'instance MA dans le registre d'entités", async () => {
    sendMessagePromise.mockResolvedValue({ config_entry_id: 'entry1', platform: 'music_assistant' });
    const { result } = renderHook(() => useMassEntryId('media_player.salon_2'));
    await waitFor(() => expect(result.current).toBe('entry1'));
    expect(sendMessagePromise).toHaveBeenCalledWith({ type: 'config/entity_registry/get', entity_id: 'media_player.salon_2' });
  });

  it('demande la bibliothèque avec return_response et sans cible', async () => {
    sendMessagePromise.mockResolvedValue({ response: { items: [{ uri: 'library://album/3', name: 'LOOM', media_type: 'album' }] } });
    const { result } = renderHook(() => useMassLibrary('entry1', { mediaType: 'album', favorite: true }));
    await waitFor(() => expect(result.current.data?.items).toHaveLength(1));
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'call_service',
      domain: 'music_assistant',
      service: 'get_library',
      // Pas de `target` : get_library n'en accepte pas, HA refuserait l'appel.
      service_data: { config_entry_id: 'entry1', media_type: 'album', order_by: 'last_played_desc', limit: 100, favorite: true },
      return_response: true,
    });
  });

  it("n'appelle rien sans instance ni texte de recherche", () => {
    renderHook(() => useMassLibrary(null, { mediaType: 'album' }));
    renderHook(() => useMassSearch('entry1', '   '));
    expect(sendMessagePromise).not.toHaveBeenCalled();
  });

  it('parcourt un album par son URI, avec le type music_assistant', async () => {
    sendMessagePromise.mockResolvedValue({ title: 'Some Nights', children: [] });
    const { result } = renderHook(() => useMassBrowse('media_player.salon_2', 'library://album/28'));
    await waitFor(() => expect(result.current.data?.title).toBe('Some Nights'));
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'media_player/browse_media',
      entity_id: 'media_player.salon_2',
      media_content_id: 'library://album/28',
      media_content_type: 'music_assistant',
    });
  });

  it("expose l'erreur de HA", async () => {
    // HA rejette avec un objet, pas une Error.
    sendMessagePromise.mockRejectedValue({ code: 'not_found', message: 'Entity not found' });
    const { result } = renderHook(() => useMassBrowse('media_player.x', 'library://album/1'));
    await waitFor(() => expect(result.current.error).toBe('Entity not found'));
  });

  it('lance un élément sur le lecteur, en file si demandé', () => {
    const callService = vi.fn();
    massPlay({ callService }, 'media_player.salon_2', { uri: 'library://album/3', media_type: 'album' }, 'next');
    expect(callService).toHaveBeenCalledWith({
      domain: 'music_assistant',
      service: 'play_media',
      target: { entity_id: 'media_player.salon_2' },
      serviceData: { media_id: 'library://album/3', media_type: 'album', enqueue: 'next' },
    });
  });
});
