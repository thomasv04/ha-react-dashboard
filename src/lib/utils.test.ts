import { describe, it, expect } from 'vitest';
import { cn } from './utils';

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
