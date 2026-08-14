import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Zap,
  Blinds,
  Minus,
  Layers,
  Copy,
  Check,
  LayoutTemplate,
  Search,
  LayoutGrid,
} from 'lucide-react';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { WIDGET_META } from '@/widgets';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { IconPicker } from '@/components/layout/WidgetPickers';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type {
  CustomPanel,
  CustomBlock,
  ButtonBlock,
  ButtonRowBlock,
  InlineButton,
  CoverRowBlock,
  SectionHeaderBlock,
  WidgetBlock,
} from '@/types/custom-panel';

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Block type meta ───────────────────────────────────────────────────────────

const BLOCK_META = {
  button: { labelKey: 'layout.customPanel.blockTypeButton', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', Icon: Zap },
  'button-row': {
    labelKey: 'layout.customPanel.blockTypeButtonRow',
    color: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    Icon: LayoutTemplate,
  },
  'cover-row': {
    labelKey: 'layout.customPanel.blockTypeCoverRow',
    color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    Icon: Blinds,
  },
  'section-header': {
    labelKey: 'layout.customPanel.blockTypeSectionHeader',
    color: 'bg-white/8 text-white/40 border border-white/12',
    Icon: Minus,
  },
  widget: {
    labelKey: 'layout.customPanel.blockTypeWidget',
    color: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    Icon: LayoutGrid,
  },
} as const;

const BLOCK_TYPE_PICKER: Array<{
  type: CustomBlock['type'];
  labelKey: string;
  descriptionKey: string;
  Icon: typeof Zap;
  iconBg: string;
  iconColor: string;
  border: string;
  hover: string;
}> = [
  {
    type: 'button',
    labelKey: 'layout.customPanel.blockTypeButton',
    descriptionKey: 'layout.customPanel.blockTypeButtonDesc',
    Icon: Zap,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    border: 'border-blue-500/20',
    hover: 'hover:bg-blue-500/10 hover:border-blue-500/30',
  },
  {
    type: 'widget',
    labelKey: 'layout.customPanel.blockTypeWidget',
    descriptionKey: 'layout.customPanel.blockTypeWidgetDesc',
    Icon: LayoutGrid,
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    border: 'border-violet-500/20',
    hover: 'hover:bg-violet-500/10 hover:border-violet-500/30',
  },
  {
    type: 'button-row',
    labelKey: 'layout.customPanel.blockTypeButtonRow',
    descriptionKey: 'layout.customPanel.blockTypeButtonRowDesc',
    Icon: LayoutTemplate,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
    border: 'border-cyan-500/20',
    hover: 'hover:bg-cyan-500/10 hover:border-cyan-500/30',
  },
  {
    type: 'cover-row',
    labelKey: 'layout.customPanel.blockTypeCoverRow',
    descriptionKey: 'layout.customPanel.blockTypeCoverRowDesc',
    Icon: Blinds,
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
    border: 'border-indigo-500/20',
    hover: 'hover:bg-indigo-500/10 hover:border-indigo-500/30',
  },
  {
    type: 'section-header',
    labelKey: 'layout.customPanel.blockTypeSectionHeader',
    descriptionKey: 'layout.customPanel.blockTypeSectionHeaderDesc',
    Icon: Minus,
    iconBg: 'bg-white/8',
    iconColor: 'text-white/50',
    border: 'border-white/10',
    hover: 'hover:bg-white/8 hover:border-white/20',
  },
];

type TFn = (key: string) => string;

function blockSummary(block: CustomBlock, t: TFn): string {
  switch (block.type) {
    case 'button':
      return block.label || t('layout.customPanel.blockNoName');
    case 'button-row':
      return block.buttons.length ? block.buttons.map(b => b.label || '…').join(' · ') : t('layout.customPanel.blockNoButtons');
    case 'cover-row':
      return block.label || block.entityId || t('layout.customPanel.blockNoEntity');
    case 'section-header':
      return block.title || t('layout.customPanel.blockNoName');
    case 'widget':
      return block.widgetType || t('layout.customPanel.blockNoName');
    default:
      return '';
  }
}

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

function ServicePicker({
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
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const current = domain && service ? `${domain}.${service}` : '';
  const currentPreset = SERVICE_PRESETS.find(p => p.domain === domain && p.service === service);
  const currentLabel = currentPreset ? t(currentPreset.labelKey) : undefined;

  const filtered = search
    ? SERVICE_PRESETS.filter(
        p => t(p.labelKey).toLowerCase().includes(search.toLowerCase()) || `${p.domain}.${p.service}`.includes(search.toLowerCase())
      )
    : SERVICE_PRESETS;

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const dropdown =
    open &&
    createPortal(
      <div
        ref={dropRef}
        className='fixed rounded-xl border border-white/12 shadow-2xl overflow-hidden'
        style={{
          top: dropPos.top,
          left: dropPos.left,
          width: dropPos.width,
          zIndex: 9999,
          background: 'rgba(12, 16, 40, 0.98)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className='flex items-center gap-2 px-3 py-2 border-b border-white/8'>
          <Search size={12} className='text-white/30 flex-shrink-0' />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('layout.customPanel.searchService')}
            className='flex-1 bg-transparent text-sm text-white/80 outline-none placeholder:text-white/25'
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
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  isActive ? 'bg-blue-500/15 border border-blue-500/30' : 'border border-transparent hover:bg-white/6'
                )}
              >
                <span className={isActive ? 'text-blue-300' : 'text-white/70'}>{t(p.labelKey)}</span>
                <span className='text-white/25 text-xs font-mono flex-shrink-0'>
                  {p.domain}.{p.service}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className='text-white/25 text-xs text-center py-3'>{t('layout.customPanel.noServiceResult')}</p>}
        </div>
        <div className='border-t border-white/8 px-3 py-2'>
          <p className='text-[10px] text-white/25 mb-1.5'>{t('layout.customPanel.manualEntry')}</p>
          <div className='flex gap-2'>
            <input
              value={domain}
              onChange={e => onChange(e.target.value, service)}
              placeholder='domaine'
              className='flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 outline-none focus:border-blue-500/40 placeholder:text-white/20 font-mono'
            />
            <input
              value={service}
              onChange={e => onChange(domain, e.target.value)}
              placeholder='service'
              className='flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 outline-none focus:border-blue-500/40 placeholder:text-white/20 font-mono'
            />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div>
      <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.serviceLabel')}</label>
      <button
        ref={triggerRef}
        type='button'
        onClick={handleOpen}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors',
          open ? 'bg-white/8 border-blue-500/40' : 'bg-white/5 border-white/10 hover:border-white/20'
        )}
      >
        <span className='flex-1 truncate'>
          {currentLabel ? (
            <>
              <span className='text-white/80'>{currentLabel}</span> <span className='text-white/30 text-xs ml-1'>{current}</span>
            </>
          ) : current ? (
            <span className='text-white/60 font-mono text-xs'>{current}</span>
          ) : (
            <span className='text-white/25'>{t('layout.customPanel.chooseService')}</span>
          )}
        </span>
        {open ? (
          <ChevronUp size={13} className='text-white/30 flex-shrink-0' />
        ) : (
          <ChevronDown size={13} className='text-white/30 flex-shrink-0' />
        )}
      </button>
      {dropdown}
    </div>
  );
}

