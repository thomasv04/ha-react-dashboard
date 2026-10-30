import { useState, useRef, useEffect, useCallback } from 'react';
import { Code2, Check, AlertTriangle, ChevronDown, Plus, Search } from 'lucide-react';
import { useHass } from '@hakit/core';
import { templateEngine } from '@/lib/template-engine';
import { isTemplateValue, tv, type TV, type TemplateValue } from '@/types/template';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

// ── Snippets rapides ──────────────────────────────────────────────────────────

const SNIPPETS = [
  { label: 'Si/Sinon', code: "{% if states('entity.id') == 'on' %}\n  valeur_si_vrai\n{% else %}\n  valeur_si_faux\n{% endif %}" },
  { label: 'Variable', code: "{% set etat = states('entity.id') %}\n{{ etat }}" },
  { label: 'Arrondi', code: "{{ states('sensor.xxx') | float | round(1) }} °C" },
  { label: 'Attribut', code: "{{ state_attr('entity.id', 'attribut') }}" },
  { label: 'A valeur ?', code: "{% if has_value('entity.id') %}ok{% else %}N/A{% endif %}" },
];

// ── Éditeur de template ───────────────────────────────────────────────────────

export function TemplateEditor({ value, onChange, entityId }: { value: string; onChange: (v: string) => void; entityId?: string }) {
  const { t } = useI18n();
  const allEntities = useHass(s => s.entities);
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

  const filteredEntities = Object.keys(allEntities ?? {})
    .filter(id => id.toLowerCase().includes(entitySearch.toLowerCase()))
    .slice(0, 30);

  return (
    <div className='space-y-2'>
      {/* Barre d'outils */}
      <div className='flex items-center gap-1 flex-wrap'>
        {/* Snippets */}
        <div className='relative'>
          <button
            onClick={() => setShowSnippets(!showSnippets)}
            className='flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--ds-surface-2)] text-[var(--ds-ink-muted)] text-[11px] transition-colors'
          >
            Snippets <ChevronDown size={10} />
          </button>
          {showSnippets && (
            <div
              className='absolute z-50 top-full left-0 mt-1 w-56 rounded-[var(--ds-radius-sm)] border border-[var(--ds-surface-3)] shadow-[var(--ds-shadow-sheet)] overflow-hidden'
              style={{ background: 'var(--ds-surface-1)' }}
            >
              {SNIPPETS.map(s => (
                <button
                  key={s.label}
                  onClick={() => {
                    insertAtCursor(s.code);
                    setShowSnippets(false);
                  }}
                  className='w-full text-left px-3 py-1.5 text-[11px] text-[var(--ds-ink-muted)]'
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Insérer entité */}
        <div className='relative'>
          <button
            onClick={() => setShowEntityPicker(!showEntityPicker)}
            className='flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--ds-surface-2)] text-[var(--ds-ink-muted)] text-[11px] transition-colors'
          >
            <Plus size={10} /> Entité
          </button>
          {showEntityPicker && (
            <div
              className='absolute z-50 top-full left-0 mt-1 w-64 rounded-[var(--ds-radius-sm)] border border-[var(--ds-surface-3)] shadow-[var(--ds-shadow-sheet)] overflow-hidden'
              style={{ background: 'var(--ds-surface-1)' }}
            >
              <div className='p-2 border-b border-[var(--ds-surface-3)]'>
                <div className='flex items-center gap-2 px-2 py-1 rounded bg-[var(--ds-surface-2)]'>
                  <Search size={11} className='text-[var(--ds-ink-muted)]' />
                  <input
                    autoFocus
                    value={entitySearch}
                    onChange={e => setEntitySearch(e.target.value)}
                    className='bg-transparent text-[11px] text-[var(--ds-ink)] outline-none flex-1 placeholder:text-[var(--ds-ink-muted)]'
                    placeholder='Rechercher une entité...'
                  />
                </div>
              </div>
              <div className='overflow-y-auto' style={{ maxHeight: 180 }}>
                {filteredEntities.map(id => (
                  <button
                    key={id}
                    onClick={() => {
                      insertAtCursor(`states('${id}')`);
                      setShowEntityPicker(false);
                      setEntitySearch('');
                    }}
                    className='w-full text-left px-3 py-1.5 text-[11px] text-[var(--ds-ink-muted)] truncate'
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
            className='px-2 py-1 rounded-md bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] text-[11px] transition-colors'
          >
            + entité courante
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
          'w-full px-3 py-2 rounded-[var(--ds-radius-sm)] border text-xs text-[var(--ds-ink)] outline-none resize-y',
          'font-mono leading-relaxed bg-black/20',
          'placeholder:text-[var(--ds-ink-muted)]',
          error
            ? 'border-[var(--ds-alert)] focus:border-[var(--ds-accent)]'
            : 'border-[var(--ds-surface-3)] focus:border-[var(--ds-accent)]'
        )}
        placeholder={"{% set v = states('sensor.xxx') %}\n{{ v }}"}
        spellCheck={false}
      />

      {/* Preview / Error */}
      {error ? (
        <div className='flex items-start gap-2 px-2 py-1.5 rounded-md bg-[var(--ds-surface-3)] border border-[var(--ds-alert)]'>
          <AlertTriangle size={12} className='text-[var(--ds-alert)] mt-0.5 shrink-0' />
          <span className='text-[10px] text-[var(--ds-alert)] font-mono leading-relaxed'>{error}</span>
        </div>
      ) : preview ? (
        <div className='flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--ds-surface-3)] border border-[var(--ds-good)]'>
          <Check size={11} className='text-[var(--ds-good)] shrink-0' />
          <span className='text-[11px] text-[var(--ds-good)]'>{t('layout.previewLabel')} </span>
          <span className='text-[11px] text-[var(--ds-good)] font-mono truncate'>{preview}</span>
        </div>
      ) : null}
    </div>
  );
}

// ── Composant principal : TemplateField ───────────────────────────────────────

export function TemplateField<T extends string | number>({
  label,
  value,
  onChange,
  entityId,
  renderValueInput,
}: {
  label: string;
  value: TV<T> | undefined;
  onChange: (v: TV<T>) => void;
  entityId?: string;
  renderValueInput: (value: T, onChange: (v: T) => void) => React.ReactNode;
  placeholder?: string;
}) {
  const isTemplate = isTemplateValue(value);
  const plainValue = (isTemplate ? '' : (value ?? '')) as T;
  const templateStr = isTemplate ? (value as TemplateValue).template : '';

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between mb-1'>
        <label className='text-[11px] text-[var(--ds-ink-muted)]'>{label}</label>
        {/* Toggle value ↔ template */}
        <button
          onClick={() => {
            if (isTemplate) {
              // Retour en valeur fixe
              onChange(plainValue || ('' as T));
            } else {
              // Passe en template
              const initial = plainValue ? `{{ '${plainValue}' }}` : '';
              onChange(tv(initial) as TV<T>);
            }
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
            isTemplate
              ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] border border-[var(--ds-accent)]'
              : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink-muted)]'
          )}
          title={isTemplate ? 'Revenir à valeur fixe' : 'Activer le mode template (Jinja2)'}
        >
          <Code2 size={10} />
          {isTemplate ? 'Template' : '{ }'}
        </button>
      </div>

      {isTemplate ? (
        <TemplateEditor value={templateStr} onChange={str => onChange(tv(str) as TV<T>)} entityId={entityId} />
      ) : (
        renderValueInput(plainValue, v => onChange(v))
      )}
    </div>
  );
}
