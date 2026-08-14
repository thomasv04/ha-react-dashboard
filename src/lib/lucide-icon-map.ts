/**
 * Résolution des icônes Lucide par nom (chaînes PascalCase venues de la config).
 *
 * L'ancienne version faisait `import * as allIcons from 'lucide-react'` puis
 * `Object.entries` dessus. Le commentaire affirmait que le tree-shaking
 * survivait : c'est faux — énumérer le module force chaque icône dans le
 * bundle. Résultat mesuré : 584 ko, soit 47 % des 1243 ko préchargés au
 * démarrage, pour afficher une dizaine d'icônes.
 *
 * Désormais deux niveaux :
 *
 * 1. {@link CORE} — les icônes que l'application elle-même utilise, importées
 *    nommément donc réellement tree-shakées. Elles résolvent de façon
 *    synchrone, sans rien télécharger.
 * 2. Le catalogue complet, chargé **à la demande** : quand l'utilisateur ouvre
 *    le sélecteur d'icônes, ou quand il a choisi une icône hors du noyau. Les
 *    composants concernés s'abonnent via {@link useIconCatalog} et se
 *    re-rendent une fois le catalogue arrivé. Entre-temps ils affichent leur
 *    icône de repli, comme ils le faisaient déjà pour un nom inconnu.
 */
import { useSyncExternalStore } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlarmSmoke,
  Armchair,
  Bath,
  BedDouble,
  Bell,
  Blinds,
  BriefcaseBusiness,
  Camera,
  Car,
  ChefHat,
  Clock,
  Cloud,
  Cpu,
  DoorOpen,
  Droplets,
  Fan,
  Flame,
  Flower2,
  Gauge,
  Home,
  Image,
  LayoutGrid,
  Leaf,
  Lightbulb,
  Lock,
  Monitor,
  Moon,
  Music,
  Package,
  Play,
  Plug,
  Power,
  Refrigerator,
  Router,
  Settings,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Sofa,
  Speaker,
  Sun,
  Thermometer,
  Timer,
  Tv,
  UtensilsCrossed,
  Video,
  Wind,
  Zap,
} from 'lucide-react';
import { assetUrl } from '@/lib/api-base';

/** Icônes embarquées : celles que l'application référence par défaut. */
const CORE: Record<string, LucideIcon> = {
  Activity,
  AlarmSmoke,
  Armchair,
  Bath,
  BedDouble,
  Bell,
  Blinds,
  BriefcaseBusiness,
  Camera,
  Car,
  ChefHat,
  Clock,
  Cloud,
  Cpu,
  DoorOpen,
  Droplets,
  Fan,
  Flame,
  Flower2,
  Gauge,
  Home,
  Image,
  LayoutGrid,
  Leaf,
  Lightbulb,
  Lock,
  Monitor,
  Moon,
  Music,
  Package,
  Play,
  Plug,
  Power,
  Refrigerator,
  Router,
  Settings,
  Shield,
  ShieldCheck,
  ShieldHalf,
  Sofa,
  Speaker,
  Sun,
  Thermometer,
  Timer,
  Tv,
  UtensilsCrossed,
  Video,
  Wind,
  Zap,
};

// ── Catalogue complet, à la demande ──────────────────────────────────────────

let fullMap: Record<string, LucideIcon> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
/** Change d'identité à chaque chargement : sert d'instantané au store. */
let revision = 0;

function isIconComponent(mod: unknown): boolean {
  return mod != null && (typeof mod === 'function' || (typeof mod === 'object' && '$$typeof' in (mod as object)));
}

/** Déclenche le téléchargement du catalogue, une seule fois. */
export function loadIconCatalog(): Promise<void> {
  if (fullMap) return Promise.resolve();
  if (!loading) {
    loading = import('lucide-react').then(mod => {
      const map: Record<string, LucideIcon> = {};
      for (const [name, value] of Object.entries(mod)) {
        if (/^[A-Z]/.test(name) && isIconComponent(value)) map[name] = value as LucideIcon;
      }
      fullMap = map;
      revision++;
      listeners.forEach(l => l());
    });
  }
  return loading;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * À appeler dans tout composant qui affiche une icône **choisie par
 * l'utilisateur** : il se re-rendra quand le catalogue complet sera disponible.
 * Sans cet abonnement, une icône hors du noyau resterait sur son repli.
 */
export function useIconCatalog(): number {
  return useSyncExternalStore(
    subscribe,
    () => revision,
    () => revision
  );
}

/** Liste triée de tous les noms — attend le catalogue complet. */
export function getIconNames(): string[] {
  return fullMap ? Object.keys(fullMap).sort() : Object.keys(CORE).sort();
}

/** Résout un nom d'icône, ou `undefined` — les appelants ont tous un repli. */
export function resolveIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  // Les icônes téléversées commencent par "custom:" — pas du Lucide.
  if (name.startsWith('custom:')) return undefined;
  if (CORE[name]) return CORE[name];
  if (fullMap) return fullMap[name];
  // Nom hors du noyau : on récupère le catalogue et le composant abonné se
  // re-rendra. D'ici là, il affiche son icône de repli.
  void loadIconCatalog();
  return undefined;
}

/** Vrai si la valeur désigne une icône téléversée. */
export function isCustomIcon(name: string | undefined): boolean {
  return !!name && name.startsWith('custom:');
}

/** URL d'une icône téléversée (retire le préfixe « custom: »). */
export function getCustomIconUrl(name: string): string {
  return assetUrl(name.replace(/^custom:/, ''));
}
