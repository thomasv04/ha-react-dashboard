# 13 — Template Engine : Jinja2/Nunjucks pour chaque champ de widget

## Objectif

Implémenter un **moteur de templates Jinja2** pour le dashboard, permettant à l'utilisateur de rendre **n'importe quel champ de n'importe quel widget dynamique** via des templates Nunjucks (syntaxe quasi-identique à HA Jinja2).

C'est **la feature différenciante** : ni Tunet ni aucun autre dashboard React HA open-source n'a ça. L'utilisateur peut copier-coller ses templates Mushroom directement.

## Résultat attendu

Dans la modal de configuration d'un widget, chaque champ a un **bouton bascule** `{ }` :

```
Entité         [sensor.solarflow_2400_ac_pack_state  ▼] [{ }]
Nom affiché    [Batterie solaire                       ] [{ }]
Icône          [Template ▓▒░░░░░░░░░░░░░░░░░░░░░░░░░░] [✓ ]
               ┌───────────────────────────────────────────┐
               │ {% set e = states('sensor.battery') %}    │
               │ {% if e == '1' %}mdi:battery-arrow-up     │
               │ {% else %}mdi:battery{% endif %}           │
               │                                           │
               │  Aperçu : mdi:battery-arrow-up   ✓       │
               └───────────────────────────────────────────┘
Couleur        [green                                  ] [{ }]
```

Templates supportés (compatibles Mushroom/HA) :
- `states('entity.id')` → état de l'entité
- `state_attr('entity.id', 'attribut')` → attribut
- `is_state('entity.id', 'valeur')` → boolean
- `has_value('entity.id')` → true si pas unknown/unavailable
- `{% if %}`, `{% elif %}`, `{% else %}`, `{% endif %}`
- `{% set variable = ... %}`
- Filtres : `| round(1)`, `| float`, `| int`, `| upper`, `| lower`, `| replace`
- Math : `+`, `-`, `*`, `/`, `%`
- Comparaisons : `==`, `!=`, `>`, `<`, `>=`, `<=`, `in`, `not in`

## Architecture

```
src/
  lib/
    template-engine.ts         # Environnement Nunjucks singleton + fonctions HA
    template-engine.test.ts    # Tests unitaires
  hooks/
    useTemplate.ts             # Hook React → résout un template avec état HA réactif
    useResolvedField.ts        # Hook → résout un TV<T> (TemplateOrValue)
  types/
    template.ts                # Types TV<T>, TemplateValue
    widget-configs.ts          # ← MODIFIER : ajouter TV<T> sur les champs des widgets
  components/
    layout/
      TemplateField.tsx        # Composant de champ avec bascule value/template
      WidgetEditModal.tsx      # ← MODIFIER : utiliser TemplateField pour les champs
    cards/
      SensorCard/
        SensorCard.tsx         # ← MODIFIER : utiliser useResolvedField (exemple pilote)
```

---

## Étape 1 : Installer Nunjucks

```bash
npm install nunjucks
npm install --save-dev @types/nunjucks
```

---

## Étape 2 : Types de base

### `src/types/template.ts` ← CRÉER

```typescript
/**
 * Un champ qui peut être une valeur fixe OU un template Nunjucks.
 *
 * Utilisation :
 *   icon: TV<string>  (peut être "mdi:home" ou un template Jinja2)
 *
 * Rétrocompat : si le champ vaut directement une string/number/boolean,
 * il est traité comme une valeur fixe (mode 'value' implicite).
 */
export interface TemplateValue {
  _tv: 'template';
  template: string;
}

/**
 * TV = TemplateOrValue.
 * T est le type de la valeur fixe (string, number, boolean...).
 * Le field peut être soit T (valeur directe, rétrocompat) soit TemplateValue.
 */
export type TV<T> = T | TemplateValue;

/** Type guard : vrai si la valeur est un template, pas une valeur brute */
export function isTemplateValue(v: unknown): v is TemplateValue {
  return (
    typeof v === 'object' &&
    v !== null &&
    '_tv' in v &&
    (v as TemplateValue)._tv === 'template'
  );
}

/** Crée un TemplateValue depuis une string de template */
export function tv(template: string): TemplateValue {
  return { _tv: 'template', template };
}

/** Crée une valeur fixe (pour la symétrie avec tv()) */
export function val<T>(value: T): T {
  return value;
}
```

