import fs from 'fs';

/**
 * Client du serveur Music Assistant (MA), côté add-on.
 *
 * HA n'expose de la file d'attente que le titre en cours et le suivant. La
 * liste complète, son ordre et le retrait d'un titre ne passent que par l'API
 * de MA lui-même — un WebSocket sur le port 8095, qui exige un jeton depuis la
 * 2.7. Le jeton reste ici, dans l'add-on : les tablettes ne le voient jamais,
 * et rien n'est ouvert sur Internet (l'add-on joint MA sur le réseau interne).
 *
 * Une seule connexion, ouverte à la première demande et rouverte si elle tombe.
 */

/** MA tourne sur le réseau de l'hôte ; un add-on le joint par la passerelle du superviseur. */
const ADDON_DEFAULT_URL = 'http://172.30.32.1:8095';
const TIMEOUT_MS = 8_000;

/**
 * Adresse et jeton de MA : options de l'add-on (`/data/options.json`), sinon
 * variables d'environnement `MA_URL` / `MA_TOKEN` (développement).
 *
 * @returns {{ url: string, token: string } | null}
 */
export function massSettings(optionsPath = process.env.OPTIONS_PATH || '/data/options.json') {
  let options = {};
  try {
    options = JSON.parse(fs.readFileSync(optionsPath, 'utf8'));
  } catch {
    // Hors add-on : pas d'options, on lit l'environnement.
  }
  const token = String(options.music_assistant_token || process.env.MA_TOKEN || '').trim();
  const url = String(options.music_assistant_url || process.env.MA_URL || (process.env.SUPERVISOR_TOKEN ? ADDON_DEFAULT_URL : ''))
    .trim()
    .replace(/\/+$/, '');
  return token && url ? { url, token } : null;
}

export class MassError extends Error {
  /** @param {string} message @param {'unreachable' | 'auth' | 'command'} kind */
  constructor(message, kind) {
    super(message);
    this.kind = kind;
  }
}

/**
 * @param {{ url: string, token: string }} settings
 * @param {{ WebSocketImpl?: typeof WebSocket, timeoutMs?: number }} [deps]
 */
export function createMassClient({ url, token }, { WebSocketImpl = globalThis.WebSocket, timeoutMs = TIMEOUT_MS } = {}) {
  /** @type {Promise<WebSocket> | null} */
  let ready = null;
  /** @type {Map<string, { resolve: (v: unknown) => void, reject: (e: Error) => void, timer: ReturnType<typeof setTimeout> }>} */
  const pending = new Map();
  let nextId = 0;

  const failAll = error => {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  };

  /** Ouvre la connexion et s'authentifie : MA envoie d'abord ses infos, puis on présente le jeton. */
  const connect = () =>
    new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocketImpl(`${url.replace(/^http/, 'ws')}/ws`);
      } catch {
        return reject(new MassError('Music Assistant unreachable', 'unreachable'));
      }
      let authenticated = false;
      const timer = setTimeout(() => {
        reject(new MassError('Music Assistant did not answer', 'unreachable'));
        try {
          ws.close();
        } catch {
          // déjà fermée
        }
      }, timeoutMs);

      ws.onmessage = event => {
        let msg;
        try {
          msg = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
        } catch {
          return;
        }
        if (!authenticated && msg.server_id && !msg.message_id) {
          ws.send(JSON.stringify({ message_id: 'auth', command: 'auth', args: { token, device_name: 'HA React Dashboard' } }));
          return;
        }
        if (msg.message_id === 'auth') {
          clearTimeout(timer);
          if (msg.error_code) {
            reject(new MassError(msg.details || 'Authentication failed', 'auth'));
            ws.close();
          } else {
            authenticated = true;
            resolve(ws);
          }
          return;
        }
        const waiting = pending.get(msg.message_id);
        // Les résultats partiels (`partial: true`) d'une longue liste arrivent en plusieurs fois.
        if (!waiting || msg.partial) return;
        clearTimeout(waiting.timer);
        pending.delete(msg.message_id);
        if (msg.error_code) waiting.reject(new MassError(msg.details || `error ${msg.error_code}`, 'command'));
        else waiting.resolve(msg.result);
      };
      ws.onerror = () => {
        if (!authenticated) {
          clearTimeout(timer);
          reject(new MassError('Music Assistant unreachable', 'unreachable'));
        }
      };
      ws.onclose = () => {
        ready = null;
        failAll(new MassError('Music Assistant connection closed', 'unreachable'));
      };
    });

  /**
   * Envoie une commande MA et rend son résultat.
   * @param {string} command
   * @param {Record<string, unknown>} [args]
   */
  async function request(command, args = {}) {
    if (!ready) {
      ready = connect();
      // Un échec (jeton refusé, MA arrêté) ne doit pas rester en cache : la demande suivante réessaie.
      ready.catch(() => (ready = null));
    }
    const ws = await ready;
    const id = String(++nextId);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new MassError(`${command} timed out`, 'unreachable'));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ message_id: id, command, args }));
    });
  }

  return { request };
}
