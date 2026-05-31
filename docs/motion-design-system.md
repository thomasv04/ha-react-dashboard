# Motion Design System — Récap pour implémentation

> Stack du projet : **Framer Motion** + **Tailwind CSS v4** + `cn()` utility
> Aucun fichier `.css` séparé pour les animations — tout passe par Framer Motion `transition` props et classes Tailwind.
> Le projet utilise déjà `MotionConfig` avec `reducedMotion` dans `App.tsx` et le hook `useLowPowerMotion()`.

---

## Approche d'implémentation

### Tokens motion (constantes TS)

Créer un fichier `src/lib/motion-tokens.ts` :

```ts
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
```

### Variants Framer Motion réutilisables

```ts
// src/lib/motion-variants.ts
import { type Variants } from 'framer-motion';
import { EASE_OUT, EASE_IN, DURATION_NORMAL, DURATION_FAST } from './motion-tokens';

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
  exit: { opacity: 0, y: 6, transition: { duration: DURATION_FAST, ease: EASE_IN } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION_NORMAL, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.22, ease: EASE_IN } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
```

### Pattern d'utilisation dans un composant

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/motion-variants';
import { T_EASE_OUT } from '@/lib/motion-tokens';

function MyComponent() {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeInUp} transition={T_EASE_OUT}>
        {/* contenu */}
      </motion.div>
    </motion.div>
  );
}
```

---

## 📐 1. Principes de Mouvement (Fondamentaux)

### 4 principes directeurs

| Principe | Description |
|----------|-------------|
| **Purposeful** | Chaque animation a une raison d'être. Guide l'attention, confirme une action, explique un changement d'état. Anti-pattern = décoratif seul |
| **Responsive** | Réponse immédiate aux actions. Tap→feedback < 100ms, Navigation < 300ms |
| **Natural** | Lois physiques : entrée = décélère (Ease Out), sortie = accélère (Ease In) |
| **Delightful** | Micro-interactions clés avec léger overshoot spring (≤ 1.2×) |

### Tokens d'easing (Framer Motion)

| Token | Valeur FM | Utilisation |
|-------|-----------|-------------|
| **Ease Out** | `ease: [0.16, 1, 0.3, 1]` | Toute entrée : bottom sheet, modal, carte, filtres |
| **Ease In** | `ease: [0.4, 0, 1, 1]` | Toute sortie : fermeture modal, dismissal, retour |
| **Ease In-Out** | `ease: [0.4, 0, 0.2, 1]` | Navigation entre pairs : slide push/pop, tab switch |
| **Spring** | `type: 'spring', stiffness: 400, damping: 25` | Micro-interactions : favori, badge, toggle, bouton CTA |
| **Linear** | `ease: 'linear'` | Rotations, boucles : spinner, shimmer |

### Scale de durées

| Durée | Secondes FM | Catégorie | Utilisation |
|-------|-------------|-----------|-------------|
| 100ms | `0.1` | Tap / Feedback | Bouton press, checkbox, ripple |
| 200ms | `0.2` | Micro-interaction | Toggle, badge, favoris |
| 300ms | `0.3` | Navigation | Slide push/pop pair → pair |
| 400ms | `0.4` | Modal / Bottom sheet | Drawer, filtres |
| 500ms | `0.5` | Entrée clé | Splash, hero |
| 600ms | `0.6` | Cinématique | Shared element, confirmation |

### Direction des animations

| Direction | Animation | Easing |
|-----------|-----------|--------|
| → Forward | Slide Left (x: 100% → 0) | `[0.4, 0, 0.2, 1]` |
| ← Back | Slide Right (x: -28% → 0) | `[0.4, 0, 0.2, 1]` |
| ↔ Lateral | Fade Cross (opacity) | `[0.16, 1, 0.3, 1]` |

### TODO
- [ ] Créer `src/lib/motion-tokens.ts` — easings, durées, transitions presets
- [ ] Créer `src/lib/motion-variants.ts` — variants réutilisables (fadeInUp, scaleIn, stagger, etc.)
- [ ] Documenter la convention forward/back/lateral

---

## 🧭 2. Navigation & Transitions

### Slide Push → Forward
- **Durée** : 0.3s
- **Easing** : `ease: [0.4, 0, 0.2, 1]`
- **Framer Motion** :
```tsx
// Screen sortant
<motion.div exit={{ x: '-100%' }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} />
// Screen entrant
<motion.div initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} />
```

### Slide Pop ← Retour
- **Durée** : 0.28s
- **Easing** : `ease: [0.4, 0, 0.2, 1]`
```tsx
// Screen précédent revient
<motion.div initial={{ x: '-28%' }} animate={{ x: 0 }} transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }} />
// Screen actuel sort
<motion.div exit={{ x: '100%' }} transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }} />
```

### Fade Cross — Onglets
- **Durée** : 0.2s
- **Easing** : `ease: [0.16, 1, 0.3, 1]`
```tsx
<AnimatePresence mode="wait">
  <motion.div key={activeTab}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} />
