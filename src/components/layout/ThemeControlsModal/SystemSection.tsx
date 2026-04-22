import { useState, useEffect } from 'react';
import { Copy, Check, Server } from 'lucide-react';
import { useI18n } from '@/i18n';

export function SystemSection() {
  const { t } = useI18n();
  const [ingressPath, setIngressPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/system/ingress-url')
      .then(r => r.json())
      .then(data => setIngressPath(data.url ?? null))
      .catch(() => setIngressPath(null))
      .finally(() => setLoading(false));
  }, []);

  const fullUrl = ingressPath ? `${window.location.origin}${ingressPath}` : null;

  const copy = () => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className='flex flex-col gap-7'>
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
          <Server size={12} /> {t('settings.system_section.ingressTitle')}
        </h3>
        <p className='text-white/40 text-xs mb-4 leading-relaxed'>{t('settings.system_section.ingressDesc')}</p>

        {loading ? (
          <p className='text-white/30 text-xs'>{t('settings.system_section.ingressLoading')}</p>
        ) : fullUrl ? (
          <div className='flex items-center gap-2'>
            <div className='flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2'>
              <span className='text-white/70 text-xs font-mono truncate block'>{fullUrl}</span>
            </div>
            <button
              onClick={copy}
              className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-semibold flex-shrink-0'
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t('settings.system_section.ingressCopied') : t('settings.system_section.ingressCopy')}
            </button>
          </div>
        ) : (
          <p className='text-white/30 text-xs italic'>{t('settings.system_section.ingressNotAvailable')}</p>
        )}
      </div>
    </div>
  );
}
