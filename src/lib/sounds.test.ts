import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PRESETS } from './sounds';

// sounds.ts is tested at the data/structure level; AudioContext is browser-only

describe('PRESETS', () => {
  const expectedPresets = [
    'notification',
    'alert',
    'success',
    'warning',
    'click',
    'toggle_on',
    'toggle_off',
    'error',
    'pop',
    'arm',
    'disarm',
    'slider_tick',
    'door_open',
    'door_close',
    'lock',
    'unlock',
    'motion',
    'media_play',
    'media_pause',
    'media_next',
    'vacuum_start',
    'vacuum_dock',
    'temperature_up',
    'temperature_down',
    'brightness_up',
    'brightness_down',
    'water',
    'battery_low',
    'chime',
  ];

  it('contient tous les presets attendus', () => {
    for (const name of expectedPresets) {
      expect(PRESETS[name as keyof typeof PRESETS], `preset "${name}" manquant`).toBeDefined();
    }
  });

  it("n'a pas de preset non documenté", () => {
    const actual = Object.keys(PRESETS).sort();
    expect(actual).toEqual([...expectedPresets].sort());
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
            gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
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
    for (const name of Object.keys(PRESETS)) {
      expect(() => playSound(name)).not.toThrow();
    }
  });

  it('ne jette pas sur un preset inconnu', async () => {
    const { playSound } = await import('./sounds');
    expect(() => playSound('unknown_preset')).not.toThrow();
  });
});
