import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration pour ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8099;

// Chemin du fichier de sauvegarde.
// Dans l'Add-on HA, ce sera /data/dashboard_config.json
const CONFIG_FILE = process.env.OPTIONS_FILE || path.join(__dirname, 'dashboard_config.json');

// Middleware pour lire le JSON envoyé par React
app.use(express.json());

// ------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------

// 1. Lire la configuration sauvegardée
app.get('/api/config', (req, res) => {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: 'Erreur de lecture du fichier' });
    }
  } else {
    // Si le fichier n'existe pas encore (première utilisation)
    res.json({ message: 'No config yet', layout: [] });
  }
});

// 2. Sauvegarder une nouvelle configuration
app.post('/api/config', (req, res) => {
  try {
    // On écrit le JSON formaté (avec indentations) dans le fichier
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

// ------------------------------------------------------------------
// FRONTEND (Vite / React)
// ------------------------------------------------------------------

// Servir les fichiers statiques générés par "npm run build"
app.use(express.static(path.join(__dirname, 'dist')));

// Pour toutes les autres routes (SPA), renvoyer index.html
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Lancement du serveur
app.listen(PORT, () => {
  console.log(`[Backend] Serveur démarré sur le port ${PORT}`);
  console.log(`[Backend] Fichier de sauvegarde utilisé : ${CONFIG_FILE}`);
});
