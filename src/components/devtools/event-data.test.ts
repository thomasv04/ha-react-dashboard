import { describe, it, expect } from 'vitest';
import { automationYaml, buildEventData, canSendEvent, DEFAULT_FORM, invalidActions, NEW_ACTION, parseActionData } from './event-data';
import { toDevTools } from '@/components/onboarding/EventsDoc';

const form = (patch: Partial<typeof DEFAULT_FORM>) => ({ ...DEFAULT_FORM, ...patch });

describe('buildEventData — modale', () => {
  it("n'écrit que ce qui s'écarte des valeurs par défaut", () => {
    expect(buildEventData('modal', form({ title: 'Salut', text: 'Corps' }))).toEqual({ title: 'Salut', content: 'Corps' });
  });

  it('couvre format, largeur, blocage et son', () => {
    expect(
      buildEventData('modal', form({ title: 'T', text: 'x', contentType: 'markdown', width: 'full', dismissible: false, sound: 'chime' }))
    ).toEqual({ title: 'T', content: 'x', content_type: 'markdown', width: 'full', dismissible: false, sound: 'chime' });
  });

  it('distingue le son coupé (false), une adresse et le son par défaut', () => {
    expect(buildEventData('modal', form({ title: 'T', sound: 'muted' })).sound).toBe(false);
    expect(buildEventData('modal', form({ title: 'T', sound: 'url', soundUrl: ' /local/a.mp3 ' })).sound).toBe('/local/a.mp3');
    expect(buildEventData('modal', form({ title: 'T', sound: 'url', soundUrl: '' })).sound).toBeUndefined();
    expect(buildEventData('modal', form({ title: 'T' })).sound).toBeUndefined();
  });
});

describe('buildEventData — toast', () => {
  it('écrit la durée en millisecondes, sauf la valeur par défaut', () => {
    expect(buildEventData('toast', form({ title: 'T', durationMs: 8000 }))).toEqual({ title: 'T', duration_ms: 8000 });
    expect(buildEventData('toast', form({ title: 'T', text: 'D' }))).toEqual({ title: 'T', description: 'D' });
  });
});

describe('buildEventData — notification', () => {
  it('couvre id, format, niveau et icône', () => {
    expect(
      buildEventData('notification', form({ title: 'N', text: 'M', id: ' maj ', level: 'warning', contentType: 'html', icon: 'Download' }))
    ).toEqual({ id: 'maj', title: 'N', message: 'M', content_type: 'html', level: 'warning', icon: 'Download' });
  });

  it('un retrait ne porte que dismiss et l’id — sans id, il vide le tiroir', () => {
    expect(buildEventData('notification', form({ dismiss: true, id: 'maj', title: 'ignoré' }))).toEqual({ id: 'maj', dismiss: true });
    expect(buildEventData('notification', form({ dismiss: true }))).toEqual({ dismiss: true });
  });
});

describe('boutons', () => {
  const action = { ...NEW_ACTION, label: 'Allumer', variant: 'primary' as const };

  it('plusieurs boutons, dans l’ordre, les vides ignorés', () => {
    const data = buildEventData(
      'modal',
      form({ title: 'M', actions: [action, { ...NEW_ACTION }, { ...NEW_ACTION, label: ' Plus tard ' }] })
    );
    expect(data.actions).toEqual([{ label: 'Allumer', variant: 'primary' }, { label: 'Plus tard' }]);
  });

  it("fusionne l'entité et le JSON dans service_data, le JSON ayant le dernier mot", () => {
    const a = { ...action, service: 'light.turn_on', entity: 'light.salon', data: '{"brightness_pct": 40, "entity_id": ["light.a"]}' };
    expect(buildEventData('toast', form({ title: 'T', actions: [a] })).actions).toEqual([
      { label: 'Allumer', variant: 'primary', service: 'light.turn_on', service_data: { entity_id: ['light.a'], brightness_pct: 40 } },
    ]);
  });

  it('keep ne vaut que pour une notification', () => {
    const a = { ...action, keep: true };
    expect(buildEventData('notification', form({ title: 'N', actions: [a] })).actions).toEqual([
      { label: 'Allumer', variant: 'primary', keep: true },
    ]);
    expect(buildEventData('modal', form({ title: 'M', actions: [a] })).actions).toEqual([{ label: 'Allumer', variant: 'primary' }]);
  });

  it('repère un JSON illisible, ou qui n’est pas un objet, et bloque l’envoi', () => {
    expect(parseActionData('').error).toBeUndefined();
    expect(parseActionData('{"a": 1}').value).toEqual({ a: 1 });
    expect(parseActionData('{oups').error).toBe(true);
    expect(parseActionData('[1, 2]').error).toBe(true);

    const bad = form({ title: 'M', actions: [action, { ...action, data: '{oups' }] });
    expect(invalidActions(bad)).toEqual([1]);
    expect(canSendEvent('modal', bad)).toBe(false);
  });
});

describe('canSendEvent', () => {
  it('demande un texte, sauf pour retirer une notification', () => {
    expect(canSendEvent('modal', form({}))).toBe(false);
    expect(canSendEvent('modal', form({ text: 'x' }))).toBe(true);
    expect(canSendEvent('notification', form({ dismiss: true }))).toBe(true);
  });
});

describe('automationYaml', () => {
  const data = {
    title: 'Le courrier : arrivé',
    content: 'Ligne 1\nLigne "2"',
    dismissible: false,
    sound: false,
    actions: [
      { label: 'Voir', service: 'light.turn_on', service_data: { entity_id: ['light.a', 'light.b'], brightness_pct: 40 } },
      { label: 'Plus tard' },
    ],
  };

  it("écrit le bloc d'automatisation : chaînes entre guillemets, booléens, listes de scalaires", () => {
    expect(automationYaml('modal', data)).toBe(
      [
        'action:',
        '  - event: ha_dashboard_modal',
        '    event_data:',
        '      title: "Le courrier : arrivé"',
        String.raw`      content: "Ligne 1\nLigne \"2\""`,
        '      dismissible: false',
        '      sound: false',
        '      actions:',
        '        - label: "Voir"',
        '          service: "light.turn_on"',
        '          service_data:',
        '            entity_id:',
        '              - "light.a"',
        '              - "light.b"',
        '            brightness_pct: 40',
        '        - label: "Plus tard"',
      ].join('\n')
    );
  });

  it('se convertit en forme Outils de développement, listes comprises', () => {
    const converted = toDevTools(automationYaml('modal', data), 'ha_dashboard_modal');
    expect(converted).toContain("# Type d'événement : ha_dashboard_modal");
    expect(converted).toContain('entity_id:\n        - "light.a"');
    expect(converted).not.toContain('event_data');
  });
});
