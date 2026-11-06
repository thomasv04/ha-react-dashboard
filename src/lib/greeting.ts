/** Moment de la journée, d'après l'heure : il choisit la salutation et le souhait. */
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

export function dayPart(hour: number): DayPart {
  if (hour >= 18) return 'evening';
  if (hour >= 12) return 'afternoon';
  if (hour >= 5) return 'morning';
  return 'night';
}

const GREETING: Record<DayPart, string> = {
  morning: 'widgets.greeting.goodMorning',
  afternoon: 'widgets.greeting.goodAfternoon',
  evening: 'widgets.greeting.goodEvening',
  night: 'widgets.greeting.goodNight',
};

/** Clé i18n de la salutation correspondant à l'heure. */
export const greetingKey = (hour: number) => GREETING[dayPart(hour)];
