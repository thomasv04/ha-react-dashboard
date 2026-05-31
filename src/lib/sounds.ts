/**
 * Synthesizes notification sounds using Web Audio API.
 * No external files needed — pure browser tones.
 */

export type SoundPreset =
  | 'notification' | 'alert' | 'success' | 'warning' | 'error'
  | 'click' | 'pop'
  | 'toggle_on' | 'toggle_off'
  | 'arm' | 'disarm'
  | 'slider_tick'
  | 'door_open' | 'door_close' | 'lock' | 'unlock'
  | 'motion'
  | 'media_play' | 'media_pause' | 'media_next'
  | 'vacuum_start' | 'vacuum_dock'
  | 'temperature_up' | 'temperature_down'
  | 'brightness_up' | 'brightness_down'
  | 'water' | 'battery_low' | 'chime'
  | 'none';

interface Note {
  freq: number;
  start: number;
  duration: number;
  gain?: number;
  type?: OscillatorType;
}

export const PRESETS: Record<Exclude<SoundPreset, 'none'>, Note[]> = {
  // ── UI générique ──
  notification: [
    { freq: 880, start: 0, duration: 0.12, gain: 0.25 },
    { freq: 1100, start: 0.14, duration: 0.18, gain: 0.18 },
  ],
  alert: [
    { freq: 660, start: 0, duration: 0.07, gain: 0.35 },
    { freq: 660, start: 0.1, duration: 0.07, gain: 0.35 },
    { freq: 880, start: 0.2, duration: 0.12, gain: 0.35 },
  ],
  success: [
    { freq: 523, start: 0, duration: 0.1, gain: 0.22 },
    { freq: 659, start: 0.1, duration: 0.1, gain: 0.22 },
    { freq: 784, start: 0.2, duration: 0.22, gain: 0.22 },
  ],
  warning: [
    { freq: 440, start: 0, duration: 0.2, gain: 0.3 },
    { freq: 330, start: 0.22, duration: 0.2, gain: 0.2 },
  ],
  error: [
    { freq: 300, start: 0, duration: 0.12, gain: 0.3, type: 'square' },
    { freq: 250, start: 0.12, duration: 0.18, gain: 0.25, type: 'square' },
  ],
  click: [
    { freq: 1800, start: 0, duration: 0.03, gain: 0.15 },
  ],
  pop: [
    { freq: 600, start: 0, duration: 0.06, gain: 0.2 },
    { freq: 900, start: 0.01, duration: 0.04, gain: 0.15 },
  ],

  // ── Toggle ──
  toggle_on: [
    { freq: 880, start: 0, duration: 0.06, gain: 0.2 },
    { freq: 1320, start: 0.07, duration: 0.08, gain: 0.15 },
  ],
  toggle_off: [
    { freq: 1100, start: 0, duration: 0.06, gain: 0.18 },
    { freq: 660, start: 0.07, duration: 0.08, gain: 0.12 },
  ],

  // ── Alarme ──
  arm: [
    { freq: 440, start: 0, duration: 0.08, gain: 0.2 },
    { freq: 554, start: 0.1, duration: 0.08, gain: 0.2 },
    { freq: 659, start: 0.2, duration: 0.08, gain: 0.2 },
    { freq: 880, start: 0.3, duration: 0.12, gain: 0.25 },
  ],
  disarm: [
    { freq: 880, start: 0, duration: 0.08, gain: 0.22 },
    { freq: 659, start: 0.1, duration: 0.08, gain: 0.2 },
    { freq: 523, start: 0.2, duration: 0.15, gain: 0.18 },
  ],

  // ── Slider ──
  slider_tick: [
    { freq: 2200, start: 0, duration: 0.015, gain: 0.08 },
  ],

  // ── Porte / Serrure ──
  door_open: [
    { freq: 400, start: 0, duration: 0.08, gain: 0.15 },
    { freq: 600, start: 0.06, duration: 0.08, gain: 0.18 },
    { freq: 800, start: 0.12, duration: 0.1, gain: 0.12 },
  ],
  door_close: [
    { freq: 800, start: 0, duration: 0.06, gain: 0.18 },
    { freq: 500, start: 0.05, duration: 0.08, gain: 0.15 },
    { freq: 300, start: 0.1, duration: 0.1, gain: 0.12 },
  ],
  lock: [
    { freq: 1400, start: 0, duration: 0.03, gain: 0.2 },
    { freq: 1000, start: 0.04, duration: 0.04, gain: 0.25 },
  ],
  unlock: [
    { freq: 1000, start: 0, duration: 0.03, gain: 0.2 },
    { freq: 1400, start: 0.04, duration: 0.06, gain: 0.18 },
  ],

  // ── Détection ──
  motion: [
    { freq: 500, start: 0, duration: 0.15, gain: 0.1 },
    { freq: 700, start: 0.05, duration: 0.12, gain: 0.08 },
  ],

  // ── Média ──
  media_play: [
    { freq: 660, start: 0, duration: 0.06, gain: 0.2 },
    { freq: 880, start: 0.07, duration: 0.1, gain: 0.18 },
  ],
  media_pause: [
    { freq: 880, start: 0, duration: 0.06, gain: 0.18 },
    { freq: 660, start: 0.07, duration: 0.1, gain: 0.15 },
  ],
  media_next: [
    { freq: 800, start: 0, duration: 0.04, gain: 0.15 },
    { freq: 1000, start: 0.04, duration: 0.04, gain: 0.15 },
    { freq: 1200, start: 0.08, duration: 0.06, gain: 0.12 },
  ],

  // ── Aspirateur ──
  vacuum_start: [
    { freq: 200, start: 0, duration: 0.15, gain: 0.15, type: 'sawtooth' },
    { freq: 300, start: 0.1, duration: 0.15, gain: 0.18, type: 'sawtooth' },
    { freq: 400, start: 0.2, duration: 0.12, gain: 0.12, type: 'sawtooth' },
  ],
  vacuum_dock: [
    { freq: 600, start: 0, duration: 0.1, gain: 0.15 },
    { freq: 500, start: 0.1, duration: 0.1, gain: 0.12 },
    { freq: 400, start: 0.2, duration: 0.15, gain: 0.1 },
  ],

  // ── Climat ──
  temperature_up: [
    { freq: 700, start: 0, duration: 0.05, gain: 0.15 },
    { freq: 900, start: 0.05, duration: 0.06, gain: 0.12 },
  ],
  temperature_down: [
    { freq: 900, start: 0, duration: 0.05, gain: 0.15 },
    { freq: 700, start: 0.05, duration: 0.06, gain: 0.12 },
  ],

  // ── Lumière ──
  brightness_up: [
    { freq: 600, start: 0, duration: 0.08, gain: 0.12 },
    { freq: 800, start: 0.06, duration: 0.1, gain: 0.1 },
  ],
  brightness_down: [
    { freq: 800, start: 0, duration: 0.08, gain: 0.12 },
    { freq: 600, start: 0.06, duration: 0.1, gain: 0.1 },
  ],

  // ── Environnement ──
  water: [
    { freq: 500, start: 0, duration: 0.04, gain: 0.12 },
    { freq: 800, start: 0.03, duration: 0.06, gain: 0.1 },
    { freq: 600, start: 0.08, duration: 0.05, gain: 0.08 },
  ],
  battery_low: [
    { freq: 330, start: 0, duration: 0.2, gain: 0.15, type: 'triangle' },
    { freq: 330, start: 0.4, duration: 0.2, gain: 0.12, type: 'triangle' },
  ],
  chime: [
    { freq: 1047, start: 0, duration: 0.15, gain: 0.18 },
    { freq: 1319, start: 0.12, duration: 0.15, gain: 0.15 },
    { freq: 1568, start: 0.24, duration: 0.2, gain: 0.12 },
  ],
};

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext();
  }
  return ctx;
}

export function playSound(sound: SoundPreset | string): void {
  if (sound === 'none') return;
  try {
    if (typeof sound === 'string' && !isPreset(sound)) {
      // External URL — use HTMLAudioElement
      const audio = new Audio(sound);
      audio.volume = 0.5;
      audio.play().catch(() => {
        /* ignore autoplay policy */
      });
      return;
    }

    const notes = PRESETS[sound as SoundPreset];
    if (!notes) return;

    const ac = getContext();
    if (ac.state === 'suspended') {
      ac.resume().then(() => scheduleNotes(ac, notes));
    } else {
      scheduleNotes(ac, notes);
    }
  } catch {
    // Silently ignore if Web Audio not supported
  }
}

function isPreset(s: string): s is SoundPreset {
  return s in PRESETS;
}

function scheduleNotes(ac: AudioContext, notes: Note[]): void {
  const now = ac.currentTime;
  notes.forEach(({ freq, start, duration, gain = 0.2, type = 'sine' }) => {
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);

    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(gainNode);
    gainNode.connect(ac.destination);

    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });
}
