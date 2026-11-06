import { describe, it, expect } from 'vitest';
import { automationYaml, buildEventData, DEFAULT_FORM } from './event-data';
import { toDevTools } from '@/components/onboarding/EventsDoc';

describe('buildEventData', () => {
  it("n'écrit que ce qui s'écarte des valeurs par défaut", () => {
    expect(buildEventData('modal', { ...DEFAULT_FORM, title: 'Salut', text: 'Corps' })).toEqual({ title: 'Salut', content: 'Corps' });
    expect(buildEventData('toast', { ...DEFAULT_FORM, title: 'T', durationS: 8 })).toEqual({ title: 'T', duration_ms: 8000 });
    expect(buildEventData('notification', { ...DEFAULT_FORM, title: 'N', id: ' maj ', level: 'warning', html: true })).toEqual({
      id: 'maj',
      title: 'N',
      content_type: 'html',
      level: 'warning',
    });
  });

  it('un toast persistant ne garde pas de durée', () => {
    expect(buildEventData('toast', { ...DEFAULT_FORM, title: 'T', durationS: 8, persistent: true })).toEqual({
      title: 'T',
      persistent: true,
    });
  });

  it("le bouton n'emporte son entité qu'avec un service", () => {
    const form = { ...DEFAULT_FORM, title: 'M', actionLabel: 'Allumer', actionEntity: 'light.salon' };
    expect(buildEventData('modal', form).actions).toEqual([{ label: 'Allumer' }]);
    expect(buildEventData('modal', { ...form, actionService: 'light.turn_on' }).actions).toEqual([
      { label: 'Allumer', service: 'light.turn_on', service_data: { entity_id: 'light.salon' } },
    ]);
  });
});

describe('automationYaml', () => {
  const data = {
    title: 'Le courrier : arrivé',
    content: 'Ligne 1\nLigne "2"',
    dismissible: false,
    actions: [{ label: 'Voir', service: 'light.turn_on', service_data: { entity_id: 'light.salon' } }, { label: 'Plus tard' }],
  };

  it("écrit le bloc d'automatisation, chaînes entre guillemets", () => {
    expect(automationYaml('modal', data)).toBe(
      [
        'action:',
        '  - event: ha_dashboard_modal',
        '    event_data:',
        '      title: "Le courrier : arrivé"',
        String.raw`      content: "Ligne 1\nLigne \"2\""`,
        '      dismissible: false',
        '      actions:',
        '        - label: "Voir"',
        '          service: "light.turn_on"',
        '          service_data:',
        '            entity_id: "light.salon"',
        '        - label: "Plus tard"',
      ].join('\n')
    );
  });

  it('se convertit en forme Outils de développement', () => {
    expect(toDevTools(automationYaml('modal', { title: 'T', actions: [{ label: 'OK' }] }), 'ha_dashboard_modal')).toBe(
      ["# Type d'événement : ha_dashboard_modal", "# Données d'événement :", 'title: "T"', 'actions:', '  - label: "OK"'].join('\n')
    );
  });
});
