import { describe, it, expect } from 'vitest';
import {
  addMonths,
  dayKey,
  daysInMonth,
  eventDayKeys,
  groupByDay,
  gridRange,
  monthGrid,
  parseEventDate,
  shiftDay,
  weekdayOrder,
} from './calendar-month';

describe('daysInMonth', () => {
  it('gère les mois de 28 à 31 jours', () => {
    expect(daysInMonth({ year: 2026, month: 1 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 1 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 3 })).toBe(30);
    expect(daysInMonth({ year: 2026, month: 9 })).toBe(31);
  });
});

describe('addMonths', () => {
  it('change d’année en décembre → janvier', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });
  it('change d’année en janvier → décembre', () => {
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
  it('saute plusieurs mois', () => {
    expect(addMonths({ year: 2026, month: 10 }, 15)).toEqual({ year: 2028, month: 1 });
    expect(addMonths({ year: 2026, month: 2 }, -14)).toEqual({ year: 2025, month: 0 });
  });
});

describe('weekdayOrder', () => {
  it('commence le lundi ou le dimanche', () => {
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe('monthGrid', () => {
  // Octobre 2026 : le 1er est un jeudi.
  const oct = { year: 2026, month: 9 };

  it('commence la première ligne au bon jour (semaine du lundi)', () => {
    const grid = monthGrid(oct, 1);
    expect(grid[0].map(d => d.key)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(grid[0].map(d => d.inMonth)).toEqual([false, false, false, true, true, true, true]);
  });

  it('commence la première ligne au bon jour (semaine du dimanche)', () => {
    const grid = monthGrid(oct, 0);
    expect(grid[0][0].key).toBe('2026-09-27');
    expect(grid[0][4].key).toBe('2026-10-01');
  });

  it('couvre toujours des semaines entières', () => {
    for (let m = 0; m < 12; m++) {
      for (const first of [0, 1]) {
        const grid = monthGrid({ year: 2026, month: m }, first);
        expect(grid.every(w => w.length === 7)).toBe(true);
        expect(grid.length).toBeGreaterThanOrEqual(4);
        expect(grid.length).toBeLessThanOrEqual(6);
        expect(grid.flat().filter(d => d.inMonth)).toHaveLength(daysInMonth({ year: 2026, month: m }));
      }
    }
  });

  it('tient en 4 semaines un février de 28 jours qui commence le premier jour de la semaine', () => {
    // Février 2027 commence un lundi.
    expect(monthGrid({ year: 2027, month: 1 }, 1)).toHaveLength(4);
  });

  it('prend 6 semaines quand le mois en déborde cinq', () => {
    // Mai 2027 : 31 jours, le 1er est un samedi.
    expect(monthGrid({ year: 2027, month: 4 }, 1)).toHaveLength(6);
  });

  it('traverse le changement d’année', () => {
    // Janvier 2027 commence un vendredi : la première ligne vient de décembre 2026.
    const grid = monthGrid({ year: 2027, month: 0 }, 1);
    expect(grid[0][0].key).toBe('2026-12-28');
    expect(grid[0][0].inMonth).toBe(false);
    expect(grid[0][4].key).toBe('2027-01-01');
    // Décembre 2026 se termine sur janvier 2027.
    const dec = monthGrid({ year: 2026, month: 11 }, 1);
    expect(dec[dec.length - 1][6].key).toBe('2027-01-03');
  });

  it('borne la plage affichée', () => {
    expect(gridRange({ year: 2026, month: 9 }, 1)).toEqual({ first: '2026-09-28', last: '2026-11-01' });
  });
});

describe('dayKey / shiftDay', () => {
  it('formate en heure locale', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('passe les fins de mois et d’année', () => {
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('évènements', () => {
  it('lit une date seule en heure locale', () => {
    expect(dayKey(parseEventDate('2026-10-19'))).toBe('2026-10-19');
  });

  it('occupe un jour pour un évènement horaire', () => {
    expect(eventDayKeys('2026-10-19T08:15:00', '2026-10-19T09:00:00')).toEqual(['2026-10-19']);
  });

  it('exclut la fin d’un évènement sur la journée', () => {
    expect(eventDayKeys('2026-10-19', '2026-10-20')).toEqual(['2026-10-19']);
    expect(eventDayKeys('2026-10-19', '2026-10-22')).toEqual(['2026-10-19', '2026-10-20', '2026-10-21']);
  });

  it('ne déborde pas quand il finit à minuit pile', () => {
    expect(eventDayKeys('2026-10-19T22:00:00', '2026-10-20T00:00:00')).toEqual(['2026-10-19']);
  });

  it('couvre chaque jour d’un évènement de plusieurs jours', () => {
    expect(eventDayKeys('2026-12-30T10:00:00', '2027-01-01T10:00:00')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
  });

  it('range les évènements par jour', () => {
    const a = { start: '2026-10-19T08:00:00', end: '2026-10-19T09:00:00' };
    const b = { start: '2026-10-19', end: '2026-10-21' };
    const map = groupByDay([a, b]);
    expect(map.get('2026-10-19')).toEqual([a, b]);
    expect(map.get('2026-10-20')).toEqual([b]);
    expect(map.has('2026-10-21')).toBe(false);
  });
});
