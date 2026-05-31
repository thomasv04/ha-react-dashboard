import { describe, it, expect } from 'vitest';
import { encodeConfig, decodeConfig, type ConfigSnapshot } from './config-string';

// ── Fixtures ────────────────────────────────────────────────────────────────────

const MINIMAL_SNAPSHOT: ConfigSnapshot = {
  v: 1,
  theme: {
    themeId: 'dark',
    background: { mode: 'solid' },
    cardOpacity: 0.12,
    perfSettings: {
      reduceBlur: false,
      reduceAnimations: false,
      disableShadows: false,
      disableModalAnimation: false,
    },
    autoTheme: { enabled: false, lightTheme: 'light', darkTheme: 'dark' },
    layoutSettings: { gridGap: 16, cardRadius: 24, rowHeight: 80 },
  },
  dashboard: {
    version: 2,
    pages: [{ id: 'home', label: 'Home', icon: '🏠' }],
    layouts: {
      home: {
        widgets: { lg: [], md: [], sm: [] },
        cols: { lg: 12, md: 8, sm: 4 },
      },
    },
    widgetConfigs: { home: {} },
  },
};

const LARGE_SNAPSHOT: ConfigSnapshot = {
  v: 1,
  theme: {
    themeId: 'clay',
    background: {
      mode: 'gradient',
      color1: '#1a1a2e',
      color2: '#16213e',
      angle: 135,
    } as ConfigSnapshot['theme']['background'],
    cardOpacity: 0.25,
    perfSettings: {
      reduceBlur: true,
      reduceAnimations: false,
      disableShadows: true,
      disableModalAnimation: false,
    },
    autoTheme: { enabled: true, lightTheme: 'light', darkTheme: 'dark' },
    layoutSettings: { gridGap: 20, cardRadius: 16, rowHeight: 100 },
  },
  dashboard: {
    version: 2,
    pages: [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'media', label: 'Media', icon: '🎵' },
      { id: 'security', label: 'Sécurité', icon: '🔒' },
    ],
    layouts: {
      home: {
        widgets: {
          lg: [
            { id: 'w1', type: 'weather', x: 0, y: 0, w: 4, h: 3 },
            { id: 'w2', type: 'light', x: 4, y: 0, w: 2, h: 2 },
            { id: 'w3', type: 'climate', x: 6, y: 0, w: 3, h: 2 },
            { id: 'w4', type: 'camera', x: 0, y: 3, w: 6, h: 4 },
          ],
          md: [
            { id: 'w1', type: 'weather', x: 0, y: 0, w: 4, h: 3 },
            { id: 'w2', type: 'light', x: 4, y: 0, w: 2, h: 2 },
          ],
          sm: [
            { id: 'w1', type: 'weather', x: 0, y: 0, w: 4, h: 3 },
          ],
        },
        cols: { lg: 12, md: 8, sm: 4 },
      },
      media: {
        widgets: { lg: [], md: [], sm: [] },
        cols: { lg: 12, md: 8, sm: 4 },
      },
      security: {
        widgets: { lg: [], md: [], sm: [] },
        cols: { lg: 12, md: 8, sm: 4 },
      },
    },
    widgetConfigs: {
      home: {
        w1: { entity_id: 'weather.home' },
        w2: { entity_id: 'light.salon' },
        w3: { entity_id: 'climate.thermostat' },
        w4: { entity_id: 'camera.front' },
      },
      media: {},
      security: {},
    },
    customPanels: [
      { id: 'custom:test', label: 'Test Panel', icon: '🧪' },
    ],
  },
};

// ── Round-trip tests ────────────────────────────────────────────────────────────

