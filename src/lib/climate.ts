/**
 * Bornes d'une consigne de température.
 *
 * Home Assistant valide `climate.set_temperature` contre les attributs
 * `min_temp` / `max_temp` de l'entité et rejette tout ce qui en sort
 * (`service_validation_error`, `translation_key: temp_out_of_range`). Comme
 * aucun appel de service de l'application ne rattrapait sa promesse, le refus
 * ne laissait qu'un `Uncaught (in promise)` — invisible sur une tablette
 * murale, et le thermostat ne bougeait pas.
 *
 * C'est donc ici que la contrainte doit vivre, une fois, pour les deux cards
 * qui pilotent une entité `climate`.
 */

/** Attributs lus sur l'entité ; tous facultatifs, un thermostat peut n'en publier aucun. */
interface ClimateAttributes {
  min_temp?: unknown;
  max_temp?: unknown;
  target_temp_step?: unknown;
}

export interface ClimateRange {
  min: number;
  max: number;
  step: number;
}

/** Valeurs de repli quand l'entité ne publie pas ses bornes. */
export const CLIMATE_FALLBACK: ClimateRange = { min: 10, max: 30, step: 0.5 };

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/**
 * Plage effective : la préférence d'affichage, bornée par ce que l'entité
 * accepte réellement.
 *
 * `configMin`/`configMax` décrivent la **jauge**, pas le thermostat — un
 * utilisateur peut vouloir une jauge 10–30 sur un appareil qui n'accepte que
 * 16–24. On intersecte : la préférence est respectée, jamais au-delà du réel.
 *
 * Si les deux plages sont disjointes (jauge 25–30 sur un thermostat 16–24),
 * l'entité l'emporte — une jauge inversée serait inutilisable.
 */
export function climateRange(attributes: ClimateAttributes | undefined, configMin?: number, configMax?: number): ClimateRange {
  const entityMin = num(attributes?.min_temp);
  const entityMax = num(attributes?.max_temp);
  // `|| ` et non `??` : un pas à 0 rendrait `snapTemp` infini.
  const step = num(attributes?.target_temp_step) || CLIMATE_FALLBACK.step;

  const min = Math.max(configMin ?? CLIMATE_FALLBACK.min, entityMin ?? -Infinity);
  const max = Math.min(configMax ?? CLIMATE_FALLBACK.max, entityMax ?? Infinity);

  if (min < max) return { min, max, step };
  return { min: entityMin ?? CLIMATE_FALLBACK.min, max: entityMax ?? CLIMATE_FALLBACK.max, step };
}

/**
 * Arrondit une consigne au pas de l'entité, sans jamais sortir des bornes.
 *
 * L'arrondi se fait **avant** le pincement : arrondir un maximum de 24,3 à un
 * pas de 0,5 donnerait 24,5, soit exactement la valeur que Home Assistant
 * refuse.
 */
export function snapTemp(raw: number, { min, max, step }: ClimateRange): number {
  const snapped = Math.round(raw / step) * step;
  // Le produit d'un pas décimal traîne des flottants (0,1 × 3 = 0,30000000000000004) :
  // Home Assistant compare des nombres, autant lui en envoyer un propre.
  const clean = Math.round(snapped * 1000) / 1000;
  return Math.min(max, Math.max(min, clean));
}
