import { useMemo, useRef, useState } from 'react';
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
import { callHAService, friendlyName } from '@/lib/ha-service';
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
  const name = config?.name ?? friendlyName(entity) ?? t('widgets.todo.label');
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
      <div ref={cardRef} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] h-full p-4'>
        <CardPlaceholder icon={ListChecks} text={t('widgets.todo.notFound')} hint={t('widgets.todo.notFoundHint')} compact={size.compact} />
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex h-full select-none flex-col overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        size.squat ? 'justify-center px-4' : 'gap-3 p-[var(--ds-space-4)]'
      )}
    >
      {/* En-tête : nom et nombre de tâches restantes */}
      <div className='flex shrink-0 items-center gap-3'>
        <ListChecks size={22} aria-hidden='true' className='shrink-0 text-[var(--ds-accent)]' />
        <div className='min-w-0'>
          <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
          <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{t('widgets.todo.remaining', { count: remaining })}</div>
        </div>
      </div>

      {/* Liste */}
      {!size.squat && (
        <div className='min-h-0 flex-1'>
          {error ? (
            <CardPlaceholder icon={ListX} text={t('widgets.todo.error')} tone='error' compact={size.compact} />
          ) : loading && items.length === 0 ? (
            <CardPlaceholder icon={ListChecks} text={t('common.loading')} tone='loading' compact={size.compact} />
          ) : items.length === 0 ? (
            <CardPlaceholder icon={PartyPopper} text={t('widgets.todo.empty')} compact={size.compact} />
          ) : (
            <ul className='flex h-full flex-col gap-1 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
              {items.map(item => {
                const done = item.status === 'completed';
                return (
                  <li key={item.uid}>
                    <button
                      role='checkbox'
                      aria-checked={done}
                      onClick={() => toggleItem(item)}
                      className='flex min-h-11 w-full items-center gap-3 rounded-[var(--ds-radius-md)] px-1 text-left'
                    >
                      <span
                        aria-hidden='true'
                        className={cn(
                          'flex size-6 shrink-0 items-center justify-center rounded-full',
                          done ? 'bg-[var(--ds-accent)] text-white' : 'border-2 border-[var(--ds-ink-muted)]'
                        )}
                      >
                        {done && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className={cn('min-w-0 flex-1 truncate text-[17px]', done && 'text-[var(--ds-ink-muted)] line-through')}>
                        {item.summary}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Ajout — masqué dès que la card n'a plus la place */}
      {allowAdd && !size.compact && (
        <form onSubmit={addItem} className='flex shrink-0 items-center gap-2'>
          <label className='sr-only' htmlFor={`todo-add-${widgetId}`}>
            {t('widgets.todo.add')}
          </label>
          <input
            id={`todo-add-${widgetId}`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder={t('widgets.todo.addPlaceholder')}
            className='h-11 min-w-0 flex-1 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-[15px] outline-none placeholder:text-[var(--ds-ink-muted)]'
          />
          <button
            type='submit'
            aria-label={t('widgets.todo.add')}
            title={t('widgets.todo.add')}
            className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-accent)] text-white'
          >
            <Plus size={20} />
          </button>
        </form>
      )}
    </div>
  );
}
