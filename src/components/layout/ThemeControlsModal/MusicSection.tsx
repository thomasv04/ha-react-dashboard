import { useEffect, useState } from 'react';
import { CheckCircle2, Music, TriangleAlert } from 'lucide-react';
import { apiFetch } from '@/lib/api-base';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT } from './controls';
import { FIELD_LABEL, SECTION_HEADING, SETTINGS_CARD } from './typography';

interface MusicStatus {
  configured: boolean;
  url: string;
  source: 'settings' | 'addon' | 'env' | null;
}

type Result = 'saved' | 'auth' | 'unreachable' | 'invalid' | 'missingUrl' | 'outdated' | null;

/**
 * Le serveur du dashboard répond-il à ces routes ? Un add-on d'avant cette
 * section renvoie 404, ou la page de l'appli (son repli pour toute adresse
 * inconnue) au lieu de JSON.
 */
async function readJson(res: Response): Promise<{ ok: boolean; outdated: boolean; body: Record<string, unknown> }> {
  const json = (res.headers.get('content-type') ?? '').includes('application/json');
  const body = json ? await res.json().catch(() => ({})) : {};
  return { ok: res.ok && json, outdated: res.status === 404 || !json, body };
}

/**
 * La connexion à Music Assistant, pour la file d'attente complète de l'appli
 * Musique. L'adresse et le jeton sont enregistrés par l'add-on, une fois pour
 * tous les appareils ; le jeton n'en ressort jamais — on ne peut que le
 * remplacer ou l'oublier. L'add-on le teste avant de le garder.
 */
export function MusicSection() {
  const { t } = useI18n();
  const [status, setStatus] = useState<MusicStatus | null>(null);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);

  useEffect(() => {
    let alive = true;
    apiFetch('/api/music/settings')
      .then(readJson)
      .then(({ ok, outdated, body }) => {
        if (!alive) return;
        if (outdated) return setResult('outdated');
        if (!ok) return;
        const s = body as unknown as MusicStatus;
        setStatus(s);
        if (s.source === 'settings') setUrl(s.url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const send = async (method: 'PUT' | 'DELETE') => {
    setBusy(true);
    setResult(null);
    try {
      const res = await apiFetch('/api/music/settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'PUT' ? JSON.stringify({ url: url.trim(), token: token.trim() }) : undefined,
      });
      const { ok, outdated, body } = await readJson(res);
      if (ok) {
        setStatus(body as unknown as MusicStatus);
        setToken('');
        setResult(method === 'PUT' ? 'saved' : null);
        if (method === 'DELETE') setUrl('');
      } else {
        const error = String(body.error ?? '');
        setResult(
          outdated
            ? 'outdated'
            : error === 'auth'
              ? 'auth'
              : error === 'missing_url'
                ? 'missingUrl'
                : error.startsWith('invalid')
                  ? 'invalid'
                  : 'unreachable'
        );
      }
    } catch {
      setResult('unreachable');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='flex flex-col gap-3'>
      <div className={cn(SETTINGS_CARD, 'flex items-center gap-4')}>
        <Music size={24} className='shrink-0 text-[var(--ds-ink-muted)]' />
        <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.music_section.intro')}</p>
      </div>

      <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')}>
        <div className='flex items-center justify-between gap-3'>
          <h3 className={SECTION_HEADING}>{t('settings.music_section.connection')}</h3>
          {status && (
            <span
              data-testid='music-status'
              className={cn(
                'flex items-center gap-2 text-sm font-semibold',
                status.configured ? 'text-[var(--ds-good)]' : 'text-[var(--ds-ink-muted)]'
              )}
            >
              {status.configured && <CheckCircle2 size={16} aria-hidden='true' />}
              {status.configured ? t(`settings.music_section.source.${status.source}`) : t('settings.music_section.notConfigured')}
            </span>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          <label htmlFor='music-url' className={FIELD_LABEL}>
            {t('settings.music_section.url')}
          </label>
          <input
            id='music-url'
            aria-describedby='music-url-hint'
            type='url'
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={status?.url || 'http://homeassistant.local:8095'}
            className={INPUT}
          />
          <span id='music-url-hint' className='text-sm text-[var(--ds-ink-muted)]'>
            {t('settings.music_section.urlHint')}
          </span>
        </div>

        <div className='flex flex-col gap-2'>
          <label htmlFor='music-token' className={FIELD_LABEL}>
            {t('settings.music_section.token')}
          </label>
          <input
            id='music-token'
            aria-describedby='music-token-hint'
            type='password'
            autoComplete='off'
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={status?.configured ? t('settings.music_section.tokenKept') : ''}
            className={INPUT}
          />
          <span id='music-token-hint' className='text-sm text-[var(--ds-ink-muted)]'>
            {t('settings.music_section.tokenHint')}
          </span>
        </div>

        {result && (
          <p
            role='status'
            className={cn(
              'flex items-center gap-2 text-[15px] font-semibold',
              result === 'saved' ? 'text-[var(--ds-good)]' : 'text-[var(--ds-alert)]'
            )}
          >
            {result === 'saved' ? <CheckCircle2 size={18} aria-hidden='true' /> : <TriangleAlert size={18} aria-hidden='true' />}
            {t(`settings.music_section.result.${result}`)}
          </p>
        )}

        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            onClick={() => send('PUT')}
            disabled={busy || !token.trim() || result === 'outdated'}
            className={BUTTON_PRIMARY}
          >
            {busy ? t('settings.music_section.testing') : t('settings.music_section.save')}
          </button>
          {status?.source === 'settings' && (
            <button type='button' onClick={() => send('DELETE')} disabled={busy} className={BUTTON_SECONDARY}>
              {t('settings.music_section.forget')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
