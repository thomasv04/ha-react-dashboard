import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, Check, X, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { WIDGET_META, WIDGET_FIELD_DEFS, DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { ChildFieldRenderer, WIDE_FIELD_TYPES } from '@/components/layout/WidgetEditModal/GroupWidgetsTab';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { IconPicker } from '@/components/layout/WidgetPickers';
import { cn, clamp } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { genId } from './block-meta';
import type { ButtonBlock, ButtonRowBlock, InlineButton, CoverRowBlock, SectionHeaderBlock, WidgetBlock } from '@/types/custom-panel';

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

/**
 * Formulaires d'édition des blocs, un par type.
 *
 * Sortis de `CustomPanelEditorModal`, qui pesait 1 100 lignes : la coquille de
 * la modale, la liste des panneaux et la saisie de chaque bloc y étaient
 * mélangées, et toucher un champ obligeait à relire l'ensemble.
 */

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
        className='fixed rounded-[var(--ds-radius-md)] border border-[var(--ds-surface-3)] shadow-[var(--ds-shadow-sheet)] overflow-hidden'
        style={{
          ...dropStyle,
          zIndex: 9999,
          background: 'var(--ds-surface-1)',
        }}
      >
        <div className='flex items-center gap-2 px-3 py-2 border-b border-[var(--ds-surface-3)]'>
          <Search size={12} className='text-[var(--ds-ink-muted)] flex-shrink-0' />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('layout.customPanel.searchService')}
            className='flex-1 bg-transparent text-sm text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
          />
        </div>
        <div className='overflow-y-auto p-1.5 space-y-0.5' style={{ maxHeight: 220 }}>
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
                  'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--ds-radius-sm)] text-sm text-left transition-colors',
                  isActive
                    ? 'bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                    : 'border border-transparent'
                )}
              >
                <span className={isActive ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink)]'}>{t(p.labelKey)}</span>
                <span className='text-[var(--ds-ink-muted)] text-xs font-mono flex-shrink-0'>
                  {p.domain}.{p.service}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className='text-[var(--ds-ink-muted)] text-xs text-center py-3'>{t('layout.customPanel.noServiceResult')}</p>
          )}
        </div>
        <div className='border-t border-[var(--ds-surface-3)] px-3 py-2'>
          <p className='text-[10px] text-[var(--ds-ink-muted)] mb-1.5'>{t('layout.customPanel.manualEntry')}</p>
          <div className='flex gap-2'>
            <input
              value={domain}
              onChange={e => onChange(e.target.value, service)}
              placeholder='domaine'
              className='flex-1 px-2 py-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-xs text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)] font-mono'
            />
            <input
              value={service}
              onChange={e => onChange(domain, e.target.value)}
              placeholder='service'
              className='flex-1 px-2 py-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-xs text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)] font-mono'
            />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div>
      <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.serviceLabel')}</label>
      <button
        ref={triggerRef}
        type='button'
        onClick={handleOpen}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] border text-sm text-left transition-colors',
          open ? 'bg-[var(--ds-surface-3)] border-[var(--ds-accent)]' : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)]'
        )}
      >
        <span className='flex-1 truncate'>
          {currentLabel ? (
            <>
              <span className='text-[var(--ds-ink)]'>{currentLabel}</span>{' '}
              <span className='text-[var(--ds-ink-muted)] text-xs ml-1'>{current}</span>
            </>
          ) : current ? (
            <span className='text-[var(--ds-ink-muted)] font-mono text-xs'>{current}</span>
          ) : (
            <span className='text-[var(--ds-ink-muted)]'>{t('layout.customPanel.chooseService')}</span>
          )}
        </span>
        {open ? (
          <ChevronUp size={13} className='text-[var(--ds-ink-muted)] flex-shrink-0' />
        ) : (
          <ChevronDown size={13} className='text-[var(--ds-ink-muted)] flex-shrink-0' />
        )}
      </button>
      {dropdown}
    </div>
  );
}

