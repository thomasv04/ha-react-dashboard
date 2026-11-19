import { describe, expect, it } from 'vitest';
import { buildTimeline, dayOf, MIN_BLOCK, PX_PER_MIN, timelineX } from './camera-timeline';

const now = new Date(2026, 10, 19, 12, 7).getTime();
const at = (h: number, m: number) => new Date(2026, 10, 19, h, m).getTime() / 1000;

describe('buildTimeline', () => {
  it('place chaque événement à son heure, aussi large que sa durée', () => {
    const t = buildTimeline(
      [
        { id: 'a', camera: 'allee', label: 'car', start_time: at(12, 3), end_time: at(12, 5) },
        { id: 'b', camera: 'allee', label: 'person', start_time: at(12, 6), end_time: null },
        { id: 'vieux', camera: 'allee', label: 'person', start_time: at(9, 0) },
      ],
      now,
      1
    );
    expect(t.width).toBe(60 * PX_PER_MIN);
    expect(t.blocks.map(b => b.id)).toEqual(['a', 'b']);
    expect(t.blocks[0]).toMatchObject({ left: 56 * PX_PER_MIN, width: 2 * PX_PER_MIN });
    // En cours : jusqu'à maintenant, mais jamais plus étroit que le minimum.
    expect(t.blocks[1].width).toBe(MIN_BLOCK);
    // Repères aux cinq minutes rondes : 11:10, 11:15… 12:05.
    expect(t.marks).toHaveLength(12);
    expect(new Date(t.marks[0].at).getMinutes()).toBe(10);
    expect(timelineX(now, now, 1)).toBe(t.width);
  });
});

describe('dayOf', () => {
  it('dit aujourd’hui, hier, ou rien au-delà', () => {
    expect(dayOf(at(0, 5) * 1000, now)).toBe('today');
    expect(dayOf(at(0, 5) * 1000 - 3_600_000, now)).toBe('yesterday');
    expect(dayOf(at(0, 5) * 1000 - 3 * 86_400_000, now)).toBeNull();
  });
});
