import request from 'supertest';
import express from 'express';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  adminWrites,
  writeGuard,
  haTokenGuard,
  ingressOrigin,
  setSupervisorAddress,
  initIngressTrust,
  haAuthMiddleware,
} from './haAuth.js';

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

describe('haTokenGuard', () => {
  /** La route réelle : le garde d'abord, le jeton ensuite. */
  function tokenApp(haUser) {
    const app = express();
    if (haUser !== undefined) app.use((req, _res, next) => ((req.haUser = haUser), next()));
    app.get('/api/system/ha-config', haTokenGuard, (_req, res) => res.json({ hassToken: 'secret-llt' }));
    return app;
  }

  it("ne rend pas le jeton d'un administrateur à un utilisateur ordinaire", async () => {
    const res = await request(tokenApp({ id: 'u1', isAdmin: false })).get('/api/system/ha-config');

    // 200 et non 403 : le dashboard retombe sur le flux d'authentification HA,
    // où l'utilisateur s'identifie avec ses propres droits.
    expect(res.status).toBe(200);
    expect(res.body.hassToken).toBeNull();
    expect(res.body.reason).toBe('not_admin');
  });

  it('sert le jeton à un administrateur', async () => {
    const res = await request(tokenApp({ id: 'u1', isAdmin: true })).get('/api/system/ha-config');
    expect(res.body.hassToken).toBe('secret-llt');
  });

  it("laisse passer quand l'authentification n'est pas branchée — la route s'en charge en production", async () => {
    const res = await request(tokenApp(undefined)).get('/api/system/ha-config');
    expect(res.body.hassToken).toBe('secret-llt');
  });
});

describe("origine des requêtes d'ingress", () => {
  afterEach(() => setSupervisorAddress(null));

  const from = address => ({ socket: { remoteAddress: address } });

  it('ne juge rien tant que le superviseur est inconnu', () => {
    expect(ingressOrigin(from('172.30.33.7'))).toBe('unknown');
  });

  it('reconnaît le superviseur', () => {
    setSupervisorAddress('172.30.32.2');
    expect(ingressOrigin(from('172.30.32.2'))).toBe('ok');
  });

  it('traite une adresse mappée IPv6 comme la même machine', () => {
    setSupervisorAddress('172.30.32.2');
    expect(ingressOrigin(from('::ffff:172.30.32.2'))).toBe('ok');
    setSupervisorAddress('::ffff:172.30.32.2');
    expect(ingressOrigin(from('172.30.32.2'))).toBe('ok');
  });

  it("démasque un autre add-on du même réseau — c'est tout l'objet du contrôle", () => {
    setSupervisorAddress('172.30.32.2');
    // Même sous-réseau `hassio`, donc invisible d'un simple contrôle de plage.
    expect(ingressOrigin(from('172.30.33.7'))).toBe('mismatch');
  });

  it("ne juge rien quand l'adresse du pair est absente", () => {
    setSupervisorAddress('172.30.32.2');
    expect(ingressOrigin({})).toBe('mismatch');
  });

  it('reste silencieux quand « supervisor » ne se résout pas', async () => {
    await initIngressTrust(() => Promise.reject(new Error('ENOTFOUND')));
    expect(ingressOrigin(from('172.30.32.2'))).toBe('unknown');
  });

  it("retient l'adresse résolue", async () => {
    await initIngressTrust(() => Promise.resolve({ address: '172.30.32.2' }));
    expect(ingressOrigin(from('172.30.32.2'))).toBe('ok');
  });
});

describe("haAuthMiddleware — en-tête d'ingress forgé", () => {
  /** L'app réelle : le middleware d'authentification devant une route quelconque. */
  const ingressApp = () => {
    const app = express();
    app.get('/api/config', haAuthMiddleware, (req, res) => res.json({ isAdmin: req.haUser.isAdmin }));
    return app;
  };

  const previous = { mode: process.env.HA_AUTH_MODE, strict: process.env.INGRESS_STRICT };

  beforeEach(() => {
    process.env.HA_AUTH_MODE = 'ingress';
    // supertest se connecte en loopback : toute requête vient donc d'une
    // adresse qui n'est pas celle-ci — exactement le cas d'un autre add-on.
    setSupervisorAddress('172.30.32.2');
  });

  afterEach(() => {
    setSupervisorAddress(null);
    process.env.HA_AUTH_MODE = previous.mode;
    if (previous.strict === undefined) delete process.env.INGRESS_STRICT;
    else process.env.INGRESS_STRICT = previous.strict;
  });

  it('laisse passer en journalisant, par défaut', async () => {
    // Un faux négatif rendrait le dashboard inaccessible depuis Home Assistant :
    // pire que le risque résiduel. On observe avant de refuser.
    delete process.env.INGRESS_STRICT;
    const res = await request(ingressApp()).get('/api/config').set('X-Ingress-Path', '/');
    expect(res.status).toBe(200);
  });

  it('refuse en mode strict', async () => {
    process.env.INGRESS_STRICT = 'true';
    const res = await request(ingressApp()).get('/api/config').set('X-Ingress-Path', '/');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/supervisor/i);
  });

  it("ne refuse rien quand l'adresse du superviseur est inconnue, même en strict", async () => {
    // Hors add-on, « supervisor » ne se résout pas : le contrôle doit rester
    // inerte plutôt que verrouiller une installation qui marchait.
    setSupervisorAddress(null);
    process.env.INGRESS_STRICT = 'true';
    const res = await request(ingressApp()).get('/api/config').set('X-Ingress-Path', '/');
    expect(res.status).toBe(200);
  });

  it("refuse toujours une requête d'ingress sans l'en-tête", async () => {
    const res = await request(ingressApp()).get('/api/config');
    expect(res.status).toBe(401);
  });
});
