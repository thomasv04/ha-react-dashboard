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

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  // TS 5.7 paramètre Uint8Array par son buffer ; `BufferSource` attend un
  // ArrayBuffer strict. Le cast est sûr, la donnée est bien un Uint8Array.
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  // Write and close — suppress rejections on the writable side
  // (errors will surface via the readable side)
  writer.write(data as unknown as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// ── Encode ──────────────────────────────────────────────────────────────────────
// JSON → UTF-8 → deflate-raw → base64 → prefixed string

export async function encodeConfig(snapshot: ConfigSnapshot): Promise<string> {
  const json = JSON.stringify(snapshot);
  const raw = new TextEncoder().encode(json);
  const compressed = await compress(raw);
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
    const raw = await decompress(compressed);
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