</AnimatePresence>
```

### Bottom Sheet — Filtres / Drawer
- **Durée** : 0.34s
- **Easing** : `ease: [0.16, 1, 0.3, 1]`
- **Comportement** : Entre depuis le bas, scrim à 45% en parallèle
```tsx
<AnimatePresence>
  {open && <>
    <motion.div className="fixed inset-0 bg-black/45"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }} />
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }} />
  </>}
</AnimatePresence>
```

### Modal Center — Popup
- **Durée** : 0.28s entrée, 0.22s sortie
- **Easing** : Ease Out entrée, Ease In sortie
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.94, y: 8 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.94 }}
  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
/>
```

### Map Markers — Drop en cascade
- **Durée** : 0.28s/marker, stagger 0.15s
```tsx
const container: Variants = { visible: { transition: { staggerChildren: 0.15 } } };
const marker: Variants = {
  hidden: { opacity: 0, scale: 0, y: -6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};
```

### TODO
- [ ] Implémenter Slide Push / Slide Pop pour la navigation (AnimatePresence + direction)
- [ ] Implémenter le Fade Cross pour les tabs (AnimatePresence mode="wait")
- [ ] Implémenter le Bottom Sheet (y: '100%' → 0 + scrim animé)
- [ ] Implémenter le Modal Center (scale 0.94 + y 8 + fade)
- [ ] Implémenter les Map Markers en stagger (variants + staggerChildren)

---

## 🎬 3. Entrée & Sortie

### Entrée groupée — Catégories & Filtres
- **Durée** : 0.24s (bloc entier, pas de stagger)
- **Easing** : `[0.16, 1, 0.3, 1]`
```tsx
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }} />
```

### Stagger Grid — Grille de cartes
- **Durée** : 0.28s/carte, stagger 0.08s
- **Easing** : `[0.16, 1, 0.3, 1]`
```tsx
const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const gridItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};
```

### Scale In — Entrée fiche / vue détail
- **Durée** : 0.28s
```tsx
<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} />
```

### Home Stagger — Blocs par sections
- **Durée** : 0.32s/bloc, stagger 0.12s entre sections
```tsx
const sectionContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const sectionItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
};
```

### Fade Out — Sortie universelle
- **Durée** : 0.2s, Ease In (accélère en sortant)
```tsx
exit={{ opacity: 0, y: 6 }}
transition={{ duration: 0.2, ease: [0.4, 0, 1, 1] }}
```

### TODO
- [ ] Créer variant `groupFadeIn` (fade + y simultané, 0.24s)
- [ ] Créer variants `staggerGrid` container + item (0.08s stagger, 0.28s/item)
- [ ] Créer variant `scaleIn` (scale 0.95→1 + fade)
- [ ] Créer variants `sectionStagger` (0.12s entre blocs)
- [ ] Créer variant `fadeOut` universelle (0.2s, ease-in)

---

## 👆 4. Micro-interactions

### Tap — Retour bouton CTA
- **Durée** : press 0.1s, release 0.15s
- **Framer Motion** : `whileTap` prop
```tsx
<motion.button whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }} />
```

### Toggle
- **Durée** : 0.18s
```tsx
<motion.div className="w-10 h-6 rounded-full"
  animate={{ backgroundColor: isOn ? 'var(--primary)' : 'var(--muted)' }}
  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
  <motion.div className="w-5 h-5 rounded-full bg-white"
    animate={{ x: isOn ? 16 : 0 }}
    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} />
</motion.div>
```

### Favoris — Cœur animé
- **Durée** : 0.18s, scale 1→1.22→1 + changement couleur
```tsx
<motion.div
  animate={{ scale: isFav ? [1, 1.22, 1] : 1, color: isFav ? '#ef4444' : '#9ca3af' }}
  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} />
```

