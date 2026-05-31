# Camera Streaming — Analyse de l'approche Tunet

## Résumé

Tunet utilise le **MJPEG natif du navigateur** via une simple balise `<img>` pointant vers l'endpoint Home Assistant `/api/camera_proxy_stream/{entity_id}`. C'est la raison pour laquelle leur flux caméra apparaît ultra-fluide avec quasi aucun appel réseau visible dans le Network tab.

## Principe technique

### MJPEG over HTTP (multipart/x-mixed-replace)

L'endpoint HA `/api/camera_proxy_stream/{entity_id}?token={access_token}` retourne un flux `multipart/x-mixed-replace` : une seule connexion HTTP reste ouverte et le serveur envoie des frames JPEG en continu.

Le navigateur sait nativement afficher ce type de contenu dans un `<img>` — aucun JavaScript n'est nécessaire pour décoder ou rafraîchir l'image.

```
Navigateur                         Home Assistant
   │                                    │
   │  GET /api/camera_proxy_stream/cam  │
   │ ──────────────────────────────────> │
   │                                    │
   │  HTTP 200                          │
   │  Content-Type: multipart/          │
   │    x-mixed-replace; boundary=frame │
   │ <────────────────────────────────── │
   │                                    │
   │  --frame                           │
   │  Content-Type: image/jpeg          │
   │  [JPEG data frame 1]              │
   │ <────────────────────────────────── │
   │                                    │
   │  --frame                           │
   │  Content-Type: image/jpeg          │
   │  [JPEG data frame 2]              │
   │ <────────────────────────────────── │
   │                                    │
   │  ... (continu indéfiniment)        │
```

### Pourquoi c'est fluide

| Propriété | MJPEG (`<img>`) | HLS (`<video>` + hls.js) |
|---|---|---|
| Connexions réseau | **1 seule** (ouverte en continu) | Multiples (manifest + segments .ts) |
| Visibilité dans Network tab | **1 requête** pendante | Dizaines de requêtes |
| Latence | ~100-300ms | ~2-5s (buffer obligatoire) |
| CPU côté client | Quasi nul (natif navigateur) | Plus élevé (décodage JS hls.js) |
| Bande passante | Plus élevée (pas de compression inter-frames) | Plus efficace (H.264/H.265) |
| Complexité code | `<img src="url">` | hls.js + `<video>` + gestion buffer |
| Compatibilité | Universel | Nécessite hls.js ou Safari natif |

### HLS — avantages pour la qualité

HLS est techniquement supérieur en termes de compression (codec H.264 avec compression inter-frames vs JPEG indépendants). Il est préférable pour :
- Les flux haute résolution (4K)
- Les connexions à bande passante limitée
- Les enregistrements / DVR

## Architecture Tunet : fallback en cascade

```
1. WebRTC  (si URL custom configurée)
     ↓ onError
2. HA MJPEG Stream  (/api/camera_proxy_stream)
     ↓ onError
3. Snapshot polling  (/api/camera_proxy + timestamp)
```

Chaque niveau tombe automatiquement au suivant via `onError` sur le `<img>`. Le code :

```jsx
const handleStreamError = useCallback(() => {
  setStreamSource((current) => {
    if (current === 'webrtc') return haStreamUrl ? 'ha' : 'snapshot';
    if (current === 'ha') return 'snapshot';
    return current;
  });
}, [haStreamUrl]);

<img src={previewUrl} onError={handleStreamError} />
```

## Optimisations notables

1. **`memo()` sur le composant** — pas de re-render si les props ne changent pas
2. **`useMemo()` sur les URLs** — recalcul uniquement quand `entityId` ou `accessToken` change
3. **Cache-busting par timestamp** uniquement sur les snapshots (pas le stream MJPEG)
4. **Refresh par motion sensor** — en mode snapshot, rafraîchit uniquement sur transition `off→on` du capteur de mouvement
5. **`referrerPolicy="no-referrer"`** — sécurité réseau

## Notre implémentation

On supporte maintenant les deux modes via le champ `streamMode` dans la config caméra :

- **`mjpeg`** (défaut) — Utilise l'approche Tunet : `<img>` vers `/api/camera_proxy_stream`
- **`hls`** — Utilise hls.js avec `<video>` pour les flux HLS (meilleure compression, plus de latence)

Le composant `CameraFeed` choisit automatiquement le rendu en fonction de ce paramètre, avec fallback MJPEG si HLS échoue.
