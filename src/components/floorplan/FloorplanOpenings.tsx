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
import { guessPartKind, openness } from '@/lib/floorplan';
import {
  familyKind,
  openingLabel,
  OPENING_KINDS,
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
      <span className='text-[10px] font-semibold uppercase tracking-wide text-white/45'>{title}</span>
      {aside && <span className='text-[10px] text-white/35'>{aside}</span>}
    </div>
  );
}

/**
 * Onglet « Ouvertures » : les liaisons d'abord — chaque porte, fenêtre ou
 * baie des familles retenues, son entité ou de quoi en choisir une —, puis le
 * type de chaque famille, deviné d'après son nom, qu'on corrige.
 */
export function OpeningsTab({
  model,
  kinds,
  links,
  selected,
  onSelect,
  onKinds,
}: {
  model: ModelOpenings;
  kinds: Kinds;
  links: OpeningLink[];
  /** Ouverture dont la fenêtre de liaison est ouverte. */
  selected: string | null;
  onSelect: (id: string) => void;
  onKinds: (kinds: Kinds) => void;
}) {
  const { t } = useI18n();
  const entities = useEntities(links.map(l => l.entityId));
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
          {typed.map(opening => {
            const Icon = OPENING_ICONS[familyKind(opening.family, kinds)!];
            const link = links.find(l => l.node === opening.id);
            const entity = link?.entityId ? entities[link.entityId] : undefined;
            const open = entity && openness(entity.state, entity.attributes) > 0;
            return (
              <button
                key={opening.id}
                onClick={() => onSelect(opening.id)}
                aria-pressed={selected === opening.id}
                className={cn(
                  'grid grid-cols-[0.875rem_minmax(0,1fr)_auto] gap-x-2 items-center px-2 py-1.5 rounded-lg text-left transition-colors',
                  selected === opening.id ? 'bg-amber-400/15 ring-1 ring-amber-400/45' : 'bg-white/5 hover:bg-white/10'
                )}
              >
                <Icon size={13} className='row-span-2 self-start mt-0.5 text-white/40' />
                <span className='truncate text-xs text-white/85'>{openingLabel(opening, model.families)}</span>
                {entity ? (
                  <span className={cn('flex items-center gap-1 text-[10px]', open ? 'text-green-300' : 'text-white/40')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-green-400' : 'bg-white/30')} />
                    {t(open ? 'layout.floorplan.openingStateOpen' : 'layout.floorplan.openingStateClosed')}
                  </span>
                ) : (
                  <span />
                )}
                <span className={cn('col-span-2 truncate text-[11px]', entity ? 'text-white/45' : 'text-amber-300/90')}>
                  {entity ? (friendlyName(entity) ?? link?.entityId) : t('layout.floorplan.openingLinkEntity')}
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
        <p className='flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-[11px] leading-snug text-amber-100/90'>
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
        className='flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-left'
      >
        <Chevron size={13} className='shrink-0 text-white/40' />
        <span className='text-xs font-medium text-white/85 whitespace-nowrap'>{t('layout.floorplan.openingTypes')}</span>
        <span className='ml-auto min-w-0 truncate text-[10px] text-white/40'>
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
            <div key={kind} className='grid grid-cols-[5.25rem_minmax(0,1fr)] gap-1.5 p-1.5 rounded-lg bg-white/5'>
              <span className='flex items-start gap-1 pt-0.5 text-[11px] leading-tight text-white/60'>
                <Icon size={12} className='shrink-0' /> {t(`layout.floorplan.openingKinds.${kind}`)}
              </span>
              <div className='flex flex-wrap items-start gap-1 min-w-0'>
                {members.map(f => (
                  <span
                    key={f.name}
                    className='inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] text-white/85'
                  >
                    <span className='truncate'>{f.name}</span>
                    {f.count > 1 && <span className='text-[10px] text-white/45'>×{f.count}</span>}
                    {!(f.name in kinds) && (
                      <span
                        title={t('layout.floorplan.openingAutoHint')}
                        className='px-1 rounded border border-sky-300/35 text-[9px] leading-3 text-sky-300'
                      >
                        {t('layout.floorplan.openingAuto')}
                      </span>
                    )}
                    <button
                      onClick={() => onKinds({ ...kinds, [f.name]: 'none' })}
                      aria-label={t('layout.floorplan.openingRemoveFamily', { name: f.name })}
                      title={t('layout.floorplan.openingRemoveFamily', { name: f.name })}
                      className='text-white/40 hover:text-white'
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
                    adding === kind ? 'border-blue-400/50 bg-blue-500/20 text-blue-200' : 'border-white/20 text-white/45 hover:text-white'
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
    <div className='col-span-2 flex flex-col gap-0.5 p-1 rounded-lg bg-black/25 border border-white/10'>
      <label className='flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-white/40'>
        <Search size={12} className='shrink-0' />
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('layout.floorplan.openingSearch')}
          className='w-full min-w-0 bg-transparent text-[11px] text-white placeholder-white/30 focus:outline-none'
        />
      </label>
      {groups.map(group => (
        <div key={group.title} className='flex flex-col'>
          <span className='px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/35'>{group.title}</span>
          {group.items.map(f => {
            const current = familyKind(f.name, kinds);
            return (
              <button
                key={f.name}
                onClick={() => onPick(f.name)}
                className='flex items-baseline justify-between gap-2 px-2 py-1 rounded-md text-left hover:bg-white/10'
              >
                <span className='truncate text-[11px] text-white/85'>{f.name}</span>
                <span className='shrink-0 text-[10px] text-white/40'>
                  {current && `${t(`layout.floorplan.openingKindsShort.${current}`)} · `}×{f.count} ·{' '}
                  {t('layout.floorplan.openingSize', { w: f.size[0], h: f.size[1] })}
                </span>
              </button>
            );
          })}
        </div>
      ))}
      {!groups.length && <span className='px-2 py-1.5 text-[11px] text-white/40'>{t('layout.floorplan.openingNone')}</span>}
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
        'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-colors',
        link[key] ? 'bg-white/12 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
      )}
    >
      <Icon size={12} /> {text}
    </button>
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
      {count > 1 && (
        <p className='px-1 text-[10px] leading-snug text-white/40'>{t('layout.floorplan.openingFamilyWide', { name: family, count })}</p>
      )}
      {single && (
        <p className='flex items-start gap-1.5 px-1 text-[10px] leading-snug text-amber-200/90'>
          <TriangleAlert size={11} className='shrink-0 mt-px' />
          {t('layout.floorplan.openingSingle')}
        </p>
      )}
      <div className='flex flex-wrap items-center gap-1.5'>
        {toggle('flip', ArrowLeftRight, t('layout.floorplan.openingFlip'), t('layout.floorplan.openingFlipHint'))}
        {(kind === 'door' || kind === 'window') &&
          toggle('hinge', Columns2, t('layout.floorplan.openingHinge'), t('layout.floorplan.openingHingeHint'))}
        {linked && (
          <button
            onClick={onUnlink}
            title={t('layout.floorplan.openingUnlink')}
            aria-label={t('layout.floorplan.openingUnlink')}
            className='p-1.5 rounded-lg text-red-400/70 hover:text-red-400'
          >
            <Unlink size={13} />
          </button>
        )}
        <button
          onClick={onSave}
          disabled={!link.entityId || !kind}
          className='ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/80 text-white hover:bg-blue-500 disabled:opacity-40'
        >
          <Link2 size={12} /> {t('layout.floorplan.openingLink')}
        </button>
      </div>
    </DraftPopover>
  );
}
