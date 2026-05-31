# Config String — Export / Import

Le dashboard permet d'**exporter** et d'**importer** toute la configuration via une chaîne de caractères unique. Cela facilite la sauvegarde, le partage entre appareils ou la restauration rapide d'une configuration.

## Fonctionnement

### Export

1. Aller dans **Paramètres → Système**
2. Cliquer sur **Générer la chaîne**
3. La chaîne apparaît dans un champ texte — la copier avec le bouton **Copier** ou en sélectionnant le texte

La chaîne contient :
- **Thème** : thème actif, fond d'écran, opacité des cartes, performance, auto jour/nuit, disposition (gap, rayon, hauteur)
- **Dashboard** : pages, layouts (positions des widgets par breakpoint), configs des widgets, wall panel, panneaux personnalisés

### Import

1. Aller dans **Paramètres → Système**
2. Coller la chaîne dans le champ d'import
3. Cliquer sur **Importer**
4. Une confirmation est demandée (la config actuelle sera écrasée)
5. Cliquer à nouveau sur **Confirmer l'import**

## Format de la chaîne

```
HADASH2:<base64>
```

- Préfixe `HADASH2:` — identifie le format et la version
- Contenu : JSON → UTF-8 → **deflate-raw** (compression native `CompressionStream`) → base64
- La compression réduit significativement la taille de la chaîne par rapport à du base64 brut
- Aucune dépendance externe — utilise les API natives du navigateur

### Structure JSON

```json
{
  "v": 1,
  "theme": {
    "themeId": "dark",
    "background": { "mode": "solid" },
    "cardOpacity": 0.12,
    "perfSettings": {
      "reduceBlur": false,
      "reduceAnimations": false,
      "disableShadows": false,
      "disableModalAnimation": false
    },
    "autoTheme": {
      "enabled": false,
      "lightTheme": "light",
      "darkTheme": "dark"
    },
    "layoutSettings": {
      "gridGap": 16,
      "cardRadius": 24,
      "rowHeight": 80
    }
  },
  "dashboard": {
    "version": 2,
    "pages": [...],
    "layouts": { ... },
    "widgetConfigs": { ... },
    "wallPanel": { ... },
    "customPanels": [...]
  }
}
```

## Erreurs possibles à l'import

| Code | Message |
|------|---------|
| `INVALID_PREFIX` | La chaîne ne commence pas par `HADASH2:` |
| `INVALID_BASE64` | Le contenu base64 est corrompu |
| `INVALID_COMPRESSED` | La décompression deflate a échoué |
| `INVALID_JSON` | Le JSON décodé est invalide |
| `INVALID_VERSION` | La version du snapshot n'est pas supportée |
| `MISSING_DATA` | Les données `theme` ou `dashboard` sont absentes |

## Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `src/lib/config-string.ts` | Fonctions `encodeConfig()` / `decodeConfig()` (async) |
| `src/lib/config-string.test.ts` | 17 tests (round-trip, erreurs, unicode, compression) |
| `src/components/layout/ThemeControlsModal/SystemSection.tsx` | UI export/import dans les paramètres |
| `src/i18n/locales/en/settings.json` | Traductions anglaises |
| `src/i18n/locales/fr/settings.json` | Traductions françaises |

## Utilisation programmatique

```ts
import { encodeConfig, decodeConfig, type ConfigSnapshot } from '@/lib/config-string';

// Export (async — utilise CompressionStream natif)
const snapshot: ConfigSnapshot = {
  v: 1,
  theme: { themeId, background, cardOpacity, perfSettings, autoTheme, layoutSettings },
  dashboard: { version: 2, pages, layouts, widgetConfigs, wallPanel, customPanels },
};
const str = await encodeConfig(snapshot);   // → "HADASH2:eNqrVi..."

// Import (async)
const restored = await decodeConfig(str);   // → ConfigSnapshot
// restored.theme   → paramètres de thème
// restored.dashboard → config du dashboard
```
