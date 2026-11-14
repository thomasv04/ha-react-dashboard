import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const callService = vi.fn();
const sendMessagePromise = vi.fn();
const hassState = { helpers: { callService }, connection: { sendMessagePromise }, entities: {} };

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => (selector ? selector(hassState) : hassState),
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => null }));

import MusicApp from './MusicApp';

const album = (n: number) => ({ media_type: 'album', uri: `library://album/${n}`, name: `Album ${n}`, artists: [] });
const RESULTS = {
  tracks: [{ media_type: 'track', uri: 'library://track/1', name: 'Believer', artists: [{ uri: 'a', name: 'Imagine Dragons' }] }],
  albums: Array.from({ length: 10 }, (_, i) => album(i + 1)),
  artists: [],
  playlists: [],
  radio: [],
};

const searchCalls = () => sendMessagePromise.mock.calls.map(c => c[0]).filter(m => m.service === 'search');

describe('Recherche de l’appli Musique', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    callService.mockClear();
    sendMessagePromise.mockReset();
    sendMessagePromise.mockImplementation(async (msg: { type: string; service?: string }) => {
      if (msg.type === 'config/entity_registry/get') return { config_entry_id: 'entry1' };
      if (msg.service === 'search') return { response: RESULTS };
      return { response: { items: [] } };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const typeQuery = async (text: string) => {
    render(<MusicApp entityId='media_player.salon_2' widgetId='w' />);
    await act(async () => {}); // l'instance MA
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: text } });
    await act(async () => void vi.advanceTimersByTime(300));
  };

  it('cherche à la pause de frappe, et groupe les résultats par type', async () => {
    await typeQuery('imagine');
    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0].service_data).toMatchObject({ config_entry_id: 'entry1', name: 'imagine', library_only: true });

    expect(screen.getByRole('button', { name: /^Believer/ })).toBeInTheDocument();
    // « Tout » : une rangée de pochettes, et de quoi voir le reste.
    expect(screen.getAllByRole('button', { name: /^Album \d+$/ })).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.seeAll' }));
    expect(screen.getAllByRole('button', { name: /^Album \d+$/ })).toHaveLength(10);
    expect(screen.queryByRole('button', { name: /^Believer/ })).not.toBeInTheDocument();
  });

  it('revient à la bibliothèque quand on efface', async () => {
    await typeQuery('imagine');
    fireEvent.click(screen.getByRole('button', { name: 'widgets.music.clearSearch' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.queryByRole('button', { name: /^Believer/ })).not.toBeInTheDocument();
  });
});
