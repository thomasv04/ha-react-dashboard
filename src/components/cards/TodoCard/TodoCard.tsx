import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { ListChecks, Check, Plus, ListX, PartyPopper } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useServiceResponse } from '@/hooks/useServiceResponse';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
// `helpers.callService` est typé sur les domaines connus de l'instance HA au
// moment de la génération des types ; `todo` n'y figure pas encore.
import { callHAService } from '@/lib/ha-service';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { TodoCardConfig } from '@/types/widget-configs';

/** Forme d'un élément renvoyé par `todo.get_items` */
interface TodoItem {
  uid: string;
  summary: string;
  status: 'needs_action' | 'completed';
  due?: string;
}

type ItemsResponse = { items?: TodoItem[] };

const ACCENT = '#fbbf24';

export function TodoCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<TodoCardConfig>(widgetId || 'todo');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const entityId = config?.entityId ?? '';
  const showCompleted = config?.showCompleted ?? false;
  const allowAdd = config?.allowAdd ?? true;

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  const [draft, setDraft] = useState('');

  // L'entité publie le **nombre** de tâches restantes : elle change à chaque
  // ajout, coche ou suppression, y compris depuis un autre appareil. C'est le
  // signal de rechargement, sans interrogation périodique.
  const { data, loading, error, refresh } = useServiceResponse<ItemsResponse>({
    domain: 'todo',
    service: 'get_items',
    entityId,
    serviceData: { status: showCompleted ? ['needs_action', 'completed'] : ['needs_action'] },
    revision: entity?.state,
  });

  const items = useMemo(() => Object.values(data ?? {}).flatMap(r => r?.items ?? []), [data]);
  const name = config?.name ?? (entity?.attributes.friendly_name as string | undefined) ?? t('widgets.todo.label');
  const remaining = items.filter(i => i.status !== 'completed').length;

  const toggleItem = (item: TodoItem) => {
    callHAService(
      helpers,
      'todo',
      'update_item',
      { entity_id: entityId },
      { item: item.uid, status: item.status === 'completed' ? 'needs_action' : 'completed' }
    );
    playFeedback(item.status === 'completed' ? 'toggle_off' : 'success');
    // Filet : si l'entité ne bouge pas (liste sans compteur), le contenu se
    // rafraîchit quand même.
    setTimeout(refresh, 400);
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const summary = draft.trim();
    if (!summary) return;
    callHAService(helpers, 'todo', 'add_item', { entity_id: entityId }, { item: summary });
    playFeedback('click');
    setDraft('');
    setTimeout(refresh, 400);
  };

  if (!entityId) {
    return (
      <div ref={cardRef} className='gc rounded-3xl p-4 h-full'>
        <CardPlaceholder icon={ListChecks} text={t('widgets.todo.notFound')} hint={t('widgets.todo.notFoundHint')} compact={size.compact} />
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn('gc rounded-3xl h-full overflow-hidden select-none flex flex-col', size.squat ? 'px-3 py-2' : 'p-3.5')}
    >
      {/* En-tête */}
      <div className='flex items-center gap-2 shrink-0'>
        <div
          className='w-7 h-7 rounded-xl flex items-center justify-center border shrink-0'
          style={{ background: `${ACCENT}1f`, borderColor: `${ACCENT}3a` }}
        >
          <ListChecks size={13} style={{ color: ACCENT }} />
        </div>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        <span className='ml-auto text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border bg-white/5 text-white/30 border-white/8 shrink-0'>
          {remaining}
        </span>
      </div>

      {/* Liste */}
      <div className='flex-1 min-h-0 mt-2'>
        {error ? (
          <CardPlaceholder icon={ListX} text={t('widgets.todo.error')} tone='error' compact={size.compact} />
        ) : loading && items.length === 0 ? (
          <CardPlaceholder icon={ListChecks} text={t('common.loading')} tone='loading' compact={size.compact} />
        ) : items.length === 0 ? (
          <CardPlaceholder icon={PartyPopper} text={t('widgets.todo.empty')} compact={size.compact} />
        ) : (
          <div className='flex flex-col gap-1 h-full overflow-y-auto scrollbar-none' style={{ scrollbarWidth: 'none' }}>
            <AnimatePresence initial={false}>
              {items.map(item => {
                const done = item.status === 'completed';
                return (
                  <motion.button
                    key={item.uid}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    onClick={() => toggleItem(item)}
                    className='flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors text-left shrink-0'
                  >
                    <span
                      className='w-4 h-4 rounded-md border flex items-center justify-center shrink-0'
                      style={done ? { background: `${ACCENT}30`, borderColor: `${ACCENT}60` } : { borderColor: 'rgba(255,255,255,0.18)' }}
                    >
                      {done && <Check size={10} style={{ color: ACCENT }} />}
                    </span>
                    <span className={cn('text-sm truncate flex-1 min-w-0', done ? 'text-white/25 line-through' : 'text-white/80')}>
                      {item.summary}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Ajout — masqué dès que la card n'a plus la place */}
      {allowAdd && !size.compact && (
        <form onSubmit={addItem} className='shrink-0 mt-2 flex items-center gap-1.5'>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder={t('widgets.todo.addPlaceholder')}
            className='flex-1 min-w-0 bg-white/5 border border-white/8 rounded-xl px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-white/20'
          />
          <button
            type='submit'
            className='w-7 h-7 rounded-xl border flex items-center justify-center shrink-0'
            style={{ background: `${ACCENT}1f`, borderColor: `${ACCENT}3a` }}
          >
            <Plus size={13} style={{ color: ACCENT }} />
          </button>
        </form>
      )}
    </motion.div>
  );
}
