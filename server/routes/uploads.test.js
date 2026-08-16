/**
 * Le nom du fichier écrit sur disque ne doit rien emprunter à la requête.
 *
 * `express.static` sert le dossier des uploads : un `<uuid>.html` ou `<uuid>.svg`
 * y devient une page exécutable sur l'origine du dashboard. L'extension est donc
 * dérivée du type déclaré, jamais de `originalname`.
 */
import { test, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { uploadsRouter, pruneOrphanUploads } from './uploads.js';

let dir;
let app;
let db;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ha-uploads-'));
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE uploaded_images (id INTEGER PRIMARY KEY, filename TEXT, original_name TEXT, mime_type TEXT, size INTEGER,
      created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE uploaded_icons (id INTEGER PRIMARY KEY, filename TEXT, original_name TEXT, mime_type TEXT, size INTEGER,
      created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE dashboard_config (id INTEGER PRIMARY KEY, data TEXT);
    CREATE TABLE config_history (id INTEGER PRIMARY KEY, data TEXT);
  `);
  app = express();
  app.use('/api/uploads', uploadsRouter(db, dir));
});

afterEach(() => {
  db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('une extension .html annoncée en image/png est écrite en .png', async () => {
  const res = await request(app)
    .post('/api/uploads/background')
    .attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.html', contentType: 'image/png' });

  expect(res.status).toBe(201);
  expect(res.body.url).toMatch(/\.png$/);
  expect(fs.readdirSync(dir).filter(f => f.endsWith('.html'))).toHaveLength(0);
});

test('une extension .svg annoncée en image/png est écrite en .png', async () => {
  const res = await request(app)
    .post('/api/uploads/background')
    .attach('image', Buffer.from('<svg onload="alert(1)"></svg>'), { filename: 'evil.svg', contentType: 'image/png' });

  expect(res.status).toBe(201);
  expect(res.body.url).toMatch(/\.png$/);
  expect(fs.readdirSync(dir).filter(f => f.endsWith('.svg'))).toHaveLength(0);
});

test('un type non autorisé est refusé', async () => {
  const res = await request(app)
    .post('/api/uploads/background')
    .attach('image', Buffer.from('x'), { filename: 'a.html', contentType: 'text/html' });

  expect(res.status).toBe(400);
});

test('la suppression refuse une traversée de chemin', async () => {
  const res = await request(app).delete('/api/uploads/background/..%2F..%2Fdashboard.db');
  expect(res.status).toBeGreaterThanOrEqual(400);
});

// ── Ménage des orphelins ────────────────────────────────────────────────────

/** Enregistre un fichier ancien de deux jours — hors du délai de grâce. */
function seedOldFile(filename, table = 'uploaded_images', subdir = '') {
  fs.mkdirSync(path.join(dir, subdir), { recursive: true });
  fs.writeFileSync(path.join(dir, subdir, filename), 'x');
  db.prepare(`INSERT INTO ${table} (filename, original_name, mime_type, size, created_at) VALUES (?, 'o', 'image/png', 1, ?)`).run(
    filename,
    new Date(Date.now() - 2 * 24 * 3600_000).toISOString().slice(0, 19).replace('T', ' ')
  );
}

test('supprime un fichier que la configuration ne référence plus', () => {
  db.prepare('INSERT INTO dashboard_config (id, data) VALUES (1, ?)').run('{"background":"/uploads/gardé.png"}');
  seedOldFile('gardé.png');
  seedOldFile('orphelin.png');

  expect(pruneOrphanUploads(db, dir)).toBe(1);
  expect(fs.existsSync(path.join(dir, 'gardé.png'))).toBe(true);
  expect(fs.existsSync(path.join(dir, 'orphelin.png'))).toBe(false);
  expect(db.prepare('SELECT COUNT(*) AS n FROM uploaded_images').get().n).toBe(1);
});

test("épargne une image encore citée par l'historique — sinon la restauration rendrait des cadres vides", () => {
  db.prepare('INSERT INTO dashboard_config (id, data) VALUES (1, ?)').run('{"background":null}');
  db.prepare('INSERT INTO config_history (data) VALUES (?)').run('{"background":"/uploads/ancien.png"}');
  seedOldFile('ancien.png');

  expect(pruneOrphanUploads(db, dir)).toBe(0);
  expect(fs.existsSync(path.join(dir, 'ancien.png'))).toBe(true);
});

test("épargne un fichier récent — il vient peut-être d'être choisi", () => {
  db.prepare('INSERT INTO dashboard_config (id, data) VALUES (1, ?)').run('{}');
  fs.writeFileSync(path.join(dir, 'frais.png'), 'x');
  db.prepare(`INSERT INTO uploaded_images (filename, original_name, mime_type, size) VALUES ('frais.png', 'o', 'image/png', 1)`).run();

  expect(pruneOrphanUploads(db, dir)).toBe(0);
  expect(fs.existsSync(path.join(dir, 'frais.png'))).toBe(true);
});

test("ne touche à rien tant aucune configuration n'existe", () => {
  seedOldFile('seul.png');
  expect(pruneOrphanUploads(db, dir)).toBe(0);
  expect(fs.existsSync(path.join(dir, 'seul.png'))).toBe(true);
});

test('refuse un envoi qui ferait dépasser le quota total', async () => {
  // 200 Mo déjà déclarés en base : le prochain octet est de trop.
  db.prepare(`INSERT INTO uploaded_images (filename, original_name, mime_type, size) VALUES ('gros.png', 'o', 'image/png', ?)`).run(
    200 * 1024 * 1024
  );

  const res = await request(app)
    .post('/api/uploads/background')
    .attach('image', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' });

  expect(res.status).toBe(507);
  // Le fichier refusé ne doit pas rester sur le disque.
  expect(fs.readdirSync(dir).filter(f => f.endsWith('.png'))).toHaveLength(0);
});
