import { type Variants } from 'framer-motion';
import {
  EASE_OUT,
  EASE_IN,
  EASE_IN_OUT,
  EASE_SINE,
  DURATION_FAST,
  DURATION_NORMAL,
  DURATION_MEDIUM,
  DURATION_SLOW,
  DURATION_ENTRANCE,
} from './motion-tokens';

// ── Entrée / Sortie génériques ──

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
  exit: { opacity: 0, y: 6, transition: { duration: DURATION_FAST, ease: EASE_IN } },
};

export const fadeOut: Variants = {
  exit: { opacity: 0, y: 6, transition: { duration: DURATION_FAST, ease: EASE_IN } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.22, ease: EASE_IN } },
};

export const groupFadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: EASE_OUT } },
};

// ── Stagger containers ──

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// 0.035 s et non 0.08 : à 0.08, un dashboard de 12 cards mettait ~1 s à
// s'afficher entièrement — sur une tablette murale qui se réveille, la
// chorégraphie devient de l'attente. À 0.035, l'effet de cascade reste lisible
// pour ~0,4 s au total.
export const staggerGridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
};

export const staggerGridItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
};

export const sectionStaggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

export const sectionStaggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
};

// ── Modal & Bottom Sheet ──

export const modalEnter: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.22, ease: EASE_IN } },
};

export const modalScrim: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION_SLOW, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DURATION_SLOW, ease: EASE_OUT } },
};

export const bottomSheet: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { duration: DURATION_SLOW, ease: EASE_OUT } },
  exit: { y: '100%', transition: { duration: DURATION_SLOW, ease: EASE_OUT } },
};

// ── Navigation ──

export const slidePushEnter: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { duration: DURATION_MEDIUM, ease: EASE_IN_OUT } },
  exit: { x: '-100%', transition: { duration: DURATION_MEDIUM, ease: EASE_IN_OUT } },
};

export const slidePopEnter: Variants = {
  hidden: { x: '-28%' },
  visible: { x: 0, transition: { duration: DURATION_NORMAL, ease: EASE_IN_OUT } },
  exit: { x: '100%', transition: { duration: DURATION_NORMAL, ease: EASE_IN_OUT } },
};

export const fadeCross: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION_FAST, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DURATION_FAST, ease: EASE_OUT } },
};

// ── Scroll reveal ──

export const revealOnScroll: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
};

// ── Map markers ──

export const markerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

export const markerDrop: Variants = {
  hidden: { opacity: 0, scale: 0, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
};

// ── Notifications ──

export const toastEnter: Variants = {
  hidden: { y: -60, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: DURATION_MEDIUM, ease: EASE_OUT } },
  exit: { y: -60, opacity: 0, transition: { duration: 0.25, ease: EASE_OUT } },
};

export const badgePop: Variants = {
  hidden: { scale: 0 },
  visible: { scale: [0, 1.12, 1], transition: { duration: 0.22, ease: EASE_OUT } },
};

// ── Feedback ──

export const errorShake: Variants = {
  shake: { x: [0, -5, 5, -3, 3, -1, 1, 0], transition: { duration: 0.36 } },
  idle: { x: 0 },
};

export const successRing: Variants = {
  hidden: { scale: 0.88, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.32, ease: EASE_OUT } },
};

// ── Premium ──

export const sharedHero = {
  duration: 0.38,
  ease: EASE_IN_OUT,
};

export const floatingIllustration: Variants = {
  float: {
    y: [0, -7, 0],
    transition: { duration: 2.6, repeat: Infinity, ease: EASE_SINE },
  },
};

export const splashLogo: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: DURATION_ENTRANCE, ease: EASE_OUT } },
};

export const stepStaggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const stepStaggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
};
