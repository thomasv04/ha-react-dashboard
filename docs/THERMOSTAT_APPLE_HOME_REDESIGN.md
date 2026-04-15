# ThermostatCard — Redesign Apple Home

> Fichier de spécification technique pour la réécriture du composant `ThermostatCard.tsx`.  
> État actuel : SVG statique, pas d'interaction drag, design basique.  
> Objectif : reproduire fidèlement l'UI du thermostat d'Apple Home avec interaction tactile + animations.

---

## 0. Problèmes actuels

| Problème | Cause |
|---|---|
| Le slider ne fonctionne pas | Aucun gestionnaire d'événement pointer/touch dans le SVG |
| Design générique | Un seul gradient `thermoArcGrad`, pas de zone de rattrapage, curseur basique |
| Typo petite et statique | `fontSize='52'`, pas d'animation au changement de valeur |

---

## 1. Interaction Drag (fix prioritaire)

### État local à ajouter

```tsx
// Valeur locale pendant le drag (non envoyée à HA tant que le doigt n'est pas levé)
const [localTarget, setLocalTarget] = useState<number>(target);
const [isDragging, setIsDragging] = useState(false);
const svgRef = useRef<SVGSVGElement>(null);

// Synchronise localTarget quand target change depuis HA (mais pas pendant le drag)
useEffect(() => {
  if (!isDragging) setLocalTarget(target);
}, [target, isDragging]);
```

### Logique de conversion coordonnées → température

```tsx
/** Convertit un point (x,y) relatif au centre SVG en température */
function coordToTemp(clientX: number, clientY: number): number {
  const svg = svgRef.current;
  if (!svg) return localTarget;

  const rect = svg.getBoundingClientRect();
  // Normalise en coordonnées viewBox (270x270)
  const scaleX = 270 / rect.width;
  const scaleY = 270 / rect.height;
  const x = (clientX - rect.left) * scaleX - CX;
  const y = (clientY - rect.top) * scaleY - CY;

  // Angle clockwise depuis le nord
  const rawDeg = (Math.atan2(x, -y) * 180) / Math.PI;
  const deg = rawDeg < 0 ? rawDeg + 360 : rawDeg;

  // Clamp dans la plage de l'arc [START_DEG, START_DEG + SWEEP_DEG]
  // START_DEG=225°, zone morte entre 135° et 225° (bas de l'arc)
  let normalized: number;
  if (deg >= START_DEG) {
    normalized = deg - START_DEG;
  } else if (deg <= START_DEG - 360 + SWEEP_DEG) {
    normalized = deg + 360 - START_DEG;
  } else {
    return localTarget; // zone morte → ignorer
  }

  const fraction = Math.max(0, Math.min(1, normalized / SWEEP_DEG));
  const step = 0.5; // pas de 0.5°C
  const raw = minT + fraction * (maxT - minT);
  return Math.round(raw / step) * step;
}
```

### Handlers à attacher au SVG

```tsx
function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
  e.currentTarget.setPointerCapture(e.pointerId);
  setIsDragging(true);
  const t = coordToTemp(e.clientX, e.clientY);
  setLocalTarget(t);
}

function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
  if (!isDragging) return;
  const t = coordToTemp(e.clientX, e.clientY);
  setLocalTarget(t);
}

function onPointerUp() {
  if (!isDragging) return;
  setIsDragging(false);
  // Envoie la commande à Home Assistant
  helpers.callService({
    domain: 'climate',
    service: 'set_temperature',
    target: { entity_id: entityId },
    serviceData: { temperature: localTarget },
  });
}
```

### Application sur le SVG

```tsx
<svg
  ref={svgRef}
  viewBox='0 0 270 270'
  className='w-full h-full touch-none cursor-grab active:cursor-grabbing'
  onPointerDown={onPointerDown}
  onPointerMove={onPointerMove}
  onPointerUp={onPointerUp}
  onPointerCancel={onPointerUp}
>
```

> **Important** : `touch-none` (Tailwind) désactive le scroll natif sur la zone SVG, indispensable pour que `setPointerCapture` fonctionne sur mobile.

---

## 2. Dégradés dynamiques Apple Home

