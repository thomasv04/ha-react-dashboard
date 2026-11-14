import request from 'supertest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createMassClient, createMassManager, massSettings } from './music.js';
import { initDB } from './db.js';
import { musicSettingsRouter } from './routes/musicSettings.js';
import { musicRouter } from './routes/music.js';

/**
 * Un faux serveur Music Assistant : envoie ses infos à l'ouverture, accepte le
 * jeton `bon-jeton`, et répond aux commandes avec `answers[command]`.
 */
function fakeMass(answers = {}) {
  const sent = [];
  class FakeSocket {
    constructor(url) {
      this.url = url;
      FakeSocket.last = this;
      queueMicrotask(() => this.emit({ server_id: 'srv', server_version: '2.10.9' }));
    }
    emit(msg) {
      this.onmessage?.({ data: JSON.stringify(msg) });
    }
    send(raw) {
      const msg = JSON.parse(raw);
      sent.push(msg);
      queueMicrotask(() => {
        if (msg.command === 'auth') {
          this.emit(
            msg.args.token === 'bon-jeton'
              ? { message_id: msg.message_id, result: { user: { username: 'dashboard' } } }
              : { message_id: msg.message_id, error_code: 20, details: 'Authentication failed' }
          );
        } else if (msg.command in answers) {
          this.emit({ message_id: msg.message_id, result: answers[msg.command] });
        } else {
          this.emit({ message_id: msg.message_id, error_code: 1, details: 'unknown command' });
        }
      });
    }
    close() {
      this.onclose?.();
    }
  }
  return { FakeSocket, sent };
}

describe('client Music Assistant', () => {
  it('présente le jeton, puis envoie la commande et rend son résultat', async () => {
    const { FakeSocket, sent } = fakeMass({ 'player_queues/items': [{ queue_item_id: 'a', name: 'Believer' }] });
    const client = createMassClient({ url: 'http://172.30.32.1:8095', token: 'bon-jeton' }, { WebSocketImpl: FakeSocket });

    const items = await client.request('player_queues/items', { queue_id: 'q1', limit: 10, offset: 0 });
    expect(items).toEqual([{ queue_item_id: 'a', name: 'Believer' }]);
    expect(FakeSocket.last.url).toBe('ws://172.30.32.1:8095/ws');
    expect(sent[0]).toMatchObject({ command: 'auth', args: { token: 'bon-jeton' } });
    expect(sent[1]).toMatchObject({ command: 'player_queues/items', args: { queue_id: 'q1' } });

    // La connexion sert à la demande suivante : pas de second `auth`.
    await client.request('player_queues/items', { queue_id: 'q1' });
    expect(sent.filter(m => m.command === 'auth')).toHaveLength(1);
  });

  it('refuse un mauvais jeton, et réessaie à la demande suivante', async () => {
    const { FakeSocket, sent } = fakeMass();
    const client = createMassClient({ url: 'http://ma:8095', token: 'faux' }, { WebSocketImpl: FakeSocket });
    await expect(client.request('player_queues/all')).rejects.toMatchObject({ kind: 'auth' });
    await expect(client.request('player_queues/all')).rejects.toMatchObject({ kind: 'auth' });
    expect(sent.filter(m => m.command === 'auth')).toHaveLength(2);
  });
});

describe('réglages Music Assistant', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma-'));
  afterEach(() => {
    delete process.env.MA_TOKEN;
    delete process.env.MA_URL;
    delete process.env.SUPERVISOR_TOKEN;
  });

  it("lit les options de l'add-on, et joint MA sur l'hôte par défaut", () => {
    const file = path.join(dir, 'options.json');
    fs.writeFileSync(file, JSON.stringify({ music_assistant_token: ' jeton ', music_assistant_url: '' }));
    process.env.SUPERVISOR_TOKEN = 'x';
    expect(massSettings(file)).toEqual({ url: 'http://172.30.32.1:8095', token: 'jeton', source: 'addon' });
  });

  it("n'active rien sans jeton", () => {
    expect(massSettings(path.join(dir, 'absent.json'))).toBeNull();
    process.env.MA_URL = 'http://192.168.1.60:8095/';
    process.env.MA_TOKEN = 'dev';
    expect(massSettings(path.join(dir, 'absent.json'))).toEqual({ url: 'http://192.168.1.60:8095', token: 'dev', source: 'env' });
  });
});

