/**
 * HA React Dashboard — Web Component entry point
 *
 * When installed via HACS as an integration, HA loads this JS bundle and registers
 * the <ha-react-dashboard-panel> custom element. HA then injects the `hass` object
 * via the setter, giving us the access token and HA URL without any manual config.
 */
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@hakit/components';
import { HassConnect } from '@hakit/core';
import { ToastProvider } from '@/context/ToastContext';
import { ToastContainer } from '@/components/ui/Toast';
import { useHAToast } from '@/hooks/useHAToast';
import Dashboard from './Dashboard';
import './index.css';

function HAToastBridge() {
  useHAToast();
  return null;
}

interface PanelAppProps {
  hassUrl: string;
  hassToken?: string;
}

function PanelApp({ hassUrl, hassToken }: PanelAppProps) {
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

class HaReactDashboardPanel extends HTMLElement {
  private _root: ReturnType<typeof createRoot> | null = null;
  private _hassUrl: string = window.location.origin;
  private _hassToken: string | undefined;

  connectedCallback() {
    const mountPoint = document.createElement('div');
    mountPoint.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';
    this.appendChild(mountPoint);
    this._root = createRoot(mountPoint);
    this._render();
  }

  disconnectedCallback() {
    this._root?.unmount();
    this._root = null;
  }

  // HA injects the hass object automatically via this setter on every state update
  set hass(hass: Record<string, unknown>) {
    const auth = hass?.auth as Record<string, unknown> | undefined;
    const data = auth?.data as Record<string, unknown> | undefined;
    if (data) {
      this._hassUrl = (data['hassUrl'] as string) || window.location.origin;
      this._hassToken = data['access_token'] as string | undefined;
    }
    // Only re-render on first hass injection (avoid unnecessary re-renders)
    if (this._root) this._render();
  }

  // Called by HA with panel config (unused here but required by the custom panel contract)
  setConfig(_config: unknown) {}

  private _render() {
    if (!this._root) return;
    this._root.render(<PanelApp hassUrl={this._hassUrl} hassToken={this._hassToken} />);
  }
}

customElements.define('ha-react-dashboard-panel', HaReactDashboardPanel);
