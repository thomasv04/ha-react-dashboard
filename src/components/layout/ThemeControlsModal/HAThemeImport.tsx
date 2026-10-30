import { useState } from 'react';
import { Download, Check, X } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { HA_THEME_ID } from '@/config/themes';
import { fetchHAThemes, type HAThemeSummary } from '@/lib/ha-themes';
import { SECTION_HEADING, SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';

/**
 * Reprend un thème défini dans `themes.yaml` de Home Assistant.
 *
 * Les thèmes HA sont des variables de style : les lire donne une cohérence
 * gratuite avec le reste de l'installation, sans que l'utilisateur ait à
 * recomposer sa palette ici.
 */
export function HAThemeImport() {
  const { t } = useI18n();
  const connection = useHass(s => s.connection);
  const { themeId, setTheme, importedTheme, setImportedTheme } = useTheme();

  const [themes, setThemes] = useState<HAThemeSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      if (!connection) throw new Error('no connection');
      setThemes(await fetchHAThemes(connection as never));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const apply = (theme: HAThemeSummary) => {
    setImportedTheme({ name: theme.name, tokens: theme.tokens });
    setTheme(HA_THEME_ID);
    setThemes(null);
  };

  const remove = () => {
    setImportedTheme(null);
    // Sans ce repli, le thème sélectionné pointerait dans le vide et le
    // dashboard retomberait silencieusement sur le sombre au prochain rendu.
    if (themeId === HA_THEME_ID) setTheme('dark');
  };

  return (
    <section className={SETTINGS_CARD}>
      <h3 className={cn(SECTION_HEADING, 'mb-1')}>{t('settings.appearance_section.haThemeTitle')}</h3>
      <p className='mb-4 text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('settings.appearance_section.haThemeDesc')}</p>

      {importedTheme && (
        <div className='flex items-center gap-2 mb-3'>
          <button
            onClick={() => setTheme(HA_THEME_ID)}
            className={`flex h-12 flex-1 cursor-pointer items-center gap-2 rounded-full px-5 text-base font-semibold ${
              themeId === HA_THEME_ID ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
            }`}
          >
            {themeId === HA_THEME_ID && <Check size={16} />}
            {importedTheme.name}
          </button>
          <button
            onClick={remove}
            title={t('common.delete')}
            className='flex size-12 cursor-pointer items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-alert)]'
          >
            <X size={16} />
          </button>
        </div>
      )}

      {themes === null ? (
        <button
          onClick={load}
          disabled={loading}
          className='flex h-12 cursor-pointer items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-5 text-base font-semibold text-[var(--ds-ink)] disabled:opacity-40'
        >
          <Download size={16} />
          {loading ? t('common.loading') : t('settings.appearance_section.haThemeLoad')}
        </button>
      ) : themes.length === 0 ? (
        <p className='text-sm italic text-[var(--ds-ink-muted)]'>{t('settings.appearance_section.haThemeEmpty')}</p>
      ) : (
        <div className='flex flex-col gap-1 max-h-48 overflow-y-auto'>
          {themes.map(theme => (
            <button
              key={theme.name}
              onClick={() => apply(theme)}
              className='flex h-12 cursor-pointer items-center gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 text-left text-base text-[var(--ds-ink)]'
            >
              {/* Aperçu : fond, accent, texte — de quoi reconnaître le thème
                  sans l'appliquer. */}
              <span className='flex gap-0.5 flex-shrink-0'>
                {[theme.tokens.bgPrimary, theme.tokens.accent, theme.tokens.textPrimary].map((c, i) => (
                  <span key={i} className='w-3 h-5 rounded-sm border border-[var(--ds-surface-3)]' style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className='truncate'>{theme.name}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className='mt-2 text-sm text-[var(--ds-alert)]'>{t('settings.appearance_section.haThemeError')}</p>}
    </section>
  );
}