### Checkbox — Sélection
- **Durée** : 0.15s, léger scale 1.08
```tsx
<motion.div animate={{ scale: checked ? [1, 1.08, 1] : 1 }}
  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }} />
```

### Swipe — Supprimer / Actions
- **Durée** : 0.22s slide
- Utiliser `drag="x"` de Framer Motion avec `dragConstraints`
```tsx
<motion.div drag="x" dragConstraints={{ left: -56, right: 0 }}
  dragElastic={0.1}
  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />
```

### Badge — Compteur
- **Durée** : scale 1→1.25→1 en 0.33s total
```tsx
<motion.span key={count}
  initial={{ scale: 1 }} animate={{ scale: [1, 1.25, 1] }}
  transition={{ duration: 0.33, ease: [0.16, 1, 0.3, 1] }} />
```

### Quantité — Drum-roll vertical
- **Durée** : 0.18s
```tsx
<AnimatePresence mode="popLayout">
  <motion.span key={quantity}
    initial={{ y: direction > 0 ? 8 : -8, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: direction > 0 ? -8 : 8, opacity: 0 }}
    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} />
</AnimatePresence>
```

### Ripple — Feedback tap
- **Durée** : 0.38s
```tsx
<motion.div className="absolute rounded-full bg-white/20 pointer-events-none"
  initial={{ scale: 0, opacity: 0.22 }}
  animate={{ scale: 3.5, opacity: 0 }}
  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }} />
```

### TODO
- [ ] Ajouter `whileTap={{ scale: 0.97 }}` aux boutons CTA
- [ ] Implémenter le toggle animé (x + backgroundColor)
- [ ] Implémenter le cœur favori (scale keyframes [1, 1.22, 1] + color)
- [ ] Implémenter la checkbox (scale [1, 1.08, 1] + stroke-dashoffset)
- [ ] Implémenter le swipe-to-reveal (drag="x" + constraints)
- [ ] Implémenter le badge compteur (scale pulse via key change)
- [ ] Implémenter le drum-roll vertical (AnimatePresence popLayout)
- [ ] Implémenter le ripple effect (scale 0→3.5 + opacity fade)

---

## ✅ 5. Feedback & États

### Succès — Confirmation
- **Timing** : ring 0.32s + checkmark 0.35s + stagger texte 0.2s
- **Easing** : `[0.16, 1, 0.3, 1]`
```tsx
const successRing: Variants = {
  hidden: { scale: 0.88, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
};
// Checkmark via SVG pathLength
<motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.32 }} />
```

### Erreur — Shake
- **Durée** : 0.36s, 4 oscillations décroissantes
```tsx
<motion.div animate={hasError ? { x: [0, -5, 5, -3, 3, -1, 1, 0] } : { x: 0 }}
  transition={{ duration: 0.36 }} />
```

### Étoiles — Notation
- **Durée** : 0.2s/étoile, stagger 0.1s
```tsx
{[1,2,3,4,5].map((star, i) => (
  <motion.div key={star}
    animate={{ scale: rating >= star ? [1, 1.18, 1] : 1 }}
    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }} />
))}
```

### Progression — Barre
```tsx
<motion.div className="h-1 rounded-full bg-primary"
  animate={{ width: `${progress}%` }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} />
```

### TODO
- [ ] Implémenter le ring de succès (scale 0.88→1 + checkmark pathLength)
- [ ] Implémenter le shake d'erreur (x keyframes oscillantes)
- [ ] Implémenter la notation étoiles (scale + stagger delay)
- [ ] Implémenter la barre de progression animée (width animate)

---

## ⏳ 6. Chargement

### Skeleton — Shimmer
- **Durée** : 1.4s loop, linear
- **Tailwind** (déjà dispo) : `animate-pulse`
```tsx
// Simple — Tailwind built-in :
<div className="animate-pulse bg-muted rounded-xl h-24" />

// Custom shimmer via Framer Motion :
<motion.div className="bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]"
  animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
  transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
```

### Spinner — Rotation
- **Durée** : 0.8s/tour, linear
```tsx
// Tailwind built-in :
<div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />

// Framer Motion :
<motion.div animate={{ rotate: 360 }}
  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
```

