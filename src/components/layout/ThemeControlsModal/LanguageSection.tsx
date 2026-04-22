import { useState, useMemo } from 'react';
import { Search, RotateCcw, Check } from 'lucide-react';
import { useI18n, SUPPORTED_LANGUAGES, getDefaultTranslations } from '@/i18n';

export function LanguageSection() {
  const { t, language, setLanguage, overrides, setOverride, removeOverride } = useI18n();
  const [search, setSearch] = useState('');
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const allKeys = useMemo(() => getDefaultTranslations(language), [language]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allKeys.filter(({ key, value }) => {
      const matchCustom = !showOnlyCustom || overrides[key] !== undefined;
      const matchSearch =
        !q || key.toLowerCase().includes(q) || value.toLowerCase().includes(q) || (overrides[key] ?? '').toLowerCase().includes(q);
      return matchCustom && matchSearch;
    });
  }, [allKeys, search, showOnlyCustom, overrides]);

  function startEdit(key: string) {
    setEditingKey(key);
    setDraftValue(overrides[key] ?? '');
  }

  function commitEdit(key: string) {
    if (draftValue.trim()) {
      setOverride(key, draftValue.trim());
    } else {
      removeOverride(key);
    }
    setEditingKey(null);
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Language picker */}
      <div>
        <p className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3'>
          {t('settings.language_section.languageLabel')}
        </p>
        <div className='flex gap-2'>
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                language === lang.code
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overrides */}
      <div className='flex flex-col gap-3'>
        <div>
          <p className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-1'>
            {t('settings.language_section.overridesTitle')}
          </p>
          <p className='text-white/30 text-[11px] leading-relaxed'>{t('settings.language_section.overridesDescription')}</p>
        </div>

        {/* Search + filter */}
        <div className='flex gap-2'>
          <div className='flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus-within:border-white/20 transition-colors'>
            <Search size={12} className='text-white/30 shrink-0' />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('settings.language_section.searchPlaceholder')}
              className='bg-transparent text-xs text-white/70 outline-none flex-1 placeholder:text-white/25'
            />
          </div>
          <button
            onClick={() => setShowOnlyCustom(v => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
              showOnlyCustom
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
            }`}
          >
            {showOnlyCustom ? t('settings.language_section.showAll') : t('settings.language_section.showOnlyCustom')}
          </button>
        </div>

        {/* Table */}
        <div className='rounded-xl border border-white/8 overflow-hidden'>
          {/* Header */}
          <div className='grid grid-cols-[2fr_2fr_2fr_auto] gap-2 px-3 py-2 bg-white/4 border-b border-white/8'>
            <span className='text-white/30 text-[10px] font-semibold uppercase tracking-wider'>
              {t('settings.language_section.keyColumn')}
            </span>
            <span className='text-white/30 text-[10px] font-semibold uppercase tracking-wider'>
              {t('settings.language_section.defaultColumn')}
            </span>
            <span className='text-white/30 text-[10px] font-semibold uppercase tracking-wider'>
              {t('settings.language_section.customColumn')}
            </span>
            <span className='w-5' />
          </div>

          {/* Rows */}
          <div className='max-h-[320px] overflow-y-auto divide-y divide-white/5'>
            {filtered.length === 0 ? (
              <div className='py-8 text-center text-white/25 text-xs'>{t('settings.language_section.noResults')}</div>
            ) : (
              filtered.map(({ key, value }) => {
                const override = overrides[key];
                const isEditing = editingKey === key;
                return (
                  <div
                    key={key}
                    className='grid grid-cols-[2fr_2fr_2fr_auto] gap-2 px-3 py-2 items-center hover:bg-white/3 transition-colors'
                  >
                    <span className='text-white/40 text-[10px] font-mono truncate' title={key}>
                      {key}
                    </span>
                    <span className='text-white/40 text-[11px] truncate' title={value}>
                      {value}
                    </span>
                    <div className='min-w-0'>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={draftValue}
                          onChange={e => setDraftValue(e.target.value)}
                          onBlur={() => commitEdit(key)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(key);
                            if (e.key === 'Escape') setEditingKey(null);
                          }}
                          className='w-full px-2 py-1 rounded bg-white/10 border border-blue-500/40 text-white text-[11px] outline-none'
                          placeholder={value}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(key)}
                          className='w-full text-left px-2 py-1 rounded hover:bg-white/8 transition-colors text-[11px] truncate'
                          title={override ?? ''}
                        >
                          {override ? <span className='text-blue-300'>{override}</span> : <span className='text-white/20 italic'>—</span>}
                        </button>
                      )}
                    </div>
                    <div className='flex items-center justify-center'>
                      {override ? (
                        <button
                          onClick={() => removeOverride(key)}
                          className='p-1 rounded text-white/25 hover:text-red-400 transition-colors'
                          title={t('settings.language_section.resetTooltip')}
                        >
                          <RotateCcw size={11} />
                        </button>
                      ) : isEditing ? (
                        <button onClick={() => commitEdit(key)} className='p-1 rounded text-green-400'>
                          <Check size={11} />
                        </button>
                      ) : (
                        <span className='w-5' />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <p className='text-white/20 text-[10px]'>
          {Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''} active
        </p>
      </div>
    </div>
  );
}
