import { describe, it, expect, beforeAll } from 'vitest';
import { templateEngine } from './template-engine';
import { resolveColorValue } from './color-value';

beforeAll(() => {
  templateEngine.bind(() => ({
    'lock.smart_lock_ultra': { state: 'locked', attributes: {} },
  }));
});

describe('resolveColorValue', () => {
  it('rend un hex tel quel', () => {
    expect(resolveColorValue('#ef4444')).toBe('#ef4444');
  });

  it('ignore un champ vide', () => {
    expect(resolveColorValue('')).toBeUndefined();
    expect(resolveColorValue(undefined)).toBeUndefined();
  });

  it('évalue un template et traduit le nom de couleur', () => {
    const tpl = "{% if is_state('lock.smart_lock_ultra', 'locked') %}red{% else %}green{% endif %}";
    expect(resolveColorValue(tpl)).toBe('#ef4444');
  });

  it('laisse passer un hex produit par un template', () => {
    expect(resolveColorValue("{{ '#123456' }}")).toBe('#123456');
  });

  it('retombe sur undefined si le template est cassé', () => {
    expect(resolveColorValue('{% if unclosed %}')).toBeUndefined();
  });
});
