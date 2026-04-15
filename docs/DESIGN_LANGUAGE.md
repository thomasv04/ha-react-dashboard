# Design Language — ThermostatCard comme référence

> Analyse du gap de design entre le ThermostatCard et les autres widgets, avec recommandations concrètes.

---

## 1. Ce qui rend le ThermostatCard excellent

### 1.1 Visualisation SVG custom avec gradient multi-stop

Le thermostat utilise une jauge circulaire SVG avec un dégradé 4 couleurs (bleu → cyan → jaune → orange) au lieu d'un simple nombre ou d'une barre plate.

```tsx
// Gradient multi-stop qui donne de la profondeur visuelle
<linearGradient id='tempGradient' gradientUnits='userSpaceOnUse' x1='17' y1='0' x2='253' y2='0'>
  <stop offset='0%'   stopColor='#1a56ff' />
  <stop offset='28%'  stopColor='#00c6ff' />
  <stop offset='65%'  stopColor='#fbbf24' />
  <stop offset='100%' stopColor='#ff7b00' />
</linearGradient>

// Track d'arrière-plan (fantôme) + arc actif
<path d={arcPath(START_DEG, START_DEG + SWEEP_DEG)} stroke='url(#tempGradient)' opacity='0.15' />
<path d={arcPath(START_DEG, endDeg)}                stroke='url(#tempGradient)' />
```

**Pattern clé** : Toujours avoir un "track" fantôme (opacity 0.15) derrière l'élément actif pour donner un contexte visuel de la plage complète.

### 1.2 Digits animés individuellement (slot machine)

Chaque chiffre a sa propre animation de slide up/down avec des ressorts physiques :

```tsx
function AnimatedDigit({ digit, x, y, ... }) {
  const prev = usePrevious(digit);
  const direction = prev !== undefined && digit > prev ? 'up' : 'down';

  return (
    <AnimatePresence mode='sync'>
      <motion.g
        key={digit}
        initial={{ opacity: 0, translateY: direction === 'up' ? 22 : -22 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0, translateY: direction === 'up' ? -22 : 22 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <text ...>{digit}</text>
      </motion.g>
    </AnimatePresence>
  );
}
```

**Pattern clé** : `usePrevious` + direction conditionnelle. Les chiffres montent quand la valeur augmente, descendent quand elle diminue.

### 1.3 Boutons glass-morphism avec état actif riche

Les presets (Power, Home, Sun, Moon) ont un traitement visuel haut de gamme :

```tsx
// État actif : gradient + bordure + double shadow (inset + drop)
isActive
  ? 'bg-gradient-to-br from-white/5 to-white/20 border border-white/30 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.3),2px_2px_6px_rgba(0,0,0,0.2)]'
  : 'bg-gradient-to-br from-black/10 to-black/20 border border-transparent hover:border-white/10'
```

**Pattern clé** : L'état actif combine 3 couches — gradient subtil + bordure semi-transparente + ombre double (inset pour la lumière intérieure + drop pour la profondeur).

### 1.4 Feedback d'interaction riche

- **Pointer capture** pour le drag fluide (pas de saut quand la souris sort de la zone)
- **Curseur animé** avec filtre d'ombre SVG (`feDropShadow`)
- **Dots de rattrapage** entre la temp actuelle et la cible

```tsx
// Curseur avec ombre
<filter id='thumbShadow'><feDropShadow dx='0' dy='2' stdDeviation='4' floodOpacity='0.3' /></filter>
<motion.circle cx={dot.x} cy={dot.y} r='10' fill='white' filter='url(#thumbShadow)' />

// Dots de trajectoire
{endDeg > currentDeg && (() => {
  const dots = [];
  for (let deg = currentDeg + 10; deg < endDeg - 5; deg += 10) {
    const pt = gaugePoint(deg);
    dots.push(<circle cx={pt.x} cy={pt.y} r='3.5' fill='white' opacity='0.65' />);
  }
  return <>{dots}</>;
})()}
```

### 1.5 Hiérarchie typographique SVG

4 niveaux visuels dans le centre de la jauge :
1. **Label d'action** : `fontSize='11'` + `letterSpacing='2'` + `opacity='0.55'` (CHAUFFER À)
2. **Température cible** : `fontSize='64'` + `fontWeight='700'` (21.0)
3. **Unité** : `fontSize='16'` + `fontWeight='500'` (°C)
4. **Température actuelle** : `fontSize='11'` + `opacity='0.35'` (● 19.5 °C)

---

## 2. Audit des autres widgets — Niveau de polish actuel

