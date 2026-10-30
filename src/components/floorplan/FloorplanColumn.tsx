import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Minus, Plus, Settings, Trash2 } from 'lucide-react';
import { FreeGridScope } from '@/components/layout/DashboardGrid';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { GRID_GAP, GRID_ROW } from '@/lib/panel-grid';
import { getMinSize } from '@/widgets';
import { useI18n } from '@/i18n';
import { ItemContent } from './FloorplanItem';
import { layoutWidgets } from '@/lib/panel-grid';

/** Petit bouton de la barre d'une card de la colonne, en édition. */
function ToolButton({ icon: Icon, label, onClick, danger }: { icon: typeof Plus; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        danger ? 'p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-alert)]' : 'p-1.5 rounded-[var(--ds-radius-sm)] text-[var(--ds-ink)]'
      }
    >
      <Icon size={13} />
    </button>
  );
}

/**
 * La colonne de widgets, sur le bord gauche d'une page Plan : des widgets
 * ordinaires, empilés dans l'ordre de `ids`, à la hauteur de leurs rangées de
 * grille. Fixes quand la maison tourne. En édition, chacun se monte, se
 * descend, s'agrandit, se règle ou se retire ; un bouton en ajoute.
 */
export function FloorplanColumn({ ids, width, onChange }: { ids: string[]; width: number; onChange: (ids: string[]) => void }) {
  const { t } = useI18n();
  const { layout, isEditMode, updateWidget, removeWidget } = useDashboardLayout();
  const { setEditingWidgetId } = useWidgetConfig();
  const [adding, setAdding] = useState(false);
  const all = layoutWidgets(layout);
  const widgets = ids.flatMap(id => all.find(w => w.id === id) ?? []);

  const move = (i: number, by: -1 | 1) => {
    const next = widgets.map(w => w.id);
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const resize = (w: GridWidget, by: -1 | 1) => updateWidget(w.id, { h: Math.max(getMinSize(w.type, w.disposition).h, w.h + by) });

  return (
    <div data-floorplan-column className='absolute left-3 top-3 bottom-3 z-30 overflow-y-auto overscroll-contain' style={{ width }}>
      <FreeGridScope>
        <div className='flex flex-col' style={{ gap: GRID_GAP }}>
          {widgets.map((w, i) => (
            <div key={w.id} data-column-item={w.id} className='relative shrink-0' style={{ height: w.h * GRID_ROW + (w.h - 1) * GRID_GAP }}>
              <ItemContent id={w.id} type={w.type} isEditMode={isEditMode} />
              {isEditMode && (
                <div className='absolute right-2 top-2 flex items-center gap-0.5 p-1 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-1)] shadow-[var(--ds-shadow-sheet)]'>
                  {i > 0 && <ToolButton icon={ChevronUp} label={t('layout.floorplan.columnUp')} onClick={() => move(i, -1)} />}
                  {i < widgets.length - 1 && (
                    <ToolButton icon={ChevronDown} label={t('layout.floorplan.columnDown')} onClick={() => move(i, 1)} />
                  )}
                  <ToolButton icon={Minus} label={t('layout.floorplan.columnShorter')} onClick={() => resize(w, -1)} />
                  <ToolButton icon={Plus} label={t('layout.floorplan.columnTaller')} onClick={() => resize(w, 1)} />
                  <ToolButton icon={Settings} label={t('layout.configureWidget')} onClick={() => setEditingWidgetId(w.id)} />
                  <ToolButton icon={Trash2} label={t('layout.removeWidget')} danger onClick={() => removeWidget(w.id)} />
                </div>
              )}
            </div>
          ))}
          {isEditMode && (
            <button
              onClick={() => setAdding(true)}
              className='shrink-0 flex items-center justify-center gap-1.5 py-3 rounded-[var(--ds-radius-lg)] border border-dashed border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] transition-colors'
            >
              <Plus size={15} />
              {t('layout.addWidget')}
            </button>
          )}
        </div>
      </FreeGridScope>
      <AnimatePresence>
        {adding && <AddWidgetModal onClose={() => setAdding(false)} onAdded={id => onChange([...widgets.map(w => w.id), id])} />}
      </AnimatePresence>
    </div>
  );
}
