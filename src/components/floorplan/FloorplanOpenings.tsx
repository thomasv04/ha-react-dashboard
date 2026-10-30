import { useState } from 'react';
import {
  AppWindow,
  ArrowLeftRight,
  Blinds,
  ChevronDown,
  ChevronRight,
  Columns2,
  DoorOpen,
  Link2,
  MoveHorizontal,
  Plus,
  Search,
  TriangleAlert,
  Unlink,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useHass } from '@hakit/core';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { useEntities } from '@/hooks/useEntities';
import { openness } from '@/lib/floorplan';
import {
  familyKind,
  guessPartKind,
  linkCandidates,
  openingLabel,
  OPENING_KINDS,
  suggestLinks,
  typedOpenings,
  type ModelOpenings,
  type OpeningFamily,
  type OpeningKind,
  type OpeningLink,
} from '@/lib/floorplan-openings';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { DraftPopover, KindGrid, type Around } from './FloorplanDrawn';
import { EmptyTab } from './FloorplanSettings';

/**
 * Les ouvertures d'une maquette exportée avec ExportToHASS : ses vraies
 * portes, fenêtres et baies, qu'on lie à une entité — l'onglet « Ouvertures »,
 * et la fenêtre de liaison, ouverte à côté de l'ouverture.
 */

const OPENING_ICONS: Record<OpeningKind, LucideIcon> = {
  door: DoorOpen,
  sliding: MoveHorizontal,
  window: AppWindow,
  shutter: Blinds,
  garage: Warehouse,
};

type Kinds = Record<string, OpeningKind | 'none'>;

function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className='flex items-baseline justify-between gap-2 px-0.5'>
      <span className='text-[10px] font-semibold uppercase tracking-wide text-[var(--ds-ink-muted)]'>{title}</span>
      {aside && <span className='text-[10px] text-[var(--ds-ink-muted)]'>{aside}</span>}
    </div>
  );
}

/**
 * Onglet « Ouvertures » : les liaisons d'abord — chaque porte, fenêtre ou
 * baie des familles retenues, son entité ou de quoi en choisir une, et celle
 * que propose son nom —, puis le type de chaque famille, deviné d'après son
 * nom, qu'on corrige.
 */
