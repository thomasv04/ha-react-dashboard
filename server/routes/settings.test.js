import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../db.js';
import { settingsRouter } from './settings.js';

let app;
let db;

/** `haUser` posé en amont, comme le ferait `haAuthMiddleware`. */
function createApp(haUser) {
  db = initDB(':memory:');
  const a = express();
  a.use(express.json());
  if (haUser !== undefined) a.use((req, _res, next) => ((req.haUser = haUser), next()));
  a.use('/api/settings', settingsRouter(db));
  return a;
}

const seed = async (deviceId, data) => request(app).put('/api/settings/current').send({ device_id: deviceId, data });

beforeEach(() => {
  app = createApp({ id: 'admin', isAdmin: true });
});

describe('POST /api/settings/broadcast', () => {
  it('recopie les réglages sur tous les appareils connus', async () => {
    await seed('salon', { themeId: 'dark' });
    await seed('cuisine', { themeId: 'light' });
    await seed('chambre', { themeId: 'light' });

    const res = await request(app)
      .post('/api/settings/broadcast')
      .send({ data: { themeId: 'ocean' } });

    expect(res.status).toBe(200);
    expect(res.body.devices).toBe(3);

    for (const device of ['salon', 'cuisine', 'chambre']) {
      const { body } = await request(app).get(`/api/settings/current?device_id=${device}`);
      expect(body.data).toEqual({ themeId: 'ocean' });
    }
  });

  it('incrémente la révision de chaque appareil', async () => {
    // Un appareil resté ouvert doit se voir refuser sa prochaine écriture (409)
    // au lieu de réimposer silencieusement ses anciens réglages.
    await seed('salon', { themeId: 'dark' });
    const before = (await request(app).get('/api/settings/current?device_id=salon')).body.revision;

    await request(app)
      .post('/api/settings/broadcast')
      .send({ data: { themeId: 'ocean' } });

    const after = (await request(app).get('/api/settings/current?device_id=salon')).body.revision;
    expect(after).toBe(before + 1);

    const stale = await request(app)
      .put('/api/settings/current')
      .send({ device_id: 'salon', data: { themeId: 'dark' }, expected_revision: before });
    expect(stale.status).toBe(409);
  });

  it('refuse un utilisateur non administrateur', async () => {
    app = createApp({ id: 'invite', isAdmin: false });
    await seed('salon', { themeId: 'dark' });

    const res = await request(app)
      .post('/api/settings/broadcast')
      .send({ data: { themeId: 'ocean' } });

    expect(res.status).toBe(403);
    // Rien n'a bougé.
    const { body } = await request(app).get('/api/settings/current?device_id=salon');
    expect(body.data).toEqual({ themeId: 'dark' });
  });

  it("laisse un non-administrateur régler *son* appareil", async () => {
    // Le point de l'exemption : verrouiller aussi `/current` empêcherait une
    // tablette ou le téléphone d'un proche de choisir son propre affichage.
    app = createApp({ id: 'invite', isAdmin: false });
    expect((await seed('telephone', { themeId: 'light' })).status).toBe(200);
  });

  it('rejette des données invalides', async () => {
    expect((await request(app).post('/api/settings/broadcast').send({ data: 'nope' })).status).toBe(400);
    expect((await request(app).post('/api/settings/broadcast').send({})).status).toBe(400);
  });

  it('ne fait rien de fâcheux sans aucun appareil enregistré', async () => {
    const res = await request(app)
      .post('/api/settings/broadcast')
      .send({ data: { themeId: 'ocean' } });

    expect(res.status).toBe(200);
    expect(res.body.devices).toBe(0);
  });
});
