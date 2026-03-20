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

function App() {
  return (
    <HassConnect hassUrl={import.meta.env.VITE_HA_URL} hassToken={import.meta.env.VITE_HA_TOKEN}>
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
