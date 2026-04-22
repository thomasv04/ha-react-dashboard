# Prompt Copilot — Implémenter le widget AutomationCard

> Copie-colle ce prompt dans Copilot en joignant le fichier `ideas/AUTOMATION_WIDGET.md` comme contexte.

---

## Prompt

Tu es un développeur React Senior spécialisé en TypeScript et React 19. Je te fournis un fichier `AUTOMATION_WIDGET.md` qui contient la spécification complète d'un nouveau widget à implémenter dans mon projet **ha-dashboard**.

### Contexte du projet

- Stack : React 19 + TypeScript + Vite + Tailwind v4 + framer-motion + @hakit/core
- Tous les widgets suivent le même pattern : `useWidgetConfig()` + `useWidgetId()` + `useSafeEntity()`
- Les widgets sont enregistrés dans un catalogue et rendus via un registry type→composant
- Le modal d'édition génère automatiquement les champs depuis les `WIDGET_FIELD_DEFS`

### Règles strictes

- **Suis exactement le pattern** des widgets existants — regarde `AlarmCard` ou `CoverCard` comme référence avant d'écrire quoi que ce soit
- **Avant de modifier un fichier**, lis-le en entier pour comprendre la structure exacte
- **Ne modifie rien d'autre** que ce qui est listé dans la spec
- **Pas de dépendances nouvelles** — tout est déjà disponible
- **Vérifie avec `tsc --noEmit`** après chaque étape

### Ordre d'exécution

Exécute les étapes dans cet ordre précis, et **montre-moi le diff de chaque fichier** avant de passer au suivant :

**Étape 1 — Lire les références**
Lis ces fichiers AVANT d'écrire du code :
- `src/components/cards/AlarmCard/AlarmCard.tsx` (pattern toggle/état)
- `src/types/widget-configs.ts` (structure complète — types + field defs + defaults)
- `src/config/widget-dispositions.ts` (format exact des dispositions)
- `src/context/DashboardLayoutContext.tsx` (WIDGET_CATALOG + SIZE_PRESETS + GridWidget type union)
- Le fichier où le mapping `type → composant` est défini (cherche `WIDGET_COMPONENTS` ou `widgetMap`)

**Étape 2 — Créer le composant**
Crée `src/components/cards/AutomationCard/AutomationCard.tsx` et `src/components/cards/AutomationCard/index.ts` en te basant exactement sur le code de la spec et en alignant le format `callService` sur ce que font les autres cards du projet.

**Étape 3 — Modifier `src/types/widget-configs.ts`**
Ajoute :
- L'interface `AutomationCardConfig`
- `'automation'` dans l'union `WidgetConfig`
- La default config dans `DEFAULT_WIDGET_CONFIGS`
- Les field defs dans `WIDGET_FIELD_DEFS` (avec `domain: 'automation'` sur le champ entityId)

**Étape 4 — Modifier `src/config/widget-dispositions.ts`**
Ajoute l'entrée `automation` avec les tailles de la spec.

**Étape 5 — Modifier `src/context/DashboardLayoutContext.tsx`**
Ajoute :
- `'automation'` dans l'union `GridWidget['type']`
- L'entrée dans `WIDGET_CATALOG`
- L'entrée dans `SIZE_PRESETS` (si ce format est encore utilisé dans ce fichier)

**Étape 6 — Enregistrer dans le widget registry**
Ajoute `AutomationCard` dans le(s) fichier(s) où le mapping type→composant est défini.

**Étape 7 — Validation**
Lance `tsc --noEmit` et corrige toute erreur TypeScript.

### Résultat attendu

À la fin, le widget doit :
- Apparaître dans le catalogue "Ajouter un widget" sous le nom "Automatisation"
- Afficher l'icône + nom + état (Actif/Inactif) + toggle switch
- Toggler l'automatisation au clic via `automation.toggle`
- Être configurable via le modal d'édition (entity picker filtré sur `automation.*`)
- Fonctionner sur les 3 breakpoints (lg/md/sm)