### Dots — Traitement
- **Durée** : 1s loop, stagger 0.07s, sine
```tsx
{[0, 1, 2].map(i => (
  <motion.div key={i} className="w-2 h-2 rounded-full bg-foreground"
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 1, repeat: Infinity, ease: [0.37, 0, 0.63, 1], delay: i * 0.07 }} />
))}
```

### Pull to Refresh
- **Durée** : 0.38s content drop
```tsx
<motion.div animate={{ y: isRefreshing ? 5 : 0 }}
  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }} />
```

### TODO
- [ ] Créer composant Skeleton shimmer (gradient animé ou Tailwind pulse)
- [ ] Créer composant Spinner (animate-spin ou rotate: 360)
- [ ] Créer composant LoadingDots (3 dots, translateY bounce, stagger 70ms)
- [ ] Implémenter le pull-to-refresh feedback (content drop 380ms)

---

## 🔔 7. Notifications

### Toast — Confirmation in-app
- **Timing** : entrée 0.3s, pause 3s, sortie 0.25s
```tsx
<motion.div
  initial={{ y: -60, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -60, opacity: 0 }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
/>
// Auto-dismiss via setTimeout(3000) + AnimatePresence
```

### Push — Notification
- **Durée** : 0.32s entrée, 4s affichage
```tsx
<motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
  exit={{ y: -80, opacity: 0 }}
  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
  className="backdrop-blur-xl" />
```

### Badge + Highlight — Notification non lue
- **Durée** : badge 0.22s scale, highlight 1.5s pulse
```tsx
<motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.12, 1] }}
  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} />
// Highlight row pulse via opacity
<motion.div animate={{ backgroundColor: ['rgba(59,130,246,0.05)', 'rgba(59,130,246,0)'] }}
  transition={{ duration: 1.5, ease: [0.37, 0, 0.63, 1] }} />
```

### TODO
- [ ] Vérifier/adapter le Toast existant (ToastContext) avec les timings du design system
- [ ] Implémenter le badge notification (scale [0, 1.12, 1])
- [ ] Implémenter le highlight pulse sur ligne non lue

---

## 🛒 8. E-commerce & Avantages

### Price Strike — Réduction
- **Durée** : 0.25s reveal, stagger 0.25s entre lignes
```tsx
<motion.span initial={{ opacity: 0.14 }} animate={{ opacity: 0.3 }}
  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} />
<motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.25 }} />
```

### Image Zoom — Hero
- **Durée** : 0.4s, scale 1→1.06
```tsx
<motion.img initial={{ scale: 1 }} animate={{ scale: 1.06 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} />
```

### Add to Cart — Élément volant
- **Durée** : fly 0.35s + badge 0.12s
```tsx
<motion.div
  initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
  animate={{ x: cartX, y: cartY, scale: 0.4, opacity: 0 }}
  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }} />
```

### Séquence Avantage → 0€
- **Durée** : 0.28s/étape, stagger 0.12s, 4 étapes
```tsx
const advantageContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
// Étapes : checkbox verte → prix barré → 0€ → message économie
```

### TODO
- [ ] Implémenter le price strike reveal (opacity cascade + stagger)
- [ ] Implémenter le hero zoom (scale 1→1.06)
- [ ] Implémenter le flying element add-to-cart (arc parabolique)
- [ ] Implémenter la séquence avantage (4 étapes stagger 120ms)

---

## 🔐 9. Authentification

### PIN — Saisie code
- **Durée** : 0.15s/point, stagger 0.18s, scale 1→1.08 + color
```tsx
<motion.div key={`dot-${i}-filled`}
  animate={{ scale: [1, 1.08, 1], backgroundColor: '#3b82f6' }}
  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }} />
```

### Face ID — Scan loop
- **Durée** : 2s loop scan, 0.28s succès
```tsx
<motion.div animate={{ scale: [1, 1.2, 1] }}
  transition={{ duration: 2, repeat: Infinity, ease: [0.37, 0, 0.63, 1] }} />
// Succès
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
  className="bg-green-500/20" transition={{ duration: 0.28 }} />
```

### Splash — Logo
- **Durée** : 0.4s, scale 0.88→1 + fade
```tsx
<motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} />
```

### Activation — Steps stagger
- **Durée** : 0.28s/step, stagger 0.08s
```tsx
const stepContainer: Variants = { visible: { transition: { staggerChildren: 0.08 } } };
const step: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};
```

