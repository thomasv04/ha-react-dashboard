import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Search, Check, X, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { WIDGET_META, WIDGET_FIELD_DEFS, DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { ChildFieldRenderer, WIDE_FIELD_TYPES } from '@/components/layout/WidgetEditModal/GroupWidgetsTab';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { IconPicker } from '@/components/layout/WidgetPickers';
import { cn, clamp } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { genId } from './block-meta';
import type { ButtonBlock, ButtonRowBlock, InlineButton, CoverRowBlock, SectionHeaderBlock, WidgetBlock } from '@/types/custom-panel';

/**
 * Formulaires d'édition des blocs, un par type.
 *
 * Sortis de `CustomPanelEditorModal`, qui pesait 1 100 lignes : la coquille de
 * la modale, la liste des modales et la saisie de chaque bloc y étaient
 * mélangées, et toucher un champ obligeait à relire l'ensemble.
 *
 * Gabarit Echo, le même que le sélecteur d'entité qu'ils côtoient : libellé en
 * gras au-dessus, champ de 48 px sur fond `surface-3`.
 */

const LABEL = 'mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]';
const INPUT =
  'h-12 w-full rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 text-base text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)] focus:ring-2 focus:ring-[var(--ds-accent)]';
const ROUND = 'flex size-10 shrink-0 items-center justify-center rounded-full';
/** Pastille d'action secondaire : « Ajouter une entité »… */
const PILL = 'flex h-11 items-center gap-2 self-start rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-sm font-semibold';

// ── Service picker ────────────────────────────────────────────────────────────

const SERVICE_PRESETS: Array<{ domain: string; service: string; labelKey: string }> = [
  { domain: 'cover', service: 'open_cover', labelKey: 'layout.customPanel.servicePresets.cover.open_cover' },
  { domain: 'cover', service: 'close_cover', labelKey: 'layout.customPanel.servicePresets.cover.close_cover' },
  { domain: 'cover', service: 'stop_cover', labelKey: 'layout.customPanel.servicePresets.cover.stop_cover' },
  { domain: 'cover', service: 'toggle', labelKey: 'layout.customPanel.servicePresets.cover.toggle' },
  { domain: 'cover', service: 'set_cover_position', labelKey: 'layout.customPanel.servicePresets.cover.set_cover_position' },
  { domain: 'light', service: 'turn_on', labelKey: 'layout.customPanel.servicePresets.light.turn_on' },
  { domain: 'light', service: 'turn_off', labelKey: 'layout.customPanel.servicePresets.light.turn_off' },
  { domain: 'light', service: 'toggle', labelKey: 'layout.customPanel.servicePresets.light.toggle' },
  { domain: 'switch', service: 'turn_on', labelKey: 'layout.customPanel.servicePresets.switch.turn_on' },
  { domain: 'switch', service: 'turn_off', labelKey: 'layout.customPanel.servicePresets.switch.turn_off' },
  { domain: 'switch', service: 'toggle', labelKey: 'layout.customPanel.servicePresets.switch.toggle' },
  { domain: 'input_boolean', service: 'turn_on', labelKey: 'layout.customPanel.servicePresets.input_boolean.turn_on' },
  { domain: 'input_boolean', service: 'turn_off', labelKey: 'layout.customPanel.servicePresets.input_boolean.turn_off' },
  { domain: 'input_boolean', service: 'toggle', labelKey: 'layout.customPanel.servicePresets.input_boolean.toggle' },
  { domain: 'scene', service: 'turn_on', labelKey: 'layout.customPanel.servicePresets.scene.turn_on' },
  { domain: 'script', service: 'turn_on', labelKey: 'layout.customPanel.servicePresets.script.turn_on' },
  { domain: 'automation', service: 'trigger', labelKey: 'layout.customPanel.servicePresets.automation.trigger' },
  { domain: 'automation', service: 'turn_on', labelKey: 'layout.customPanel.servicePresets.automation.turn_on' },
  { domain: 'automation', service: 'turn_off', labelKey: 'layout.customPanel.servicePresets.automation.turn_off' },
  { domain: 'climate', service: 'set_hvac_mode', labelKey: 'layout.customPanel.servicePresets.climate.set_hvac_mode' },
  { domain: 'climate', service: 'set_temperature', labelKey: 'layout.customPanel.servicePresets.climate.set_temperature' },
  { domain: 'media_player', service: 'media_play', labelKey: 'layout.customPanel.servicePresets.media_player.media_play' },
  { domain: 'media_player', service: 'media_pause', labelKey: 'layout.customPanel.servicePresets.media_player.media_pause' },
  { domain: 'media_player', service: 'media_stop', labelKey: 'layout.customPanel.servicePresets.media_player.media_stop' },
  { domain: 'vacuum', service: 'start', labelKey: 'layout.customPanel.servicePresets.vacuum.start' },
  { domain: 'vacuum', service: 'return_to_base', labelKey: 'layout.customPanel.servicePresets.vacuum.return_to_base' },
];

export function ServicePicker({
  domain,
  service,
  onChange,
}: {
  domain: string;
  service: string;
  onChange: (domain: string, service: string) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const { open, close, toggle: handleOpen, triggerRef, dropRef, dropStyle } = useDropdownPortal<HTMLButtonElement>();

  const current = domain && service ? `${domain}.${service}` : '';
  const currentPreset = SERVICE_PRESETS.find(p => p.domain === domain && p.service === service);
  const currentLabel = currentPreset ? t(currentPreset.labelKey) : undefined;

  const filtered = search
    ? SERVICE_PRESETS.filter(
        p => t(p.labelKey).toLowerCase().includes(search.toLowerCase()) || `${p.domain}.${p.service}`.includes(search.toLowerCase())
      )
    : SERVICE_PRESETS;

  const dropdown =
    open &&
    createPortal(
      <div
        ref={dropRef}
        className='fixed overflow-hidden rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-sheet)]'
        style={{ ...dropStyle, zIndex: 9999, background: 'var(--ds-surface-1)' }}
      >
        <div className='p-2'>
          <div className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-4'>
            <Search size={16} className='shrink-0 text-[var(--ds-ink-muted)]' />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('layout.customPanel.searchService')}
              className='flex-1 bg-transparent text-base text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
            />
          </div>
        </div>
        <div className='space-y-0.5 overflow-y-auto px-2 pb-2' style={{ maxHeight: 260 }}>
          {filtered.map(p => {
            const isActive = p.domain === domain && p.service === service;
            return (
              <button
                key={`${p.domain}.${p.service}`}
                onClick={() => {
                  onChange(p.domain, p.service);
                  close();
                  setSearch('');
                }}
                className={cn(
                  'flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--ds-radius-sm)] px-3 text-left',
                  isActive ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'hover:bg-[var(--ds-surface-2)]'
                )}
              >
                <span className='font-semibold'>{t(p.labelKey)}</span>
                <span
                  className={cn('shrink-0 font-mono text-xs', isActive ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]')}
                >
                  {p.domain}.{p.service}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className='py-3 text-center text-sm text-[var(--ds-ink-muted)]'>{t('layout.customPanel.noServiceResult')}</p>
          )}
        </div>
        <div className='border-t border-[var(--ds-surface-3)] p-3'>
          <p className='mb-2 text-xs font-semibold text-[var(--ds-ink-muted)]'>{t('layout.customPanel.manualEntry')}</p>
          <div className='flex gap-2'>
            <input
              value={domain}
              onChange={e => onChange(e.target.value, service)}
              placeholder={t('layout.customPanel.domainPlaceholder')}
              className={cn(INPUT, 'h-10 font-mono text-sm')}
            />
            <input
              value={service}
              onChange={e => onChange(domain, e.target.value)}
              placeholder={t('layout.customPanel.servicePlaceholder')}
              className={cn(INPUT, 'h-10 font-mono text-sm')}
            />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div>
      <label className={LABEL}>{t('layout.customPanel.serviceLabel')}</label>
      <button
        ref={triggerRef}
        type='button'
        onClick={handleOpen}
        className={cn(INPUT, 'flex items-center gap-2 text-left', open && 'ring-2 ring-[var(--ds-accent)]')}
      >
        <span className='flex-1 truncate'>
          {currentLabel ? (
            <>
              <span>{currentLabel}</span>
              <span className='ml-2 font-mono text-xs text-[var(--ds-ink-muted)]'>{current}</span>
            </>
          ) : current ? (
            <span className='font-mono text-sm text-[var(--ds-ink-muted)]'>{current}</span>
          ) : (
            <span className='text-[var(--ds-ink-muted)]'>{t('layout.customPanel.chooseService')}</span>
          )}
        </span>
        {open ? (
          <ChevronUp size={18} className='shrink-0 text-[var(--ds-ink-muted)]' />
        ) : (
          <ChevronDown size={18} className='shrink-0 text-[var(--ds-ink-muted)]' />
        )}
      </button>
      {dropdown}
    </div>
  );
}

// ── Panel ref badge (copy ID) ─────────────────────────────────────────────────

export function PanelRefBadge({ panelId }: { panelId: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const ref = `custom:${panelId}`;

  const copy = () => {
    navigator.clipboard.writeText(ref).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className='flex min-h-[64px] items-center gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-4'>
      <div className='min-w-0 flex-1'>
        <p className='text-[17px] font-semibold'>{t('layout.customPanel.refBadgeTitle')}</p>
        <p className='truncate font-mono text-sm text-[var(--ds-ink-muted)]'>{ref}</p>
      </div>
      <button onClick={copy} title={t('common.copy')} aria-label={t('common.copy')} className={cn(ROUND, 'bg-[var(--ds-surface-3)]')}>
        {copied ? <Check size={18} className='text-[var(--ds-good)]' /> : <Copy size={16} />}
      </button>
    </div>
  );
}

// ── Block forms ───────────────────────────────────────────────────────────────

export function ButtonFields({
  label,
  icon,
  variant,
  domain,
  service,
  targetEntityIds,
  onChange,
}: {
  label: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  domain: string;
  service: string;
  targetEntityIds: string[];
  onChange: (
    patch: Partial<{
      label: string;
      icon?: string;
      variant: 'primary' | 'secondary';
      domain: string;
      service: string;
      targetEntityIds: string[];
    }>
  ) => void;
}) {
  const { t } = useI18n();
  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <div>
          <label className={LABEL}>{t('layout.customPanel.blockLabel')}</label>
          <input
            value={label}
            onChange={e => onChange({ label: e.target.value })}
            placeholder={t('layout.customPanel.buttonLabelPlaceholder')}
            className={INPUT}
          />
        </div>
        <IconPicker value={icon ?? ''} onChange={v => onChange({ icon: v || undefined })} label={t('layout.customPanel.blockIcon')} />
      </div>

      <div>
        <span className={LABEL}>{t('layout.customPanel.blockVariant')}</span>
        {/* La tuile telle qu'elle s'affichera : bleue pour le principal. */}
        <div role='radiogroup' aria-label={t('layout.customPanel.blockVariant')} className='flex gap-2'>
          {(['primary', 'secondary'] as const).map(v => (
            <button
              key={v}
              role='radio'
              aria-checked={variant === v}
              onClick={() => onChange({ variant: v })}
              className={cn(
                'h-11 flex-1 rounded-[var(--ds-radius-pill)] font-semibold',
                variant !== v
                  ? 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
                  : v === 'primary'
                    ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
                    : 'bg-[var(--ds-ink)] text-[var(--ds-ground)]'
              )}
            >
              {v === 'primary' ? t('layout.customPanel.blockPrimary') : t('layout.customPanel.blockSecondary')}
            </button>
          ))}
        </div>
      </div>

      <ServicePicker domain={domain} service={service} onChange={(d, s) => onChange({ domain: d, service: s })} />

      <div className='flex flex-col gap-2'>
        <span className={cn(LABEL, 'mb-0')}>{t('layout.customPanel.blockTargetEntities')}</span>
        {targetEntityIds.map((eid, i) => (
          <div key={i} className='flex items-center gap-2'>
            <div className='flex-1'>
              <EntityPicker
                value={eid}
                onChange={v => {
                  const next = [...targetEntityIds];
                  next[i] = v;
                  onChange({ targetEntityIds: next });
                }}
                label=''
              />
            </div>
            <button
              onClick={() => onChange({ targetEntityIds: targetEntityIds.filter((_, j) => j !== i) })}
              aria-label={t('layout.customPanel.removeEntity')}
              className={cn(ROUND, 'bg-[var(--ds-surface-3)] text-[var(--ds-alert)]')}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button onClick={() => onChange({ targetEntityIds: [...targetEntityIds, ''] })} className={PILL}>
          <Plus size={16} />
          {t('layout.customPanel.addEntityToBlock')}
        </button>
      </div>
    </div>
  );
}

export function ButtonBlockForm({ block, onChange }: { block: ButtonBlock; onChange: (b: ButtonBlock) => void }) {
  return (
    <ButtonFields
      label={block.label}
      icon={block.icon}
      variant={block.variant}
      domain={block.domain}
      service={block.service}
      targetEntityIds={block.targetEntityIds}
      onChange={patch => onChange({ ...block, ...patch })}
    />
  );
}

export function ButtonRowBlockForm({ block, onChange }: { block: ButtonRowBlock; onChange: (b: ButtonRowBlock) => void }) {
  const { t } = useI18n();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const addButton = () => {
    const id = genId();
    const btn: InlineButton = { id, label: '', variant: 'primary', domain: '', service: '', targetEntityIds: [] };
    const next = { ...block, buttons: [...block.buttons, btn] };
    onChange(next);
    setExpandedIdx(next.buttons.length - 1);
  };

  const removeButton = (i: number) => {
    onChange({ ...block, buttons: block.buttons.filter((_, idx) => idx !== i) });
    if (expandedIdx === i) setExpandedIdx(null);
  };

  const updateButton = (i: number, patch: Partial<InlineButton>) => {
    onChange({ ...block, buttons: block.buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) });
  };

  return (
    <div className='flex flex-col gap-2'>
      {block.buttons.length === 0 && <p className='py-1 text-sm text-[var(--ds-ink-muted)]'>{t('layout.customPanel.noButtonInRow')}</p>}
      {block.buttons.map((btn, i) => {
        const expanded = expandedIdx === i;
        return (
          <div key={btn.id} className='overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)]'>
            <div className='flex min-h-[56px] items-center gap-2 pl-4 pr-2'>
              <button
                onClick={() => setExpandedIdx(expanded ? null : i)}
                aria-expanded={expanded}
                className='flex min-w-0 flex-1 items-center gap-2 self-stretch text-left'
              >
                <span className='min-w-0 flex-1 truncate font-semibold'>
                  {btn.label || `${t('layout.customPanel.blockBtnN')} ${i + 1}`}
                </span>
                <ChevronDown
                  size={18}
                  className={cn('shrink-0 text-[var(--ds-ink-muted)] transition-transform', expanded && 'rotate-180')}
                />
              </button>
              <button
                onClick={() => removeButton(i)}
                aria-label={t('layout.customPanel.removeButton')}
                className={cn(ROUND, 'text-[var(--ds-alert)]')}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className='overflow-hidden'
                >
                  {/* Un cran plus clair que la ligne : les champs `surface-3` y restent lisibles. */}
                  <div className='m-2 mt-0 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] p-3'>
                    <ButtonFields
                      label={btn.label}
                      icon={btn.icon}
                      variant={btn.variant}
                      domain={btn.domain}
                      service={btn.service}
                      targetEntityIds={btn.targetEntityIds}
                      onChange={patch => updateButton(i, patch)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <button
        onClick={addButton}
        className='flex min-h-[56px] items-center justify-center gap-2 rounded-[var(--ds-radius-md)] border-2 border-dashed border-[var(--ds-surface-3)] font-semibold text-[var(--ds-ink-muted)]'
      >
        <Plus size={18} />
        {t('layout.customPanel.addButtonToRow')}
      </button>
    </div>
  );
}

export function CoverRowBlockForm({ block, onChange }: { block: CoverRowBlock; onChange: (b: CoverRowBlock) => void }) {
  const { t } = useI18n();
  return (
    <div className='flex flex-col gap-4'>
      <EntityPicker
        value={block.entityId}
        onChange={v => onChange({ ...block, entityId: v })}
        domain='cover'
        label={t('layout.customPanel.coverEntity')}
      />
      <div>
        <label className={LABEL}>{t('layout.customPanel.coverLabelOptional')}</label>
        <input
          value={block.label ?? ''}
          onChange={e => onChange({ ...block, label: e.target.value || undefined })}
          placeholder={t('layout.customPanel.coverLabelPlaceholder')}
          className={INPUT}
        />
      </div>
    </div>
  );
}

export function SectionHeaderBlockForm({ block, onChange }: { block: SectionHeaderBlock; onChange: (b: SectionHeaderBlock) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <label className={LABEL}>{t('layout.customPanel.sectionTitle')}</label>
      <input
        value={block.title}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder={t('layout.customPanel.sectionTitlePlaceholder')}
        className={INPUT}
      />
    </div>
  );
}

// ── Widget block ──────────────────────────────────────────────────────────────

/** Pastille de couleur du manifeste, icône blanche : les apps du lanceur. */
function WidgetIcon({ meta, size = 'size-9' }: { meta: (typeof WIDGET_META)[number]; size?: string }) {
  return (
    <span
      className={cn(size, 'flex shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] text-white')}
      style={{ background: meta.color }}
    >
      <meta.icon size={18} />
    </span>
  );
}

/**
 * Choix de la card : une grille de vignettes, pas un `<select>`.
 *
 * Le menu déroulant natif sort du thème — le navigateur le peint en blanc, avec
 * ses propres surlignages, au milieu d'une modale sombre. Et une liste de vingt
 * cards sans leur icône ne se parcourt pas.
 */
function WidgetTypeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = WIDGET_META.find(m => m.type === value);

  // Une vingtaine de cards : la liste ne tient pas sous les yeux, et on connaît
  // le nom de celle qu'on cherche. Le type est cherché aussi — c'est ce qui
  // s'écrit dans la config, et « thermostat » y est plus parlant que « Clim ».
  const q = query.trim().toLowerCase();
  const matching = q ? WIDGET_META.filter(m => t(m.label).toLowerCase().includes(q) || m.type.includes(q)) : WIDGET_META;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <div>
      <label className={LABEL}>{t('layout.customPanel.widgetType')}</label>
      {/* Fermé, c'est un vrai bouton — donc atteignable au clavier, ce qu'un
          `<div>` cliquable n'est pas. Ouvert, il devient un conteneur : un
          `<input>` ne peut pas vivre dans un `<button>`, et c'est l'input qui
          prend alors le focus. */}
      {open ? (
        <div className={cn(INPUT, 'flex items-center gap-2 ring-2 ring-[var(--ds-accent)]')}>
          <Search size={16} className='shrink-0 text-[var(--ds-ink-muted)]' />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && close()}
            placeholder={t('layout.searchWidget')}
            className='min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--ds-ink-muted)]'
          />
          <button onClick={close} aria-label={t('common.close')} className='shrink-0 text-[var(--ds-ink-muted)]'>
            <ChevronUp size={18} />
          </button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} aria-expanded={false} className={cn(INPUT, 'flex items-center gap-3 pl-2 text-left')}>
          {selected && <WidgetIcon meta={selected} size='size-8' />}
          <span className={cn('flex-1 truncate', !selected && 'pl-2 text-[var(--ds-ink-muted)]')}>
            {selected ? t(selected.label) : t('layout.customPanel.widgetTypeNone')}
          </span>
          <ChevronDown size={18} className='shrink-0 text-[var(--ds-ink-muted)]' />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className='overflow-hidden'
          >
            <div className='grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 pt-2'>
              {matching.map(meta => (
                <button
                  key={meta.type}
                  onClick={() => {
                    onChange(meta.type);
                    close();
                  }}
                  className={cn(
                    'flex min-h-[56px] items-center gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-2.5 text-left',
                    meta.type === value && 'ring-2 ring-[var(--ds-accent)]'
                  )}
                >
                  <WidgetIcon meta={meta} />
                  <span className='text-sm font-semibold leading-tight'>{t(meta.label)}</span>
                </button>
              ))}
              {matching.length === 0 && (
                <p className='col-span-full py-4 text-center text-sm text-[var(--ds-ink-muted)]'>{t('common.noResults')}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Choix de la card, de sa hauteur, et de ses propres réglages. */
export function WidgetBlockForm({ block, onChange }: { block: WidgetBlock; onChange: (b: WidgetBlock) => void }) {
  const { t } = useI18n();
  // `weather-icons` n'a pas d'éditeur ici — même exclusion que dans les groupes.
  const fields = (WIDGET_FIELD_DEFS[block.widgetType] ?? []).filter(f => f.fieldType !== 'weather-icons');
  const rows = block.rows ?? 4;
  const setRows = (n: number) => onChange({ ...block, rows: clamp(n, 1, 12) });

  const patch = (p: Record<string, unknown>) => onChange({ ...block, config: { ...block.config, ...p } });

  // Changer de type repart des valeurs par défaut du nouveau widget : garder
  // l'ancienne config, c'est laisser des clés qui n'ont plus de sens.
  const changeType = (widgetType: string) =>
    onChange({
      ...block,
      widgetType,
      config: {
        ...((DEFAULT_WIDGET_CONFIGS[widgetType as keyof typeof DEFAULT_WIDGET_CONFIGS] ?? {}) as unknown as Record<string, unknown>),
      },
    });

  return (
    <div className='flex flex-col gap-4'>
      <WidgetTypeField value={block.widgetType} onChange={changeType} />

      {/* Un pas au doigt plutôt qu'un champ numérique : douze valeurs au plus. */}
      <div>
        <span className={LABEL}>{t('layout.customPanel.widgetRows')}</span>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setRows(rows - 1)}
            disabled={rows <= 1}
            aria-label={t('layout.customPanel.widgetRowsLess')}
            className={cn(ROUND, 'size-11 bg-[var(--ds-surface-3)] disabled:opacity-30')}
          >
            <Minus size={18} />
          </button>
          <output aria-live='polite' className='min-w-8 text-center text-xl font-semibold tabular-nums'>
            {rows}
          </output>
          <button
            onClick={() => setRows(rows + 1)}
            disabled={rows >= 12}
            aria-label={t('layout.customPanel.widgetRowsMore')}
            className={cn(ROUND, 'size-11 bg-[var(--ds-surface-3)] disabled:opacity-30')}
          >
            <Plus size={18} />
          </button>
        </div>
        <p className='mt-2 text-sm text-[var(--ds-ink-muted)]'>{t('layout.customPanel.widgetRowsHint')}</p>
      </div>

      {/* Les réglages propres à la card. Mêmes champs que dans la modale
          d'édition de la grille — ils viennent du manifeste du widget. Sans eux
          le bloc affichait une card qu'on ne pouvait pas configurer : pas
          d'entité, pas de nom, rien. */}
      {fields.length > 0 && (
        <div className='grid grid-cols-2 gap-x-3 gap-y-4'>
          {fields.map(field => (
            <div key={field.key} className={WIDE_FIELD_TYPES.includes(field.fieldType) ? 'col-span-2' : 'col-span-1'}>
              <ChildFieldRenderer field={field} draft={block.config} onPatch={patch} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
