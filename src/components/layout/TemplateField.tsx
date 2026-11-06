import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, AlertTriangle, ChevronDown, Plus, Search } from 'lucide-react';
import { useHass } from '@hakit/core';
import { templateEngine } from '@/lib/template-engine';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

// ── Snippets rapides ──────────────────────────────────────────────────────────

const SNIPPETS = [
  { key: 'ifElse', code: "{% if states('entity.id') == 'on' %}\n  valeur_si_vrai\n{% else %}\n  valeur_si_faux\n{% endif %}" },
  { key: 'variable', code: "{% set etat = states('entity.id') %}\n{{ etat }}" },
  { key: 'round', code: "{{ states('sensor.xxx') | float | round(1) }} °C" },
  { key: 'attribute', code: "{{ state_attr('entity.id', 'attribut') }}" },
  { key: 'hasValue', code: "{% if has_value('entity.id') %}ok{% else %}N/A{% endif %}" },
];

/** Pastille de la barre d'outils, au gabarit de la fiche d'édition. */
const TOOL = 'flex h-10 items-center gap-1.5 rounded-full bg-[var(--ds-surface-3)] px-4 text-sm font-semibold';
/** Menu déroulant de la barre d'outils. */
const MENU =
  'absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-1)] shadow-[var(--ds-shadow-sheet)]';
const MENU_ITEM = 'flex min-h-11 w-full items-center px-4 text-left text-[15px]';

// ── Éditeur de template ───────────────────────────────────────────────────────

export function TemplateEditor({ value, onChange, entityId }: { value: string; onChange: (v: string) => void; entityId?: string }) {
  const { t } = useI18n();
  const entities = useHass(s => s.entities);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');

  // Valider et prévisualiser en temps réel
  useEffect(() => {
    templateEngine.bind(() => (entities ?? {}) as Record<string, { state: string; attributes: Record<string, unknown> }>);
    const syntaxError = templateEngine.validate(value);
    if (syntaxError) {
      setError(syntaxError);
      setPreview('');
    } else {
      setError(null);
      setPreview(templateEngine.render(value));
    }
  }, [value, entities]);

  // Insertion à la position du curseur
  const insertAtCursor = useCallback(
    (text: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + text.length;
        el.focus();
      });
    },
    [value, onChange]
  );

  const filteredEntities = Object.keys(entities ?? {})
    .filter(id => id.toLowerCase().includes(entitySearch.toLowerCase()))
    .slice(0, 30);

  return (
    <div className='space-y-3'>
      {/* Barre d'outils */}
      <div className='flex flex-wrap items-center gap-2'>
        {/* Snippets */}
        <div className='relative'>
          <button onClick={() => setShowSnippets(!showSnippets)} aria-expanded={showSnippets} className={TOOL}>
            {t('layout.templateEditor.snippets')} <ChevronDown size={16} />
          </button>
          {showSnippets && (
            <div className={cn(MENU, 'w-60')}>
              {SNIPPETS.map(s => (
                <button
                  key={s.key}
                  onClick={() => {
                    insertAtCursor(s.code);
                    setShowSnippets(false);
                  }}
                  className={MENU_ITEM}
                >
                  {t(`layout.templateEditor.snippet.${s.key}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Insérer entité */}
        <div className='relative'>
          <button onClick={() => setShowEntityPicker(!showEntityPicker)} aria-expanded={showEntityPicker} className={TOOL}>
            <Plus size={16} /> {t('layout.templateEditor.insertEntity')}
          </button>
          {showEntityPicker && (
            <div className={cn(MENU, 'w-72')}>
              <div className='p-2'>
                <div className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-4'>
                  <Search size={16} className='text-[var(--ds-ink-muted)]' />
                  <input
                    autoFocus
                    value={entitySearch}
                    onChange={e => setEntitySearch(e.target.value)}
                    className='flex-1 bg-transparent text-[15px] text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
                    placeholder={t('layout.templateEditor.searchEntity')}
                  />
                </div>
              </div>
              <div className='overflow-y-auto pb-2' style={{ maxHeight: 220 }}>
                {filteredEntities.map(id => (
                  <button
                    key={id}
                    onClick={() => {
                      insertAtCursor(`states('${id}')`);
                      setShowEntityPicker(false);
                      setEntitySearch('');
                    }}
                    className={cn(MENU_ITEM, 'truncate font-mono text-sm')}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Entité contextuelle si disponible */}
        {entityId && (
          <button
            onClick={() => insertAtCursor(`states('${entityId}')`)}
            className={cn(TOOL, 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]')}
          >
            <Plus size={16} /> {t('layout.templateEditor.currentEntity')}
          </button>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
        className={cn(
          'w-full resize-y rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 py-3 font-mono text-sm leading-relaxed text-[var(--ds-ink)] outline-none',
          'placeholder:text-[var(--ds-ink-muted)]',
          error ? 'ring-2 ring-[var(--ds-alert)]' : 'focus:ring-2 focus:ring-[var(--ds-accent)]'
        )}
        placeholder={"{% set v = states('sensor.xxx') %}\n{{ v }}"}
        spellCheck={false}
      />

      {/* Preview / Error */}
      {error ? (
        <div className='flex items-start gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 py-2.5'>
          <AlertTriangle size={16} className='mt-0.5 shrink-0 text-[var(--ds-alert)]' />
          <span className='font-mono text-sm leading-relaxed text-[var(--ds-alert)]'>{error}</span>
        </div>
      ) : preview ? (
        <div className='flex items-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 py-2.5 text-sm'>
          <Check size={16} className='shrink-0 text-[var(--ds-good)]' />
          <span className='shrink-0 font-semibold text-[var(--ds-good)]'>{t('layout.previewLabel')}</span>
          <span className='truncate font-mono'>{preview}</span>
        </div>
      ) : null}
    </div>
  );
}
