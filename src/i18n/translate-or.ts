/**
 * `t(key)`, ou `fallback` quand la clé n'existe pas — `t` renvoie alors la clé
 * elle-même. Pour les valeurs venues de Home Assistant (une étiquette Frigate,
 * un mode de thermostat) : les connues sont traduites, les autres restent
 * lisibles telles quelles.
 */
export function translateOr(t: (key: string) => string, key: string, fallback: string): string {
  const text = t(key);
  return text === key ? fallback : text;
}
