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
import type { ReactNode } from 'react';
import { useAutoTheme } from '@/hooks/useAutoTheme';

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