| Widget | Score | Forces | Faiblesses |
|--------|-------|--------|------------|
| **ThermostatCard** | ⭐⭐⭐⭐⭐ | Jauge SVG, animations, gradients, interaction drag | — (référence) |
| **CameraCard** | ⭐⭐⭐⭐ | Feed + overlay badges, sélecteur stylé | Peu d'animations, pas de transitions de vue |
| **AlarmCard** | ⭐⭐⭐½ | Status pill coloré, numpad, expand/collapse | Numpad plat, pas de visual feedback sur le code |
| **WeatherCard** | ⭐⭐⭐ | Layout clair, 4-day forecast | Icônes lucide basiques, zéro gradient, tout est plat |
| **TempoCard** | ⭐⭐⭐ | Bonne utilisation des couleurs de tarif | Pas de visualisation, juste des pills |
| **ShortcutsCard** | ⭐⭐⭐ | Grid colorée, bonne iconographie | Boutons sans depth, pas de glass-morphism |
| **PelletCard** | ⭐⭐½ | Toggle ON/OFF | Juste du texte + boutons +/-, aucune visualisation |
| **LightCard** | ⭐⭐½ | Slider fonctionnel, glow ambre | Range input natif HTML, pas de custom control |
| **EnergyCard** | ⭐⭐½ | Barre batterie animée | Layout plat, pas de visual flow |
| **CoverCard** | ⭐⭐½ | Slider vertical créatif | Rendu brut, boutons sans style |
| **SensorCard** | ⭐⭐ | Threshold colors, toggle | Complètement générique, aucun visuel |
| **TemplateCard** | ⭐⭐ | Flexible | Visuellement vide, carte placeholder |
| **GreetingCard** | ⭐⭐ (volontaire) | Minimalisme assumé | — (OK tel quel) |

---

## 3. Recommandations par widget — Du plus impactant au moins

### 3.1 🔥 PelletCard — Le jumeau manqué du ThermostatCard

**Problème** : Le PelletCard contrôle un `climate.pellet`, exactement comme le Thermostat, mais il affiche juste `23°` en gros avec des boutons +/- basiques. Le contraste est choquant.

**Avant** (code actuel) :
```tsx
// Juste un gros chiffre et des boutons ronds
<div className='text-5xl font-bold text-white'>
  {targetTemp !== undefined ? `${targetTemp}°` : '—'}
</div>
<div className='flex items-center justify-center gap-4'>
  <motion.button onClick={() => setTemp(-0.5)} className='w-10 h-10 rounded-full gc-btn'>
    <Minus size={16} />
  </motion.button>
  <motion.button onClick={() => setTemp(0.5)} className='w-10 h-10 rounded-full bg-orange-500/20'>
    <Plus size={16} />
  </motion.button>
</div>
```

**Recommandation** : Réutiliser une mini-jauge linéaire SVG ou arc partiel avec le même système de gradient, et remplacer les +/- par un drag sur la jauge.

```tsx
// Mini jauge horizontale avec gradient orange/rouge
<svg viewBox="0 0 200 40">
  <defs>
    <linearGradient id="pelletGrad">
      <stop offset="0%" stopColor="#f97316" />
      <stop offset="100%" stopColor="#ef4444" />
    </linearGradient>
  </defs>
  {/* Track fantôme */}
  <rect x="10" y="14" width="180" height="12" rx="6" fill="url(#pelletGrad)" opacity="0.15" />
  {/* Barre active */}
  <rect x="10" y="14" width={fraction * 180} height="12" rx="6" fill="url(#pelletGrad)" />
  {/* Curseur */}
  <circle cx={10 + fraction * 180} cy="20" r="8" fill="white" filter="url(#thumbShadow)" />
</svg>
```

### 3.2 💡 LightCard — Slider circulaire au lieu du `<input type=range>`

**Problème** : Le slider de luminosité est un `<input type="range">` HTML natif avec du CSS custom. Ça fonctionne mais ça casse complètement l'esthétique glass-morphism.

**Avant** (code actuel) :
```tsx
<input
  type="range" min={1} max={100}
  className="w-full h-1.5 rounded-full appearance-none
    [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
    [&::-webkit-slider-thumb]:rounded-full
    [&::-webkit-slider-thumb]:bg-amber-400"
  style={{ background: `linear-gradient(to right, rgba(251,191,36,0.5) 0%, ...)` }}
/>
```

**Recommandation** : SVG arc ou barre custom avec le même pattern que le thermostat — track fantôme + barre active + curseur avec shadow.

