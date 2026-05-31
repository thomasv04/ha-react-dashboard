// ── Easing curves (arrays pour Framer Motion) ──
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.4, 0, 1, 1] as const;
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;
export const EASE_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25, mass: 0.8 };
export const EASE_SINE = [0.37, 0, 0.63, 1] as const;

// ── Durées (secondes pour Framer Motion) ──
export const DURATION_INSTANT = 0.1;
export const DURATION_MICRO = 0.15;
export const DURATION_FAST = 0.2;
export const DURATION_NORMAL = 0.28;
export const DURATION_MEDIUM = 0.3;
export const DURATION_SLOW = 0.34;
export const DURATION_ENTRANCE = 0.4;
export const DURATION_HERO = 0.5;
export const DURATION_CINEMATIC = 0.6;

// ── Presets de transition réutilisables ──
export const T_EASE_OUT = { duration: DURATION_NORMAL, ease: EASE_OUT };
export const T_EASE_IN = { duration: DURATION_FAST, ease: EASE_IN };
export const T_EASE_IN_OUT = { duration: DURATION_MEDIUM, ease: EASE_IN_OUT };
export const T_SPRING = EASE_SPRING;
