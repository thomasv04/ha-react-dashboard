import { ThemeProvider } from '@hakit/components';
import { HassConnect } from '@hakit/core';
import { ToastProvider } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';
import { useHAToast } from '@/hooks/useHAToast';
import Dashboard from './Dashboard';

/** Mounts the HA event subscription inside the providers */
function HAToastBridge() {
  useHAToast();
  return null;
}

/**
 * Resolve HA URL based on environment
 * - If VITE_NO_AUTH is true (add-on mode): use local URL without token
 * - Otherwise: use configured URL with token
 */
function resolveHAConfig() {
  const isAddonMode = import.meta.env.VITE_NO_AUTH === 'true';

  if (isAddonMode) {
    // Add-on mode: use local connection without token
    const url = import.meta.env.VITE_HA_URL || 'http://homeassistant:8123';
    return { hassUrl: url, hassToken: undefined };
  }

  // Standard mode: require token from environment
  const token = import.meta.env.VITE_HA_TOKEN;
  if (!token) {
    console.warn('VITE_HA_TOKEN is not set. Connection may fail.');
  }

  return {
    hassUrl: import.meta.env.VITE_HA_URL || 'http://localhost:8123',
    hassToken: token,
  };
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
      <ToastProvider>
        <HAToastBridge />
        <Dashboard />
        <ToastContainer />
      </ToastProvider>
    </HassConnect>
  );
}

export default App;
