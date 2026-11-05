/** Ce qu'affiche une modale épinglée dans le menu, d'après son entité d'état. */
export interface RailStatus {
  /** Remplace l'icône : « 21° », « 54% ». */
  text?: string;
  /** Allume l'icône : lampe allumée, porte déverrouillée, chauffage en marche. */
  on: boolean;
}

const ON_STATES = new Set([
  'on',
  'open',
  'opening',
  'unlocked',
  'playing',
  'heat',
  'cool',
  'heat_cool',
  'auto',
  'dry',
  'fan_only',
  'triggered',
]);

interface EntityLike {
  state: string;
  attributes: Record<string, unknown>;
}

export function railStatus(entityId: string, entity: EntityLike | null | undefined): RailStatus {
  if (!entity) return { on: false };
  // Un thermostat se lit à sa température, pas à son mode.
  if (entityId.startsWith('climate.')) {
    const current = entity.attributes.current_temperature;
    if (typeof current === 'number') return { text: `${Math.round(current)}°`, on: entity.state !== 'off' };
  }
  const value = Number(entity.state);
  if (entity.state.trim() !== '' && Number.isFinite(value)) {
    const unit = String(entity.attributes.unit_of_measurement ?? '');
    return { text: `${Math.round(value)}${unit.startsWith('°') ? '°' : unit === '%' ? '%' : ''}`, on: false };
  }
  return { on: ON_STATES.has(entity.state) };
}
