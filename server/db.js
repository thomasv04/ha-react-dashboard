import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Migrations de schéma, **append-only**.
 *
 * L'index dans ce tableau fait foi : la migration `MIGRATIONS[i]` amène le
 * schéma en version `i + 1`, et `PRAGMA user_version` retient où en est une
 * base donnée. Ajouter une migration = pousser une fonction à la fin. Ne
 * jamais modifier ni réordonner une entrée déjà publiée : les installations
 * qui l'ont appliquée ne la rejoueront pas.
 *
 * La version 1 reprend à l'identique les `CREATE TABLE IF NOT EXISTS`
 * d'origine. Les bases antérieures à ce mécanisme ont `user_version = 0` alors
 * que leurs tables existent déjà : la rejouer est donc sans effet, et elles
 * repartent du bon pied.
 *
 * @type {ReadonlyArray<(db: import('better-sqlite3').Database) => void>}
 */
const MIGRATIONS = [
  // ── 1 — schéma initial ────────────────────────────────────────────────────
  db => {
    // Dashboard config (remplacement du fichier JSON)
    db.exec(`
      CREATE TABLE IF NOT EXISTS dashboard_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        version INTEGER NOT NULL DEFAULT 2,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Profils utilisateur
    db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        ha_user_id TEXT,
        label TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(ha_user_id)`);

    // Settings par device
    db.exec(`
      CREATE TABLE IF NOT EXISTS device_settings (
        device_id TEXT PRIMARY KEY,
        ha_user_id TEXT,
        data TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Images uploadées (fond d'écran)
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_images (
        filename TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Icônes custom uploadées
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_icons (
        filename TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  },

  // ── 2 — historique de configuration + révision ────────────────────────────
  db => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS config_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        version INTEGER NOT NULL,
        size INTEGER NOT NULL,
        label TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // `revision` sert à détecter les écritures concurrentes (deux appareils en
    // mode édition). Défaut 0 : les bases existantes repartent de zéro sans
    // migration de données.
    const columns = db.pragma('table_info(dashboard_config)').map(c => c.name);
    if (!columns.includes('revision')) {
      db.exec(`ALTER TABLE dashboard_config ADD COLUMN revision INTEGER NOT NULL DEFAULT 0`);
    }
  },
];

/** Nombre d'états de configuration conservés par `config_history`. */
export const CONFIG_HISTORY_LIMIT = 20;

/** Version de schéma attendue par ce code. */
export const SCHEMA_VERSION = MIGRATIONS.length;

/**
 * Applique les migrations manquantes, une transaction par migration.
 *
 * Une migration qui échoue laisse `user_version` à sa valeur précédente : la
 * base reste cohérente et l'add-on s'arrête plutôt que de servir un schéma à
 * moitié migré.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function migrate(db) {
  const from = db.pragma('user_version', { simple: true });

  for (let i = from; i < MIGRATIONS.length; i++) {
    const target = i + 1;
    db.transaction(() => {
      MIGRATIONS[i](db);
      // `user_version` n'accepte pas de paramètre lié — l'index vient d'une
      // boucle sur un tableau littéral, pas d'une entrée utilisateur.
      db.pragma(`user_version = ${target}`);
    })();
    if (from > 0) console.info(`[db] Migrated schema → v${target}`);
  }
}

/**
 * Initialise la DB SQLite avec WAL mode pour de meilleures performances.
 * @param {string} dbPath - Chemin vers le fichier SQLite
 * @returns {import('better-sqlite3').Database}
 */
export function initDB(dbPath) {
  // Ensure the parent directory exists (e.g. data/ may not exist in CI)
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  // WAL mode = lectures parallèles + écritures non-bloquantes
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);

  // ── Migration depuis fichier JSON (si le fichier existe et la DB est vide) ──
  // Pas de migration pour les DB en mémoire (tests)
  if (dbPath !== ':memory:') {
    migrateFromJSON(db);
  }

  return db;
}

/**
 * Force la fusion du journal WAL dans le fichier `.db` principal.
 *
 * Sans cela, les dernières écritures vivent dans `dashboard.db-wal`. Une
 * sauvegarde Home Assistant qui copie `/data` pendant que l'add-on tourne peut
 * donc capturer une base amputée de la configuration qui vient d'être
 * enregistrée. Le coût est négligeable : quelques kilo-octets, et ces écritures
 * sont rares (une par modification du dashboard).
 *
 * @param {import('better-sqlite3').Database} db
 */
export function checkpoint(db) {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    // Un checkpoint refusé (lecteur concurrent) n'est pas une erreur fatale :
    // les données sont dans le WAL, la prochaine tentative les fusionnera.
    console.warn('[db] Checkpoint skipped:', err.message);
  }
}

/**
 * Migration one-shot : lit dashboard_config.json et l'insère dans SQLite.
 * Ne supprime pas le fichier JSON (il sert de backup).
 * @param {import('better-sqlite3').Database} db
 */
function migrateFromJSON(db) {
  const configPath =
    process.env.OPTIONS_FILE || (fs.existsSync('./dashboard_config.json') ? './dashboard_config.json' : './dashboard_config.example.json');
  if (!fs.existsSync(configPath)) return;

  const existing = db.prepare('SELECT COUNT(*) as count FROM dashboard_config').get();
  if (existing.count > 0) return; // DB déjà peuplée

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const data = JSON.parse(raw);

    db.prepare(
      `
      INSERT INTO dashboard_config (id, version, data) VALUES (1, ?, ?)
    `
    ).run(data.version ?? 1, JSON.stringify(data));

    console.info('[db] Migrated dashboard_config.json → SQLite');
  } catch (err) {
    console.error('[db] Migration error:', err.message);
  }
}
