import { describe, it, expect, vi } from 'vitest';
import { asText, findPanel, modalFromEvent, toastFromEvent, applyNotificationEvent } from './ha-events';

const helpers = { callService: vi.fn() };

describe('findPanel', () => {
  const panels = [
    { id: 'a1', name: 'Volets' },
    { id: 'b2', name: 'Sonnette' },
  ];

  it("trouve la modale par sa référence d'éditeur, son id ou son nom", () => {
    expect(findPanel('custom:b2', panels)?.name).toBe('Sonnette');
    expect(findPanel('b2', panels)?.name).toBe('Sonnette');
    expect(findPanel(' sonnette ', panels)?.id).toBe('b2');
  });

  it('ne trouve rien pour une modale inconnue ou une référence vide', () => {
    expect(findPanel('Portail', panels)).toBeUndefined();
    expect(findPanel('', panels)).toBeUndefined();
    expect(findPanel(undefined, panels)).toBeUndefined();
  });
});

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

  it("une durée de modale venue d'un modèle en texte compte ; absente, nulle ou illisible, la modale reste", () => {
    expect(modalFromEvent({ duration_ms: '30000' as unknown as number }, helpers).durationMs).toBe(30000);
    expect(modalFromEvent({}, helpers).durationMs).toBeUndefined();
    expect(modalFromEvent({ duration_ms: 0 }, helpers).durationMs).toBeUndefined();
    expect(modalFromEvent({ duration_ms: 'bientôt' as unknown as number }, helpers).durationMs).toBeUndefined();
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
