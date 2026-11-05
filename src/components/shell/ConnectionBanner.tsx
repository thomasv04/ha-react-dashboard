import { useEffect, useState } from 'react';
import { useHass } from '@hakit/core';
import { WifiOff } from 'lucide-react';
import { useI18n } from '@/i18n';

/**
 * Délai avant d'annoncer la coupure : une reconnexion éclair (redémarrage du
 * Wi-Fi, onglet repris) ne doit pas faire clignoter l'écran.
 */
const GRACE_MS = 3000;

type Status = 'up' | 'lost' | 'failed';

/**
 * Bandeau « connexion perdue ». Un écran mural reste allumé des mois : sans lui,
 * une coupure laissait des tuiles figées sur des états périmés, sans rien qui
 * le dise. `home-assistant-js-websocket` se reconnecte seul ; il n'abandonne
 * que si Home Assistant refuse le jeton (`reconnect-error`) — il faut alors
 * recharger la page pour en obtenir un neuf.
 */
export function ConnectionBanner() {
  const { t } = useI18n();
  const connection = useHass(s => s.connection);
  const [status, setStatus] = useState<Status>('up');

  useEffect(() => {
    if (!connection) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const down = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setStatus(s => (s === 'failed' ? s : 'lost')), GRACE_MS);
    };
    const up = () => {
      clearTimeout(timer);
      setStatus('up');
    };
    const failed = () => {
      clearTimeout(timer);
      setStatus('failed');
    };
    connection.addEventListener('disconnected', down);
    connection.addEventListener('ready', up);
    connection.addEventListener('reconnect-error', failed);
    return () => {
      clearTimeout(timer);
      connection.removeEventListener('disconnected', down);
      connection.removeEventListener('ready', up);
      connection.removeEventListener('reconnect-error', failed);
    };
  }, [connection]);

  if (status === 'up') return null;
  return (
    <div
      role='status'
      data-connection={status}
      className='fixed left-1/2 top-4 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-[var(--ds-radius-pill)] bg-[var(--ds-alert)] py-2 pl-4 pr-2 text-sm font-semibold text-white shadow-[var(--ds-shadow-sheet)]'
    >
      <WifiOff size={18} aria-hidden='true' />
      <span className='py-1 pr-2'>{t(status === 'lost' ? 'dashboard.connection.lost' : 'dashboard.connection.failed')}</span>
      {status === 'failed' && (
        <button
          onClick={() => window.location.reload()}
          className='h-8 rounded-[var(--ds-radius-pill)] bg-white/20 px-4 text-sm font-semibold'
        >
          {t('dashboard.connection.reload')}
        </button>
      )}
    </div>
  );
}