---

## Étape 3 : Moteur Nunjucks

### `src/lib/template-engine.ts` ← CRÉER

```typescript
import nunjucks from 'nunjucks';
import type { HassEntities } from 'home-assistant-js-websocket';

type GetEntities = () => HassEntities;

/**
 * Environnement Nunjucks singleton avec les fonctions Home Assistant injectées.
 * Compatible avec la syntaxe Jinja2 de HA / Mushroom Templates.
 *
 * Fonctions disponibles dans les templates :
 *   states('entity.id')                → état sous forme de string
 *   state_attr('entity.id', 'attr')    → valeur d'un attribut
 *   is_state('entity.id', 'value')     → boolean
 *   has_value('entity.id')             → true si pas unknown/unavailable
 *   iif(condition, si_vrai, si_faux)   → ternaire lisible
 *
 * Filtres supplémentaires :
 *   | round(2)      → arrondi à N décimales
 *   | float(0)      → parse en float (défaut si NaN)
 *   | int(0)        → parse en int
 *   | multiply(1.5) → multiplication
 *   | divide(2)     → division
 */
class HATemplateEngine {
  private env: nunjucks.Environment;
  private getEntities: GetEntities = () => ({});

  constructor() {
    this.env = new nunjucks.Environment(null, { autoescape: false });
    this.registerHAGlobals();
    this.registerHAFilters();
  }

  /** Lie le moteur à la source d'entités HA (appelé par useTemplate) */
  bind(getter: GetEntities): void {
    this.getEntities = getter;
  }

  // ── Fonctions HA ────────────────────────────────────────────────────────────

  private registerHAGlobals(): void {
    const self = this;

    this.env.addGlobal('states', (entityId: string): string => {
      const entity = self.getEntities()[entityId];
      return entity?.state ?? 'unknown';
    });

    this.env.addGlobal('state_attr', (entityId: string, attr: string): unknown => {
      const entity = self.getEntities()[entityId];
      return entity?.attributes?.[attr] ?? null;
    });

    // Alias courant dans Mushroom
    this.env.addGlobal('states_attr', (entityId: string, attr: string): unknown => {
      const entity = self.getEntities()[entityId];
      return entity?.attributes?.[attr] ?? null;
    });

    this.env.addGlobal('is_state', (entityId: string, value: string): boolean => {
      const entity = self.getEntities()[entityId];
      return entity?.state === String(value);
    });

    this.env.addGlobal('has_value', (entityId: string): boolean => {
      const state = (self.getEntities()[entityId]?.state ?? 'unavailable');
      return state !== 'unknown' && state !== 'unavailable';
    });

    // Ternaire dans un appel de fonction (plus lisible que ?: dans Nunjucks)
    this.env.addGlobal(
      'iif',
      (condition: unknown, ifTrue: unknown, ifFalse: unknown): unknown =>
        condition ? ifTrue : ifFalse,
    );
  }

  // ── Filtres supplémentaires ──────────────────────────────────────────────────

  private registerHAFilters(): void {
    this.env.addFilter('round', (num: unknown, precision = 0): number => {
      const n = parseFloat(String(num));
      if (isNaN(n)) return 0;
      const factor = Math.pow(10, precision);
      return Math.round(n * factor) / factor;
    });

    this.env.addFilter('float', (v: unknown, defaultVal = 0): number => {
      const n = parseFloat(String(v));
      return isNaN(n) ? defaultVal : n;
    });

    this.env.addFilter('int', (v: unknown, defaultVal = 0): number => {
      const n = parseInt(String(v), 10);
      return isNaN(n) ? defaultVal : n;
    });

    this.env.addFilter('multiply', (v: unknown, factor: number): number => {
      return parseFloat(String(v)) * factor;
    });

    this.env.addFilter('divide', (v: unknown, by: number): number => {
      const n = parseFloat(String(v));
      return by !== 0 ? n / by : 0;
    });

    // Déjà dans Nunjucks : upper, lower, replace, trim, truncate, default, join, sum, etc.
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  /**
   * Résout un template Nunjucks avec l'état HA courant.
   * @returns La string résolue, ou un message d'erreur préfixé par "[Erreur template]"
   */
  render(template: string): string {
    try {
      return this.env.renderString(template, {}).trim();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[TemplateEngine] Error:', msg, '\nTemplate:', template);
      return `[Erreur template: ${msg}]`;
    }
  }

  /**
   * Vérifie la syntaxe d'un template sans l'évaluer.
   * @returns null si valide, string d'erreur si invalide
   */
  validate(template: string): string | null {
    try {
      nunjucks.compile(template, this.env);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  }
}

/** Singleton — partagé par toute l'application */
export const templateEngine = new HATemplateEngine();
```

