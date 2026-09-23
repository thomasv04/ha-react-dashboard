import type { DashboardConfigV2 } from '@/context/DashboardLayoutContext';
import type { BackgroundConfig } from '@/config/themes';
import type { ThemeId } from '@/config/themes';
import type { PerfSettings, AutoThemeConfig, LayoutSettings } from '@/context/ThemeContext';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface ThemeSettingsSnapshot {
  themeId: ThemeId;
  background: BackgroundConfig;
  cardOpacity: number;
  perfSettings: PerfSettings;
  autoTheme: AutoThemeConfig;
  layoutSettings: LayoutSettings;
}

export interface ConfigSnapshot {
  v: 1;
  theme: ThemeSettingsSnapshot;
  dashboard: DashboardConfigV2;
}

const PREFIX = 'HADASH2:';

// ── Helpers ─────────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

/**
 * deflate-raw dans un sens ou dans l'autre.
 *
 * `Response` sait déjà vider un stream : les deux fonctions d'avant
 * recollaient les chunks à la main, vingt-cinq lignes chacune pour ce que la
 * plateforme fait en une. (`Blob.stream()` ferait aussi l'entrée, mais jsdom
 * ne l'implémente pas — d'où le writer.)
 */
async function pipe(data: Uint8Array, Stream: typeof CompressionStream | typeof DecompressionStream): Promise<Uint8Array> {
  const { readable, writable } = new Stream('deflate-raw');
  const writer = writable.getWriter();
  // Les erreurs de flux remontent par la lecture ; sans ces `catch`, une entrée
  // illisible rejetterait aussi côté écriture, sans personne pour l'attraper.
  writer.write(data as unknown as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(readable).arrayBuffer());
}

// ── Encode ──────────────────────────────────────────────────────────────────────
// JSON → UTF-8 → deflate-raw → base64 → prefixed string

export async function encodeConfig(snapshot: ConfigSnapshot): Promise<string> {
  const json = JSON.stringify(snapshot);
  const raw = new TextEncoder().encode(json);
  const compressed = await pipe(raw, CompressionStream);
  return PREFIX + uint8ToBase64(compressed);
}

// ── Decode ──────────────────────────────────────────────────────────────────────

export async function decodeConfig(str: string): Promise<ConfigSnapshot> {
  const trimmed = str.trim();

  if (!trimmed.startsWith(PREFIX)) {
    throw new Error('INVALID_PREFIX');
  }

  const base64 = trimmed.slice(PREFIX.length);

  let compressed: Uint8Array;
  try {
    compressed = base64ToUint8(base64);
  } catch {
    throw new Error('INVALID_BASE64');
  }

  let jsonStr: string;
  try {
    const raw = await pipe(compressed, DecompressionStream);
    jsonStr = new TextDecoder().decode(raw);
  } catch {
    throw new Error('INVALID_COMPRESSED');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('INVALID_JSON');
  }

  if (!parsed || typeof parsed !== 'object' || !('v' in parsed) || (parsed as { v: unknown }).v !== 1) {
    throw new Error('INVALID_VERSION');
  }

  const snap = parsed as ConfigSnapshot;

  if (!snap.theme || !snap.dashboard) {
    throw new Error('MISSING_DATA');
  }

  return snap;
}
