import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const apiFetch = vi.fn();
vi.mock('@/lib/api-base', () => ({ apiFetch: (path: string, init?: RequestInit) => apiFetch(path, init) }));

import { MusicSection } from './MusicSection';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('MusicSection', () => {
  beforeEach(() => apiFetch.mockReset());

  it("teste puis enregistre le jeton, sans jamais l'afficher", async () => {
    apiFetch
      .mockResolvedValueOnce(json({ configured: false, url: '', source: null }))
      .mockResolvedValueOnce(json({ configured: true, url: 'http://192.168.1.60:8095', source: 'settings' }));
    render(<MusicSection />);
    expect(await screen.findByText('settings.music_section.notConfigured')).toBeInTheDocument();

    const save = screen.getByRole('button', { name: 'settings.music_section.save' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('settings.music_section.url'), { target: { value: 'http://192.168.1.60:8095' } });
    fireEvent.change(screen.getByLabelText('settings.music_section.token'), { target: { value: 'secret' } });
    fireEvent.click(save);

    expect(await screen.findByText('settings.music_section.result.saved')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenLastCalledWith(
      '/api/music/settings',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ url: 'http://192.168.1.60:8095', token: 'secret' }) })
    );
    // Le champ se vide : le jeton enregistré ne réapparaît pas à l'écran.
    expect(screen.getByLabelText('settings.music_section.token')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'settings.music_section.forget' })).toBeInTheDocument();
  });

  it('dit quand Music Assistant refuse le jeton', async () => {
    apiFetch.mockResolvedValueOnce(json({ configured: false, url: '', source: null })).mockResolvedValueOnce(json({ error: 'auth' }, 424));
    render(<MusicSection />);
    await screen.findByText('settings.music_section.notConfigured');
    fireEvent.change(screen.getByLabelText('settings.music_section.token'), { target: { value: 'faux' } });
    fireEvent.click(screen.getByRole('button', { name: 'settings.music_section.save' }));
    expect(await screen.findByText('settings.music_section.result.auth')).toBeInTheDocument();
  });

  it('dit quand l’add-on ne connaît pas encore ce réglage, au lieu d’accuser Music Assistant', async () => {
    // Un add-on d'avant cette section : sa page de repli au lieu de JSON.
    apiFetch.mockResolvedValueOnce(new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } }));
    render(<MusicSection />);
    expect(await screen.findByText('settings.music_section.result.outdated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'settings.music_section.save' })).toBeDisabled();
  });

  it('en carte (HACS), dit que l’intégration Music Assistant connecte déjà, sans formulaire', async () => {
    apiFetch.mockResolvedValueOnce(json({ configured: true, url: '', source: 'integration' }));
    render(<MusicSection />);
    expect(await screen.findByText('settings.music_section.integrationHint')).toBeInTheDocument();
    expect(screen.getByText('settings.music_section.source.integration')).toBeInTheDocument();
    expect(screen.queryByLabelText('settings.music_section.token')).not.toBeInTheDocument();
  });
});