---

## Étape 4 : Hooks React

### `src/hooks/useTemplate.ts` ← CRÉER

```typescript
import { useEffect, useRef, useState } from 'react';
import { useHass } from '@hakit/core';
import { templateEngine } from '@/lib/template-engine';
import { isTemplateValue, type TV } from '@/types/template';

/**
 * Résout un template Nunjucks de façon réactive.
 * Re-rend automatiquement quand les entités HA changent.
 *
 * @param template - String Nunjucks (ex: "{% if states('sensor.x') == '1' %}on{% endif %}")
 * @returns La string résolue
 *
 * @example
 * const icon = useTemplate("{% if is_state('light.salon', 'on') %}mdi:lightbulb{% else %}mdi:lightbulb-off{% endif %}");
 */
export function useTemplate(template: string): string {
  const entities = useHass(s => s.entities);

  useEffect(() => {
    templateEngine.bind(() => entities ?? {});
  }, [entities]);

  // Résoudre synchroniquement à chaque render (les entities ont changé → re-render → nouveau résultat)
  return templateEngine.render(template);
}

/**
 * Résout un TV<T> (TemplateOrValue) de façon réactive.
 * Si c'est une valeur fixe → retourne directement.
 * Si c'est un template → évalue via Nunjucks.
 *
 * @param field - TV<T> ou undefined
 * @param fallback - Valeur si field est undefined
 * @returns T résolu
 *
 * @example
 * const config = getWidgetConfig<SensorCardConfig>(id);
 * const icon = useResolvedField(config.icon, 'mdi:help');
 * const color = useResolvedField(config.color, 'blue');
 */
export function useResolvedField<T>(field: TV<T> | undefined, fallback: T): T {
  const entities = useHass(s => s.entities);

  useEffect(() => {
    templateEngine.bind(() => entities ?? {});
  }, [entities]);

  if (field === undefined || field === null) return fallback;

  if (isTemplateValue(field)) {
    return templateEngine.render(field.template) as unknown as T;
  }

  return field as T;
}
```

---

## Étape 5 : Composant TemplateField

### `src/components/layout/TemplateField.tsx` ← CRÉER

Ce composant remplace les `FieldInput` et `EntityPicker` actuels dans `WidgetEditModal.tsx` pour les champs qui supportent les templates.

