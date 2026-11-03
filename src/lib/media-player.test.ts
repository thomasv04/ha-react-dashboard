import { describe, it, expect } from 'vitest';
import { formatMediaTime, interpolatePosition, nextRepeat, supportsMedia, isMediaOff } from './media-player';

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
