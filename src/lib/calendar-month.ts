/**
 * Calcul du calendrier mensuel — sans React, sans Intl, sans fuseau : des
 * dates locales et des clés `YYYY-MM-DD`.
 *
 * Les mois sont numérotés comme `Date` : 0 = janvier … 11 = décembre.
 */

export interface MonthCursor {
  year: number;
  /** 0 = janvier. */
  month: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Clé locale `YYYY-MM-DD` d'une date — l'identité d'un jour, quelle que soit l'heure. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Inverse de `dayKey` : minuit local du jour. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Décale un jour (clé) de `delta` jours, en passant par le calendrier et non par 24 h (heure d'été). */
export function shiftDay(key: string, delta: number): string {
  const d = fromDayKey(key);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
}

/** Mois voisin : `delta` = -1 pour le précédent, +1 pour le suivant ; l'année suit. */
export function addMonths({ year, month }: MonthCursor, delta: number): MonthCursor {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Mois d'une clé de jour. */
export function cursorOf(key: string): MonthCursor {
  const d = fromDayKey(key);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function daysInMonth({ year, month }: MonthCursor): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Les sept jours de la semaine dans l'ordre d'affichage (0 = dimanche). */
export function weekdayOrder(firstDayOfWeek: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (firstDayOfWeek + i) % 7);
}

export interface MonthDay {
  key: string;
  date: number;
  /** Faux pour les jours du mois précédent ou suivant qui complètent les semaines. */
  inMonth: boolean;
}

/**
 * Les semaines entières qui couvrent le mois : de 4 (un février de 28 jours qui
 * commence le premier jour de la semaine) à 6. Les cases hors du mois portent
 * les jours voisins, comme sur l'Echo Show.
 */
export function monthGrid(cursor: MonthCursor, firstDayOfWeek: number): MonthDay[][] {
  const { year, month } = cursor;
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - firstDayOfWeek + 7) % 7;
  const total = lead + daysInMonth(cursor);
  const weeks = Math.ceil(total / 7);

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(year, month, 1 - lead + w * 7 + i);
      return { key: dayKey(d), date: d.getDate(), inMonth: d.getMonth() === month };
    })
  );
}

/** Première et dernière clé visibles dans la grille (bornes incluses). */
export function gridRange(cursor: MonthCursor, firstDayOfWeek: number): { first: string; last: string } {
  const weeks = monthGrid(cursor, firstDayOfWeek);
  return { first: weeks[0][0].key, last: weeks[weeks.length - 1][6].key };
}

// ── Évènements ───────────────────────────────────────────────────────────────

/** Un évènement sans heure (`YYYY-MM-DD`) occupe des journées entières. */
export const isAllDayValue = (value: string) => !value.includes('T');

/**
 * Date d'un début ou d'une fin d'évènement. `new Date('2026-10-19')` serait
 * minuit **UTC** — la veille à l'ouest de Greenwich : une date seule se lit en
 * heure locale.
 */
export function parseEventDate(value: string): Date {
  return isAllDayValue(value) ? fromDayKey(value) : new Date(value);
}

/**
 * Les jours qu'un évènement occupe. La fin est exclusive, comme dans HA : un
 * évènement « journée » du 19 a pour fin le 20, et une réunion qui finit à
 * minuit pile ne déborde pas sur le lendemain.
 */
export function eventDayKeys(start: string, end: string): string[] {
  const s = parseEventDate(start);
  const rawEnd = end ? parseEventDate(end) : s;
  // Fin exclusive ; un évènement de durée nulle occupe tout de même son jour.
  const lastInstant = rawEnd.getTime() > s.getTime() ? new Date(rawEnd.getTime() - 1) : s;
  const keys: string[] = [];
  let key = dayKey(s);
  const lastKey = dayKey(lastInstant);
  // Garde-fou : un évènement mal formé ne doit pas bloquer l'onglet.
  for (let i = 0; i < 400 && key <= lastKey; i++) {
    keys.push(key);
    key = shiftDay(key, 1);
  }
  return keys;
}

/** Range les évènements par jour occupé. */
export function groupByDay<T extends { start: string; end: string }>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of events) {
    for (const key of eventDayKeys(e.start, e.end)) {
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
  }
  return map;
}
