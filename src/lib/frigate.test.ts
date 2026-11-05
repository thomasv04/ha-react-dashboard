import { describe, it, expect } from 'vitest';
import { countByLabel, frigateMedia, parseEvents } from './frigate';

const ev = (id: string, label: string, start_time: number) => ({ id, camera: 'entree', label, start_time });

describe('frigate', () => {
  it('lit la réponse en liste comme en JSON, la plus récente d’abord', () => {
    const list = [ev('a', 'person', 10), ev('b', 'car', 30)];
    expect(parseEvents(list).map(e => e.id)).toEqual(['b', 'a']);
    expect(parseEvents(JSON.stringify(list)).map(e => e.id)).toEqual(['b', 'a']);
    expect(parseEvents({ error: 'x' })).toEqual([]);
    expect(parseEvents([{ id: 3 }, null])).toEqual([]);
  });

  it('compte par étiquette, personnes et colis devant', () => {
    const events = [
      ev('1', 'car', 1),
      ev('2', 'car', 2),
      ev('3', 'car', 3),
      ev('4', 'package', 4),
      ev('5', 'person', 5),
      ev('6', 'bird', 6),
    ];
    expect(countByLabel(events)).toEqual([
      ['person', 1],
      ['package', 1],
      ['car', 3],
      ['bird', 1],
    ]);
  });

  it('passe par le proxy de notifications de l’intégration', () => {
    expect(frigateMedia('1699.5-abc', 'clip.mp4')).toBe('/api/frigate/notifications/1699.5-abc/clip.mp4');
  });
});