```tsx
// Barre de luminosité SVG style thermostat
<svg viewBox="0 0 200 24" className="w-full touch-none">
  <defs>
    <linearGradient id="brightnessGrad">
      <stop offset="0%" stopColor="rgba(251,191,36,0.3)" />
      <stop offset="100%" stopColor="#fbbf24" />
    </linearGradient>
    <filter id="lightThumb">
      <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#fbbf24" floodOpacity="0.4" />
    </filter>
  </defs>
  <rect x="4" y="8" width="192" height="8" rx="4" fill="white" opacity="0.08" />
  <rect x="4" y="8" width={pct * 1.92} height="8" rx="4" fill="url(#brightnessGrad)" />
  <circle cx={4 + pct * 1.92} cy="12" r="7" fill="#fbbf24" filter="url(#lightThumb)" />
</svg>
```

**Bonus** : Ajouter un halo lumineux derrière l'icône ampoule quand elle est ON, proportionnel à la brightness :
```tsx
<div style={{
  boxShadow: isOn ? `0 0 ${brightness / 3}px rgba(251,191,36,${brightness / 200})` : 'none'
}}>
  <Lightbulb />
</div>
```

### 3.3 ⚡ EnergyCard — Flow animé avec SVG

**Problème** : Juste du texte et une barre de progression CSS basique. Aucune notion de "flux" d'énergie.

**Avant** :
```tsx
// Barre CSS plate
<div className='w-32 h-2 bg-white/8 rounded-full'>
  <motion.div animate={{ width: `${level}%` }}
    className={`h-full rounded-full ${level > 60 ? 'bg-green-500' : ...}`} />
</div>
```

**Recommandation** : Batterie SVG stylisée + animation de particules pour le flux.

```tsx
// Icône batterie SVG avec remplissage gradienté
<svg viewBox="0 0 48 80">
  <defs>
    <linearGradient id="battGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stopColor={level > 60 ? '#22c55e' : level > 25 ? '#eab308' : '#ef4444'} />
      <stop offset="100%" stopColor={level > 60 ? '#4ade80' : level > 25 ? '#fbbf24' : '#f87171'} />
    </linearGradient>
  </defs>
  {/* Contour batterie */}
  <rect x="8" y="0" width="32" height="8" rx="2" fill="white" opacity="0.3" />
  <rect x="2" y="8" width="44" height="68" rx="6" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
  {/* Remplissage */}
  <rect x="5" y={11 + (1 - level/100) * 62} width="38" height={level/100 * 62} rx="4" fill="url(#battGrad)" />
</svg>
```

### 3.4 🪟 CoverCard — Visualisation de volet réaliste

**Problème** : Le slider vertical avec des "slats" est créatif mais les traits `h-px bg-blue-400/30` sont trop basiques, et les boutons ↑□↓ n'ont aucun style.

**Avant** :
```tsx
// Boutons plats sans glass-morphism
<button className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center">
  <ChevronUp size={18} className="text-white/60" />
</button>
```

**Recommandation** : 
1. Appliquer le pattern glass-morphism du thermostat aux boutons
2. Ajouter un gradient bleu subtil quand le volet est ouvert

```tsx
// Boutons style thermostat
<motion.button
  whileHover={{ scale: 1.06 }}
  whileTap={{ scale: 0.94 }}
  className={cn(
    'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
    'bg-gradient-to-br from-white/5 to-white/15 border border-white/10',
    'hover:border-white/25 hover:shadow-[inset_1px_1px_3px_rgba(255,255,255,0.15)]'
  )}
>
  <ChevronUp size={18} className="text-white/70" />
</motion.button>
```

### 3.5 🌤️ WeatherCard — Ajouter du depth visuel

**Problème** : Tout est du texte plat avec des icônes Lucide monochromes. Aucun gradient, aucune profondeur.

**Recommandation** : 
1. Gradient subtil sur la température principale
2. Ligne séparatrice avec glow au lieu du `h-px bg-white/6`
3. Icônes forecast avec un petit cercle coloré derrière

```tsx
// Température avec gradient text
<div className='text-5xl font-light tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent'>
  {temp}°
</div>

// Séparateur avec glow
<div className='h-px bg-gradient-to-r from-transparent via-white/15 to-transparent' />

// Icônes forecast avec halo
<div className='w-8 h-8 rounded-full bg-white/5 flex items-center justify-center'>
  <WeatherIcon condition={day.condition} size={16} />
</div>
```

### 3.6 🔔 AlarmCard — Numpad premium

**Problème** : Le numpad utilise `gc-btn` basique, le champ de code est trop simple.

