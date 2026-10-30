import { useState, useEffect, useCallback } from 'react';
import { History, RotateCcw, AlertTriangle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { apiFetch } from '@/lib/api-base';
import { SECTION_HEADING } from './typography';
import { cn } from '@/lib/utils';

interface HistoryEntry {
  id: number;
  version: number;
  size: number;
  label: string | null;
  created_at: string;
}

/**
 * Les deux backends n'écrivent pas la date pareil : SQLite rend
 * `2026-08-16 13:30:00` (UTC, sans fuseau), le store HA un ISO complet. Sans
 * normalisation, la forme SQLite est interprétée comme heure locale par les
 * navigateurs qui l'acceptent — et rejetée par les autres.
 */
function parseDate(raw: string): Date {
  return new Date(/[TZ+]/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`);
}

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} o` : `${Math.round(bytes / 1024)} ko`;
}

/**
 * Historique de configuration : la seule façon de revenir en arrière après un
 * import raté ou une disposition cassée en mode édition.
 */
export function ConfigHistorySection() {
  const { t, language } = useI18n();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    apiFetch('/api/config/history')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: HistoryEntry[]) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setError(true));
  }, []);

  useEffect(load, [load]);

  const restore = async (id: number) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    try {
      const res = await apiFetch(`/api/config/history/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      // Toute l'application dérive de la configuration — thème, pages, panneaux,
      // configs de widgets. La repropager à chaud demanderait de rejouer à la
      // main ce que fait déjà le démarrage. Un rechargement est plus court et
      // ne peut pas laisser un morceau de l'écran sur l'ancienne version.
      window.location.reload();
    } catch {
      setError(true);
      setConfirmId(null);
    }
  };

  // Backend antérieur à la 2.2.0, ou serveur injoignable : la section n'a rien
  // à proposer, autant ne pas afficher une case vide inquiétante.
  if (error) return null;

  return (
    <div>
      <h3 className={cn(SECTION_HEADING, 'mb-3 flex items-center gap-2')}>
        <History size={12} /> {t('settings.system_section.historyTitle')}
      </h3>
      <p className='text-[var(--ds-ink-muted)] text-xs mb-4 leading-relaxed'>{t('settings.system_section.historyDesc')}</p>

      {entries === null ? (
        <p className='text-[var(--ds-ink-muted)] text-xs'>{t('common.loading')}</p>
      ) : entries.length === 0 ? (
        <p className='text-[var(--ds-ink-muted)] text-xs italic'>{t('settings.system_section.historyEmpty')}</p>
      ) : (
        <ul className='flex flex-col gap-1.5'>
          {entries.map(entry => (
            <li
              key={entry.id}
              className='flex items-center gap-2 bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] rounded-[var(--ds-radius-sm)] px-3 py-2'
            >
              <div className='flex-1 min-w-0'>
                <span className='text-[var(--ds-ink)] text-xs block truncate'>{parseDate(entry.created_at).toLocaleString(language)}</span>
                <span className='text-[var(--ds-ink-muted)] text-sm'>
                  {formatSize(entry.size)}
                  {entry.label ? ` · ${entry.label}` : ''}
                </span>
              </div>
              <button
                onClick={() => restore(entry.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-sm)] border transition-colors text-xs font-semibold flex-shrink-0 ${
                  confirmId === entry.id
                    ? 'bg-[var(--ds-surface-3)] border-[var(--ds-warm-light)] text-[var(--ds-warm-light)]'
                    : 'bg-[var(--ds-surface-3)] border-[var(--ds-surface-3)] text-[var(--ds-ink)]'
                }`}
              >
                {confirmId === entry.id ? <AlertTriangle size={12} /> : <RotateCcw size={12} />}
                {confirmId === entry.id ? t('settings.system_section.historyConfirm') : t('common.restore')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