### Remplacer `thermoArcGrad` dans `<defs>`

```tsx
<defs>
  {/* Chaleur : rose → orange */}
  <linearGradient id='heatGradient' x1='0%' y1='100%' x2='100%' y2='0%'>
    <stop offset='0%' stopColor='#ff2a5f' />
    <stop offset='100%' stopColor='#ff7b00' />
  </linearGradient>

  {/* Froid : bleu foncé → bleu clair */}
  <linearGradient id='coolGradient' x1='0%' y1='100%' x2='100%' y2='0%'>
    <stop offset='0%' stopColor='#0055ff' />
    <stop offset='100%' stopColor='#00c6ff' />
  </linearGradient>

  {/* Ombre pour le curseur thumb */}
  <filter id='thumbShadow' x='-50%' y='-50%' width='200%' height='200%'>
    <feDropShadow dx='0' dy='2' stdDeviation='4' floodColor='black' floodOpacity='0.3' />
  </filter>
</defs>
```

### Arc actif avec gradient conditionnel

```tsx
<path
  d={arcPath(START_DEG, endDeg)}
  fill='none'
  stroke={isHeating ? 'url(#heatGradient)' : isCooling ? 'url(#coolGradient)' : 'rgba(255,255,255,0.25)'}
  strokeWidth='12'
  strokeLinecap='round'
/>
```

---

## 3. Zone de rattrapage (Catch-up dots)

Affiche un arc en pointillés entre `current` et `target` pour visualiser l'écart à combler.

### Calcul

```tsx
const currentFraction = Math.max(0, Math.min(1, (current - minT) / (maxT - minT)));
const currentDeg = START_DEG + Math.max(1, currentFraction * SWEEP_DEG);
const currentDot = gaugePoint(currentDeg); // petit cercle marqueur

// Arc de rattrapage : du current vers le target (ou l'inverse)
const catchFrom = Math.min(currentDeg, endDeg);
const catchTo   = Math.max(currentDeg, endDeg);
```

### SVG

```tsx
{/* Marqueur de température actuelle */}
<circle cx={currentDot.x} cy={currentDot.y} r='4' fill='rgba(255,255,255,0.5)' />

{/* Arc de rattrapage en pointillés */}
{Math.abs(currentDeg - endDeg) > 2 && (
  <path
    d={arcPath(catchFrom, catchTo)}
    fill='none'
    stroke='white'
    strokeWidth='11'
    strokeLinecap='round'
    strokeDasharray='2 8'
    opacity='0.45'
  />
)}
```

---

## 4. Curseur (Thumb) amélioré

```tsx
{/* Thumb avec filtre d'ombre et rayon plus grand */}
<circle
  cx={dot.x}
  cy={dot.y}
  r='10'
  fill='white'
  filter='url(#thumbShadow)'
  className='transition-all duration-75 ease-linear'
/>
```

- `r='10'` → plus tactile (vs `r='7'`)  
- `filter='url(#thumbShadow)'` → relief Apple  
- `transition-all duration-75` → lisse sans lag visible

---

## 5. Typographie centrale agrandie

```tsx
{/* Label HEAT TO / COOL TO */}
<text x={CX} y={CY - 30} textAnchor='middle' fill='rgba(255,255,255,0.55)' fontSize='12' letterSpacing='2' fontFamily='inherit'>
  {isHeating ? 'HEAT TO' : isCooling ? 'COOL TO' : actionLabel.toUpperCase()}
</text>

{/* Température entière — plus grande */}
<text x={CX} y={CY + 28} textAnchor='middle' fill='white' fontSize='64' fontWeight='700' fontFamily='inherit'>
  {Math.floor(localTarget)}
</text>

{/* °C superscript */}
<text x={CX + 36} y={CY - 8} textAnchor='start' fill='white' fontSize='16' fontWeight='500' fontFamily='inherit'>
  °C
</text>

{/* Décimale */}
<text x={CX + 36} y={CY + 14} textAnchor='start' fill='rgba(255,255,255,0.45)' fontSize='13' fontFamily='inherit'>
  .{Math.round((localTarget - Math.floor(localTarget)) * 10)}
</text>

{/* Température actuelle */}
<text x={CX} y={CY + 50} textAnchor='middle' fill='rgba(255,255,255,0.35)' fontSize='11' fontFamily='inherit'>
  ● {current.toFixed(1)} °C
</text>
```

