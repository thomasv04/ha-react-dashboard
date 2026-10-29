import { useState, useMemo } from 'react';
import { Search, RotateCcw, Check } from 'lucide-react';
import { useI18n, SUPPORTED_LANGUAGES, getDefaultTranslations } from '@/i18n';
import { SECTION_HEADING } from './typography';
import { cn } from '@/lib/utils';

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
        <p className={cn(SECTION_HEADING, 'mb-3')}>{t('settings.language_section.languageLabel')}</p>
        <div className='flex gap-2'>
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-4 py-2 rounded-[var(--ds-radius-sm)] text-sm font-medium transition-all border ${
                language === lang.code
                  ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                  : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
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
          <p className={cn(SECTION_HEADING, 'mb-1')}>{t('settings.language_section.overridesTitle')}</p>
          <p className='text-[var(--ds-ink-muted)] text-[11px] leading-relaxed'>{t('settings.language_section.overridesDescription')}</p>
        </div>

        {/* Search + filter */}
        <div className='flex gap-2'>
          <div className='flex-1 flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] focus-within:border-[var(--ds-accent)] transition-colors'>
            <Search size={12} className='text-[var(--ds-ink-muted)] shrink-0' />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('settings.language_section.searchPlaceholder')}
              className='bg-transparent text-xs text-[var(--ds-ink)] outline-none flex-1 placeholder:text-[var(--ds-ink-muted)]'
            />
          </div>
          <button
            onClick={() => setShowOnlyCustom(v => !v)}
            className={`px-3 py-2 rounded-[var(--ds-radius-sm)] text-xs font-medium border transition-all whitespace-nowrap ${
              showOnlyCustom
                ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
            }`}
          >
            {showOnlyCustom ? t('settings.language_section.showAll') : t('settings.language_section.showOnlyCustom')}
          </button>
        </div>

        {/* Table */}
        <div className='rounded-[var(--ds-radius-md)] border border-[var(--ds-surface-3)] overflow-hidden'>
          {/* Header */}
          <div className='grid grid-cols-[2fr_2fr_2fr_auto] gap-2 px-3 py-2 bg-[var(--ds-surface-2)] border-b border-[var(--ds-surface-3)]'>
            <span className='text-[var(--ds-ink-muted)] text-[10px] font-semibold uppercase tracking-wider'>
              {t('settings.language_section.keyColumn')}
            </span>
            <span className='text-[var(--ds-ink-muted)] text-[10px] font-semibold uppercase tracking-wider'>
              {t('settings.language_section.defaultColumn')}
            </span>
            <span className='text-[var(--ds-ink-muted)] text-[10px] font-semibold uppercase tracking-wider'>
              {t('settings.language_section.customColumn')}
            </span>
            <span className='w-5' />
          </div>

          {/* Rows */}
          <div className='max-h-[320px] overflow-y-auto divide-y divide-[var(--ds-surface-3)]'>
            {filtered.length === 0 ? (
              <div className='py-8 text-center text-[var(--ds-ink-muted)] text-xs'>{t('settings.language_section.noResults')}</div>
            ) : (
              filtered.map(({ key, value }) => {
                const override = overrides[key];
                const isEditing = editingKey === key;
                return (
                  <div key={key} className='grid grid-cols-[2fr_2fr_2fr_auto] gap-2 px-3 py-2 items-center transition-colors'>
                    <span className='text-[var(--ds-ink-muted)] text-[10px] font-mono truncate' title={key}>
                      {key}
                    </span>
                    <span className='text-[var(--ds-ink-muted)] text-[11px] truncate' title={value}>
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
                          className='w-full px-2 py-1 rounded bg-[var(--ds-surface-3)] border border-[var(--ds-accent)] text-[var(--ds-ink)] text-[11px] outline-none'
                          placeholder={value}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(key)}
                          className='w-full text-left px-2 py-1 rounded transition-colors text-[11px] truncate'
                          title={override ?? ''}
                        >
                          {override ? (
                            <span className='text-[var(--ds-accent)]'>{override}</span>
                          ) : (
                            <span className='text-[var(--ds-ink-muted)] italic'>—</span>
                          )}
                        </button>
                      )}
                    </div>
                    <div className='flex items-center justify-center'>
                      {override ? (
                        <button
                          onClick={() => removeOverride(key)}
                          className='p-1 rounded text-[var(--ds-ink-muted)] transition-colors'
                          title={t('settings.language_section.resetTooltip')}
                        >
                          <RotateCcw size={11} />
                        </button>
                      ) : isEditing ? (
                        <button onClick={() => commitEdit(key)} className='p-1 rounded text-[var(--ds-good)]'>
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

        <p className='text-[var(--ds-ink-muted)] text-[10px]'>
          {Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''} active
        </p>
      </div>
    </div>
  );
}
