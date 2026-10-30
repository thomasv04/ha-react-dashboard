import { useState, useEffect, useRef } from 'react';
import { Copy, Check, Download, Upload, AlertTriangle, Compass, FileDown, FileUp } from 'lucide-react';
import { startTour } from '@/components/onboarding/TourOverlay';
import { useI18n } from '@/i18n';
import { apiFetch, isPanelMode } from '@/lib/api-base';
import { useTheme } from '@/context/ThemeContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { encodeConfig, decodeConfig, type ConfigSnapshot } from '@/lib/config-string';
import { ConfigHistorySection } from './ConfigHistorySection';
import { SECTION_HEADING, SETTINGS_CARD } from './typography';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT } from './controls';
import { cn } from '@/lib/utils';

export function SystemSection() {
  const { t } = useI18n();
  const [ingressPath, setIngressPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // ── Config string state ──
  const { themeId, perfSettings, autoTheme, setTheme, setPerfSettings, setAutoTheme } = useTheme();
  const { pages, allLayouts, allWidgetConfigs, wallPanelConfig, wallPanelLayout, wallPanelWidgetConfigs, customPanels, dock, saveConfig } =
    useDashboardConfig();
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
      theme: { themeId, perfSettings, autoTheme },
      dashboard: {
        version: 2,
        pages,
        layouts: allLayouts,
        widgetConfigs: allWidgetConfigs,
        wallPanel: { config: wallPanelConfig, layout: wallPanelLayout, widgetConfigs: wallPanelWidgetConfigs },
        customPanels,
        dock,
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
    setPerfSettings(snapshot.theme.perfSettings);
    setAutoTheme(snapshot.theme.autoTheme);

    // Apply dashboard config
    if (!(await saveConfig(snapshot.dashboard))) {
      setImportStatus('error');
      setImportError(t('dashboard.saveFailed'));
      setConfirmImport(false);
      return;
    }

    setImportStatus('success');
    setConfirmImport(false);
    setImportString('');
    setTimeout(() => setImportStatus('idle'), 2500);
  };

  const block = cn(SETTINGS_CARD, 'flex flex-col gap-3');
  const note = 'text-[15px] leading-relaxed text-[var(--ds-ink-muted)]';
  const area = cn(INPUT, 'h-auto resize-none py-3 font-mono text-sm');

  return (
    <div className='flex flex-col gap-3'>
      {/* ── Version réellement chargée ── */}
      {/* `__BUILD_VERSION__` vient de `config.yaml` au moment du build, donc du
          commit tagué. Ce champ lisait `RELEASE_NOTES[0]`, tenu à la main : un
          build 2.1.4 s'annonçait 2.1.3 et faisait croire à une mise à jour HACS
          qui n'était jamais arrivée. */}
      <section className={cn(SETTINGS_CARD, 'flex items-baseline justify-between gap-3')}>
        <span className={SECTION_HEADING}>{t('settings.system_section.buildVersion')}</span>
        <code data-testid='build-version' className='font-mono text-lg text-[var(--ds-ink)]'>
          {__BUILD_VERSION__}
        </code>
      </section>

      {/* ── Visite guidée ── */}
      <section className={block}>
        <h3 className={SECTION_HEADING}>{t('tour.title')}</h3>
        <p className={note}>{t('tour.replayDesc')}</p>
        <button onClick={() => startTour('basics')} className={cn(BUTTON_SECONDARY, 'self-start')}>
          <Compass size={18} /> {t('tour.replay')}
        </button>
      </section>

      {/* ── Ingress URL ── */}
      <section className={block}>
        <h3 className={SECTION_HEADING}>{t('settings.system_section.ingressTitle')}</h3>
        <p className={note}>{t('settings.system_section.ingressDesc')}</p>

        {loading ? (
          <p className={note}>{t('settings.system_section.ingressLoading')}</p>
        ) : fullUrl ? (
          <div className='flex items-center gap-2'>
            <div className={cn(INPUT, 'flex min-w-0 flex-1 items-center')}>
              <span className='block truncate font-mono text-sm'>{fullUrl}</span>
            </div>
            <button onClick={copy} className={cn(BUTTON_PRIMARY, 'shrink-0')}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? t('settings.system_section.ingressCopied') : t('settings.system_section.ingressCopy')}
            </button>
          </div>
        ) : (
          <p className={cn(note, 'italic')}>{t('settings.system_section.ingressNotAvailable')}</p>
        )}
      </section>

      {/* ── Export config ── */}
      <section className={block}>
        <h3 className={SECTION_HEADING}>{t('settings.system_section.configExportTitle')}</h3>
        <p className={note}>{t('settings.system_section.configExportDesc')}</p>

        <button onClick={handleExport} className={cn(BUTTON_PRIMARY, 'self-start')}>
          <Download size={18} />
          {t('settings.system_section.configExportBtn')}
        </button>

        {exportString && (
          <div className='flex flex-col gap-2'>
            <textarea
              ref={textareaRef}
              readOnly
              value={exportString}
              rows={4}
              className={area}
              onClick={() => textareaRef.current?.select()}
            />
            <div className='flex items-center gap-2 self-end'>
              <button onClick={downloadExport} className={BUTTON_SECONDARY}>
                <FileDown size={18} />
                {t('settings.system_section.configExportDownload')}
              </button>
              <button onClick={copyExport} className={BUTTON_PRIMARY}>
                {exportCopied ? <Check size={18} /> : <Copy size={18} />}
                {exportCopied ? t('settings.system_section.configExportCopied') : t('settings.system_section.configExportCopy')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Import config ── */}
      <section className={block}>
        <h3 className={SECTION_HEADING}>{t('settings.system_section.configImportTitle')}</h3>
        <p className={note}>{t('settings.system_section.configImportDesc')}</p>

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
          className={area}
        />

        {/* Le champ natif reste caché : son rendu par défaut jure avec le reste
            des réglages, mais c'est bien lui qui ouvre le sélecteur. */}
        <label className={cn(BUTTON_SECONDARY, 'cursor-pointer self-start')}>
          <FileUp size={18} />
          {t('settings.system_section.configImportFile')}
          <input type='file' accept='.hadash,.txt' className='hidden' onChange={e => loadImportFile(e.target.files?.[0])} />
        </label>

        {importStatus === 'error' && (
          <div className='flex items-center gap-2 text-[15px] text-[var(--ds-alert)]'>
            <AlertTriangle size={16} />
            {importError}
          </div>
        )}

        {importStatus === 'success' && (
          <div className='flex items-center gap-2 text-[15px] text-[var(--ds-good)]'>
            <Check size={16} />
            {t('settings.system_section.configImportSuccess')}
          </div>
        )}

        {confirmImport && importStatus === 'idle' && (
          <div className='flex items-center gap-2 text-[15px] text-[var(--ds-warm-light)]'>
            <AlertTriangle size={16} />
            {t('settings.system_section.configImportConfirm')}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!importString.trim() || importStatus === 'success'}
          className={cn(BUTTON_PRIMARY, 'self-start')}
        >
          <Upload size={18} />
          {confirmImport && importStatus === 'idle'
            ? t('settings.system_section.configImportConfirmBtn')
            : t('settings.system_section.configImportBtn')}
        </button>
      </section>

      {/* ── Historique de configuration ── */}
      <ConfigHistorySection />
    </div>
  );
}
