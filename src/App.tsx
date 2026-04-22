import { ThemeProvider } from '@hakit/components';
import { HassConnect } from '@hakit/core';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { ToastContainer } from '@/components/ui/Toast/components/Toast';
import { useHAToast } from '@/hooks/useHAToast';
import Dashboard from './Dashboard';
import { ModalContainer } from './components/ui/Modal/composents/Modal';
import { ThemeContextProvider, useTheme } from '@/context/ThemeContext';
import { I18nProvider } from '@/i18n';
import { BackgroundLayer } from '@/components/layout/BackgroundLayer';
import { MotionConfig } from 'framer-motion';
import { useState, useEffect, type ReactNode } from 'react';
import { useAutoTheme } from '@/hooks/useAutoTheme';
import { apiUrl } from '@/lib/api-base';

function MotionConfigBridge({ children }: { children: ReactNode }) {
  const { perfSettings } = useTheme();
  return <MotionConfig reducedMotion={perfSettings.reduceAnimations ? 'always' : 'user'}>{children}</MotionConfig>;
}

/** Mounts the HA event subscription inside the providers */
function HAToastBridge() {
  useHAToast();
  return null;
}

function AutoThemeBridge() {
  useAutoTheme();
  return null;
}

/**
 * Resolve the HA URL the browser should connect to.
 *
 * - Ingress mode: `window.location.origin` (user is already on homeassistant.local:8123)
 * - Dev / VITE_HA_URL set: use the env value
 * - Fallback: http://homeassistant:8123
 */
function resolveHassUrl(): string {
  // When loaded via ingress the pathname starts with /api/hassio_ingress/<token>/
  if (window.location.pathname.startsWith('/api/hassio_ingress/')) {
    return window.location.origin;
  }
  return import.meta.env.VITE_HA_URL ?? 'http://homeassistant:8123';
}

interface AppProps {
  hassUrl?: string;
  hassToken?: string;
}

function App({ hassUrl: propHassUrl, hassToken: propHassToken }: AppProps = {}) {
  const [hassToken, setHassToken] = useState<string | undefined>(
    propHassToken ?? import.meta.env.VITE_HA_TOKEN ?? undefined
  );
  const hassUrl = propHassUrl ?? resolveHassUrl();

  // Fetch the HA token from the add-on server (reads /data/options.json ha_token).
  // Only runs when no token was provided via props/env.
  useEffect(() => {
    if (hassToken) return;
    fetch(apiUrl('/api/system/ha-config'))
      .then(r => r.json())
      .then((data: { hassToken?: string | null }) => {
        if (data.hassToken) {
          setHassToken(data.hassToken);
        } else {
          console.info('[ha-dashboard] No token in options — HassConnect will open the HA login dialog.');
        }
      })
      .catch(() => {
        console.info('[ha-dashboard] Could not reach server for ha-config, proceeding without token.');
      });
  }, []);

  return (
    <HassConnect hassUrl={hassUrl} hassToken={hassToken}>
      <ThemeProvider />
      <I18nProvider>
        <ThemeContextProvider>
          <BackgroundLayer />
          <MotionConfigBridge>
            <ToastProvider>
              <ModalProvider>
                <HAToastBridge />
                <AutoThemeBridge />
                <Dashboard />
                <ToastContainer />
                <ModalContainer />
              </ModalProvider>
            </ToastProvider>
          </MotionConfigBridge>
        </ThemeContextProvider>
      </I18nProvider>
    </HassConnect>
  );
}

export default App;

function MotionConfigBridge({ children }: { children: ReactNode }) {
  const { perfSettings } = useTheme();
  return <MotionConfig reducedMotion={perfSettings.reduceAnimations ? 'always' : 'user'}>{children}</MotionConfig>;
}

/** Mounts the HA event subscription inside the providers */
function HAToastBridge() {
  useHAToast();
  return null;
}

function AutoThemeBridge() {
  useAutoTheme();
  return null;
}

/**
 * Resolve HA connection config at runtime.
 *
 * Priority (highest → lowest):
 *   1. window.ENV  — injected by run.sh at container startup from /data/options.json
 *   2. import.meta.env.VITE_* — .env file used during local development
 *   3. Hard-coded fallback URL (no token → HA login prompt)
 */
function resolveHAConfig() {
  // window.ENV is written by rootfs/run.sh; cast to avoid TS errors
  const runtimeEnv = (window as { ENV?: { HA_URL?: string; HA_TOKEN?: string } }).ENV ?? {};

  const hassUrl = (runtimeEnv.HA_URL?.trim() || null) ?? import.meta.env.VITE_HA_URL ?? 'http://homeassistant:8123';

  const rawToken = runtimeEnv.HA_TOKEN?.trim() || import.meta.env.VITE_HA_TOKEN;
  const hassToken = rawToken || undefined; // coerce empty string → undefined

  if (!hassToken) {
    console.info('[ha-dashboard] No token provided – HassConnect will open the HA login dialog.');
  }

  return { hassUrl, hassToken };
}

interface AppProps {
  hassUrl?: string;
  hassToken?: string;
}

function App({ hassUrl: propHassUrl, hassToken: propHassToken }: AppProps = {}) {
  const { hassUrl: envHassUrl, hassToken: envHassToken } = resolveHAConfig();
  const hassUrl = propHassUrl ?? envHassUrl;
  const hassToken = propHassToken !== undefined ? propHassToken : envHassToken;

  return (
    <HassConnect hassUrl={hassUrl} hassToken={hassToken}>
      <ThemeProvider />
      <I18nProvider>
        <ThemeContextProvider>
          <BackgroundLayer />
          <MotionConfigBridge>
            <ToastProvider>
              <ModalProvider>
                <HAToastBridge />
                <AutoThemeBridge />
                <Dashboard />
                <ToastContainer />
                <ModalContainer />
              </ModalProvider>
            </ToastProvider>
          </MotionConfigBridge>
        </ThemeContextProvider>
      </I18nProvider>
    </HassConnect>
  );
}

export default App;