// ── Block forms ───────────────────────────────────────────────────────────────

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
    <div className='flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)]'>
      <div className='flex-1 min-w-0'>
        <p className='text-[10px] text-[var(--ds-ink-muted)] font-medium uppercase tracking-wider mb-0.5'>
          {t('layout.customPanel.refBadgeTitle')}
        </p>
        <p className='text-xs text-[var(--ds-ink-muted)] font-mono truncate'>{ref}</p>
      </div>
      <button
        onClick={copy}
        title={t('common.copy')}
        aria-label={t('common.copy')}
        className='flex-shrink-0 p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)] transition-colors'
      >
        {copied ? <Check size={13} className='text-[var(--ds-good)]' /> : <Copy size={13} />}
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
    <div className='space-y-3'>
      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.blockLabel')}</label>
          <input
            value={label}
            onChange={e => onChange({ label: e.target.value })}
            placeholder='ex: Tout ouvrir'
            className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)]'
          />
        </div>
        <div>
          <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.blockIcon')}</label>
          <IconPicker value={icon ?? ''} onChange={v => onChange({ icon: v || undefined })} label='' />
        </div>
      </div>

      <div>
        <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.blockVariant')}</label>
        <div className='flex gap-2'>
          {(['primary', 'secondary'] as const).map(v => (
            <button
              key={v}
              onClick={() => onChange({ variant: v })}
              className={cn(
                'flex-1 py-1.5 rounded-[var(--ds-radius-sm)] text-xs font-medium border transition-colors',
                variant === v
                  ? v === 'primary'
                    ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                    : 'bg-[var(--ds-surface-3)] border-[var(--ds-surface-3)] text-[var(--ds-ink)]'
                  : 'bg-transparent border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
              )}
            >
              {v === 'primary' ? t('layout.customPanel.blockPrimary') : t('layout.customPanel.blockSecondary')}
            </button>
          ))}
        </div>
      </div>

      <ServicePicker domain={domain} service={service} onChange={(d, s) => onChange({ domain: d, service: s })} />

      <div>
        <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1.5'>{t('layout.customPanel.blockTargetEntities')}</label>
        <div className='space-y-2'>
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
                className='p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-alert)] transition-colors flex-shrink-0'
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ targetEntityIds: [...targetEntityIds, ''] })}
            className='flex items-center gap-1.5 text-xs text-[var(--ds-accent)] transition-colors py-1'
          >
            <Plus size={13} />
            {t('layout.customPanel.addEntityToBlock')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ButtonBlockForm({ block, onChange }: { block: ButtonBlock; onChange: (b: ButtonBlock) => void }) {
  return (
    <div className='pt-3 border-t border-[var(--ds-surface-3)]'>
      <ButtonFields
        label={block.label}
        icon={block.icon}
        variant={block.variant}
        domain={block.domain}
        service={block.service}
        targetEntityIds={block.targetEntityIds}
        onChange={patch => onChange({ ...block, ...patch })}
      />
    </div>
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
    <div className='pt-3 border-t border-[var(--ds-surface-3)] space-y-2'>
      {block.buttons.length === 0 && (
        <p className='text-[var(--ds-ink-muted)] text-xs text-center py-2'>{t('layout.customPanel.noButtonInRow')}</p>
      )}
      {block.buttons.map((btn, i) => (
        <div key={btn.id} className='rounded-[var(--ds-radius-sm)] border border-[var(--ds-surface-3)] overflow-hidden'>
          <div
            className='flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors'
            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpandedIdx(expandedIdx === i ? null : i)}
            role='button'
            tabIndex={0}
          >
            <span className='flex-1 text-sm text-[var(--ds-ink-muted)] truncate'>
              {btn.label || `${t('layout.customPanel.blockBtnN')} ${i + 1}`}
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                removeButton(i);
              }}
              aria-label={t('layout.customPanel.removeButton')}
              className='p-1 rounded text-[var(--ds-alert)]'
            >
              <Trash2 size={12} />
            </button>
            {expandedIdx === i ? (
              <ChevronUp size={13} className='text-[var(--ds-ink-muted)]' />
            ) : (
              <ChevronDown size={13} className='text-[var(--ds-ink-muted)]' />
            )}
          </div>
          <AnimatePresence initial={false}>
            {expandedIdx === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className='overflow-hidden'
              >
                <div className='px-3 pb-3 pt-2 border-t border-[var(--ds-surface-3)]'>
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
      ))}
      <button
        onClick={addButton}
        className='w-full flex items-center justify-center gap-1.5 py-2 rounded-[var(--ds-radius-sm)] border border-dashed border-[var(--ds-surface-3)] text-xs text-[var(--ds-ink-muted)] transition-colors'
      >
        <Plus size={12} />
        {t('layout.customPanel.addButtonToRow')}
      </button>
    </div>
  );
}

export function CoverRowBlockForm({ block, onChange }: { block: CoverRowBlock; onChange: (b: CoverRowBlock) => void }) {
  const { t } = useI18n();
  return (
    <div className='space-y-3 pt-3 border-t border-[var(--ds-surface-3)]'>
      <EntityPicker
        value={block.entityId}
        onChange={v => onChange({ ...block, entityId: v })}
        domain='cover'
        label={t('layout.customPanel.coverEntity')}
      />
      <div>
        <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.coverLabelOptional')}</label>
        <input
          value={block.label ?? ''}
          onChange={e => onChange({ ...block, label: e.target.value || undefined })}
          placeholder={t('layout.customPanel.coverLabelPlaceholder')}
          className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)]'
        />
      </div>
    </div>
  );
}

