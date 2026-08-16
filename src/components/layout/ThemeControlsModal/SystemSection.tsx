import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Server, Download, Upload, AlertTriangle, Compass, FileDown, FileUp } from 'lucide-react';
import { startTour } from '@/components/onboarding/TourOverlay';
import { useI18n } from '@/i18n';
import { apiFetch, isPanelMode } from '@/lib/api-base';
import { useTheme } from '@/context/ThemeContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { encodeConfig, decodeConfig, type ConfigSnapshot } from '@/lib/config-string';
import { ConfigHistorySection } from './ConfigHistorySection';

export function SystemSection() {
  const { t } = useI18n();
  const [ingressPath, setIngressPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // ── Config string state ──
  const {
    themeId,
    background,
    cardOpacity,
    perfSettings,
    autoTheme,
    layoutSettings,
    setTheme,
    setBackground,
    setCardOpacity,
    setPerfSettings,
    setAutoTheme,
    setLayoutSettings,
  } = useTheme();
  const { pages, allLayouts, allWidgetConfigs, wallPanelConfig, wallPanelLayout, customPanels, saveConfig } = useDashboardConfig();
  const [exportString, setExportString] = useState('');
  const [importString, setImportString] = useState('');
  const [exportCopied, setExportCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // L'URL d'ingress n'a de sens que servi par l'add-on. En carte Lovelace,
    // l'adresse du dashboard est celle du tableau de bord HA lui-même.
    if (isPanelMode()) {
      setLoading(false);
      return;
    }
    apiFetch('/api/system/ingress-url')
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

  // ── Export ──
  const handleExport = async () => {
    const snapshot: ConfigSnapshot = {
      v: 1,
      theme: { themeId, background, cardOpacity, perfSettings, autoTheme, layoutSettings },
      dashboard: {
        version: 2,
        pages,
        layouts: allLayouts,
        widgetConfigs: allWidgetConfigs,
        wallPanel: { config: wallPanelConfig, layout: wallPanelLayout, widgetConfigs: {} },
        customPanels,
      },
    };
    const encoded = await encodeConfig(snapshot);
    setExportString(encoded);
    setExportCopied(false);
  };

  const copyExport = () => {
    navigator.clipboard.writeText(exportString).then(() => {
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 1800);
    });
  };

  /**
   * Une configuration complète pèse vite plusieurs dizaines de kilo-octets. Le
   * presse-papier tient, mais le trajet jusqu'à un fichier texte ne tient pas
   * toujours : troncature à la lecture, retours à la ligne insérés au collage.
   * Le fichier supprime toute la chaîne de manipulation.
   */
  const downloadExport = () => {
    const url = URL.createObjectURL(new Blob([exportString], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `ha-dashboard-${new Date().toISOString().slice(0, 10)}.hadash`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadImportFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then(text => {
      setImportString(text.trim());
      setConfirmImport(false);
      setImportStatus('idle');
    });
  };

  // ── Import ──
  const handleImport = async () => {
    setImportStatus('idle');
    setImportError('');

    let snapshot: ConfigSnapshot;
    try {
      snapshot = await decodeConfig(importString);
    } catch (err) {
      setImportStatus('error');
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      const errorKeys: Record<string, string> = {
        INVALID_PREFIX: t('settings.system_section.configImportErrPrefix'),
        INVALID_BASE64: t('settings.system_section.configImportErrBase64'),
        INVALID_COMPRESSED: t('settings.system_section.configImportErrCompressed'),
        INVALID_JSON: t('settings.system_section.configImportErrJson'),
        INVALID_VERSION: t('settings.system_section.configImportErrVersion'),
        MISSING_DATA: t('settings.system_section.configImportErrMissing'),
      };
      setImportError(errorKeys[code] ?? code);
      return;
    }

    if (!confirmImport) {
      setConfirmImport(true);
      return;
    }

    // Apply theme settings
    setTheme(snapshot.theme.themeId);
    setBackground(snapshot.theme.background);
    setCardOpacity(snapshot.theme.cardOpacity);
    setPerfSettings(snapshot.theme.perfSettings);
    setAutoTheme(snapshot.theme.autoTheme);
    setLayoutSettings(snapshot.theme.layoutSettings);

    // Apply dashboard config
    saveConfig(snapshot.dashboard);

    setImportStatus('success');
    setConfirmImport(false);
    setImportString('');
    setTimeout(() => setImportStatus('idle'), 2500);
  };

  return (
    <div className='flex flex-col gap-7'>
      {/* ── Version réellement chargée ── */}
      {/* `__BUILD_VERSION__` vient de `config.yaml` au moment du build, donc du
          commit tagué. Ce champ lisait `RELEASE_NOTES[0]`, tenu à la main : un
          build 2.1.4 s'annonçait 2.1.3 et faisait croire à une mise à jour HACS
          qui n'était jamais arrivée. */}
      <div className='flex items-baseline gap-2'>
        <span className='text-white/45 text-[11px] font-semibold tracking-widest uppercase'>
          {t('settings.system_section.buildVersion')}
        </span>
        <code data-testid='build-version' className='text-white/70 text-xs font-mono'>
          {__BUILD_VERSION__}
        </code>
      </div>

      {/* ── Visite guidée ── */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
          <Compass size={12} /> {t('tour.title')}
        </h3>
        <p className='text-white/40 text-xs mb-4 leading-relaxed'>{t('tour.replayDesc')}</p>
        <button
          onClick={() => startTour('basics')}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/8 border border-white/12 text-white/70 hover:bg-white/12 hover:text-white transition-colors text-xs font-semibold'
        >
          <Compass size={12} /> {t('tour.replay')}
        </button>
      </div>

      {/* ── Ingress URL ── */}
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

      {/* ── Export config ── */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
          <Download size={12} /> {t('settings.system_section.configExportTitle')}
        </h3>
        <p className='text-white/40 text-xs mb-4 leading-relaxed'>{t('settings.system_section.configExportDesc')}</p>

        <button
          onClick={handleExport}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-semibold mb-3'
        >
          <Download size={12} />
          {t('settings.system_section.configExportBtn')}
        </button>

        {exportString && (
          <div className='flex flex-col gap-2'>
            <textarea
              ref={textareaRef}
              readOnly
              value={exportString}
              rows={4}
              className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs font-mono resize-none focus:outline-none focus:border-blue-500/40'
              onClick={() => textareaRef.current?.select()}
            />
            <div className='self-end flex items-center gap-2'>
              <button
                onClick={downloadExport}
                className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/8 border border-white/12 text-white/70 hover:bg-white/12 hover:text-white transition-colors text-xs font-semibold'
              >
                <FileDown size={12} />
                {t('settings.system_section.configExportDownload')}
              </button>
              <button
                onClick={copyExport}
                className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs font-semibold'
              >
                {exportCopied ? <Check size={12} /> : <Copy size={12} />}
                {exportCopied ? t('settings.system_section.configExportCopied') : t('settings.system_section.configExportCopy')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Import config ── */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
          <Upload size={12} /> {t('settings.system_section.configImportTitle')}
        </h3>
        <p className='text-white/40 text-xs mb-4 leading-relaxed'>{t('settings.system_section.configImportDesc')}</p>

        <textarea
          value={importString}
          onChange={e => {
            setImportString(e.target.value);
            setConfirmImport(false);
            setImportStatus('idle');
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            loadImportFile(e.dataTransfer.files[0]);
          }}
          rows={4}
          placeholder={t('settings.system_section.configImportPlaceholder')}
          className='w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs font-mono resize-none focus:outline-none focus:border-blue-500/40 placeholder:text-white/20 mb-3'
        />

        {/* Le champ natif reste caché : son rendu par défaut jure avec le reste
            de la modale, mais c'est bien lui qui ouvre le sélecteur. */}
        <label className='inline-flex items-center gap-1.5 px-3 py-2 mb-3 rounded-lg bg-white/8 border border-white/12 text-white/70 hover:bg-white/12 hover:text-white transition-colors text-xs font-semibold cursor-pointer'>
          <FileUp size={12} />
          {t('settings.system_section.configImportFile')}
          <input type='file' accept='.hadash,.txt' className='hidden' onChange={e => loadImportFile(e.target.files?.[0])} />
        </label>

        {importStatus === 'error' && (
          <div className='flex items-center gap-2 text-red-400 text-xs mb-3'>
            <AlertTriangle size={12} />
            {importError}
          </div>
        )}

        {importStatus === 'success' && (
          <div className='flex items-center gap-2 text-emerald-400 text-xs mb-3'>
            <Check size={12} />
            {t('settings.system_section.configImportSuccess')}
          </div>
        )}

        {confirmImport && importStatus === 'idle' && (
          <div className='flex items-center gap-2 text-amber-400 text-xs mb-3'>
            <AlertTriangle size={12} />
            {t('settings.system_section.configImportConfirm')}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!importString.trim() || importStatus === 'success'}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed'
        >
          <Upload size={12} />
          {confirmImport && importStatus === 'idle'
            ? t('settings.system_section.configImportConfirmBtn')
            : t('settings.system_section.configImportBtn')}
        </button>
      </div>

      {/* ── Historique de configuration ── */}
      <ConfigHistorySection />
    </div>
  );
}