// ── Block forms ───────────────────────────────────────────────────────────────

// ── Panel ref badge (copy ID) ─────────────────────────────────────────────────

function PanelRefBadge({ panelId }: { panelId: string }) {
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
    <div className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8'>
      <div className='flex-1 min-w-0'>
        <p className='text-[10px] text-white/30 font-medium uppercase tracking-wider mb-0.5'>{t('layout.customPanel.refBadgeTitle')}</p>
        <p className='text-xs text-white/50 font-mono truncate'>{ref}</p>
      </div>
      <button
        onClick={copy}
        title={t('common.copy')}
        aria-label={t('common.copy')}
        className='flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors'
      >
        {copied ? <Check size={13} className='text-green-400' /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ── Block forms ───────────────────────────────────────────────────────────────

function ButtonFields({
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
          <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.blockLabel')}</label>
          <input
            value={label}
            onChange={e => onChange({ label: e.target.value })}
            placeholder='ex: Tout ouvrir'
            className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 placeholder:text-white/20'
          />
        </div>
        <div>
          <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.blockIcon')}</label>
          <IconPicker value={icon ?? ''} onChange={v => onChange({ icon: v || undefined })} label='' />
        </div>
      </div>

      <div>
        <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.blockVariant')}</label>
        <div className='flex gap-2'>
          {(['primary', 'secondary'] as const).map(v => (
            <button
              key={v}
              onClick={() => onChange({ variant: v })}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                variant === v
                  ? v === 'primary'
                    ? 'bg-blue-500/25 border-blue-500/50 text-blue-300'
                    : 'bg-white/10 border-white/20 text-white/80'
                  : 'bg-transparent border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
              )}
            >
              {v === 'primary' ? t('layout.customPanel.blockPrimary') : t('layout.customPanel.blockSecondary')}
            </button>
          ))}
        </div>
      </div>

      <ServicePicker domain={domain} service={service} onChange={(d, s) => onChange({ domain: d, service: s })} />

      <div>
        <label className='text-[11px] text-white/40 block mb-1.5'>{t('layout.customPanel.blockTargetEntities')}</label>
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
                className='p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0'
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ targetEntityIds: [...targetEntityIds, ''] })}
            className='flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400 transition-colors py-1'
          >
            <Plus size={13} />
            {t('layout.customPanel.addEntityToBlock')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ButtonBlockForm({ block, onChange }: { block: ButtonBlock; onChange: (b: ButtonBlock) => void }) {
  return (
    <div className='pt-3 border-t border-white/8'>
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

function ButtonRowBlockForm({ block, onChange }: { block: ButtonRowBlock; onChange: (b: ButtonRowBlock) => void }) {
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
    <div className='pt-3 border-t border-white/8 space-y-2'>
      {block.buttons.length === 0 && <p className='text-white/25 text-xs text-center py-2'>{t('layout.customPanel.noButtonInRow')}</p>}
      {block.buttons.map((btn, i) => (
        <div key={btn.id} className='rounded-lg border border-white/10 overflow-hidden'>
          <div
            className='flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors'
            onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpandedIdx(expandedIdx === i ? null : i)}
            role='button'
            tabIndex={0}
          >
            <span className='flex-1 text-sm text-white/60 truncate'>{btn.label || `${t('layout.customPanel.blockBtnN')} ${i + 1}`}</span>
            <button
              onClick={e => {
                e.stopPropagation();
                removeButton(i);
              }}
              aria-label={t('layout.customPanel.removeButton')}
              className='p-1 rounded hover:bg-red-500/20 text-red-400/50 hover:text-red-400'
            >
              <Trash2 size={12} />
            </button>
            {expandedIdx === i ? <ChevronUp size={13} className='text-white/25' /> : <ChevronDown size={13} className='text-white/25' />}
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
                <div className='px-3 pb-3 pt-2 border-t border-white/8'>
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
        className='w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/15 text-xs text-white/35 hover:text-white/60 hover:border-white/25 transition-colors'
      >
        <Plus size={12} />
        {t('layout.customPanel.addButtonToRow')}
      </button>
    </div>
  );
}

function CoverRowBlockForm({ block, onChange }: { block: CoverRowBlock; onChange: (b: CoverRowBlock) => void }) {
  const { t } = useI18n();
  return (
    <div className='space-y-3 pt-3 border-t border-white/8'>
      <EntityPicker
        value={block.entityId}
        onChange={v => onChange({ ...block, entityId: v })}
        domain='cover'
        label={t('layout.customPanel.coverEntity')}
      />
      <div>
        <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.coverLabelOptional')}</label>
        <input
          value={block.label ?? ''}
          onChange={e => onChange({ ...block, label: e.target.value || undefined })}
          placeholder={t('layout.customPanel.coverLabelPlaceholder')}
          className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 placeholder:text-white/20'
        />
      </div>
    </div>
  );
}

function SectionHeaderBlockForm({ block, onChange }: { block: SectionHeaderBlock; onChange: (b: SectionHeaderBlock) => void }) {
  const { t } = useI18n();
  return (
    <div className='pt-3 border-t border-white/8'>
      <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.sectionTitle')}</label>
      <input
        value={block.title}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder={t('layout.customPanel.sectionTitlePlaceholder')}
        className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 placeholder:text-white/20'
      />
    </div>
  );
}

// ── Widget block ──────────────────────────────────────────────────────────────

/**
 * Choix de la card et de sa hauteur.
 *
 * La configuration fine (entité, options) se fait dans le panneau lui-même :
 * une card embarquée s'édite comme sur la grille, via son propre formulaire.
 * Dupliquer ici les champs de vingt-quatre cards n'apporterait rien.
 */
function WidgetBlockForm({ block, onChange }: { block: WidgetBlock; onChange: (b: WidgetBlock) => void }) {
  const { t } = useI18n();
  return (
    <div className='pt-3 border-t border-white/8 flex flex-col gap-3'>
      <div>
        <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.widgetType')}</label>
        <select
          value={block.widgetType}
          onChange={e => onChange({ ...block, widgetType: e.target.value })}
          className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50'
        >
          <option value=''>—</option>
          {WIDGET_META.map(m => (
            <option key={m.type} value={m.type}>
              {t(m.label)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className='text-[11px] text-white/40 block mb-1'>{t('layout.customPanel.widgetRows')}</label>
        <input
          type='number'
          min={1}
          max={12}
          value={block.rows ?? 4}
          onChange={e => onChange({ ...block, rows: Math.max(1, Math.min(12, Number(e.target.value) || 4)) })}
          className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50'
        />
        <p className='text-[10px] text-white/25 mt-1'>{t('layout.customPanel.widgetRowsHint')}</p>
      </div>
    </div>
  );
}

// ── Block item ────────────────────────────────────────────────────────────────

function BlockItem({
  block,
  index,
  total,
  expanded,
  onToggle,
  onUpdate,
  onMove,
  onDelete,
}: {
  block: CustomBlock;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (b: CustomBlock) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const meta = BLOCK_META[block.type];
  const MetaIcon = meta.Icon;

  return (
    <div className='rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden'>
      <div
        className='flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-white/5 transition-colors'
        onClick={onToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        role='button'
        tabIndex={0}
      >
        {/* Move buttons */}
        <div className='flex flex-col gap-0.5 flex-shrink-0' onClick={e => e.stopPropagation()}>
          <button
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={t('layout.customPanel.moveBlockUp')}
            className='p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors'
          >
            <ChevronUp size={12} />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={t('layout.customPanel.moveBlockDown')}
            className='p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors'
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Type badge */}
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0', meta.color)}>
          <MetaIcon size={11} />
          {t(meta.labelKey)}
        </span>

        {/* Summary */}
        <span className='flex-1 text-sm text-white/60 truncate min-w-0'>{blockSummary(block, t)}</span>

        {/* Delete */}
        <div className='flex items-center gap-1 flex-shrink-0' onClick={e => e.stopPropagation()}>
          <button
            onClick={onDelete}
            aria-label={t('layout.customPanel.deleteBlock')}
            className='p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors'
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Expand chevron */}
        <div className='text-white/30 flex-shrink-0 transition-transform' style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>
          <ChevronDown size={14} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className='overflow-hidden'
          >
            <div className='px-3 pb-3'>
              {block.type === 'button' && <ButtonBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'button-row' && <ButtonRowBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'cover-row' && <CoverRowBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'section-header' && <SectionHeaderBlockForm block={block} onChange={b => onUpdate(b)} />}
              {block.type === 'widget' && <WidgetBlockForm block={block} onChange={b => onUpdate(b)} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Panel editor (right pane) ─────────────────────────────────────────────────

function PanelEditor({ panel, onChange }: { panel: CustomPanel; onChange: (p: CustomPanel) => void }) {
  const { t } = useI18n();
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const updateBlock = (index: number, block: CustomBlock) => {
    const next = [...panel.blocks];
    next[index] = block;
    onChange({ ...panel, blocks: next });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const next = [...panel.blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...panel, blocks: next });
  };

  const deleteBlock = (index: number) => {
    const id = panel.blocks[index].id;
    if (expandedBlockId === id) setExpandedBlockId(null);
    onChange({ ...panel, blocks: panel.blocks.filter((_, i) => i !== index) });
  };

  const addBlock = (type: CustomBlock['type']) => {
    const id = genId();
    let block: CustomBlock;
    if (type === 'button') {
      block = { id, type: 'button', label: '', variant: 'primary', domain: '', service: '', targetEntityIds: [] };
    } else if (type === 'button-row') {
      block = { id, type: 'button-row', buttons: [] };
    } else if (type === 'cover-row') {
      block = { id, type: 'cover-row', entityId: '' };
    } else if (type === 'widget') {
      block = { id, type: 'widget', widgetType: '', config: {}, rows: 4 };
    } else {
      block = { id, type: 'section-header', title: '' };
    }
    onChange({ ...panel, blocks: [...panel.blocks, block] });
    setExpandedBlockId(id);
  };

  return (
    <div className='flex flex-col h-full overflow-hidden relative'>
      {/* Panel meta — compact single row */}
      <div className='flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0'>
        <input
          value={panel.name}
          onChange={e => onChange({ ...panel, name: e.target.value })}
          placeholder={t('layout.customPanel.panelPlaceholder')}
          className='flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 placeholder:text-white/30'
        />
        <div className='w-44 flex-shrink-0'>
          <IconPicker value={panel.icon ?? ''} onChange={v => onChange({ ...panel, icon: v || undefined })} label='' />
        </div>
      </div>

      {/* Ref badge */}
      <div className='px-4 py-2 border-b border-white/8 flex-shrink-0'>
        <PanelRefBadge panelId={panel.id} />
      </div>

      {/* Blocks header */}
      <div className='flex items-center justify-between px-4 py-2 border-b border-white/8 flex-shrink-0'>
        <div className='flex items-center gap-2'>
          <span className='text-[11px] font-semibold text-white/40 uppercase tracking-wider'>{t('layout.customPanel.blocks')}</span>
          <span className='text-[11px] text-white/20'>({panel.blocks.length})</span>
        </div>
      </div>

      {/* Block list */}
      <div className='flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0'>
        {panel.blocks.length === 0 && (
          <div className='flex flex-col items-center justify-center h-full gap-3 text-center'>
            <div className='w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center'>
              <Plus size={18} className='text-white/20' />
            </div>
            <p className='text-white/25 text-sm'>{t('layout.customPanel.noBlock')}</p>
            <p className='text-white/15 text-xs'>{t('layout.customPanel.noBlockHint')}</p>
          </div>
        )}
        {panel.blocks.map((block, i) => (
          <BlockItem
            key={block.id}
            block={block}
            index={i}
            total={panel.blocks.length}
            expanded={expandedBlockId === block.id}
            onToggle={() => setExpandedBlockId(prev => (prev === block.id ? null : block.id))}
            onUpdate={b => updateBlock(i, b)}
            onMove={dir => moveBlock(i, dir)}
            onDelete={() => deleteBlock(i)}
          />
        ))}
      </div>

      {/* Add block button */}
      <div className='px-4 py-3 border-t border-white/8 flex-shrink-0'>
        <button
          onClick={() => setShowPicker(v => !v)}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-colors',
            showPicker
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8 hover:border-white/20 hover:text-white/70'
          )}
        >
          <Plus size={14} className={showPicker ? 'rotate-45 transition-transform' : 'transition-transform'} />
          {t('layout.customPanel.addBlock')}
        </button>
      </div>

      {/* Block type picker — floating above the button */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className='absolute inset-x-4 bottom-[60px] rounded-xl border border-white/12 shadow-2xl z-10 overflow-hidden'
            style={{ background: 'rgba(10, 14, 36, 0.98)', backdropFilter: 'blur(20px)' }}
          >
            <div className='flex items-center justify-between px-4 py-2.5 border-b border-white/8'>
              <span className='text-[11px] font-semibold text-white/40 uppercase tracking-wider'>
                {t('layout.customPanel.chooseBlockType')}
              </span>
              <button
                onClick={() => setShowPicker(false)}
                aria-label={t('common.close')}
                className='p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/8 transition-colors'
              >
                <X size={13} />
              </button>
            </div>
            <div className='p-3 grid grid-cols-3 gap-2'>
              {BLOCK_TYPE_PICKER.map(bt => (
                <button
                  key={bt.type}
                  onClick={() => {
                    addBlock(bt.type);
                    setShowPicker(false);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all',
                    'bg-transparent',
                    bt.border,
                    bt.hover
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', bt.iconBg)}>
                    <bt.Icon size={17} className={bt.iconColor} />
                  </div>
                  <div>
                    <div className={cn('text-xs font-semibold leading-tight', bt.iconColor)}>{t(bt.labelKey)}</div>
                    <div className='text-[10px] text-white/30 mt-0.5 leading-tight'>{t(bt.descriptionKey)}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Panel list item ───────────────────────────────────────────────────────────

function PanelListItem({
  panel,
  active,
  onSelect,
  onDelete,
}: {
  panel: CustomPanel;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  // eslint-disable-next-line react-hooks/static-components
  const Icon = panel.icon ? resolveIcon(panel.icon) : null;

  return (
    <div
      onClick={onSelect}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      role='button'
      tabIndex={0}
      className={cn(
        'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all',
        active ? 'bg-white/10 border border-white/15' : 'hover:bg-white/5 border border-transparent'
      )}
    >
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', active ? 'bg-blue-500/20' : 'bg-white/8')}>
        {Icon ? (
          // eslint-disable-next-line react-hooks/static-components
          <Icon size={14} className={active ? 'text-blue-400' : 'text-white/50'} />
        ) : (
          <span className={cn('text-xs font-bold', active ? 'text-blue-400' : 'text-white/40')}>{panel.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <span className={cn('flex-1 text-sm font-medium truncate', active ? 'text-white' : 'text-white/60')}>{panel.name}</span>
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={t('layout.customPanel.deletePanel')}
        className='opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all'
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CustomPanelEditorModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { panels, upsertPanel, deletePanel } = useCustomPanels();

  // Local copy — synced to context on close
  const [localPanels, setLocalPanels] = useState<CustomPanel[]>(() => [...panels]);
  const [selectedId, setSelectedId] = useState<string | null>(panels[0]?.id ?? null);

  const selectedPanel = localPanels.find(p => p.id === selectedId) ?? null;

  const syncToContext = useCallback(
    (list: CustomPanel[]) => {
      // Upsert all local panels
      for (const p of list) upsertPanel(p);
      // Delete panels removed locally
      for (const p of panels) {
        if (!list.find(lp => lp.id === p.id)) deletePanel(p.id);
      }
    },
    [panels, upsertPanel, deletePanel]
  );

  const handleClose = () => {
    syncToContext(localPanels);
    onClose();
  };

  const createPanel = () => {
    const id = genId();
    const panel: CustomPanel = { id, name: t('layout.customPanel.newPanelDefault'), blocks: [] };
    const next = [...localPanels, panel];
    setLocalPanels(next);
    setSelectedId(id);
  };

  const handleDeleteLocal = (id: string) => {
    const next = localPanels.filter(p => p.id !== id);
    setLocalPanels(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const handlePanelChange = (panel: CustomPanel) => {
    setLocalPanels(prev => prev.map(p => (p.id === panel.id ? panel : p)));
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 z-[80] bg-black/60'
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: DURATION_FAST }}
        className='fixed inset-0 z-[81] flex items-center justify-center p-4 pointer-events-none'
      >
        <div
          className='pointer-events-auto w-full max-w-4xl h-[88vh] max-h-[920px] rounded-2xl border border-white/12 shadow-2xl flex flex-col overflow-hidden'
          style={{ background: 'rgba(12, 16, 40, 0.97)', backdropFilter: 'blur(20px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className='flex items-center gap-3 px-5 py-4 border-b border-white/8 flex-shrink-0'>
            <div className='w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center'>
              <Layers size={16} className='text-white' />
            </div>
            <div>
              <h2 className='text-white font-semibold text-base'>{t('layout.customPanel.title')}</h2>
              <p className='text-white/30 text-[11px]'>{t('layout.customPanel.subtitle')}</p>
            </div>
            <button
              onClick={handleClose}
              aria-label={t('common.close')}
              className='ml-auto p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors'
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className='flex flex-1 overflow-hidden min-h-0'>
            {/* Left sidebar — panel list */}
            <div className='w-52 border-r border-white/8 flex flex-col flex-shrink-0'>
              <div className='flex-1 overflow-y-auto p-3 space-y-1 min-h-0'>
                {localPanels.length === 0 && <p className='text-white/25 text-xs text-center py-6'>{t('layout.customPanel.noPanel')}</p>}
                {localPanels.map(panel => (
                  <PanelListItem
                    key={panel.id}
                    panel={panel}
                    active={selectedId === panel.id}
                    onSelect={() => setSelectedId(panel.id)}
                    onDelete={() => handleDeleteLocal(panel.id)}
                  />
                ))}
              </div>
              <div className='p-3 border-t border-white/8 flex-shrink-0'>
                <button
                  onClick={createPanel}
                  className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 text-blue-400 text-xs font-medium transition-colors'
                >
                  <Plus size={13} />
                  {t('layout.customPanel.newPanel')}
                </button>
              </div>
            </div>

            {/* Right — editor */}
            <div className='flex-1 overflow-hidden min-w-0'>
              {selectedPanel ? (
                <PanelEditor panel={selectedPanel} onChange={handlePanelChange} />
              ) : (
                <div className='flex flex-col items-center justify-center h-full text-center gap-3 p-8'>
                  <div className='w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center'>
                    <Layers size={24} className='text-white/20' />
                  </div>
                  <div>
                    <p className='text-white/35 text-sm font-medium'>{t('layout.customPanel.selectPanel')}</p>
                    <p className='text-white/20 text-xs mt-1'>{t('layout.customPanel.selectPanelPromptSub')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-between px-5 py-3 border-t border-white/8 flex-shrink-0'>
            <p className='text-[11px] text-white/25'>{t('layout.customPanel.footerNote')}</p>
            <button
              onClick={handleClose}
              className='px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-sm font-medium transition-colors'
            >
              {t('layout.customPanel.close')}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
