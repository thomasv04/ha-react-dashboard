import type { TourId } from '@/components/onboarding/TourOverlay';

export interface ReleaseNoteItem {
  /** Texte libre — pas de clé i18n : ces notes sont datées, pas traduites. */
  text: string;
  /** Ouvre la visite guidée correspondante depuis la note. */
  tour?: TourId;
  /** Illustration : chemin servi tel quel (mettre le fichier dans `public/`). */
  image?: string;
}

export interface ReleaseNote {
  version: string;
  /** ISO `YYYY-MM-DD`, affichée telle quelle. */
  date: string;
  title: string;
  items: ReleaseNoteItem[];
}

/**
 * Notes de version, **la plus récente en premier**.
 *
 * C'est cette liste qui pilote la fenêtre « Nouveautés » : au chargement, la
 * version de `RELEASE_NOTES[0]` est comparée à celle que l'appareil a déjà vue.
 * Pas de numéro de build injecté au compilateur — ajouter une entrée ici suffit
 * à déclencher l'annonce, et rien ne peut désynchroniser les deux.
 */
export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '2.1.3',
    date: '2026-08-14',
    title: 'Vos widgets dans les panneaux',
    items: [
      {
        text: "Un panneau peut désormais embarquer n'importe quelle card du dashboard — caméra, lumière, capteur, thermostat, énergie. Les blocs existants agissaient sans rien afficher : plus d'état, plus d'image, plus de courbe dans un panneau.",
        tour: 'panels',
      },
      {
        text: "Le panneau ne s'affichait plus du tout depuis la 2.1.1 : l'abonnement aux modales envoyées par Home Assistant plantait au montage. Corrigé.",
      },
      {
        text: 'Les écritures partagées — configuration, profils, traductions, fichiers — sont réservées aux administrateurs. Les réglages propres à un appareil (thème, performances) restent accessibles à tous.',
      },
      {
        text: "L'écran de chargement propose enfin de réessayer au lieu de tourner indéfiniment quand la connexion à Home Assistant se bloque.",
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-08-14',
    // Doit rester aligné sur le tag publié : `npm run create-tag` compare les
    // deux et prévient si elles divergent.
    title: 'Un dashboard qui part de zéro',
    items: [
      {
        text: "Les sept panneaux intégrés — lumières, volets, sécurité, aspirateur, plantes, caméras, notifications — ont disparu : ils étaient câblés sur les entités d'une seule maison. Composez les vôtres par blocs, puis ajoutez-les au dock.",
        tour: 'panels',
      },
      {
        text: "Le dock du bas ne liste plus que vos panneaux. Il reste invisible tant que vous n'en avez ajouté aucun.",
      },
      {
        text: 'Une visite guidée démarre au premier lancement, et un bouton « ? » en mode édition ouvre les visites par thème.',
        tour: 'basics',
      },
      {
        text: "Les fiches « plus d'infos » et les réglages reprennent le verre du reste du dashboard. Les barres de défilement sont fines et translucides.",
      },
      {
        text: "Régler la jauge d'un thermostat n'ouvre plus la fiche « plus d'infos » en plein geste.",
      },
    ],
  },
];
