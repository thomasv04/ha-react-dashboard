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
import { uploadsRouter } from './uploads.js';

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