### TODO
- [ ] Implémenter l'animation PIN (scale + color per dot)
- [ ] Implémenter le scan Face ID (pulse ring loop)
- [ ] Implémenter le splash screen (scale 0.88→1 + fade)
- [ ] Implémenter les étapes activation (stagger 80ms)

---

## 📜 10. Scroll & Pages

### Reveal on Scroll — Cascade
- **Durée** : 0.28s/item, stagger 0.08s
- Utiliser `whileInView` de Framer Motion
```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} />
```

### Parallax — Hero
- Utiliser `useScroll` + `useTransform` de Framer Motion
```tsx
const { scrollY } = useScroll();
const bgY = useTransform(scrollY, [0, 300], [0, -180]); // 0.6× speed
const fgY = useTransform(scrollY, [0, 300], [0, 60]);   // 1.2× speed
<motion.img style={{ y: bgY }} />
```

### Header Collapsible
- **Durée** : 0.25s
- **Easing** : `[0.4, 0, 0.2, 1]`
```tsx
const headerHeight = useTransform(scrollY, [0, 40], [52, 32]);
<motion.header style={{ height: headerHeight }}
  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} />
```

### TODO
- [ ] Implémenter le reveal-on-scroll (whileInView + viewport once)
- [ ] Implémenter le parallax (useScroll + useTransform)
- [ ] Implémenter le header collapsible (height animée scroll-linked)

---

## 💎 11. Transitions Premium

### Shared Hero — Liste → Fiche
- **Durée** : 0.38s
- **Easing** : `[0.4, 0, 0.2, 1]`
- Utiliser `layoutId` de Framer Motion
```tsx
// Dans la liste
<motion.img layoutId={`hero-${productId}`} />
// Dans la fiche
<motion.img layoutId={`hero-${productId}`}
  transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }} />
```

### Illustration flottante
- **Durée** : 2.6s loop, sine
```tsx
<motion.div animate={{ y: [0, -7, 0] }}
  transition={{ duration: 2.6, repeat: Infinity, ease: [0.37, 0, 0.63, 1] }} />
```

### E-Ticket — Révélation QR
- **Timing** : ticket 0.38s → scan → QR 0.3s → badge 0.22s
```tsx
// Ticket spring up
<motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }} />
// QR deblur
<motion.div initial={{ filter: 'blur(5px)' }} animate={{ filter: 'blur(0px)' }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.42 }} />
// Badge pop
<motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.15, 1] }}
  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: 0.54 }} />
```

### Confirmation — Célébration
- **Timing** : titre 0.36s → confettis 0.6s → étapes stagger 0.2s
```tsx
// Titre
<motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }} />
// Confettis (6 éléments tombants)
{confetti.map((c, i) => (
  <motion.div key={i}
    initial={{ y: -20, opacity: 1, rotate: 0 }}
    animate={{ y: 200, opacity: 0, rotate: 360 }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }} />
))}
```

### Calendrier — Sélection de date
- **Durée** : date 0.25s (scale 1→1.16→1 + fill), CTA 0.3s (slide up, delay 0.12s)
```tsx
<motion.button animate={{ scale: selected ? [1, 1.16, 1] : 1 }}
  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} />
<motion.div initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.12 }} />
```

### TODO
- [ ] Implémenter le Shared Hero avec layoutId
- [ ] Implémenter l'illustration flottante (y sine loop 2.6s)
- [ ] Implémenter la révélation E-Ticket (spring + blur→net + badge pop)
- [ ] Implémenter la célébration confettis (titre + confetti fall + stagger étapes)
- [ ] Implémenter la sélection date (scale + fill + CTA slide)

---

## Résumé : fichiers à créer

| Fichier | Contenu |
|---------|---------|
| `src/lib/motion-tokens.ts` | Constantes easing arrays, durées en secondes, transitions presets |
| `src/lib/motion-variants.ts` | Variants Framer Motion réutilisables (fadeInUp, scaleIn, stagger, etc.) |

> **Pas de CSS custom properties pour les easings** — Framer Motion utilise des arrays JS `[0.16, 1, 0.3, 1]`, pas des strings `cubic-bezier()`.
> Les classes Tailwind existantes (`animate-pulse`, `animate-spin`, `transition-all`, `duration-300`) restent utilisées pour les transitions CSS simples (hover, focus).
> Le projet a déjà `MotionConfig reducedMotion` et `useLowPowerMotion()` — tous les nouveaux composants héritent automatiquement du respect des préférences utilisateur.
