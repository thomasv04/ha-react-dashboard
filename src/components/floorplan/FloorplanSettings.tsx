import type { ReactNode } from 'react';
import { Cable, DoorOpen, MapPin, SquareDashed, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/**
 * Le panneau d'édition d'une maquette : quatre onglets — Maquette, Ambiance,
 * Ouvertures, Éléments —, un seul ouvert à la fois, ou aucun ; en bas, toujours
 * visibles, les outils et ce qu'un clic fera. Sa hauteur est bornée : au-delà,
 * l'onglet défile, et la maquette reste à l'écran.
 */

export type SettingsTab = 'model' | 'ambiance' | 'openings' | 'elements';

/** Ce que pose un clic sur la maquette. */
export type Tool = 'chip' | 'part' | 'room' | 'cable';

export interface SettingsTabSpec {
  id: SettingsTab;
  icon: LucideIcon;
  label: string;
  /** Nombre d'éléments de l'onglet, en pastille ; rien à zéro. */
  badge?: number;
  content: ReactNode;
}

const TOOLS: { id: Tool; icon: LucideIcon; label: string }[] = [
  { id: 'chip', icon: MapPin, label: 'layout.floorplan.toolChip' },
  { id: 'part', icon: DoorOpen, label: 'layout.floorplan.toolPart' },
  { id: 'room', icon: SquareDashed, label: 'layout.floorplan.toolRoom' },
  { id: 'cable', icon: Cable, label: 'layout.floorplan.toolCable' },
];

export function SettingsPanel({
  tabs,
  tab,
  onTab,
  tool,
  onTool,
  hint,
}: {
  tabs: SettingsTabSpec[];
  /** Onglet ouvert — `null` : le panneau replié sur ses onglets et ses outils. */
  tab: SettingsTab | null;
  onTab: (tab: SettingsTab | null) => void;
  tool: Tool;
  onTool: (tool: Tool) => void;
  /** Ce qu'un clic fera, selon l'outil. */
  hint: string;
}) {
  const { t } = useI18n();
  const open = tabs.find(spec => spec.id === tab);
  return (
    <div className='absolute left-2 top-2 z-30 w-76 max-w-[calc(100%-1rem)] max-h-[calc(100%-1rem)] flex flex-col gap-2 p-2.5 rounded-2xl gc-overlay'>
      <div
        role='tablist'
        aria-label={t('layout.floorplan.settings')}
        className='shrink-0 grid grid-cols-4 gap-0.5 p-0.5 rounded-xl bg-white/5 border border-white/10'
      >
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            role='tab'
            id={`floorplan-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={tab === id ? `floorplan-tabpanel-${id}` : undefined}
            // Un onglet ouvert se referme d'un second clic : la maquette retrouve sa place.
            onClick={() => onTab(tab === id ? null : id)}
            className={cn(
              'relative flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
              tab === id ? 'bg-blue-500/20 text-blue-200' : 'text-white/45 hover:text-white/75'
            )}
          >
            <Icon size={14} />
            {label}
            {!!badge && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-0.5 right-1 min-w-4 px-1 rounded-full text-[9px] leading-[14px] font-semibold tabular-nums',
                  tab === id ? 'bg-blue-500 text-white' : 'bg-white/15 text-white/80'
                )}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {open && (
        <div
          role='tabpanel'
          id={`floorplan-tabpanel-${open.id}`}
          aria-labelledby={`floorplan-tab-${open.id}`}
          className='min-h-0 overflow-y-auto flex flex-col gap-2 -mr-1.5 pr-1.5'
        >
          {open.content}
        </div>
      )}
      <div
        role='group'
        aria-label={t('layout.floorplan.tool')}
        className='shrink-0 flex gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10'
      >
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTool(id)}
            aria-pressed={tool === id}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors',
              tool === id ? 'bg-blue-500/20 text-blue-300' : 'text-white/45 hover:text-white/70'
            )}
          >
            <Icon size={12} className='shrink-0' /> {t(label)}
          </button>
        ))}
      </div>
      <p className='shrink-0 text-[11px] text-white/40 px-0.5'>{hint}</p>
    </div>
  );
}

/** Un réglage qu'on coche, sur sa ligne. */
export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className='flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg bg-white/5 text-xs text-white/70 cursor-pointer select-none'>
      {label}
      <input type='checkbox' checked={checked} onChange={e => onChange(e.target.checked)} className='accent-blue-500 shrink-0' />
    </label>
  );
}

/** Onglet sans rien encore : ce qu'on peut y faire. */
export function EmptyTab({ children }: { children: ReactNode }) {
  return <p className='px-1 py-2 text-[11px] leading-snug text-white/40'>{children}</p>;
}

/** Deux ou trois choix exclusifs, en boutons accolés. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; icon?: LucideIcon; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role='group' aria-label={label} className='flex gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10 w-fit'>
      {options.map(({ id, icon: Icon, label: text }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            value === id ? 'bg-blue-500/20 text-blue-300' : 'text-white/45 hover:text-white/70'
          )}
        >
          {Icon && <Icon size={12} />} {text}
        </button>
      ))}
    </div>
  );
}