```typescript
import { useState, useRef, useEffect, useCallback } from 'react';
import { Code2, Check, AlertTriangle, ChevronDown, Plus, Search } from 'lucide-react';
import { useHass } from '@hakit/core';
import { templateEngine } from '@/lib/template-engine';
import { isTemplateValue, tv, type TV } from '@/types/template';
import { cn } from '@/lib/utils';

// ── Snippets rapides ──────────────────────────────────────────────────────────

const SNIPPETS = [
  { label: 'Si/Sinon', code: "{% if states('entity.id') == 'on' %}\n  valeur_si_vrai\n{% else %}\n  valeur_si_faux\n{% endif %}" },
  { label: 'Variable', code: "{% set etat = states('entity.id') %}\n{{ etat }}" },
  { label: 'Arrondi', code: "{{ states('sensor.xxx') | float | round(1) }} °C" },
  { label: 'Attribut', code: "{{ state_attr('entity.id', 'attribut') }}" },
  { label: 'A valeur ?', code: "{% if has_value('entity.id') %}ok{% else %}N/A{% endif %}" },
];

// ── Éditeur de template ───────────────────────────────────────────────────────

function TemplateEditor({
  value,
  onChange,
  entityId,
}: {
  value: string;
  onChange: (v: string) => void;
  entityId?: string;
}) {
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
    templateEngine.bind(() => entities ?? {});
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
  const insertAtCursor = useCallback((text: string) => {
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
  }, [value, onChange]);

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
            className='flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[11px] transition-colors'
          >
            Snippets <ChevronDown size={10} />
          </button>
          {showSnippets && (
            <div className='absolute z-50 top-full left-0 mt-1 w-56 rounded-lg border border-white/10 shadow-xl overflow-hidden'
              style={{ background: 'rgba(12, 16, 40, 0.98)' }}
            >
              {SNIPPETS.map(s => (
                <button
                  key={s.label}
                  onClick={() => { insertAtCursor(s.code); setShowSnippets(false); }}
                  className='w-full text-left px-3 py-1.5 text-[11px] text-white/60 hover:bg-white/8 hover:text-white/90'
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
            className='flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[11px] transition-colors'
          >
            <Plus size={10} /> Entité
          </button>
          {showEntityPicker && (
            <div className='absolute z-50 top-full left-0 mt-1 w-64 rounded-lg border border-white/10 shadow-xl overflow-hidden'
              style={{ background: 'rgba(12, 16, 40, 0.98)' }}
            >
              <div className='p-2 border-b border-white/8'>
                <div className='flex items-center gap-2 px-2 py-1 rounded bg-white/5'>
                  <Search size={11} className='text-white/30' />
                  <input
                    autoFocus
                    value={entitySearch}
                    onChange={e => setEntitySearch(e.target.value)}
                    className='bg-transparent text-[11px] text-white/80 outline-none flex-1 placeholder:text-white/20'
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
                    className='w-full text-left px-3 py-1.5 text-[11px] text-white/60 hover:bg-white/8 hover:text-white/90 truncate'
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
            className='px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400/70 hover:text-blue-400 text-[11px] transition-colors'
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
          'w-full px-3 py-2 rounded-lg border text-xs text-white/80 outline-none resize-y',
          'font-mono leading-relaxed bg-black/20',
          'placeholder:text-white/15',
          error
            ? 'border-red-500/40 focus:border-red-500/70'
            : 'border-white/10 focus:border-blue-500/50',
        )}
        placeholder="{% set v = states('sensor.xxx') %}&#10;{{ v }}"
        spellCheck={false}
      />

      {/* Preview / Error */}
      {error ? (
        <div className='flex items-start gap-2 px-2 py-1.5 rounded-md bg-red-500/10 border border-red-500/20'>
          <AlertTriangle size={12} className='text-red-400 mt-0.5 shrink-0' />
          <span className='text-[10px] text-red-300/80 font-mono leading-relaxed'>{error}</span>
        </div>
      ) : preview ? (
        <div className='flex items-center gap-2 px-2 py-1.5 rounded-md bg-green-500/8 border border-green-500/15'>
          <Check size={11} className='text-green-400 shrink-0' />
          <span className='text-[11px] text-green-300/70'>Aperçu : </span>
          <span className='text-[11px] text-green-200/90 font-mono truncate'>{preview}</span>
        </div>
      ) : null}
    </div>
  );
}

// ── Composant principal : TemplateField ───────────────────────────────────────

/**
 * Champ de formulaire polyvalent qui supporte le mode "valeur fixe" et le mode "template".
 * Remplace FieldInput/EntityPicker dans WidgetEditModal pour les champs TV<T>.
 *
 * @example
 * <TemplateField
 *   label="Icône"
 *   value={config.icon}
 *   onChange={v => updateConfig({ icon: v })}
 *   entityId={config.entityId}
 *   renderValueInput={(value, onChange) => (
 *     <IconPicker value={value} onChange={onChange} />
 *   )}
 * />
 */
export function TemplateField<T extends string | number>({
  label,
  value,
  onChange,
  entityId,
  renderValueInput,
  placeholder,
}: {
  label: string;
  value: TV<T> | undefined;
  onChange: (v: TV<T>) => void;
  entityId?: string;
  /** Rendu du contrôle en mode valeur fixe (input, picker, select...) */
  renderValueInput: (value: T, onChange: (v: T) => void) => React.ReactNode;
  placeholder?: string;
}) {
  const isTemplate = isTemplateValue(value);
  const plainValue = (isTemplate ? '' : (value ?? '')) as T;
  const templateStr = isTemplate ? (value as import('@/types/template').TemplateValue).template : '';

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between mb-1'>
        <label className='text-[11px] text-white/40'>{label}</label>
        {/* Toggle value ↔ template */}
        <button
          onClick={() => {
            if (isTemplate) {
              // Retour en valeur fixe : essayer de parser le résultat comme valeur
              onChange(plainValue || ('' as T));
            } else {
              // Passe en template : pré-remplir avec la valeur actuelle si c'est une string simple
              const initial = plainValue ? `{{ '${plainValue}' }}` : '';
              onChange(tv(initial));
            }
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
            isTemplate
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
              : 'bg-white/5 text-white/30 hover:text-white/60 hover:bg-white/10',
          )}
          title={isTemplate ? 'Revenir à valeur fixe' : 'Activer le mode template (Jinja2)'}
        >
          <Code2 size={10} />
          {isTemplate ? 'Template' : '{ }'}
        </button>
      </div>

      {isTemplate ? (
        <TemplateEditor
          value={templateStr}
          onChange={str => onChange(tv(str))}
          entityId={entityId}
        />
      ) : (
        renderValueInput(plainValue, v => onChange(v))
      )}
    </div>
  );
}
```

