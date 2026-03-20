import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PRESETS } from './sounds';

// sounds.ts is tested at the data/structure level; AudioContext is browser-only

describe('PRESETS', () => {
  it('contient les 4 presets', () => {
    const expected = ['notification', 'alert', 'success', 'warning'];
    for (const name of expected) {
      expect(PRESETS[name as keyof typeof PRESETS]).toBeDefined();
    }
  });

  it('chaque preset a au moins une note', () => {
    for (const [name, notes] of Object.entries(PRESETS)) {
      expect(notes.length, `preset "${name}" vide`).toBeGreaterThan(0);
    }
  });

  it('chaque note a une fréquence positive', () => {
    for (const [name, notes] of Object.entries(PRESETS)) {
      for (const note of notes) {
        expect(note.freq, `freq invalide dans "${name}"`).toBeGreaterThan(0);
      }
    }
  });

  it('chaque note a un start ≥ 0', () => {
    for (const notes of Object.values(PRESETS)) {
      for (const note of notes) {
        expect(note.start).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('chaque note a une durée > 0', () => {
    for (const notes of Object.values(PRESETS)) {
      for (const note of notes) {
        expect(note.duration).toBeGreaterThan(0);
      }
    }
  });

  it('les notes sont ordonnées par start croissant', () => {
    for (const [name, notes] of Object.entries(PRESETS)) {
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i].start, `start non croissant dans "${name}"`).toBeGreaterThanOrEqual(notes[i - 1].start);
      }
    }
  });
});

describe('playSound()', () => {
  beforeEach(() => {
    // Mock Web Audio API absent dans jsdom
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        currentTime = 0;
        createOscillator() {
          return {
            type: '',
            frequency: { setValueAtTime: vi.fn() },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
        }
        createGain() {
          return {
            gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
          };
        }
        get destination() {
          return {};
        }
      }
    );
  });

  it('ne jette pas sur un preset connu', async () => {
    const { playSound } = await import('./sounds');
    expect(() => playSound('notification')).not.toThrow();
    expect(() => playSound('alert')).not.toThrow();
    expect(() => playSound('success')).not.toThrow();
    expect(() => playSound('warning')).not.toThrow();
  });

  it('ne jette pas sur un preset inconnu', async () => {
    const { playSound } = await import('./sounds');
    expect(() => playSound('unknown_preset')).not.toThrow();
  });
});
