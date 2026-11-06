import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyText } from './clipboard';

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, 'execCommand');
});

describe('copyText', () => {
  it("passe par l'API du presse-papiers quand elle existe", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await copyText('abc')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('se replie sur execCommand en contexte non sécurisé (clipboard absent)', async () => {
    vi.stubGlobal('navigator', {});
    let copied = '';
    document.execCommand = vi.fn(() => {
      copied = document.querySelector('textarea')?.value ?? '';
      return true;
    });
    expect(await copyText('http sans clipboard')).toBe(true);
    expect(copied).toBe('http sans clipboard');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it("se replie aussi quand l'API refuse, et dit faux si tout échoue", async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowed')) } });
    document.execCommand = vi.fn(() => false);
    expect(await copyText('x')).toBe(false);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });
});
