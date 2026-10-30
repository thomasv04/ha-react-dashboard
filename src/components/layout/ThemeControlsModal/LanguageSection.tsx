import { useState, useMemo } from 'react';
import { Search, RotateCcw, Check } from 'lucide-react';
import { useI18n, SUPPORTED_LANGUAGES, getDefaultTranslations } from '@/i18n';
import { SECTION_HEADING, SETTINGS_CARD } from './typography';
import { BUTTON_SECONDARY, Segmented } from './controls';
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
    <div className='flex flex-col gap-3'>
      {/* Langue */}
      <section className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}>
        <h3 className={SECTION_HEADING}>{t('settings.language_section.languageLabel')}</h3>
        <Segmented
          value={language}
          onChange={setLanguage}
          label={t('settings.language_section.languageLabel')}
          options={SUPPORTED_LANGUAGES.map(lang => ({ value: lang.code, label: lang.label }))}
        />
      </section>

      {/* Traductions personnalisées */}
      <section className={cn(SETTINGS_CARD, 'flex flex-col gap-3')}>
        <div>
          <h3 className={SECTION_HEADING}>{t('settings.language_section.overridesTitle')}</h3>
          <p className='mt-1 text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>
            {t('settings.language_section.overridesDescription')}
          </p>
        </div>

        {/* Search + filter */}
        <div className='flex gap-2'>
          <div className='flex h-12 flex-1 items-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 focus-within:outline-2 focus-within:outline-[var(--ds-accent)]'>
            <Search size={16} className='text-[var(--ds-ink-muted)] shrink-0' />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('settings.language_section.searchPlaceholder')}
              className='flex-1 bg-transparent text-base text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
            />
          </div>
          <button
            onClick={() => setShowOnlyCustom(v => !v)}
            aria-pressed={showOnlyCustom}
            className={cn(BUTTON_SECONDARY, 'whitespace-nowrap', showOnlyCustom && 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]')}
          >
            {showOnlyCustom ? t('settings.language_section.showAll') : t('settings.language_section.showOnlyCustom')}
          </button>
        </div>

        {/* Table */}
        <div className='overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)]'>
          {/* Header */}
          <div className='grid grid-cols-[2fr_2fr_2fr_auto] gap-2 bg-[var(--ds-surface-1)] px-4 py-3'>
            <span className='text-sm font-semibold text-[var(--ds-ink-muted)]'>{t('settings.language_section.keyColumn')}</span>
            <span className='text-sm font-semibold text-[var(--ds-ink-muted)]'>{t('settings.language_section.defaultColumn')}</span>
            <span className='text-sm font-semibold text-[var(--ds-ink-muted)]'>{t('settings.language_section.customColumn')}</span>
            <span className='w-5' />
          </div>

          {/* Rows */}
          <div className='max-h-[360px] divide-y divide-[var(--ds-surface-1)] overflow-y-auto'>
            {filtered.length === 0 ? (
              <div className='py-8 text-center text-[15px] text-[var(--ds-ink-muted)]'>{t('settings.language_section.noResults')}</div>
            ) : (
              filtered.map(({ key, value }) => {
                const override = overrides[key];
                const isEditing = editingKey === key;
                return (
                  <div key={key} className='grid grid-cols-[2fr_2fr_2fr_auto] items-center gap-2 px-4 py-2.5'>
                    <span className='truncate font-mono text-sm text-[var(--ds-ink-muted)]' title={key}>
                      {key}
                    </span>
                    <span className='text-[var(--ds-ink-muted)] text-sm truncate' title={value}>
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
                          className='h-10 w-full rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-1)] px-3 text-base text-[var(--ds-ink)] outline-2 outline-[var(--ds-accent)]'
                          placeholder={value}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(key)}
                          className='h-10 w-full truncate rounded-[var(--ds-radius-sm)] px-3 text-left text-base'
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
                          className='flex size-10 items-center justify-center rounded-full text-[var(--ds-ink-muted)]'
                          title={t('settings.language_section.resetTooltip')}
                        >
                          <RotateCcw size={16} />
                        </button>
                      ) : isEditing ? (
                        <button
                          onClick={() => commitEdit(key)}
                          className='flex size-10 items-center justify-center rounded-full text-[var(--ds-good)]'
                        >
                          <Check size={16} />
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

        <p className='text-sm text-[var(--ds-ink-muted)]'>
          {Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''} active
        </p>
      </section>
    </div>
  );
}