export function SectionHeaderBlockForm({ block, onChange }: { block: SectionHeaderBlock; onChange: (b: SectionHeaderBlock) => void }) {
  const { t } = useI18n();
  return (
    <div className='pt-3 border-t border-[var(--ds-surface-3)]'>
      <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.sectionTitle')}</label>
      <input
        value={block.title}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder={t('layout.customPanel.sectionTitlePlaceholder')}
        className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)]'
      />
    </div>
  );
}

// ── Widget block ──────────────────────────────────────────────────────────────

/**
 * Choix de la card : une grille de vignettes, pas un `<select>`.
 *
 * Le menu déroulant natif sort du thème — le navigateur le peint en blanc, avec
 * ses propres surlignages, au milieu d'une modale sombre. Et une liste de vingt
 * cards sans leur icône ne se parcourt pas. Même vignette que le sélecteur de
 * widgets d'un groupe : icône du manifeste, à la couleur du manifeste.
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
      <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.widgetType')}</label>
      {/* Fermé, c'est un vrai bouton — donc atteignable au clavier, ce qu'un
          `<div>` cliquable n'est pas. Ouvert, il devient un conteneur : un
          `<input>` ne peut pas vivre dans un `<button>`, et c'est l'input qui
          prend alors le focus. */}
      {open ? (
        <div className='w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-accent)]'>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && close()}
            placeholder={t('layout.searchWidget')}
            className='flex-1 min-w-0 bg-transparent text-sm text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)]'
          />
          <button onClick={close} aria-label={t('common.close')} className='shrink-0 text-[var(--ds-ink-muted)] transition-colors'>
            <ChevronDown size={14} className='rotate-180' />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className='w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] transition-colors text-left'
        >
          {selected ? (
            <span
              className='w-6 h-6 rounded-[var(--ds-radius-sm)] flex items-center justify-center shrink-0'
              style={{ background: `${selected.color}20`, border: `1px solid ${selected.color}35` }}
            >
              <selected.icon size={13} style={{ color: selected.color }} />
            </span>
          ) : null}
          <span className={cn('flex-1 text-sm truncate', selected ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]')}>
            {selected ? t(selected.label) : t('layout.customPanel.widgetTypeNone')}
          </span>
          <ChevronDown size={14} className='text-[var(--ds-ink-muted)] shrink-0' />
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
            <div className='grid grid-cols-2 gap-1.5 pt-1.5'>
              {matching.map(meta => (
                <button
                  key={meta.type}
                  onClick={() => {
                    onChange(meta.type);
                    close();
                  }}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--ds-radius-md)] border transition-all text-left',
                    meta.type === value
                      ? 'border-[var(--ds-accent)] bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
                      : 'border-[var(--ds-surface-3)] bg-[var(--ds-surface-2)]'
                  )}
                >
                  <span
                    className='w-7 h-7 rounded-[var(--ds-radius-md)] flex items-center justify-center shrink-0'
                    style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}35` }}
                  >
                    <meta.icon size={14} style={{ color: meta.color }} />
                  </span>
                  <span className='text-[var(--ds-ink-muted)] text-xs font-medium leading-tight'>{t(meta.label)}</span>
                </button>
              ))}
              {matching.length === 0 && (
                <p className='col-span-2 py-4 text-center text-xs text-[var(--ds-ink-muted)]'>{t('common.noResults')}</p>
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
    <div className='pt-3 border-t border-[var(--ds-surface-3)] flex flex-col gap-3'>
      <WidgetTypeField value={block.widgetType} onChange={changeType} />
      <div>
        <label className='text-[11px] text-[var(--ds-ink-muted)] block mb-1'>{t('layout.customPanel.widgetRows')}</label>
        <input
          type='number'
          min={1}
          max={12}
          value={block.rows ?? 4}
          onChange={e => onChange({ ...block, rows: clamp(Number(e.target.value) || 4, 1, 12) })}
          className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)]'
        />
        <p className='text-[10px] text-[var(--ds-ink-muted)] mt-1'>{t('layout.customPanel.widgetRowsHint')}</p>
      </div>

      {/* Les réglages propres à la card. Mêmes champs que dans la modale
          d'édition de la grille — ils viennent du manifeste du widget. Sans eux
          le bloc affichait une card qu'on ne pouvait pas configurer : pas
          d'entité, pas de nom, rien. */}
      {fields.length > 0 && (
        <div className='pt-3 border-t border-[var(--ds-surface-3)] grid grid-cols-2 gap-x-3 gap-y-3'>
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

// ── Block item ────────────────────────────────────────────────────────────────
