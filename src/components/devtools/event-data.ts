import { HA_EVENT_TYPES } from '@/lib/ha-events';

export type EventKind = keyof typeof HA_EVENT_TYPES;

/** Le formulaire du bac à sable, commun aux trois événements. */
export interface EventForm {
  title: string;
  text: string;
  html: boolean;
  width: 'sm' | 'md' | 'lg' | 'full';
  dismissible: boolean;
  durationS: number;
  persistent: boolean;
  level: 'info' | 'success' | 'warning' | 'error';
  id: string;
  actionLabel: string;
  actionService: string;
  actionEntity: string;
}

export const DEFAULT_FORM: EventForm = {
  title: '',
  text: '',
  html: false,
  width: 'md',
  dismissible: true,
  durationS: 5,
  persistent: false,
  level: 'info',
  id: '',
  actionLabel: '',
  actionService: '',
  actionEntity: '',
};

/**
 * Les `event_data` que le formulaire décrit. Seul ce qui s'écarte du
 * comportement par défaut est écrit : le YAML copié reste celui qu'on aurait
 * tapé à la main.
 */
export function buildEventData(kind: EventKind, f: EventForm): Record<string, unknown> {
  const action = f.actionLabel.trim()
    ? [
        {
          label: f.actionLabel.trim(),
          ...(f.actionService.trim() && { service: f.actionService.trim() }),
          ...(f.actionService.trim() && f.actionEntity.trim() && { service_data: { entity_id: f.actionEntity.trim() } }),
        },
      ]
    : undefined;

  const data: Record<string, unknown> =
    kind === 'modal'
      ? {
          title: f.title,
          content: f.text,
          content_type: f.html ? 'html' : undefined,
          width: f.width === 'md' ? undefined : f.width,
          dismissible: f.dismissible ? undefined : false,
        }
      : kind === 'toast'
        ? {
            title: f.title,
            description: f.text,
            duration_ms: f.persistent || f.durationS === 5 ? undefined : Math.round(f.durationS * 1000),
            persistent: f.persistent || undefined,
          }
        : {
            id: f.id.trim(),
            title: f.title,
            message: f.text,
            content_type: f.html ? 'html' : undefined,
            level: f.level === 'info' ? undefined : f.level,
          };

  return Object.fromEntries(Object.entries<unknown>({ ...data, actions: action }).filter(([, v]) => v !== undefined && v !== ''));
}

/** YAML d'un objet de données ; les tableaux ne contiennent que des objets (les boutons). */
function emit(obj: Record<string, unknown>, pad: string): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      return [
        `${pad}${key}:`,
        ...value.flatMap(item =>
          emit(item as Record<string, unknown>, `${pad}    `).map((line, i) => (i === 0 ? `${pad}  - ${line.trimStart()}` : line))
        ),
      ];
    }
    if (value && typeof value === 'object') return [`${pad}${key}:`, ...emit(value as Record<string, unknown>, `${pad}  `)];
    // Chaîne entre guillemets doubles façon JSON : c'est aussi du YAML valide,
    // accents, `:` et retours à la ligne compris.
    return [`${pad}${key}: ${typeof value === 'string' ? JSON.stringify(value) : String(value)}`];
  });
}

/** Le bloc à coller dans une automatisation — la forme que lit `toDevTools`. */
export function automationYaml(kind: EventKind, data: Record<string, unknown>): string {
  return ['action:', `  - event: ${HA_EVENT_TYPES[kind]}`, '    event_data:', ...emit(data, '      ')].join('\n');
}
