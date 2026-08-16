import request from 'supertest';
import express from 'express';
import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, CONFIG_HISTORY_LIMIT } from '../db.js';
import { configRouter } from './config.js';

let app;

beforeEach(() => {
  const db = initDB(':memory:');
  app = express();
  app.use(express.json());
  app.use('/api/config', configRouter(db));
});

const put = (body, expectedRevision) => {
  const req = request(app).put('/api/config').send(body);
  return expectedRevision === undefined ? req : req.set('X-Expected-Revision', String(expectedRevision));
};

describe('révision et conflits', () => {
  it('incrémente la révision à chaque écriture et la renvoie en en-tête', async () => {
    expect((await request(app).get('/api/config')).headers['x-config-revision']).toBe('0');

    expect((await put({ pages: ['a'] })).body.revision).toBe(1);
    expect((await put({ pages: ['b'] })).body.revision).toBe(2);
    expect((await request(app).get('/api/config')).headers['x-config-revision']).toBe('2');
  });

  it('refuse une écriture fondée sur une révision périmée', async () => {
    await put({ pages: ['a'] }); // révision 1
    await put({ pages: ['b'] }); // révision 2 — l'autre appareil a enregistré

    const res = await put({ pages: ['perdu'] }, 1);

    expect(res.status).toBe(409);
    expect(res.body.current_revision).toBe(2);
    // Le point de tout l'exercice : rien n'a été écrasé.
    expect((await request(app).get('/api/config')).body.pages).toEqual(['b']);
  });

  it('accepte une écriture fondée sur la révision courante', async () => {
    await put({ pages: ['a'] });
    const res = await put({ pages: ['c'] }, 1);

    expect(res.status).toBe(200);
    expect((await request(app).get('/api/config')).body.pages).toEqual(['c']);
  });

  it("n'impose pas l'en-tête — un import écrase volontairement", async () => {
    await put({ pages: ['a'] });
    expect((await put({ pages: ['importé'] })).status).toBe(200);
  });
});

describe('historique', () => {
  it('archive chaque état précédent et permet de le restaurer', async () => {
    await put({ pages: ['original'] });
    await put({ pages: ['cassé'] });

    const history = (await request(app).get('/api/config/history')).body;
    expect(history).toHaveLength(1);
    expect(history[0].size).toBeGreaterThan(0);

    const res = await request(app).post(`/api/config/history/${history[0].id}/restore`);
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/config')).body.pages).toEqual(['original']);
  });

  it('archive aussi avant de restaurer — une restauration ratée reste rattrapable', async () => {
    await put({ pages: ['v1'] });
    await put({ pages: ['v2'] });

    const [entry] = (await request(app).get('/api/config/history')).body;
    await request(app).post(`/api/config/history/${entry.id}/restore`); // → v1

    // v2 a été archivé avant d'être remplacé par v1
    const history = (await request(app).get('/api/config/history')).body;
    expect(history).toHaveLength(2);
    expect(history[0].label).toBe('avant restauration');

    await request(app).post(`/api/config/history/${history[0].id}/restore`);
    expect((await request(app).get('/api/config')).body.pages).toEqual(['v2']);
  });

  it("n'archive pas deux enregistrements identiques", async () => {
    await put({ pages: ['a'] });
    await put({ pages: ['a'] });
    await put({ pages: ['a'] });

    expect((await request(app).get('/api/config/history')).body).toHaveLength(0);
  });

  it(`ne conserve que les ${CONFIG_HISTORY_LIMIT} derniers états`, async () => {
    for (let i = 0; i < CONFIG_HISTORY_LIMIT + 5; i++) {
      await put({ pages: [`v${i}`] });
    }

    const history = (await request(app).get('/api/config/history')).body;
    expect(history).toHaveLength(CONFIG_HISTORY_LIMIT);
    // Ce sont les plus récents qui restent, pas les plus anciens.
    expect(history[0].id).toBeGreaterThan(history[CONFIG_HISTORY_LIMIT - 1].id);
    expect(JSON.parse(history[0].data ?? 'null')).toBeNull(); // les données ne fuitent pas dans la liste
  });

  it('renvoie 404 sur un identifiant inconnu', async () => {
    expect((await request(app).post('/api/config/history/999/restore')).status).toBe(404);
  });
});