**Recommandation** :
```tsx
// Bouton numpad avec feedback tactile
<motion.button
  whileTap={{ scale: 0.93 }}
  className='h-11 rounded-xl text-sm font-semibold text-white
    bg-gradient-to-br from-white/5 to-white/10 border border-white/8
    active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
    transition-all duration-150'
>

// Code dots animés au lieu du texte masqué
{Array.from({ length: 8 }).map((_, i) => (
  <motion.div
    key={i}
    animate={{ scale: i < code.length ? 1 : 0.5, opacity: i < code.length ? 1 : 0.2 }}
    className={cn('w-3 h-3 rounded-full', i < code.length ? 'bg-white' : 'bg-white/20')}
  />
))}
```

### 3.7 📊 SensorCard — Mini sparkline ou gauge

Pour les capteurs numériques, ajouter un indicateur visuel compact :

```tsx
// Mini arc de gauge (90°) pour valeurs numériques
<svg viewBox="0 0 40 24" className="w-10 h-6 mt-1">
  <path d="M 4 20 A 16 16 0 0 1 36 20" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="3" strokeLinecap="round" />
  <path d={miniArc(fraction)} fill="none" stroke={thresholdColor ?? 'white'} strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
</svg>
```

---

## 4. Patterns réutilisables à extraire

### 4.1 Hook `usePrevious` (déjà dans ThermostatCard, à mutualiser)

```tsx
// src/hooks/usePrevious.ts
import { useRef, useEffect } from 'react';
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}
```

### 4.2 Composant bouton glass-morphism réutilisable

```tsx
// src/components/ui/GlassButton.tsx
interface GlassButtonProps {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function GlassButton({ active, children, onClick, className }: GlassButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-[15px] transition-all duration-200',
        active
          ? 'bg-gradient-to-br from-white/5 to-white/20 border border-white/30 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.3),2px_2px_6px_rgba(0,0,0,0.2)]'
          : 'bg-gradient-to-br from-black/10 to-black/20 border border-transparent hover:border-white/10',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
```

### 4.3 SVG Slider réutilisable (horizontal)

```tsx
// src/components/ui/SvgSlider.tsx — barre avec track fantôme + curseur + shadow
interface SvgSliderProps {
  value: number;        // 0-1
  gradientId: string;
  gradientStops: { offset: string; color: string }[];
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}
```

---

## 5. Priorités d'implémentation

| Priorité | Widget | Effort | Impact visuel |
|----------|--------|--------|---------------|
| 🔴 P0 | **PelletCard** — mini jauge arc + design thermostat-like | Moyen | ⭐⭐⭐⭐⭐ |
| 🔴 P0 | **LightCard** — SVG slider + halo lumineux | Moyen | ⭐⭐⭐⭐ |
| 🟡 P1 | **CoverCard** — glass buttons + gradient volet | Faible | ⭐⭐⭐ |
| 🟡 P1 | **EnergyCard** — batterie SVG + flow animé | Moyen | ⭐⭐⭐⭐ |
| 🟡 P1 | **WeatherCard** — gradient text + séparateur glow + halos | Faible | ⭐⭐⭐ |
| 🟢 P2 | **AlarmCard** — numpad glass + code dots animés | Faible | ⭐⭐½ |
| 🟢 P2 | **SensorCard** — mini gauge arc | Faible | ⭐⭐ |
| ⚪ Skip | **GreetingCard** — minimalisme volontaire, OK tel quel | — | — |
| ⚪ Skip | **CameraCard** — déjà bien, petits tweaks possibles | — | — |
| ⚪ Skip | **TemplateCard** — générique par nature | — | — |

---

## 6. Résumé des tokens de design du Thermostat à propager

| Token | Valeur | Usage |
|-------|--------|-------|
| **Glass active** | `from-white/5 to-white/20 border-white/30 shadow-[inset+drop]` | Boutons, pills, badges actifs |
| **Glass inactive** | `from-black/10 to-black/20 border-transparent` | État de repos |
| **Track fantôme** | `opacity='0.15'` sur le même gradient | Contexte visuel de la plage |
| **Curseur** | `fill='white' r='10'` + `feDropShadow` | Thumb de slider |
| **Spring animation** | `stiffness: 400, damping: 30` | Transitions de valeurs |
| **Label spacing** | `letterSpacing='2'` + uppercase | Sous-titres, labels d'état |
| **Séparateur** | `bg-gradient-to-r from-transparent via-white/15 to-transparent` | Remplace `h-px bg-white/6` |
