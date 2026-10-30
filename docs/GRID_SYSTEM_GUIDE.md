# Panneaux et tuiles

Depuis la 4.0, une page n'est plus une grille libre en coordonnées : c'est une
suite de **panneaux**, côte à côte comme sur l'Echo Show.

## Le modèle

```ts
interface DashboardLayout {
  panels: LayoutPanel[];
}

interface LayoutPanel {
  id: string;
  title?: string;
  cols: number;     // largeur, en colonnes de la trame (2 à 12)
  below?: boolean;  // rangé sous le panneau précédent, dans sa colonne
  widgets: GridWidget[]; // dans l'ordre où ils se rangent
}

interface GridWidget {
  id: string;
  type: ManifestWidgetType;
  w: number; // colonnes
  h: number; // rangées
  disposition?: string;
  pos?: FloorplanPos; // page Plan uniquement
}
```

Pas de `x`/`y` : une tuile prend sa place d'après son rang, en `grid-auto-flow:
row dense`. Une seule disposition pour toutes les tailles d'écran ; sous 768 px
les panneaux s'empilent, et une tuile plus large que l'écran est ramenée à la
largeur disponible.

## La trame

Fixe, dans `src/lib/panel-grid.ts` : colonnes de 96 px, rangées de 80 px,
gouttière de 16 px. Ce n'est plus un réglage. Les tailles des manifestes
(`defaultSize.lg`, `minSize.lg`, `sizePresets.lg`) s'expriment dans cette trame.

## Les dispositions d'avant la 4.0

`toPanelLayout()` convertit au chargement (serveur, cache, écran de veille) :
la grille `lg` devient un panneau de 12 colonnes, dans l'ordre de lecture.

## Édition

- crayon de la barre : toute la page ;
- ✎ d'un panneau : ce panneau seul (`editPanelId`) ;
- ⚙ d'un panneau : titre, largeur, « sous le précédent », ordre, suppression.

Le déplacement des tuiles passe par les événements pointeur, pour marcher au
doigt sur une tablette murale.