---

## Étape 6 : Mettre à jour les configs de widgets

### `src/types/widget-configs.ts` ← MODIFIER

Importer le type `TV` et l'appliquer progressivement. **Commencer par `SensorCardConfig`** comme widget pilote, puis appliquer à tous.

```typescript
// Ajouter en haut du fichier, après les imports existants :
import type { TV } from './template';
```

Modifier `SensorCardConfig` :

```typescript
// ── Sensor ────────────────────────────────────────────────────────────────────
export type SensorVariant = 'default' | 'gauge' | 'sparkline';

export interface SensorCardConfig {
  type: 'sensor';
  entityId: string;           // L'entité principale (pas un template, toujours fixe)
  name?: TV<string>;          // ← WAS: name?: string
  icon?: TV<string>;          // ← WAS: icon?: string
  color?: TV<string>;         // ← NOUVEAU : couleur dynamique
  unit?: TV<string>;          // ← NOUVEAU : unité dynamique (override l'unité de l'entité)
  variant?: SensorVariant;
  min?: number;
  max?: number;
  thresholds?: { value: number; color: string }[];
  onText?: TV<string>;        // ← WAS: onText?: string
  offText?: TV<string>;       // ← WAS: offText?: string
}
```

> **Note rétrocompatibilité** : Les configs existantes avec des `string` simples continuent de fonctionner car `TV<string> = string | TemplateValue`. `isTemplateValue('Chambre')` retourne `false` → la string est utilisée directement.

Appliquer le même pattern à `LightCardConfig` :

```typescript
export interface LightCardConfig {
  type: 'light';
  entityId: string;
  name?: TV<string>;
  icon?: TV<string>;
  isGroup?: boolean;
  groupEntities?: string[];
}
```

Et `CoverCardConfig` :

```typescript
export interface CoverCardConfig {
  type: 'cover';
  entityId: string;
  name?: TV<string>;
  icon?: TV<string>;
  showTilt?: boolean;
}
```

---

## Étape 7 : Intégrer dans SensorCard (widget pilote)

### `src/components/cards/SensorCard/SensorCard.tsx` ← MODIFIER

Remplacer la lecture directe des champs par `useResolvedField` :

```typescript
// Ajouter l'import
import { useResolvedField } from '@/hooks/useTemplate';

// Dans le composant SensorCard, remplacer :
// const name = config?.name ?? entityState?.attributes?.friendly_name ?? entityId;
// const icon = config?.icon ?? 'activity';

// Par :
const config = getWidgetConfig<SensorCardConfig>(widgetId);

const name = useResolvedField(config?.name, 
  entityState?.attributes?.friendly_name ?? entityId ?? 'Capteur');
const icon = useResolvedField(config?.icon, 
  inferIconFromEntity(entityId ?? ''));
const color = useResolvedField(config?.color, 
  inferColorFromState(entityState?.state));
const unit = useResolvedField(config?.unit,
  entityState?.attributes?.unit_of_measurement ?? '');
const onText = useResolvedField(config?.onText, 'Actif');
const offText = useResolvedField(config?.offText, 'Inactif');
```

> `useResolvedField` est réactif : si une entité utilisée dans un template change, le composant re-render automatiquement.

---

## Étape 8 : Mettre à jour WidgetEditModal

