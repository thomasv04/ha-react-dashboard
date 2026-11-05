/**
 * Préchauffage du serveur de dev, avant la suite E2E. La configuration de test,
 * elle, est posée par la fixture de chaque worker (`fixtures.ts`).
 *
 * Playwright considère le serveur prêt dès que le port répond, mais Vite ouvre
 * son port **avant** d'avoir fini de pré-bundler ses dépendances : il annonce
 * « ready in 1 s », puis fait patienter chaque requête de module derrière
 * l'optimiseur esbuild. Sans ce préchauffage, ce sont les premiers tests qui
 * encaissent l'attente et expirent, alors que les suivants passent en moins
 * d'une seconde.
 *
 * Mesuré cache purgé (`node_modules/.vite`) sur une machine Windows : 13 s
 * jusqu'au premier widget rendu. Ce chiffre a longtemps été de 8 à 13 minutes,
 * et le plafond était monté à 25 minutes pour le couvrir : le watcher de Vite
 * parcourait les venvs Python du dépôt (cf. `server.watch` dans
 * `vite.config.ts`). Le plafond reste large, mais assez bas pour qu'une
 * régression de ce genre fasse échouer la suite au lieu de passer inaperçue.
 *
 * `domcontentloaded` n'aide pas à raccourcir : `main.tsx` est un module, et un
 * script de module diffère `DOMContentLoaded` jusqu'à ce que tout son graphe
 * soit chargé. C'est donc bien `goto` qui encaisse l'attente.
 */
import { test as setup } from './fixtures';

const WARMUP_TIMEOUT = 3 * 60_000;

setup('préchauffe le serveur de développement', async ({ page }) => {
  setup.setTimeout(WARMUP_TIMEOUT + 60_000);
  await page.goto('/', { timeout: WARMUP_TIMEOUT, waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-widget-id]', { timeout: 120_000 });
});
