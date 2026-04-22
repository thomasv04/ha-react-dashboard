import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Initialise la DB SQLite avec WAL mode pour de meilleures performances.
 * Crée les tables si elles n'existent pas (auto-migration).
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

  // ── Table : dashboard config (remplacement du fichier JSON) ──────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 2,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Table : profils utilisateur ──────────────────────────────────────────
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

  // ── Table : settings par device ──────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_settings (
      device_id TEXT PRIMARY KEY,
      ha_user_id TEXT,
      data TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Table : images uploadées (fond d'écran) ──────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploaded_images (
      filename TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Table : icônes custom uploadées ─────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS uploaded_icons (
      filename TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Migration depuis fichier JSON (si le fichier existe et la DB est vide) ──
  // Pas de migration pour les DB en mémoire (tests)
  if (dbPath !== ':memory:') {
    migrateFromJSON(db);
  }

  return db;
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

    console.log('[db] Migrated dashboard_config.json → SQLite');
  } catch (err) {
    console.error('[db] Migration error:', err.message);
  }
}
