import request from 'supertest';
import express from 'express';
import { describe, it, expect } from 'vitest';
import { initDB } from './server/db.js';
import { configRouter } from './server/routes/config.js';
import { profilesRouter } from './server/routes/profiles.js';
import { settingsRouter } from './server/routes/settings.js';

/**
 * Crée une app Express avec une base SQLite en mémoire (:memory:)
 * pour isoler chaque suite de tests.
 */
function createTestApp() {
  const db = initDB(':memory:');
  const app = express();
  app.use(express.json());
  app.use('/api/config', configRouter(db));
  app.use('/api/profiles', profilesRouter(db));
  app.use('/api/settings', settingsRouter(db));
  return { app, db };
}

// ─────────────────────────────────────────────────────────────────────────────
// /api/config
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/config', () => {
  it('renvoie le message par défaut si la DB est vide', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'No config yet', layout: [] });
  });

  it('renvoie la config sauvegardée', async () => {
    const { app } = createTestApp();
    const config = { version: 2, pages: [{ id: 'home', label: 'Home', widgets: [] }] };
    await request(app).post('/api/config').send(config);

    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(config);
  });

  it('préserve la clé wallPanel dans la config', async () => {
    const { app } = createTestApp();
    const config = { version: 2, wallPanel: { config: { enabled: true, idle_time: 60 }, layout: {} } };
    await request(app).post('/api/config').send(config);

    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.wallPanel).toMatchObject(config.wallPanel);
  });
});

describe('POST /api/config', () => {
  it('sauvegarde la config et renvoie success', async () => {
    const { app } = createTestApp();
    const config = { version: 2, layout: ['itemA', 'itemB'] };
    const res = await request(app).post('/api/config').send(config);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('renvoie 400 si le body est invalide', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/api/config').send('not-json').set('Content-Type', 'text/plain');
    expect(res.status).toBe(400);
  });

  it('met à jour la config existante (UPSERT)', async () => {
    const { app } = createTestApp();
    await request(app)
      .post('/api/config')
      .send({ version: 2, layout: ['v1'] });
    await request(app)
      .post('/api/config')
      .send({ version: 2, layout: ['v2'] });

    const res = await request(app).get('/api/config');
    expect(res.body.layout).toEqual(['v2']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/profiles
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/profiles', () => {
  it('renvoie une liste vide au départ', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/profiles');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('liste uniquement les profils du user HA si x-ha-user-id présent', async () => {
    const { app } = createTestApp();
    await request(app)
      .post('/api/profiles')
      .set('x-ha-user-id', 'user1')
      .send({ label: 'Profil A', data: { foo: 1 } });
    await request(app)
      .post('/api/profiles')
      .set('x-ha-user-id', 'user2')
      .send({ label: 'Profil B', data: { foo: 2 } });

    const res = await request(app).get('/api/profiles').set('x-ha-user-id', 'user1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].label).toBe('Profil A');
  });
});

describe('POST /api/profiles', () => {
  it('crée un profil et renvoie 201 avec id+label', async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post('/api/profiles')
      .send({ label: 'Mon profil', data: { theme: 'dark' } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ label: 'Mon profil' });
    expect(res.body.id).toBeDefined();
  });

  it('renvoie 400 si label ou data manquant', async () => {
    const { app } = createTestApp();
    const r1 = await request(app).post('/api/profiles').send({ label: 'Test' });
    expect(r1.status).toBe(400);
    const r2 = await request(app).post('/api/profiles').send({ data: {} });
    expect(r2.status).toBe(400);
  });
});

describe('GET /api/profiles/:id', () => {
  it('renvoie le profil avec ses données parsées', async () => {
    const { app } = createTestApp();
    const created = await request(app)
      .post('/api/profiles')
      .send({ label: 'Test', data: { key: 'value' } });
    const { id } = created.body;

    const res = await request(app).get(`/api/profiles/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ key: 'value' });
  });

  it('renvoie 404 pour un id inconnu', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/profiles/unknown-id');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/profiles/:id', () => {
  it('met à jour le label du profil', async () => {
    const { app } = createTestApp();
    const created = await request(app).post('/api/profiles').send({ label: 'Ancien label', data: {} });
    const { id } = created.body;

    const res = await request(app).put(`/api/profiles/${id}`).send({ label: 'Nouveau label' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('renvoie 404 pour un id inconnu', async () => {
    const { app } = createTestApp();
    const res = await request(app).put('/api/profiles/nope').send({ label: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/profiles/:id', () => {
  it('supprime le profil existant', async () => {
    const { app } = createTestApp();
    const created = await request(app).post('/api/profiles').send({ label: 'À supprimer', data: {} });
    const { id } = created.body;

    const res = await request(app).delete(`/api/profiles/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('renvoie 404 pour un id inconnu', async () => {
    const { app } = createTestApp();
    const res = await request(app).delete('/api/profiles/ghost');
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/settings
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/settings/current', () => {
  it('renvoie revision:0 si aucun setting', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/settings/current?device_id=dev1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ revision: 0 });
  });
});

describe('PUT /api/settings/current', () => {
  it('sauvegarde les settings et incrémente la révision', async () => {
    const { app } = createTestApp();
    const r1 = await request(app)
      .put('/api/settings/current')
      .send({ device_id: 'dev1', data: { brightness: 80 } });
    expect(r1.status).toBe(200);
    expect(r1.body).toEqual({ success: true, revision: 1 });

    const r2 = await request(app)
      .put('/api/settings/current')
      .send({ device_id: 'dev1', data: { brightness: 90 }, expected_revision: 1 });
    expect(r2.status).toBe(200);
    expect(r2.body.revision).toBe(2);
  });

  it('renvoie 409 en cas de conflit de révision', async () => {
    const { app } = createTestApp();
    await request(app)
      .put('/api/settings/current')
      .send({ device_id: 'dev2', data: { x: 1 } });

    const res = await request(app)
      .put('/api/settings/current')
      .send({ device_id: 'dev2', data: { x: 2 }, expected_revision: 99 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// haAuthMiddleware
// ─────────────────────────────────────────────────────────────────────────────
describe('haAuthMiddleware', () => {
  it('mode ingress : refuse si le header x-ingress-path est absent', async () => {
    const originalMode = process.env.HA_AUTH_MODE;
    process.env.HA_AUTH_MODE = 'ingress';

    const { haAuthMiddleware } = await import('./server/haAuth.js');
    const app = express();
    app.use(haAuthMiddleware);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing ingress header');

    process.env.HA_AUTH_MODE = originalMode;
  });

  it('mode ingress : accepte si le header x-ingress-path est présent', async () => {
    const originalMode = process.env.HA_AUTH_MODE;
    process.env.HA_AUTH_MODE = 'ingress';

    const { haAuthMiddleware } = await import('./server/haAuth.js');
    const app = express();
    app.use(haAuthMiddleware);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test').set('x-ingress-path', '/ingress/abc');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    process.env.HA_AUTH_MODE = originalMode;
  });

  it('mode disabled en production : renvoie 500', async () => {
    const originalMode = process.env.HA_AUTH_MODE;
    const originalEnv = process.env.NODE_ENV;
    process.env.HA_AUTH_MODE = 'disabled';
    process.env.NODE_ENV = 'production';

    const { haAuthMiddleware } = await import('./server/haAuth.js');
    const app = express();
    app.use(haAuthMiddleware);
    app.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Auth disabled in production is not allowed');

    process.env.HA_AUTH_MODE = originalMode;
    process.env.NODE_ENV = originalEnv;
  });
});