describe('/api/music', () => {
  const appWith = client => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api/music',
      musicRouter(() => client)
    );
    return app;
  };

  it('dit quand Music Assistant n’est pas configuré', async () => {
    const res = await request(appWith(null)).get('/api/music/queue/q1');
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('not_configured');
  });

  it('rend la file, déplace et retire un titre', async () => {
    const client = { request: vi.fn(async command => (command === 'player_queues/items' ? [{ queue_item_id: 'a' }] : null)) };
    const app = appWith(client);

    const list = await request(app).get('/api/music/queue/4e981e3a-9707?limit=50');
    expect(list.body).toEqual([{ queue_item_id: 'a', name: '', artists: [], duration: null, image: null }]);
    expect(client.request).toHaveBeenLastCalledWith('player_queues/items', { queue_id: '4e981e3a-9707', limit: 50, offset: 0 });

    await request(app).post('/api/music/queue/q1/move').send({ queue_item_id: 'a', pos_shift: -1 }).expect(200);
    expect(client.request).toHaveBeenLastCalledWith('player_queues/move_item', { queue_id: 'q1', queue_item_id: 'a', pos_shift: -1 });

    await request(app).post('/api/music/queue/q1/delete').send({ queue_item_id: 'a' }).expect(200);
    expect(client.request).toHaveBeenLastCalledWith('player_queues/delete_item', { queue_id: 'q1', item_id_or_index: 'a' });

    await request(app).post('/api/music/queue/q1/play').send({ index: 3 }).expect(200);
    expect(client.request).toHaveBeenLastCalledWith('player_queues/play_index', { queue_id: 'q1', index: 3 });
  });

  it('refuse les demandes mal formées', async () => {
    const client = { request: vi.fn() };
    const app = appWith(client);
    await request(app).get('/api/music/queue/..%2Fetc').expect(400);
    await request(app).post('/api/music/queue/q1/move').send({ queue_item_id: 'a', pos_shift: 'haut' }).expect(400);
    await request(app).post('/api/music/queue/q1/play').send({ index: -1 }).expect(400);
    expect(client.request).not.toHaveBeenCalled();
  });

  it('traduit un jeton refusé en 424, pas en 401 (réservé à HA)', async () => {
    const { FakeSocket } = fakeMass();
    const client = createMassClient({ url: 'http://ma:8095', token: 'faux' }, { WebSocketImpl: FakeSocket });
    const res = await request(appWith(client)).get('/api/music/queue/q1');
    expect(res.status).toBe(424);
    expect(res.body.error).toBe('auth');
  });
});

describe('titres de la file', () => {
  it('réduit un titre MA à ce que l’écran montre, sans image privée', async () => {
    const { toQueueItem } = await import('./routes/music.js');
    expect(
      toQueueItem({
        queue_item_id: 'x1',
        name: 'Elton John - Tiny Dancer',
        duration: 377,
        image: { path: 'https://i.scdn.co/image/abc', provider: 'spotify', remotely_accessible: true },
        media_item: { name: 'Tiny Dancer', artists: [{ name: 'Elton John' }] },
      })
    ).toEqual({ queue_item_id: 'x1', name: 'Tiny Dancer', artists: ['Elton John'], duration: 377, image: 'https://i.scdn.co/image/abc' });
    // Une image locale passe par le proxy de MA, injoignable depuis la tablette : pas d'image plutôt qu'un lien mort.
    expect(
      toQueueItem({ queue_item_id: 'x2', name: 'A', image: { path: '/media/a.jpg', provider: 'filesystem', remotely_accessible: false } })
        .image
    ).toBeNull();
  });
});

describe('réglages saisis dans les Paramètres', () => {
  const absent = path.join(os.tmpdir(), 'pas-d-options.json');
  const setup = () => {
    const { FakeSocket } = fakeMass({ 'player_queues/all': [] });
    const manager = createMassManager(initDB(':memory:'), { optionsPath: absent, WebSocketImpl: FakeSocket });
    const app = express();
    app.use(express.json());
    app.use('/api/music/settings', musicSettingsRouter(manager));
    return { manager, app };
  };

  it('teste le jeton avant de le garder, et ne le rend jamais', async () => {
    const { manager, app } = setup();
    expect((await request(app).get('/api/music/settings')).body).toMatchObject({ configured: false });

    // Un jeton refusé par MA n'est pas gardé.
    const bad = await request(app).put('/api/music/settings').send({ url: 'http://192.168.1.60:8095', token: 'faux' });
    expect(bad.status).toBe(424);
    expect(manager.getClient()).toBeNull();

    const ok = await request(app).put('/api/music/settings').send({ url: 'http://192.168.1.60:8095/', token: 'bon-jeton' });
    expect(ok.body).toEqual({ configured: true, url: 'http://192.168.1.60:8095', source: 'settings' });
    expect(JSON.stringify(ok.body)).not.toContain('bon-jeton');
    expect(manager.getClient()).not.toBeNull();

    // Oublié : retour aux options de l'add-on (ici, aucune).
    const cleared = await request(app).delete('/api/music/settings');
    expect(cleared.body.configured).toBe(false);
    expect(manager.getClient()).toBeNull();
  });

  it('refuse une adresse ou un jeton mal formés', async () => {
    const { app } = setup();
    await request(app).put('/api/music/settings').send({ url: 'file:///etc/passwd', token: 'x' }).expect(400);
    await request(app).put('/api/music/settings').send({ url: '', token: '   ' }).expect(400);
  });
});