> Note : utiliser `localTarget` (pas `target`) pour que le chiffre suive le doigt en temps réel.

---

## 6. Animation Odometer (chiffres qui défilent)

### Imports à ajouter

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect } from 'react';
```

### Hook `usePrevious`

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; });
  return ref.current;
}
```

### Sous-composant `AnimatedSvgNumber`

```tsx
interface AnimatedSvgNumberProps {
  value: number;        // valeur entière affichée
  x: number;
  y: number;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
  textAnchor?: 'start' | 'middle' | 'end';
}

function AnimatedSvgNumber({ value, x, y, fontSize = 64, fontWeight = '700', fill = 'white', textAnchor = 'middle' }: AnimatedSvgNumberProps) {
  const prev = usePrevious(value);
  const direction = prev !== undefined && value > prev ? 'up' : 'down';

  const variants = {
    initial: { opacity: 0, y: direction === 'up' ? 22 : -22 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: direction === 'up' ? -22 : 22 },
  };

  return (
    // SVG ne supporte pas foreignObject ici, on utilise un groupe de clipPath
    // Voir implémentation dans la section "Considérations techniques"
    <AnimatePresence mode='popLayout'>
      <motion.text
        key={value}
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill={fill}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontFamily='inherit'
        variants={variants}
        initial='initial'
        animate='animate'
        exit='exit'
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {value}
      </motion.text>
    </AnimatePresence>
  );
}
```

### Considérations techniques SVG + framer-motion

- `motion.text` est supporté par framer-motion (SVG elements).  
- L'attribut `y` dans les variants anime la propriété SVG `y` (translateY via transform). Attention : certains navigateurs traitent `y` comme attribut de position et non comme transform — préférer `style={{ translateY: ... }}` si l'animation ne fonctionne pas.  
- Alternative robuste : wrapper dans un `<g transform="translate(x, y)">` et animer le `<g>` avec `motion.g` sur `y`.  
- Ajouter un `<clipPath>` autour de la zone centrale pour éviter que les chiffres sortants ne débordent sur l'arc.

### Clippath pour masquer le débordement

```tsx
<defs>
  {/* ... gradients ... */}
  <clipPath id='centerClip'>
    <circle cx={CX} cy={CY} r='80' />
  </clipPath>
</defs>

{/* Zone centrale clippée */}
<g clipPath='url(#centerClip)'>
  <AnimatedSvgNumber value={Math.floor(localTarget)} x={CX} y={CY + 28} />
  {/* texte °C et décimale (non animés, stables) */}
</g>
```

---

## 7. Plan d'implémentation (ordre recommandé)

```
[ ] 1. Ajouter useState/useRef pour localTarget, isDragging, svgRef
[ ] 2. Implémenter coordToTemp()
[ ] 3. Attacher les handlers pointer au SVG (onPointerDown/Move/Up/Cancel)
[ ] 4. Tester le drag → vérifier que localTarget suit le doigt
[ ] 5. Remplacer thermoArcGrad par heatGradient + coolGradient + thumbShadow filter
[ ] 6. Mettre à jour le stroke de l'arc actif
[ ] 7. Calculer currentDeg + currentDot
[ ] 8. Ajouter l'arc de rattrapage en pointillés
[ ] 9. Mettre à jour le thumb (r=10, filter, transition)
[ ] 10. Agrandir la typo centrale (fontSize=64, localTarget)
[ ] 11. Coder usePrevious + AnimatedSvgNumber
[ ] 12. Remplacer les <text> tempInt/tempDec par AnimatedSvgNumber
[ ] 13. Ajouter clipPath centerClip
[ ] 14. Tests Storybook + test sur mobile (touch)
```

---

## 8. Fichier à modifier

- `src/components/cards/ThermostatCard/ThermostatCard.tsx` — toutes les modifications ci-dessus

Aucun nouveau fichier nécessaire (usePrevious et AnimatedSvgNumber peuvent rester dans le même fichier, au-dessus du composant principal).