### `src/components/layout/WidgetEditModal.tsx` ← MODIFIER

**1. Importer `TemplateField` :**

```typescript
import { TemplateField } from '@/components/layout/TemplateField';
import type { TV } from '@/types/template';
```

**2. Remplacer les champs `name`, `icon`, `color` de SensorCard par des `TemplateField` :**

Dans la fonction qui rend les champs du widget `sensor` (dans le switch/map des `WIDGET_FIELD_DEFS`) :

```tsx
{/* Champ Nom — avec support template */}
<TemplateField<string>
  label="Nom affiché"
  value={previewConfig.name as TV<string> | undefined}
  onChange={v => updateConfig({ name: v })}
  entityId={previewConfig.entityId}
  renderValueInput={(val, onChange) => (
    <input
      type="text"
      value={val}
      onChange={e => onChange(e.target.value)}
      placeholder="Chambre"
      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50"
    />
  )}
/>

{/* Champ Icône — avec support template */}
<TemplateField<string>
  label="Icône"
  value={previewConfig.icon as TV<string> | undefined}
  onChange={v => updateConfig({ icon: v })}
  entityId={previewConfig.entityId}
  renderValueInput={(val, onChange) => (
    <IconPicker value={val} onChange={onChange} />
  )}
/>

{/* Champ Couleur (NOUVEAU) — avec support template */}
<TemplateField<string>
  label="Couleur"
  value={previewConfig.color as TV<string> | undefined}
  onChange={v => updateConfig({ color: v })}
  entityId={previewConfig.entityId}
  renderValueInput={(val, onChange) => (
    <div className="flex gap-2 flex-wrap">
      {['blue', 'green', 'orange', 'red', 'purple', 'yellow'].map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            'px-2 py-1 rounded text-xs capitalize transition-all',
            val === c ? 'ring-2 ring-white/40 opacity-100' : 'opacity-50 hover:opacity-80',
          )}
          style={{ background: colorToHex(c) }}
        >
          {c}
        </button>
      ))}
    </div>
  )}
/>
```

**3. Ajouter `colorToHex` helper dans le fichier :**

```typescript
function colorToHex(color: string): string {
  const map: Record<string, string> = {
    blue: '#3b82f6', green: '#22c55e', orange: '#f97316',
    red: '#ef4444', purple: '#a855f7', yellow: '#eab308',
    grey: '#6b7280', gray: '#6b7280', white: '#f1f5f9',
  };
  return map[color] ?? color; // supporte aussi les hex directs
}
```

---

## Étape 9 : Exemple complet (type Mushroom)

Voici un exemple de config SensorCard avec templates, identique à l'exemple Mushroom de la question :

```typescript
// Dans dashboard_config.json ou via la modal
const solarBatteryWidget: SensorCardConfig = {
  type: 'sensor',
  entityId: 'sensor.solarflow_2400_ac_pack_state',
  name: { _tv: 'template', template: 'Batterie solaire' },
  icon: {
    _tv: 'template',
    template: `
      {%- set etat = states('sensor.solarflow_2400_ac_pack_state') -%}
      {%- if etat in ['charging', 'En charge', '1'] -%}
        mdi:battery-arrow-up
      {%- elif etat in ['discharging', 'En décharge', '2'] -%}
        mdi:battery-arrow-down
      {%- else -%}
        mdi:battery
      {%- endif -%}
    `,
  },
  color: {
    _tv: 'template',
    template: `
      {%- set etat = states('sensor.solarflow_2400_ac_pack_state') -%}
      {%- if etat in ['charging', 'En charge', '1'] -%}green
      {%- elif etat in ['discharging', 'En décharge', '2'] -%}orange
      {%- else -%}grey{%- endif -%}
    `,
  },
  unit: {
    _tv: 'template',
    template: `
      {%- set etat = states('sensor.solarflow_2400_ac_pack_state') -%}
      {%- if etat in ['charging', 'En charge', '1'] -%}
        {{ states('sensor.solarflow_2400_ac_grid_input_power') }} W
      {%- elif etat in ['discharging', 'En décharge', '2'] -%}
        {{ states('sensor.solarflow_2400_ac_output_home_power') }} W
      {%- else -%}0 W{%- endif -%}
    `,
  },
};
```

---

## Étape 10 : Tests

