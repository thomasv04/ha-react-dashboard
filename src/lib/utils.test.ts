import { describe, it, expect } from 'vitest';
import { cn, clamp, isTypingTarget } from './utils';

describe('cn()', () => {
  it('retourne une chaîne vide sans arguments', () => {
    expect(cn()).toBe('');
  });

  it('fusionne des classes simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignore les valeurs falsy', () => {
    expect(cn('foo', false, undefined, null, 0 as unknown as string, 'bar')).toBe('foo bar');
  });

  it('déduplique les classes Tailwind conflictuelles (merge)', () => {
    // tailwind-merge: px-2 et px-4 → seul px-4 gagne
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('fusionne des classes conditionnelles (objet)', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500');
  });

  it('supporte les tableaux', () => {
    expect(cn(['flex', 'items-center'], 'gap-2')).toBe('flex items-center gap-2');
  });

  it('déduplique p-2 vs p-4', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('conserve le prefixe responsive (ex: sm:hidden)', () => {
    expect(cn('hidden', 'sm:block')).toBe('hidden sm:block');
  });
});

describe('isTypingTarget()', () => {
  /** Écoute sur `window` et rend ce que le garde a vu du dernier événement. */
  function guardSaw(dispatch: () => void): boolean {
    let seen = false;
    const onKeyDown = (e: Event) => {
      seen = isTypingTarget(e);
    };
    window.addEventListener('keydown', onKeyDown);
    dispatch();
    window.removeEventListener('keydown', onKeyDown);
    return seen;
  }

  it('reconnaît un champ de saisie', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    expect(guardSaw(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })))).toBe(true);
    input.remove();
  });

  it('laisse passer une frappe hors champ', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(guardSaw(() => div.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })))).toBe(false);
    div.remove();
  });

  // Le cas qui cassait : sous Home Assistant le dashboard vit dans une shadow
  // root, et `e.target` vu depuis `window` est l'hôte, pas l'`<input>`. Taper
  // « c » dans le nom d'un panneau ouvrait la barre de commande.
  it("voit l'input même à travers une shadow root", () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const input = document.createElement('input');
    host.attachShadow({ mode: 'open' }).appendChild(input);

    expect(guardSaw(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true, composed: true })))).toBe(true);
    host.remove();
  });
});

describe('clamp()', () => {
  it('laisse passer une valeur déjà dans les bornes', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('ramène aux bornes', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('rend la borne basse quand elle dépasse la haute', () => {
    // Le cas dégénéré : une grille plus étroite que le widget qu'on y pose.
    // L'écriture miroir `Math.min(max, Math.max(min, v))` rendrait `max` ici —
    // c'est tout l'intérêt d'avoir une seule fonction plutôt que deux
    // tournures qui se ressemblent.
    expect(clamp(5, 10, 2)).toBe(10);
  });
});
