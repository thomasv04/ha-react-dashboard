/**
 * Puissance lisible : en W sous le kilowatt, en kW (une décimale au plus) au-delà.
 * Le séparateur décimal suit la locale de l'interface — « 1,5 kW » en français,
 * « 1.5 kW » en anglais.
 */
export function formatPower(w: number, locale: string): { value: string; unit: string } {
  if (Math.abs(w) >= 1000) return { value: (w / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }), unit: 'kW' };
  return { value: Math.round(w).toLocaleString(locale), unit: 'W' };
}