export function OpeningsTab({
  model,
  kinds,
  links,
  selected,
  onSelect,
  onKinds,
  onLink,
}: {
  model: ModelOpenings;
  kinds: Kinds;
  links: OpeningLink[];
  /** Ouverture dont la fenêtre de liaison est ouverte. */
  selected: string | null;
  onSelect: (id: string) => void;
  onKinds: (kinds: Kinds) => void;
  /** Liaisons à ajouter : celles que proposent les noms. */
  onLink: (links: OpeningLink[]) => void;
}) {
  const { t } = useI18n();
  const all = useHass(s => s.entities);
  const suggested = suggestLinks(model, kinds, links, linkCandidates(all));
  const entities = useEntities([...links, ...suggested].map(l => l.entityId));
  const typed = typedOpenings(model, kinds);
  const linked = typed.filter(o => links.some(l => l.node === o.id && l.entityId)).length;
  return (
    <>
      {typed.length ? (
        <div className='flex flex-col gap-1'>
          <SectionTitle
            title={t('layout.floorplan.openingsLinks')}
            aside={t('layout.floorplan.openingsLinked', { linked, total: typed.length })}
          />
          {suggested.length > 0 && (
            <button
              onClick={() => onLink(suggested)}
              className='flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ds-radius-sm)] text-xs font-medium bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
            >
              <Link2 size={12} />
              {t(suggested.length > 1 ? 'layout.floorplan.openingLinkSuggestedPlural' : 'layout.floorplan.openingLinkSuggested', {
                count: suggested.length,
              })}
            </button>
          )}
          {typed.map(opening => {
            const Icon = OPENING_ICONS[familyKind(opening.family, kinds)!];
            const link = links.find(l => l.node === opening.id);
            const entity = link?.entityId ? entities[link.entityId] : undefined;
            const open = entity && openness(entity.state, entity.attributes) > 0;
            const proposal = suggested.find(s => s.node === opening.id)?.entityId;
            return (
              <button
                key={opening.id}
                onClick={() => onSelect(opening.id)}
                aria-pressed={selected === opening.id}
                className={cn(
                  'grid grid-cols-[0.875rem_minmax(0,1fr)_auto] gap-x-2 items-center px-2 py-1.5 rounded-lg text-left transition-colors',
                  selected === opening.id ? 'bg-[var(--ds-surface-3)] ring-1 ring-amber-400/45' : 'bg-[var(--ds-surface-2)]'
                )}
              >
                <Icon size={13} className='row-span-2 self-start mt-0.5 text-[var(--ds-ink-muted)]' />
                <span className='truncate text-xs text-[var(--ds-ink)]'>{openingLabel(opening, model.families)}</span>
                {entity ? (
                  <span
                    className={cn('flex items-center gap-1 text-[10px]', open ? 'text-[var(--ds-good)]' : 'text-[var(--ds-ink-muted)]')}
                  >
                    <span
                      className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-[var(--ds-good)] text-[#062614]' : 'bg-[var(--ds-surface-3)]')}
                    />
                    {t(open ? 'layout.floorplan.openingStateOpen' : 'layout.floorplan.openingStateClosed')}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  className={cn(
                    'col-span-2 truncate text-[11px]',
                    entity ? 'text-[var(--ds-ink-muted)]' : proposal ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-warm-light)]'
                  )}
                >
                  {entity
                    ? (friendlyName(entity) ?? link?.entityId)
                    : proposal
                      ? t('layout.floorplan.openingSuggested', { name: friendlyName(entities[proposal]) ?? proposal })
                      : t('layout.floorplan.openingLinkEntity')}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyTab>{t('layout.floorplan.openingsNoKind')}</EmptyTab>
      )}
      <Types families={model.families} kinds={kinds} onKinds={onKinds} initiallyOpen={!typed.length} />
      {model.unnamed > 0 && (
        <p className='flex items-start gap-1.5 px-2 py-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] border border-[var(--ds-warm-light)] text-[11px] leading-snug text-[var(--ds-warm-light)]'>
          <TriangleAlert size={12} className='shrink-0 mt-0.5' />
          {t(model.unnamed > 1 ? 'layout.floorplan.openingUnnamedPlural' : 'layout.floorplan.openingUnnamed', { count: model.unnamed })}
        </p>
      )}
    </>
  );
}

/**
 * Le type de chaque famille : pour chacun, les familles qu'il regroupe —
 * devinées d'après leur nom (« auto »), ou choisies. Retirer une famille ou en
 * ajouter une fige le choix.
 */
function Types({
  families,
  kinds,
  onKinds,
  initiallyOpen,
}: {
  families: OpeningFamily[];
  kinds: Kinds;
  onKinds: (kinds: Kinds) => void;
  initiallyOpen: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(initiallyOpen);
  /** Type dont on choisit une famille à ajouter. */
  const [adding, setAdding] = useState<OpeningKind | null>(null);
  if (!families.length) return null;
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className='flex flex-col gap-1'>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className='flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] text-left'
      >
        <Chevron size={13} className='shrink-0 text-[var(--ds-ink-muted)]' />
        <span className='text-xs font-medium text-[var(--ds-ink)] whitespace-nowrap'>{t('layout.floorplan.openingTypes')}</span>
        <span className='ml-auto min-w-0 truncate text-[10px] text-[var(--ds-ink-muted)]'>
          {t(families.length > 1 ? 'layout.floorplan.openingFamiliesPlural' : 'layout.floorplan.openingFamilies', {
            count: families.length,
          })}
        </span>
      </button>
      {open &&
        OPENING_KINDS.map(kind => {
          const Icon = OPENING_ICONS[kind];
          const members = families.filter(f => familyKind(f.name, kinds) === kind);
          return (
            <div
              key={kind}
              className='grid grid-cols-[5.25rem_minmax(0,1fr)] gap-1.5 p-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)]'
            >
              <span className='flex items-start gap-1 pt-0.5 text-[11px] leading-tight text-[var(--ds-ink-muted)]'>
                <Icon size={12} className='shrink-0' /> {t(`layout.floorplan.openingKinds.${kind}`)}
              </span>
              <div className='flex flex-wrap items-start gap-1 min-w-0'>
                {members.map(f => (
                  <span
                    key={f.name}
                    className='inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-0.5 rounded-full bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)] text-[11px] text-[var(--ds-ink)]'
                  >
                    <span className='truncate'>{f.name}</span>
                    {f.count > 1 && <span className='text-[10px] text-[var(--ds-ink-muted)]'>×{f.count}</span>}
                    {!(f.name in kinds) && (
                      <span
                        title={t('layout.floorplan.openingAutoHint')}
                        className='px-1 rounded border border-[var(--ds-accent)] text-[9px] leading-3 text-[var(--ds-accent)]'
                      >
                        {t('layout.floorplan.openingAuto')}
                      </span>
                    )}
                    <button
                      onClick={() => onKinds({ ...kinds, [f.name]: 'none' })}
                      aria-label={t('layout.floorplan.openingRemoveFamily', { name: f.name })}
                      title={t('layout.floorplan.openingRemoveFamily', { name: f.name })}
                      className='text-[var(--ds-ink-muted)]'
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setAdding(a => (a === kind ? null : kind))}
                  aria-expanded={adding === kind}
                  aria-label={t('layout.floorplan.openingAddFamily')}
                  title={t('layout.floorplan.openingAddFamily')}
                  className={cn(
                    'px-1.5 py-0.5 rounded-full border border-dashed text-[11px]',
                    adding === kind
                      ? 'border-[var(--ds-accent)] bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
                      : 'border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
                  )}
                >
                  <Plus size={11} />
                </button>
              </div>
              {adding === kind && (
                <FamilyPicker
                  kind={kind}
                  families={families}
                  kinds={kinds}
                  onPick={name => {
                    onKinds({ ...kinds, [name]: kind });
                    setAdding(null);
                  }}
                />
              )}
            </div>
          );
        })}
    </div>
  );
}

/** Les familles qu'on peut ranger dans ce type : celles logées dans un mur d'abord, les ouvertures probables. */
function FamilyPicker({
  kind,
  families,
  kinds,
  onPick,
}: {
  kind: OpeningKind;
  families: OpeningFamily[];
  kinds: Kinds;
  onPick: (family: string) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const candidates = families.filter(f => familyKind(f.name, kinds) !== kind && f.name.toLowerCase().includes(search.toLowerCase()));
  const groups = [
    { title: t('layout.floorplan.openingInWall'), items: candidates.filter(f => f.inWall && !familyKind(f.name, kinds)) },
    { title: t('layout.floorplan.openingElsewhere'), items: candidates.filter(f => familyKind(f.name, kinds)) },
    { title: t('layout.floorplan.openingOthers'), items: candidates.filter(f => !f.inWall && !familyKind(f.name, kinds)) },
  ].filter(g => g.items.length);
  return (
    <div className='col-span-2 flex flex-col gap-0.5 p-1 rounded-[var(--ds-radius-sm)] bg-black/25 border border-[var(--ds-surface-3)]'>
      <label className='flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--ds-surface-2)] text-[var(--ds-ink-muted)]'>
        <Search size={12} className='shrink-0' />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('layout.floorplan.openingSearch')}
          className='w-full min-w-0 bg-transparent text-[11px] text-[var(--ds-ink)] placeholder:text-[var(--ds-ink-muted)] focus:outline-none'
        />
      </label>
      {groups.map(group => (
        <div key={group.title} className='flex flex-col'>
          <span className='px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ds-ink-muted)]'>
            {group.title}
          </span>
          {group.items.map(f => {
            const current = familyKind(f.name, kinds);
            return (
              <button
                key={f.name}
                onClick={() => onPick(f.name)}
                className='flex items-baseline justify-between gap-2 px-2 py-1 rounded-md text-left'
              >
                <span className='truncate text-[11px] text-[var(--ds-ink)]'>{f.name}</span>
                <span className='shrink-0 text-[10px] text-[var(--ds-ink-muted)]'>
                  {current && `${t(`layout.floorplan.openingKindsShort.${current}`)} · `}×{f.count} ·{' '}
                  {t('layout.floorplan.openingSize', { w: f.size[0], h: f.size[1] })}
                </span>
              </button>
            );
          })}
        </div>
      ))}
      {!groups.length && <span className='px-2 py-1.5 text-[11px] text-[var(--ds-ink-muted)]'>{t('layout.floorplan.openingNone')}</span>}
    </div>
  );
}

/**
 * Fenêtre de liaison d'une ouverture de la maquette, à côté d'elle : l'entité
 * d'abord — le type en est deviné, comme pour un élément dessiné, quand le nom
 * de sa famille ne le disait pas —, puis le type, pour toute la famille, et ce
 * qui se corrige : le sens, les gonds. Pendant qu'on choisit, la vraie porte
 * s'ouvre et se ferme.
 */
export function OpeningPopover({
  label,
  family,
  count,
  kind,
  link,
  linked,
  single,
  around,
  onKind,
  onChange,
  onSave,
  onUnlink,
  onCancel,
}: {
  label: string;
  family: string;
  /** Objets de sa famille : le type vaut pour tous. */
  count: number;
  kind: OpeningKind | null;
  link: OpeningLink;
  /** Déjà liée : on peut la délier. */
  linked: boolean;
  /** D'un seul tenant : rien ne peut bouger — un « # » à la fin de son nom, dans Sweet Home 3D. */
  single: boolean;
  around: Around;
  onKind: (kind: OpeningKind) => void;
  onChange: (link: OpeningLink) => void;
  onSave: () => void;
  onUnlink: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const choose = (entityId: string) => {
    onChange({ ...link, entityId });
    if (kind) return;
    const deviceClass = useHass.getState().entities?.[entityId]?.attributes?.device_class;
    onKind(guessPartKind(entityId, deviceClass));
  };
  const toggle = (key: 'flip' | 'hinge', Icon: LucideIcon, text: string, hint: string) => (
    <button
      onClick={() => onChange({ ...link, [key]: !link[key] })}
      aria-pressed={!!link[key]}
      title={hint}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--ds-radius-sm)] text-xs border transition-colors',
        link[key]
          ? 'bg-[var(--ds-surface-3)] border-[var(--ds-surface-3)] text-[var(--ds-ink)]'
          : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink)]'
      )}
    >
      <Icon size={12} /> {text}
    </button>
  );
  /** Une entité de plus, facultative — le volet devant, la serrure —, qu'une croix retire. */
  const extra = (key: 'shutter' | 'lock', domain: string, text: string) => (
    <div className='flex items-end gap-1'>
      <div className='flex-1 min-w-0'>
        <EntityPicker label={text} value={link[key] ?? ''} domain={domain} onChange={id => onChange({ ...link, [key]: id })} />
      </div>
      {link[key] && (
        <button
          onClick={() => onChange({ ...link, [key]: undefined })}
          title={t('layout.floorplan.openingExtraClear')}
          aria-label={t('layout.floorplan.openingExtraClear')}
          className='p-2 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink-muted)]'
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
  return (
    <DraftPopover title={label} onCancel={onCancel} around={around}>
      <EntityPicker autoOpen={!link.entityId} label='' value={link.entityId} domain={['cover', 'binary_sensor']} onChange={choose} />
      <KindGrid
        kinds={OPENING_KINDS}
        value={kind}
        onChange={onKind}
        icons={OPENING_ICONS}
        label={k => t(`layout.floorplan.openingKindsShort.${k}`)}
      />
      {/* Une porte-fenêtre a souvent son contact, son volet, sa serrure : chacun le sien. */}
      {kind && kind !== 'shutter' && kind !== 'garage' && extra('shutter', 'cover', t('layout.floorplan.openingShutter'))}
      {kind && kind !== 'shutter' && kind !== 'window' && extra('lock', 'lock', t('layout.floorplan.openingLock'))}
      {count > 1 && (
        <p className='px-1 text-[10px] leading-snug text-[var(--ds-ink-muted)]'>
          {t('layout.floorplan.openingFamilyWide', { name: family, count })}
        </p>
      )}
      {single && (
        <p className='flex items-start gap-1.5 px-1 text-[10px] leading-snug text-[var(--ds-warm-light)]'>
          <TriangleAlert size={11} className='shrink-0 mt-px' />
          {t('layout.floorplan.openingSingle')}
        </p>
      )}
      <div className='flex flex-wrap items-center gap-1.5'>
        {kind !== 'shutter' &&
          kind !== 'garage' &&
          toggle('flip', ArrowLeftRight, t('layout.floorplan.openingFlip'), t('layout.floorplan.openingFlipHint'))}
        {(kind === 'door' || kind === 'window') &&
          toggle('hinge', Columns2, t('layout.floorplan.openingHinge'), t('layout.floorplan.openingHingeHint'))}
        {linked && (
          <button
            onClick={onUnlink}
            title={t('layout.floorplan.openingUnlink')}
            aria-label={t('layout.floorplan.openingUnlink')}
            className='p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-alert)]'
          >
            <Unlink size={13} />
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!link.entityId || !kind}
          className='ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-sm)] text-xs font-medium bg-[var(--ds-accent)] text-white disabled:opacity-40'
        >
          <Link2 size={12} /> {t('layout.floorplan.openingLink')}
        </button>
      </div>
    </DraftPopover>
  );
}
