# Sound Feedback — Proposition

## État actuel

Le système de son existe dans `src/lib/sounds.ts` avec 4 presets synthétisés via Web Audio API :
- **notification** — double ding doux
- **alert** — triple bip urgent
- **success** — carillon ascendant
- **warning** — tonalité basse sourde

Actuellement utilisé **uniquement** dans le `ToastContext` et le `ModalContext` (son joué à l'apparition).

---

## Objectif

Ajouter un retour sonore sur les actions utilisateur dans les widgets, avec un système global, configurable et désactivable.

---

## Actions proposées par widget

### 🔆 LightCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Toggle ON | `toggle_on` | Pip montant lumineux |
| Toggle OFF | `toggle_off` | Pip descendant discret |
| Brightness slider | `brightness_up` / `brightness_down` | Au relâchement du slider |
| Color temp slider | `slider_tick` | Tick léger en fin de drag |

### 🪟 CoverCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Ouverture | `door_open` | Tonalités montantes |
| Fermeture | `door_close` | Descente rapide |
| Stop | `warning` | Interruption |
| Position slider | `slider_tick` | Au relâchement |

### 🌡️ ThermostatCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Température + | `temperature_up` | Pip ascendant rapide |
| Température − | `temperature_down` | Pip descendant rapide |
| Changement mode/preset | `click` | Clic discret |

### 🔥 PelletCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Toggle ON | `toggle_on` | |
| Toggle OFF | `toggle_off` | |
| Température + | `temperature_up` | |
| Température − | `temperature_down` | |

### 🎵 MediaPlayerCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Play | `media_play` | Blip enjoué montant |
| Pause | `media_pause` | Drop doux descendant |
| Next / Previous | `media_next` | Balayage rapide |
| Volume slider | `slider_tick` | Au relâchement |

### 🤖 VacuumCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Start | `vacuum_start` | Ronronnement moteur montant |
| Pause | `media_pause` | |
| Stop | `warning` | Arrêt |
| Return home | `vacuum_dock` | Tonalités descendantes apaisantes |
| Locate | `alert` | Localisation sonore |

### 🚨 AlarmCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Armement (away/home/night) | `arm` | Bips ascendants (tension) |
| Désarmement | `disarm` | Carillon descendant (soulagement) |
| Code PIN invalide | `error` | Buzz dissonant descendant |

### ⚡ AutomationCard / AutomationListCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Toggle ON | `toggle_on` | |
| Toggle OFF | `toggle_off` | |

### 🔘 ButtonCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Appui bouton | `click` | Clic court et discret |
| Appui bouton (avec confirmation) | `alert` | Avant confirmation |

### 🏠 RoomCard / RoomsGrid
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Toggle lumières | `toggle_on` / `toggle_off` | Selon état |

### 📡 SensorCard (entités actionnables)
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Toggle switch/light | `toggle_on` / `toggle_off` | |
| Script / Scene | `click` | |

### 📷 CameraCard
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Changement de flux | `click` | |

### 🔒 Serrures (si entité lock)
| Action | Preset suggéré | Notes |
|--------|---------------|-------|
| Verrouillage | `lock` | Clic métallique solide |
| Déverrouillage | `unlock` | Clic métallique inversé |

---

## Presets disponibles (29 au total)

| Catégorie | Presets |
|-----------|---------|
| UI générique | `notification`, `alert`, `success`, `warning`, `error`, `click`, `pop` |
| Toggle | `toggle_on`, `toggle_off` |
| Alarme | `arm`, `disarm` |
| Slider | `slider_tick` |
| Porte / Serrure | `door_open`, `door_close`, `lock`, `unlock` |
| Détection | `motion` |
| Média | `media_play`, `media_pause`, `media_next` |
| Aspirateur | `vacuum_start`, `vacuum_dock` |
| Climat | `temperature_up`, `temperature_down` |
| Lumière | `brightness_up`, `brightness_down` |
| Environnement | `water`, `battery_low`, `chime` |

> Tous les presets sont synthétisés via Web Audio API (aucun fichier externe).
> Storybook : `UI/Sound Library` pour tester chaque son.

---

## Modifications architecturales nécessaires

### 1. Hook global `useSoundFeedback`

Créer un hook qui centralise la logique sonore et respecte le paramètre utilisateur :

```tsx
// src/hooks/useSoundFeedback.ts
import { useCallback } from 'react';
import { playSound, SoundPreset } from '@/lib/sounds';
import { useThemeContext } from '@/context/ThemeContext'; // ou nouveau SoundContext

export function useSoundFeedback() {
  const { soundEnabled } = useSettings(); // à définir

  const play = useCallback(
    (preset: SoundPreset) => {
      if (soundEnabled) playSound(preset);
    },
    [soundEnabled]
  );

  return { play };
}
```

### 2. Paramètre utilisateur dans les Settings

Ajouter dans la modale Settings une section **Son** :

| Paramètre | Type | Default | Description |
|-----------|------|---------|-------------|
| `soundEnabled` | `boolean` | `false` | Active/désactive tous les sons de feedback |
| `soundVolume` | `number` (0–1) | `0.5` | Volume global (optionnel, V2) |

Le paramètre doit être persisté via le système de settings existant (`useSettingsSync` → `GET/PUT /api/settings/current`).

### 3. Modifier `playSound()` pour supporter le volume global

```ts
// Ajouter un paramètre volume optionnel
export function playSound(sound: SoundPreset | string, volume?: number): void
```

### 4. Intégration dans les widgets

Chaque widget appelle `useSoundFeedback()` et joue le son **après** l'appel service :

```tsx
const { play } = useSoundFeedback();

const handleToggle = () => {
  helpers.callService({ ... });
  play('notification');
};
```

---

## Plan d'implémentation

1. ~~**Ajouter les presets**~~ — ✅ 29 presets dans `src/lib/sounds.ts`
2. ~~**Story Storybook**~~ — ✅ `UI/Sound Library` avec testeur complet
3. **Ajouter le setting** `soundEnabled` dans le ThemeContext/Settings (persisté)
4. **Modifier `playSound()`** pour accepter un volume global
5. **Créer `useSoundFeedback()`** — hook wrapper avec check du setting
6. **Intégrer dans chaque widget** — commencer par Light, Cover, Alarm
7. **Ajouter les clés i18n** pour la section Settings (en + fr)
8. **Tester** — vérifier que `soundEnabled: false` mute tout

---

## Widgets display-only (pas de son)

- GreetingCard
- WeatherCard
- EnergyCard
- TempoCard
- PersonStatusCard
- TemplateCard
- ShortcutsCard (navigation uniquement)

---

## Notes

- Le son par défaut doit être **désactivé** (`soundEnabled: false`) pour ne pas surprendre l'utilisateur
- Les sons des toasts/modals doivent aussi respecter le setting global `soundEnabled`
- Prévoir un cas pour les écrans tactiles muraux (kiosk) où le son peut être utile en permanence
