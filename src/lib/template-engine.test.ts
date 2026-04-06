import { describe, it, expect, beforeEach } from 'vitest';
import { templateEngine } from './template-engine';

const mockEntities = {
  'sensor.temperature': {
    state: '21.5',
    attributes: { unit_of_measurement: '°C', friendly_name: 'Température' },
  },
  'light.salon': {
    state: 'on',
    attributes: { brightness: 128, friendly_name: 'Salon' },
  },
  'sensor.battery': {
    state: '1',
    attributes: { friendly_name: 'Batterie' },
  },
};

beforeEach(() => {
  templateEngine.bind(() => mockEntities);
});

describe('templateEngine.render', () => {
  it('résout states()', () => {
    expect(templateEngine.render("{{ states('sensor.temperature') }}")).toBe('21.5');
  });

  it('résout state_attr()', () => {
    expect(templateEngine.render("{{ state_attr('sensor.temperature', 'unit_of_measurement') }}")).toBe('°C');
  });

  it('résout is_state()', () => {
    expect(templateEngine.render("{{ is_state('light.salon', 'on') }}")).toBe('true');
  });

  it('résout has_value()', () => {
    expect(templateEngine.render("{{ has_value('sensor.temperature') }}")).toBe('true');
  });

  it('résout {% if %} / {% elif %} / {% else %}', () => {
    const template = `
      {%- set etat = states('sensor.battery') -%}
      {%- if etat == '1' -%}charging
      {%- elif etat == '2' -%}discharging
      {%- else -%}idle{%- endif -%}
    `;
    expect(templateEngine.render(template)).toBe('charging');
  });

  it('résout le filtre | round', () => {
    expect(templateEngine.render("{{ states('sensor.temperature') | float | round(1) }}")).toBe('21.5');
  });

  it('résout le filtre | multiply', () => {
    expect(templateEngine.render("{{ state_attr('light.salon', 'brightness') | multiply(100) | divide(255) | round(0) }}")).toBe('50');
  });

  it('résout in avec liste', () => {
    const template = `{%- if states('sensor.battery') in ['1', 'charging'] -%}oui{%- else -%}non{%- endif -%}`;
    expect(templateEngine.render(template)).toBe('oui');
  });

  it('retourne unknown pour entité inexistante', () => {
    expect(templateEngine.render("{{ states('sensor.inexistant') }}")).toBe('unknown');
  });

  it("retourne un message d'erreur sur syntaxe invalide", () => {
    const result = templateEngine.render('{% if unclosed %}');
    expect(result).toContain('[Erreur template:');
  });

  it('résout iif()', () => {
    expect(templateEngine.render("{{ iif(is_state('light.salon', 'on'), 'allumé', 'éteint') }}")).toBe('allumé');
  });
});

describe('templateEngine.validate', () => {
  it('retourne null pour un template valide', () => {
    expect(templateEngine.validate("{% if true %}ok{% endif %}")).toBeNull();
  });

  it("retourne un message d'erreur pour une syntaxe invalide", () => {
    expect(templateEngine.validate('{% if unclosed %}')).not.toBeNull();
  });
});
