import Database from 'better-sqlite3';
import { describe, it, expect } from 'vitest';
import { initDB, migrate, checkpoint, SCHEMA_VERSION } from './db.js';

const tableNames = db =>
  db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .all()
    .map(r => r.name);

describe('migrations de schéma', () => {
  it('amène une base neuve à la version courante avec toutes les tables', () => {
    const db = initDB(':memory:');

    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
    expect(tableNames(db)).toEqual(
      expect.arrayContaining(['dashboard_config', 'profiles', 'device_settings', 'uploaded_images', 'uploaded_icons'])
    );
  });

  it('rattrape une base 2.1.x — tables déjà créées, user_version resté à 0 — sans perdre de données', () => {
    // Reproduit l'état d'une installation antérieure au versionnage : le schéma
    // est là, `user_version` ne l'est pas. C'est le cas de *toutes* les bases
    // en service aujourd'hui, celui qu'une migration ratée casserait.
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE dashboard_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        version INTEGER NOT NULL DEFAULT 2,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.prepare('INSERT INTO dashboard_config (id, version, data) VALUES (1, 2, ?)').run('{"pages":["salon"]}');
    expect(db.pragma('user_version', { simple: true })).toBe(0);

    migrate(db);

    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
    expect(db.prepare('SELECT data FROM dashboard_config WHERE id = 1').get().data).toBe('{"pages":["salon"]}');
    expect(tableNames(db)).toEqual(expect.arrayContaining(['profiles', 'device_settings', 'uploaded_icons']));
  });

  it('est idempotente — un second passage ne rejoue rien', () => {
    const db = initDB(':memory:');
    db.prepare('INSERT INTO dashboard_config (id, version, data) VALUES (1, 2, ?)').run('{}');

    migrate(db);
    migrate(db);

    expect(db.pragma('user_version', { simple: true })).toBe(SCHEMA_VERSION);
    expect(db.prepare('SELECT COUNT(*) AS n FROM dashboard_config').get().n).toBe(1);
  });
});

describe('checkpoint', () => {
  it('ne jette pas, même sur une base en mémoire (sans WAL)', () => {
    const db = initDB(':memory:');
    expect(() => checkpoint(db)).not.toThrow();
  });
});