describe('config-string', () => {
  describe('encodeConfig', () => {
    it('produces a string starting with HADASH2:', async () => {
      const result = await encodeConfig(MINIMAL_SNAPSHOT);
      expect(result).toMatch(/^HADASH2:/);
    });

    it('produces a non-empty payload after prefix', async () => {
      const result = await encodeConfig(MINIMAL_SNAPSHOT);
      const payload = result.slice('HADASH2:'.length);
      expect(payload.length).toBeGreaterThan(0);
    });

    it('compressed output is shorter than raw base64', async () => {
      const compressed = await encodeConfig(LARGE_SNAPSHOT);
      const rawJson = JSON.stringify(LARGE_SNAPSHOT);
      // Raw base64 via TextEncoder (handles unicode safely)
      const rawBytes = new TextEncoder().encode(rawJson);
      let binary = '';
      for (let i = 0; i < rawBytes.length; i++) binary += String.fromCharCode(rawBytes[i]);
      const rawBase64Len = 'HADASH2:'.length + btoa(binary).length;
      expect(compressed.length).toBeLessThan(rawBase64Len);
    });
  });

  describe('decodeConfig', () => {
    it('round-trips a minimal config', async () => {
      const encoded = await encodeConfig(MINIMAL_SNAPSHOT);
      const decoded = await decodeConfig(encoded);
      expect(decoded).toEqual(MINIMAL_SNAPSHOT);
    });

    it('round-trips a large config with widgets, pages, custom panels', async () => {
      const encoded = await encodeConfig(LARGE_SNAPSHOT);
      const decoded = await decodeConfig(encoded);
      expect(decoded).toEqual(LARGE_SNAPSHOT);
    });

    it('preserves unicode characters (emojis, accented chars)', async () => {
      const snap: ConfigSnapshot = {
        ...MINIMAL_SNAPSHOT,
        dashboard: {
          ...MINIMAL_SNAPSHOT.dashboard,
          pages: [{ id: 'home', label: 'Séjour 🏡', icon: '🇫🇷' }],
        },
      };
      const encoded = await encodeConfig(snap);
      const decoded = await decodeConfig(encoded);
      expect(decoded.dashboard.pages[0].label).toBe('Séjour 🏡');
      expect(decoded.dashboard.pages[0].icon).toBe('🇫🇷');
    });

    it('handles leading/trailing whitespace in input', async () => {
      const encoded = await encodeConfig(MINIMAL_SNAPSHOT);
      const decoded = await decodeConfig(`  \n${encoded}\n  `);
      expect(decoded).toEqual(MINIMAL_SNAPSHOT);
    });
  });

  // ── Error cases ─────────────────────────────────────────────────────────────

  describe('decodeConfig error handling', () => {
    it('throws INVALID_PREFIX for empty string', async () => {
      await expect(decodeConfig('')).rejects.toThrow('INVALID_PREFIX');
    });

    it('throws INVALID_PREFIX for random text', async () => {
      await expect(decodeConfig('hello world')).rejects.toThrow('INVALID_PREFIX');
    });

    it('throws INVALID_PREFIX for old HADASH1: prefix', async () => {
      await expect(decodeConfig('HADASH1:abc123')).rejects.toThrow('INVALID_PREFIX');
    });

    it('throws INVALID_BASE64 for invalid base64 after prefix', async () => {
      await expect(decodeConfig('HADASH2:!!!not-base64!!!')).rejects.toThrow('INVALID_BASE64');
    });

    it('throws INVALID_COMPRESSED for valid base64 but not deflate data', async () => {
      const fakeBase64 = btoa('this is not compressed data');
      await expect(decodeConfig(`HADASH2:${fakeBase64}`)).rejects.toThrow('INVALID_COMPRESSED');
    });

    it('throws INVALID_VERSION for v:999', async () => {
      // Manually compress valid JSON with wrong version
      const json = JSON.stringify({ v: 999, theme: {}, dashboard: {} });
      const raw = new TextEncoder().encode(json);
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(raw);
      writer.close();
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const compressed = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) { compressed.set(c, offset); offset += c.length; }
      let binary = '';
      for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
      const b64 = btoa(binary);

      await expect(decodeConfig(`HADASH2:${b64}`)).rejects.toThrow('INVALID_VERSION');
    });

    it('throws MISSING_DATA when theme is absent', async () => {
      const json = JSON.stringify({ v: 1, dashboard: {} });
      const raw = new TextEncoder().encode(json);
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(raw);
      writer.close();
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const compressed = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) { compressed.set(c, offset); offset += c.length; }
      let binary = '';
      for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
      const b64 = btoa(binary);

      await expect(decodeConfig(`HADASH2:${b64}`)).rejects.toThrow('MISSING_DATA');
    });

    it('throws MISSING_DATA when dashboard is absent', async () => {
      const json = JSON.stringify({ v: 1, theme: { themeId: 'dark' } });
      const raw = new TextEncoder().encode(json);
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(raw);
      writer.close();
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const compressed = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) { compressed.set(c, offset); offset += c.length; }
      let binary = '';
      for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
      const b64 = btoa(binary);

      await expect(decodeConfig(`HADASH2:${b64}`)).rejects.toThrow('MISSING_DATA');
    });
  });

  // ── Stability ───────────────────────────────────────────────────────────────

  describe('stability', () => {
    it('two encodes of the same data produce decodable strings', async () => {
      const a = await encodeConfig(MINIMAL_SNAPSHOT);
      const b = await encodeConfig(MINIMAL_SNAPSHOT);
      // Both should decode to the same result (content-equal)
      const da = await decodeConfig(a);
      const db = await decodeConfig(b);
      expect(da).toEqual(db);
      expect(da).toEqual(MINIMAL_SNAPSHOT);
    });

    it('handles snapshot with empty widgets and configs', async () => {
      const snap: ConfigSnapshot = {
        v: 1,
        theme: MINIMAL_SNAPSHOT.theme,
        dashboard: {
          version: 2,
          pages: [],
          layouts: {},
          widgetConfigs: {},
        },
      };
      const encoded = await encodeConfig(snap);
      const decoded = await decodeConfig(encoded);
      expect(decoded.dashboard.pages).toEqual([]);
      expect(decoded.dashboard.layouts).toEqual({});
    });
  });
});
