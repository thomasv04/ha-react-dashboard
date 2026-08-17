/** États de repos : tout le reste compte comme actif — `on`, mais aussi `open`, `heat`, `playing`, `locked`. */
const IDLE_STATES = new Set(['off', 'closed', 'unavailable', 'unknown', 'none', 'idle', 'standby', '']);

export function isActiveState(state: string | undefined): boolean {
  return !IDLE_STATES.has(state ?? '');
}

/**
 * Domaines dont la bascule n'est pas `homeassistant.toggle` — un volet ne se
 * « toggle » pas, il s'ouvre ou se ferme.
 *
 * ponytail: `alarm_control_panel` n'y est pas — armer demande un code, ça reste
 * une fiche détail.
 */
const TOGGLE_SERVICES: Record<string, (active: boolean) => [string, string]> = {
  lock: active => ['lock', active ? 'unlock' : 'lock'],
  cover: active => ['cover', active ? 'close_cover' : 'open_cover'],
};

/** Domaine + service pour basculer une entité de ce domaine, depuis cet état. */
export function toggleService(domain: string, active: boolean): [string, string] {
  return TOGGLE_SERVICES[domain]?.(active) ?? ['homeassistant', 'toggle'];
}

export function callHAService(
  helpers: { callService: unknown },
  domain: string,
  service: string,
  target: Record<string, unknown>,
  serviceData?: Record<string, unknown>
) {
  (helpers.callService as (args: unknown) => void)({
    domain,
    service,
    target,
    serviceData,
  });
}
