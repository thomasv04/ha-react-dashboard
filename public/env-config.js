// This file is a placeholder for local development.
// In production (Docker/HA add-on), run.sh overwrites this file at container
// startup with values read from /data/options.json.
//
// For local dev, leave HA_URL/HA_TOKEN empty here and use your .env file instead
// (App.tsx falls back to import.meta.env.VITE_HA_URL / VITE_HA_TOKEN).
window.ENV = {
  HA_URL: '',
  HA_TOKEN: '',
};
