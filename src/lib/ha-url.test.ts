import { describe, it, expect } from 'vitest';
import { haBaseFromSocketUrl, haBaseUrl, resolveHaUrl } from './ha-url';

describe('haBaseFromSocketUrl', () => {
  it('passe de ws à http et garde hôte et port', () => {
    expect(haBaseFromSocketUrl('ws://192.168.1.20:8123/api/websocket')).toBe('http://192.168.1.20:8123');
  });

  it('passe de wss à https', () => {
    expect(haBaseFromSocketUrl('wss://maison.example.org/api/websocket')).toBe('https://maison.example.org');
  });

  it('rend une chaîne vide sans URL lisible', () => {
    expect(haBaseFromSocketUrl(undefined)).toBe('');
    expect(haBaseFromSocketUrl('pas une url')).toBe('');
  });
});

describe('haBaseUrl', () => {
  it('préfère la socket à la variable d’environnement', () => {
    expect(haBaseUrl('ws://10.0.0.2:8123/api/websocket', 'http://homeassistant.local:8123')).toBe('http://10.0.0.2:8123');
  });

  it('se rabat sur la variable d’environnement, sans barre finale', () => {
    expect(haBaseUrl(undefined, 'http://ha.lan:8123/')).toBe('http://ha.lan:8123');
  });

  it('rend une chaîne vide sans rien', () => {
    expect(haBaseUrl(undefined, undefined)).toBe('');
  });
});

describe('resolveHaUrl', () => {
  const base = 'https://ha.example.org';

  it('préfixe un chemin relatif à HA', () => {
    expect(resolveHaUrl('/api/media_player_proxy/media_player.salon?token=x', base)).toBe(
      'https://ha.example.org/api/media_player_proxy/media_player.salon?token=x'
    );
  });

  it('laisse passer les URL absolues', () => {
    expect(resolveHaUrl('https://i.scdn.co/image/abc', base)).toBe('https://i.scdn.co/image/abc');
    expect(resolveHaUrl('data:image/png;base64,AAA', base)).toBe('data:image/png;base64,AAA');
  });

  it('garde le chemin relatif sans origine connue', () => {
    expect(resolveHaUrl('/api/image', '')).toBe('/api/image');
  });

  it('rend undefined sans URL', () => {
    expect(resolveHaUrl(undefined, base)).toBeUndefined();
    expect(resolveHaUrl('', base)).toBeUndefined();
  });
});
