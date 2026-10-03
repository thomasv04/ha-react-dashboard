import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Minus, Plus, Settings, Trash2 } from 'lucide-react';
import { FreeGridScope } from '@/components/layout/DashboardGrid';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useTheme } from '@/context/ThemeContext';
import { getMinSize } from '@/widgets';
import { useI18n } from '@/i18n';
import { ItemContent } from './FloorplanItem';

/** Petit bouton de la barre d'une card de la colonne, en édition. */
function ToolButton({ icon: Icon, label, onClick, danger }: { icon: typeof Plus; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        danger ? 'p-1.5 rounded-lg text-red-300 hover:bg-red-500/25' : 'p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10'
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
  const { layoutSettings } = useTheme();
  const [adding, setAdding] = useState(false);
  const widgets = ids.flatMap(id => layout.widgets.lg.find(w => w.id === id) ?? []);

  const move = (i: number, by: -1 | 1) => {
    const next = widgets.map(w => w.id);
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const resize = (w: GridWidget, by: -1 | 1) =>
    updateWidget(w.id, { h: Math.max(getMinSize(w.type, 'lg', w.disposition).h, w.h + by) }, 'lg');

  return (
    <div data-floorplan-column className='absolute left-3 top-3 bottom-3 z-30 overflow-y-auto overscroll-contain' style={{ width }}>
      <FreeGridScope>
        <div className='flex flex-col' style={{ gap: layoutSettings.gridGap }}>
          {widgets.map((w, i) => (
            <div
              key={w.id}
              data-column-item={w.id}
              className='relative shrink-0'
              style={{ height: w.h * layoutSettings.rowHeight + (w.h - 1) * layoutSettings.gridGap }}
            >
              <ItemContent id={w.id} type={w.type} isEditMode={isEditMode} />
              {isEditMode && (
                <div className='absolute right-2 top-2 flex items-center gap-0.5 p-1 rounded-xl gc-overlay'>
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
              className='shrink-0 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-dashed border-white/25 text-sm text-white/70 hover:text-white hover:border-white/45 transition-colors'
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
