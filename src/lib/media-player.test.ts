import { describe, it, expect } from 'vitest';
import { formatMediaTime, interpolatePosition, nextRepeat, supportsMedia, isMediaOff, pickPlayingMusic } from './media-player';

describe('interpolatePosition', () => {
  const attrs = { media_position: 100, media_position_updated_at: '2026-11-03T10:00:00Z', media_duration: 200 };
  const t0 = Date.parse('2026-11-03T10:00:00Z');

  it('ajoute le temps écoulé pendant la lecture', () => {
    expect(interpolatePosition(attrs, true, t0 + 12_000)).toBe(112);
  });
  it('reste fixe en pause', () => {
    expect(interpolatePosition(attrs, false, t0 + 12_000)).toBe(100);
  });
  it('borne à la durée', () => {
    expect(interpolatePosition(attrs, true, t0 + 999_000)).toBe(200);
  });
  it('ignore une horloge en retard', () => {
    expect(interpolatePosition(attrs, true, t0 - 5000)).toBe(100);
  });
  it('rend 0 sans donnée', () => {
    expect(interpolatePosition({}, true, t0)).toBe(0);
  });
});

describe('formatMediaTime', () => {
  it('formate minutes et heures', () => {
    expect(formatMediaTime(75)).toBe('1:15');
    expect(formatMediaTime(3725)).toBe('1:02:05');
    expect(formatMediaTime(-3)).toBe('0:00');
  });
});

describe('nextRepeat', () => {
  it('cycle off → all → one → off', () => {
    expect(nextRepeat('off')).toBe('all');
    expect(nextRepeat('all')).toBe('one');
    expect(nextRepeat('one')).toBe('off');
    expect(nextRepeat(undefined)).toBe('all');
  });
});

describe('supportsMedia / isMediaOff', () => {
  it('lit les drapeaux, et suppose oui sans eux', () => {
    expect(supportsMedia(4, 'VOLUME_SET')).toBe(true);
    expect(supportsMedia(4, 'SHUFFLE_SET')).toBe(false);
    expect(supportsMedia(undefined, 'SHUFFLE_SET')).toBe(true);
  });
  it('reconnaît les états éteints', () => {
    expect(isMediaOff('off')).toBe(true);
    expect(isMediaOff('playing')).toBe(false);
  });
});

describe('pickPlayingMusic', () => {
  const p = (state: string, attrs: Record<string, unknown> = {}) => ({ state, attributes: { media_title: 'Believer', ...attrs } });

  it('montre la musique qui joue, un lecteur Music Assistant d’abord', () => {
    expect(
      pickPlayingMusic({
        'media_player.cast': p('playing', { media_content_type: 'music' }),
        'media_player.salon_2': p('playing', { mass_player_type: 'player' }),
      })
    ).toBe('media_player.salon_2');
    expect(pickPlayingMusic({ 'media_player.cast': p('playing', { media_content_type: 'music' }) })).toBe('media_player.cast');
  });

  it('ignore une vidéo et un lecteur sans titre', () => {
    expect(pickPlayingMusic({ 'media_player.tv': p('playing', { media_content_type: 'video' }) })).toBeUndefined();
    expect(pickPlayingMusic({ 'media_player.salon_2': { state: 'playing', attributes: { mass_player_type: 'player' } } })).toBeUndefined();
  });

  it('garde le lecteur montré tant qu’il est en pause, pas quand il s’arrête', () => {
    const paused = { 'media_player.salon_2': p('paused', { mass_player_type: 'player' }) };
    expect(pickPlayingMusic(paused)).toBeUndefined();
    expect(pickPlayingMusic(paused, 'media_player.salon_2')).toBe('media_player.salon_2');
    expect(pickPlayingMusic({ 'media_player.salon_2': p('idle', { mass_player_type: 'player' }) }, 'media_player.salon_2')).toBeUndefined();
  });
});
