import request from 'supertest';
import express from 'express';
import { describe, it, expect } from 'vitest';
import { adminWrites, writeGuard } from './haAuth.js';

/** App minimale : un middleware sous test, deux routes qui répondent 200. */
function appWith(middleware, haUser) {
  const app = express();
  app.use(express.json());
  if (haUser !== undefined) app.use((req, _res, next) => ((req.haUser = haUser), next()));
  app.use('/api/config', middleware, (_req, res) => res.json({ ok: true }));
  return app;
}

describe('adminWrites', () => {
  it("laisse tout le monde lire — c'est ce que le dashboard affiche", async () => {
    const app = appWith(adminWrites, { id: 'u1', isAdmin: false });
    expect((await request(app).get('/api/config')).status).toBe(200);
  });

  it('refuse les écritures à un utilisateur non administrateur', async () => {
    const app = appWith(adminWrites, { id: 'u1', isAdmin: false });

    const res = await request(app).put('/api/config').send({ pages: [] });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('laisse passer un administrateur', async () => {
    const app = appWith(adminWrites, { id: 'u1', isAdmin: true });
    expect((await request(app).put('/api/config').send({ pages: [] })).status).toBe(200);
  });

  it("ne bloque rien quand l'authentification n'est pas branchée (dev)", async () => {
    const app = appWith(adminWrites, undefined);
    expect((await request(app).put('/api/config').send({ pages: [] })).status).toBe(200);
  });
});

describe('writeGuard', () => {
  it("sert en lecture seule quand rien n'authentifie l'appelant", async () => {
    const app = appWith(writeGuard, undefined);

    expect((await request(app).get('/api/config')).status).toBe(200);
    expect((await request(app).put('/api/config').send({})).status).toBe(503);
    expect((await request(app).post('/api/config').send({})).status).toBe(503);
    expect((await request(app).delete('/api/config')).status).toBe(503);
  });
});