### `src/lib/template-engine.test.ts` ← CRÉER

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { templateEngine } from './template-engine';
import type { HassEntities } from 'home-assistant-js-websocket';

const mockEntities: HassEntities = {
  'sensor.temperature': {
    entity_id: 'sensor.temperature',
    state: '21.5',
    attributes: { unit_of_measurement: '°C', friendly_name: 'Température' },
    last_changed: '', last_updated: '', context: { id: '', user_id: null, parent_id: null },
  },
  'light.salon': {
    entity_id: 'light.salon',
    state: 'on',
    attributes: { brightness: 128, friendly_name: 'Salon' },
    last_changed: '', last_updated: '', context: { id: '', user_id: null, parent_id: null },
  },
  'sensor.battery': {
    entity_id: 'sensor.battery',
    state: '1',
    attributes: { friendly_name: 'Batterie' },
    last_changed: '', last_updated: '', context: { id: '', user_id: null, parent_id: null },
  },
};

beforeEach(() => {
  templateEngine.bind(() => mockEntities);
});

describe('templateEngine.render', () => {
  it('résout states()', () => {
    expect(templateEngine.render("{{ states('sensor.temperature') }}")).toBe('21.5');
  });

  it('résout state_attr()', () => {
    expect(templateEngine.render("{{ state_attr('sensor.temperature', 'unit_of_measurement') }}")).toBe('°C');
  });

  it('résout is_state()', () => {
    expect(templateEngine.render("{{ is_state('light.salon', 'on') }}")).toBe('true');
  });

  it('résout has_value()', () => {
    expect(templateEngine.render("{{ has_value('sensor.temperature') }}")).toBe('true');
  });

  it('résout {% if %} / {% elif %} / {% else %}', () => {
    const template = `
      {%- set etat = states('sensor.battery') -%}
      {%- if etat == '1' -%}charging
      {%- elif etat == '2' -%}discharging
      {%- else -%}idle{%- endif -%}
    `;
    expect(templateEngine.render(template)).toBe('charging');
  });

  it('résout le filtre | round', () => {
    expect(templateEngine.render("{{ states('sensor.temperature') | float | round(1) }}")).toBe('21.5');
  });

  it('résout le filtre | multiply', () => {
    expect(templateEngine.render("{{ state_attr('light.salon', 'brightness') | multiply(100) | divide(255) | round(0) }}")).toBe('50');
  });

  it('résout in avec liste', () => {
    const template = `{%- if states('sensor.battery') in ['1', 'charging'] -%}oui{%- else -%}non{%- endif -%}`;
    expect(templateEngine.render(template)).toBe('oui');
  });

  it('retourne unknown pour entité inexistante', () => {
    expect(templateEngine.render("{{ states('sensor.inexistant') }}")).toBe('unknown');
  });

  it('retourne un message d\'erreur sur syntaxe invalide', () => {
    const result = templateEngine.render('{% if unclosed %}');
    expect(result).toContain('[Erreur template:');
  });
});

describe('templateEngine.validate', () => {
  it('retourne null pour un template valide', () => {
    expect(templateEngine.validate("{% if true %}ok{% endif %}")).toBeNull();
  });

  it('retourne un message d\'erreur pour une syntaxe invalide', () => {
    expect(templateEngine.validate('{% if unclosed %}')).not.toBeNull();
  });
});
```

---

## Étape 11 : Guide de migration des autres widgets

Pattern à appliquer à chaque widget pour activer le support template :

### Dans `widget-configs.ts`

```typescript
// Remplacer les champs string par TV<string>
// AVANT :
// name?: string;
// icon?: string;

// APRÈS :
import type { TV } from './template';
name?: TV<string>;
icon?: TV<string>;
color?: TV<string>;   // Ajouter si absent
```

### Dans le composant `.tsx` du widget

```typescript
// Ajouter en haut :
import { useResolvedField } from '@/hooks/useTemplate';

// Dans le corps du composant :
const config = getWidgetConfig<MonWidgetConfig>(widgetId);
const name = useResolvedField(config?.name, fallback);
const icon = useResolvedField(config?.icon, 'help');
// Utiliser name, icon directement dans le JSX
```

### Dans `WidgetEditModal.tsx`

```typescript
// Remplacer les <FieldInput label="Nom"> par :
<TemplateField<string>
  label="Nom"
  value={previewConfig.name}
  onChange={v => updateConfig({ name: v })}
  entityId={previewConfig.entityId}
  renderValueInput={(val, onChange) => (
    <input ... value={val} onChange={e => onChange(e.target.value)} />
  )}
