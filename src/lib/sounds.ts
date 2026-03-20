/**
 * Synthesizes notification sounds using Web Audio API.
 * No external files needed — pure browser tones.
 */

export type SoundPreset = 'notification' | 'alert' | 'success' | 'warning';

interface Note {
  freq: number;
  start: number;
  duration: number;
  gain?: number;
}

export const PRESETS: Record<SoundPreset, Note[]> = {
  // Soft double-ding (high → higher)
  notification: [
    { freq: 880, start: 0, duration: 0.12, gain: 0.25 },
    { freq: 1100, start: 0.14, duration: 0.18, gain: 0.18 },
  ],
  // Short urgent triple beep
  alert: [
    { freq: 660, start: 0, duration: 0.07, gain: 0.35 },
    { freq: 660, start: 0.1, duration: 0.07, gain: 0.35 },
    { freq: 880, start: 0.2, duration: 0.12, gain: 0.35 },
  ],
  // Ascending pleasant chime
  success: [
    { freq: 523, start: 0, duration: 0.1, gain: 0.22 },
    { freq: 659, start: 0.1, duration: 0.1, gain: 0.22 },
    { freq: 784, start: 0.2, duration: 0.22, gain: 0.22 },
  ],
  // Low muted single tone
  warning: [
    { freq: 440, start: 0, duration: 0.2, gain: 0.3 },
    { freq: 330, start: 0.22, duration: 0.2, gain: 0.2 },
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
  notes.forEach(({ freq, start, duration, gain = 0.2 }) => {
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();

    osc.type = 'sine';
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
