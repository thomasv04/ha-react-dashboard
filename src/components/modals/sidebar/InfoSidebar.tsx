/**
 * InfoSidebar — composable right panel for MoreInfo modals.
 *
 * Instead of custom right panels per widget, each MoreInfo component passes
 * an array of module descriptors to InfoSidebar, which renders them in order.
 * Modules are self-contained, card-styled blocks.
 *
 * Usage:
 *   <InfoSidebar modules={[
 *     { type: 'timeline', entityId },
 *     { type: 'history', historyHours, onHistoryHoursChange },
 *     { type: 'attributes', entityId },
 *     { type: 'entityId', entityIds: [entityId] },
 *   ]} />
 */
import type { ReactNode } from 'react';
import {
  TimelineModule,
  HistoryModule,
  AttributesModule,
  DetailsModule,
  PowerBalanceModule,
  PowerBarsModule,
  PresetsModule,
  SelectModule,
  EntityIdModule,
} from './modules';
import type { DetailEntry, PowerBarEntry, PresetEntry } from './modules';

// ─── Module descriptor types ──────────────────────────────────────────────────

export type SidebarModule =
  | { type: 'timeline'; entityId: string }
  | { type: 'history'; historyHours: number; onHistoryHoursChange: (h: number) => void }
  | { type: 'attributes'; entityId: string; exclude?: string[] }
  | { type: 'details'; title: string; entries: DetailEntry[] }
  | { type: 'powerBalance'; production: number; consumption: number }
  | { type: 'powerBars'; entries: PowerBarEntry[] }
  | { type: 'presets'; title: string; presets: PresetEntry[]; onSelect: (value: number | string) => void }
  | { type: 'select'; title: string; value: string; options: string[]; onChange: (v: string) => void }
  | { type: 'entityId'; entityIds: string[] }
  | { type: 'custom'; content: ReactNode };

// ─── Component ────────────────────────────────────────────────────────────────

export function InfoSidebar({ modules }: { modules: SidebarModule[] }) {
  return (
    <div className='space-y-4'>
      {modules.map((mod, i) => {
        switch (mod.type) {
          case 'timeline':
            return <TimelineModule key={i} entityId={mod.entityId} />;
          case 'history':
            return <HistoryModule key={i} historyHours={mod.historyHours} onHistoryHoursChange={mod.onHistoryHoursChange} />;
          case 'attributes':
            return <AttributesModule key={i} entityId={mod.entityId} exclude={mod.exclude} />;
          case 'details':
            return <DetailsModule key={i} title={mod.title} entries={mod.entries} />;
          case 'powerBalance':
            return <PowerBalanceModule key={i} production={mod.production} consumption={mod.consumption} />;
          case 'powerBars':
            return <PowerBarsModule key={i} entries={mod.entries} />;
          case 'presets':
            return <PresetsModule key={i} title={mod.title} presets={mod.presets} onSelect={mod.onSelect} />;
          case 'select':
            return <SelectModule key={i} title={mod.title} value={mod.value} options={mod.options} onChange={mod.onChange} />;
          case 'entityId':
            return <EntityIdModule key={i} entityIds={mod.entityIds} />;
          case 'custom':
            return <div key={i}>{mod.content}</div>;
          default:
            return null;
        }
      })}
    </div>
  );
}