/>
```

### Liste des widgets à migrer (par ordre de priorité)

| Widget | Champs à rendre templateables |
|--------|------------------------------|
| `sensor` | `name`, `icon`, `color`, `unit`, `onText`, `offText` |
| `light` | `name`, `icon` |
| `cover` | `name`, `icon` |
| `thermostat` | `name` (via entityId) |
| `person` | chaque `PersonEntry.name` |
| `shortcuts` | chaque `ShortcutEntry.label`, `.icon` |
| `activity` | chaque `ActivityPill.label`, `.template` (déjà un mini-template!) |

> **Note** : `activity` pills ont déjà un champ `template` avec une syntaxe custom `{state}`. Ce champ peut être migré vers Nunjucks réel (rétrocompat : détecter si la string contient `{% ` ou `{{ ` pour traiter en Nunjucks, sinon garder l'ancienne syntaxe `{state}`).

---

## Points de vigilance

### Performance
- Le moteur Nunjucks est **synchrone** — pas de latence réseau
- Re-évaluation à chaque changement d'entité (géré par React re-render de `useHass`)
- **Ne pas** appeler `templateEngine.render()` en dehors d'un hook React (pas d'accès aux entités)
- Pour les composants qui n'utilisent **aucun** template, aucun overhead (le chemin `!isTemplateValue` est gratuit)

### Sécurité
- Nunjucks en mode **browser** n'a pas accès au filesystem ou aux modules Node
- `autoescape: false` est nécessaire pour retourner du texte brut (icônes, couleurs)
- Les templates ne peuvent pas appeler `eval()`, `import`, `require` — Nunjucks n'expose pas ces primitives
- Les templates sont stockés dans `dashboard_config.json` (côté client, pas de XSS possible entre utilisateurs)

### Bundle size
- Nunjucks ajoute ~50kb gzippé — acceptable pour une feature aussi puissante
- Alternative si taille critique : `nunjucks/browser` (version allégée sans loader de fichiers)

### Débogage
- Les erreurs de template s'affichent en rouge dans l'éditeur **avant** d'appliquer
- En production, les erreurs sont loggées en console (`console.warn`) mais n'crashent pas le composant (retourne `[Erreur template: ...]`)

---

## Résumé des fichiers

| Fichier | Action | Notes |
|---------|--------|-------|
| `package.json` | `npm install nunjucks @types/nunjucks` | |
| `src/types/template.ts` | CRÉER | `TV<T>`, `TemplateValue`, `isTemplateValue`, `tv()` |
| `src/lib/template-engine.ts` | CRÉER | Singleton Nunjucks + fonctions HA |
| `src/lib/template-engine.test.ts` | CRÉER | 10+ tests |
| `src/hooks/useTemplate.ts` | CRÉER | `useTemplate()` + `useResolvedField()` |
| `src/components/layout/TemplateField.tsx` | CRÉER | Composant UI avec bascule + éditeur |
| `src/types/widget-configs.ts` | MODIFIER | Importer `TV`, modifier `SensorCardConfig` en pilote |
| `src/components/cards/SensorCard/SensorCard.tsx` | MODIFIER | Utiliser `useResolvedField` |
| `src/components/layout/WidgetEditModal.tsx` | MODIFIER | Utiliser `TemplateField` pour les champs `sensor` |

**Ordre d'implémentation recommandé** :
1. `template.ts` + `template-engine.ts` + tests → `npx vitest run`
2. `useTemplate.ts`
3. `TemplateField.tsx`
4. Modifier `widget-configs.ts` (SensorCard uniquement)
5. Modifier `SensorCard.tsx`
6. Modifier `WidgetEditModal.tsx`
7. Vérifier `npx tsc --noEmit`
8. Tester manuellement : ouvrir le modal d'un SensorCard, activer le template sur "Icône", entrer `{% if is_state('light.salon', 'on') %}mdi:lightbulb{% else %}mdi:lightbulb-off{% endif %}` → voir l'aperçu se mettre à jour en temps réel
