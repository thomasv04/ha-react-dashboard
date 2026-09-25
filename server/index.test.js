/**
 * La CSP de l'add-on : les E2E passent par Vite, qui n'en a pas — seul ce
 * test voit ce qu'elle bloque en production.
 */
import { test, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';

let app;

beforeAll(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ha-dashboard-csp-'));
  process.env.DB_PATH = path.join(dir, 'dashboard.db');
  process.env.UPLOADS_DIR = path.join(dir, 'uploads');
  ({ default: app } = await import('./index.js'));
});

test("laisse three.js charger les textures d'une maquette, rangées en blob:", async () => {
  const res = await request(app).get('/api/config');
  const directive = res.headers['content-security-policy'].split(';').find(d => d.trim().startsWith('connect-src'));
  expect(directive.trim().split(/\s+/)).toContain('blob:');
});

test('limite les écritures à 30 par minute et par utilisateur', async () => {
  const statuses = [];
  for (let i = 0; i < 31; i++) statuses.push((await request(app).post('/api/limite-des-ecritures')).status);
  expect(statuses.slice(0, 30)).not.toContain(429);
  expect(statuses[30]).toBe(429);
});
