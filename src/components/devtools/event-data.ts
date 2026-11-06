import { HA_EVENT_TYPES } from '@/lib/ha-events';

export type EventKind = keyof typeof HA_EVENT_TYPES;
export type ContentType = 'plain' | 'html' | 'markdown';
export type ActionVariant = 'default' | 'primary' | 'danger';

/** Un bouton d'événement, tel que le formulaire le saisit. */
export interface ActionForm {
  label: string;
  variant: ActionVariant;
  /** `domaine.service` */
  service: string;
  /** Raccourci : devient `service_data.entity_id`. */
  entity: string;
  /** Le reste de `service_data`, en JSON. */
  data: string;
  /** Notification seulement : la garder après l'action. */
  keep: boolean;
}

/**
 * Le formulaire du bac à sable : **tous** les champs que les trois événements
 * acceptent (cf. `HAModalEvent`, `HAToastEvent`, `HANotificationEvent`).
 */
export interface EventForm {
  id: string;
  title: string;
  text: string;
  contentType: ContentType;
  width: 'sm' | 'md' | 'lg' | 'full';
  dismissible: boolean;
  durationMs: number;
  persistent: boolean;
  /** `default` : laisser le son par défaut ; `muted` : `sound: false` ; `url` : `soundUrl` ; sinon un préréglage. */
  sound: string;
  soundUrl: string;
  level: 'info' | 'success' | 'warning' | 'error';
  icon: string;
  /** Notification : retirer (celle de `id`, ou tout le tiroir) au lieu d'en ajouter une. */
  dismiss: boolean;
  actions: ActionForm[];
}

export const NEW_ACTION: ActionForm = { label: '', variant: 'default', service: '', entity: '', data: '', keep: false };

export const DEFAULT_FORM: EventForm = {
  id: '',
  title: '',
  text: '',
  contentType: 'plain',
  width: 'md',
  dismissible: true,
  durationMs: 5000,
  persistent: false,
  sound: 'default',
  soundUrl: '',
  level: 'info',
  icon: '',
  dismiss: false,
  actions: [],
};

/** Le JSON d'un bouton : un objet, ou rien. `error` : saisi mais illisible. */
export function parseActionData(text: string): { value?: Record<string, unknown>; error?: boolean } {
  if (!text.trim()) return {};
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? { value: value as Record<string, unknown> } : { error: true };
  } catch {
    return { error: true };
  }
}

/** Rangs des boutons dont le JSON ne se lit pas : l'événement n'est alors ni envoyé ni aperçu. */
export const invalidActions = (f: EventForm): number[] => f.actions.flatMap((a, i) => (parseActionData(a.data).error ? [i] : []));

/** Peut-on envoyer ? Un retrait n'a besoin de rien ; le reste, d'un texte. */
export const canSendEvent = (kind: EventKind, f: EventForm): boolean =>
  invalidActions(f).length === 0 && (kind === 'notification' && f.dismiss ? true : !!(f.title.trim() || f.text.trim()));

const soundValue = (f: EventForm): string | false | undefined =>
  f.sound === 'default' ? undefined : f.sound === 'muted' ? false : f.sound === 'url' ? f.soundUrl.trim() || undefined : f.sound;

function actionData(kind: EventKind, a: ActionForm) {
  const serviceData = { ...(a.entity.trim() && { entity_id: a.entity.trim() }), ...parseActionData(a.data).value };
  const action = {
    label: a.label.trim(),
    variant: a.variant === 'default' ? undefined : a.variant,
    service: a.service.trim(),
    service_data: Object.keys(serviceData).length > 0 ? serviceData : undefined,
    keep: kind === 'notification' && a.keep ? true : undefined,
  };
  return Object.fromEntries(Object.entries<unknown>(action).filter(([, v]) => v !== undefined && v !== ''));
}

/**
 * Les `event_data` que le formulaire décrit. Seul ce qui s'écarte du
 * comportement par défaut est écrit : le YAML copié reste celui qu'on aurait
 * tapé à la main.
 */
export function buildEventData(kind: EventKind, f: EventForm): Record<string, unknown> {
  const actions = f.actions.filter(a => a.label.trim()).map(a => actionData(kind, a));
  const contentType = f.contentType === 'plain' ? undefined : f.contentType;

  const data: Record<string, unknown> =
    kind === 'modal'
      ? {
          title: f.title,
          content: f.text,
          content_type: contentType,
          width: f.width === 'md' ? undefined : f.width,
          dismissible: f.dismissible ? undefined : false,
          sound: soundValue(f),
          actions,
        }
      : kind === 'toast'
        ? {
            title: f.title,
            description: f.text,
            duration_ms: f.durationMs === 5000 ? undefined : f.durationMs,
            persistent: f.persistent || undefined,
            sound: soundValue(f),
            actions,
          }
        : f.dismiss
          ? { id: f.id.trim(), dismiss: true }
          : {
              id: f.id.trim(),
              title: f.title,
              message: f.text,
              content_type: contentType,
              level: f.level === 'info' ? undefined : f.level,
              icon: f.icon.trim(),
              actions,
            };

  // `false` reste : `sound: false` coupe le son. Seuls l'absent, le vide et la liste vide s'en vont.
  return Object.fromEntries(
    Object.entries<unknown>(data).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
  );
}

/** Valeur YAML d'un scalaire ou d'une liste : chaîne entre guillemets façon JSON, qui est aussi du YAML valide. */
const scalar = (value: unknown) => (typeof value === 'string' || Array.isArray(value) ? JSON.stringify(value) : String(value));

const isMap = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** YAML d'un objet : sous-objets, listes d'objets (les boutons) et listes de scalaires (`entity_id: [..]` du JSON saisi). */
function emit(obj: Record<string, unknown>, pad: string): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return [`${pad}${key}: []`];
      return [
        `${pad}${key}:`,
        ...value.flatMap(item =>
          isMap(item)
            ? emit(item, `${pad}    `).map((line, i) => (i === 0 ? `${pad}  - ${line.trimStart()}` : line))
            : [`${pad}  - ${scalar(item)}`]
        ),
      ];
    }
    if (isMap(value)) {
      const inner = emit(value, `${pad}  `);
      return inner.length > 0 ? [`${pad}${key}:`, ...inner] : [`${pad}${key}: {}`];
    }
    return [`${pad}${key}: ${scalar(value)}`];
  });
}

/** Le bloc à coller dans une automatisation — la forme que lit `toDevTools`. */
export function automationYaml(kind: EventKind, data: Record<string, unknown>): string {
  return ['action:', `  - event: ${HA_EVENT_TYPES[kind]}`, '    event_data:', ...emit(data, '      ')].join('\n');
}
