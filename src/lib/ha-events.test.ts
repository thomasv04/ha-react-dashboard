import { describe, it, expect, vi } from 'vitest';
import { asText, modalFromEvent, toastFromEvent, applyNotificationEvent } from './ha-events';

const helpers = { callService: vi.fn() };

describe('asText', () => {
  it('écrit en texte ce que HA rend en valeur native', () => {
    expect(asText('déjà du texte')).toBe('déjà du texte');
    expect(asText(21.5)).toBe('21.5');
    expect(asText(false)).toBe('false');
    expect(asText({ from: 'facteur', count: 2 })).toBe('{\n  "from": "facteur",\n  "count": 2\n}');
    expect(asText(['a', 'b'])).toBe('[\n  "a",\n  "b"\n]');
  });

  it('ne rend rien pour une variable sans valeur', () => {
    expect(asText(undefined)).toBeUndefined();
    expect(asText(null)).toBeUndefined();
    expect(asText('')).toBeUndefined();
  });
});

describe('événements portant des valeurs natives (templates {{ … }})', () => {
  it('une modale dont le contenu est un objet affiche son JSON au lieu de planter le rendu', () => {
    const modal = modalFromEvent({ title: 'Boîte aux lettres', content: { message: 'Colis', nb: 1 } as unknown as string }, helpers);
    expect(modal.content).toBe('{\n  "message": "Colis",\n  "nb": 1\n}');
    expect(typeof modal.content).toBe('string');
  });

  it('un contenu html garde son type, un contenu vide disparaît', () => {
    expect(modalFromEvent({ content: '<b>x</b>', content_type: 'html' }, helpers).content).toEqual({ type: 'html', value: '<b>x</b>' });
    expect(modalFromEvent({ title: 'Seul', content: '' }, helpers).content).toBeUndefined();
  });

  it('un toast garde un titre texte, même pour un nombre ou une valeur absente', () => {
    expect(toastFromEvent({ title: 42 as unknown as string }, helpers).title).toBe('42');
    expect(toastFromEvent({ title: undefined as unknown as string }, helpers).title).toBe('');
  });

  it('une notification dont le message est un objet entre dans le tiroir en texte', () => {
    const store = { notify: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn() };
    applyNotificationEvent({ id: 7 as unknown as string, message: { ok: true } as unknown as string }, store);
    expect(store.notify).toHaveBeenCalledWith(expect.objectContaining({ id: '7', message: '{\n  "ok": true\n}' }));
  });
});
