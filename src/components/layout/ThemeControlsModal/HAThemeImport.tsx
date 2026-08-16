import { useState } from 'react';
import { Download, Check, X } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { HA_THEME_ID } from '@/config/themes';
import { fetchHAThemes, type HAThemeSummary } from '@/lib/ha-themes';

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
    <div>
      <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3 flex items-center gap-2'>
        <Download size={12} /> {t('settings.appearance_section.haThemeTitle')}
      </h3>
      <p className='text-white/30 text-[11px] mb-3 leading-relaxed'>{t('settings.appearance_section.haThemeDesc')}</p>

      {importedTheme && (
        <div className='flex items-center gap-2 mb-3'>
          <button
            onClick={() => setTheme(HA_THEME_ID)}
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              themeId === HA_THEME_ID
                ? 'bg-blue-500/25 border-blue-500/40 text-blue-200'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            {themeId === HA_THEME_ID && <Check size={12} />}
            {importedTheme.name}
          </button>
          <button
            onClick={remove}
            title={t('common.delete')}
            className='p-2 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-400/70 hover:text-red-300 transition-colors cursor-pointer'
          >
            <X size={12} />
          </button>
        </div>
      )}

      {themes === null ? (
        <button
          onClick={load}
          disabled={loading}
          className='flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/8 border border-white/12 text-white/70 hover:bg-white/12 hover:text-white transition-colors text-xs font-semibold cursor-pointer disabled:opacity-40'
        >
          <Download size={12} />
          {loading ? t('common.loading') : t('settings.appearance_section.haThemeLoad')}
        </button>
      ) : themes.length === 0 ? (
        <p className='text-white/30 text-xs italic'>{t('settings.appearance_section.haThemeEmpty')}</p>
      ) : (
        <div className='flex flex-col gap-1 max-h-48 overflow-y-auto'>
          {themes.map(theme => (
            <button
              key={theme.name}
              onClick={() => apply(theme)}
              className='flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-xs text-left cursor-pointer'
            >
              {/* Aperçu : fond, accent, texte — de quoi reconnaître le thème
                  sans l'appliquer. */}
              <span className='flex gap-0.5 flex-shrink-0'>
                {[theme.tokens.bgPrimary, theme.tokens.accent, theme.tokens.textPrimary].map((c, i) => (
                  <span key={i} className='w-3 h-5 rounded-sm border border-white/10' style={{ backgroundColor: c }} />
                ))}
              </span>
              <span className='truncate'>{theme.name}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className='text-red-400 text-xs mt-2'>{t('settings.appearance_section.haThemeError')}</p>}
    </div>
  );
}
