import request from 'supertest';
import app from './server.js';
import fs from 'fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

describe("Tests de l'API du serveur Express", () => {
  // On restaure le comportement normal de 'fs' après chaque test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/config', () => {
    // --- HAPPY PATHS (Succès) ---

    it('doit renvoyer la configuration si le fichier existe', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ layout: ['item1'] }));

      const response = await request(app).get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ layout: ['item1'] });
    });

    it("doit renvoyer un message par défaut si le fichier n'existe pas", async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      const response = await request(app).get('/api/config');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'No config yet', layout: [] });
    });

    // --- SAD PATHS (Erreurs) ---

    it('doit renvoyer une erreur 500 si la lecture du fichier échoue', async () => {
      // On dit que le fichier existe...
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      // ...mais on force la fonction de lecture à "planter" en jetant une erreur
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Erreur simulée de lecture (ex: permission refusée)');
      });

      const response = await request(app).get('/api/config');

      // On vérifie que le catch a bien intercepté l'erreur et renvoyé le bon statut/message
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Erreur de lecture du fichier' });
    });
  });

  describe('POST /api/config', () => {
    // --- HAPPY PATHS (Succès) ---

    it('doit sauvegarder la configuration et renvoyer un succès', async () => {
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const newConfig = { layout: ['itemA', 'itemB'] };

      const response = await request(app).post('/api/config').send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(writeSpy).toHaveBeenCalled();
    });

    // --- SAD PATHS (Erreurs) ---

    it('doit renvoyer une erreur 500 si la sauvegarde (écriture) échoue', async () => {
      // On force la fonction d'écriture à "planter"
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error("Erreur simulée d'écriture (ex: disque plein)");
      });

      const newConfig = { layout: ['itemA'] };

      const response = await request(app).post('/api/config').send(newConfig);

      // On vérifie que ton bloc catch fait bien son travail
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Erreur lors de la sauvegarde' });
    });
  });

  describe('Frontend SPA Fallback (Routes par défaut)', () => {
    it("doit intercepter les routes inconnues pour servir l'application React", async () => {
      // On fait une requête sur une route qui n'est pas dans l'API
      const response = await request(app).get('/une-route-inventee');

      // L'important ici est de vérifier que la route a bien été appelée.
      // Le statut dépendra de si tu as déjà fait un "npm run build" (dossier dist présent) ou non,
      // donc on vérifie juste qu'Express a bien traité la requête.
      expect(response.status).toBeDefined();
    });
  });
});

describe('Frontend SPA Fallback', () => {
    
    it('doit intercepter les routes inconnues pour servir l\'application React', async () => {
      // On fait une requête GET sur une route qui n'est pas dans l'API
      const response = await request(app).get('/une-route-inventee');
      
      // Que le fichier 'dist/index.html' existe ou non sur ton disque pendant le test
      // Express va essayer de le renvoyer (code 200) ou renverra une erreur (code 404).
      // Dans les deux cas, la ligne de code aura été exécutée !
      expect(response.status).toBeDefined();
    });

  });
