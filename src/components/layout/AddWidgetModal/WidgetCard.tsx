import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { WidgetMeta } from './widget-meta';

/** Une carte de la galerie : l'icône du widget, son nom, ce qu'il fait. */
export function WidgetCard({ meta, selected, onClick }: { meta: WidgetMeta; selected: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-[var(--ds-radius-xl)] p-3 text-left transition-colors',
        selected ? 'bg-[var(--ds-sheet-section)] outline-[3px] -outline-offset-[3px] outline-[var(--ds-accent)]' : 'bg-[var(--ds-surface-2)]'
      )}
    >
      <span className='flex h-24 items-center justify-center rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)]'>
        <meta.icon size={38} style={{ color: meta.color }} />
      </span>
      <span className='min-w-0 px-1'>
        <span className='block truncate text-[17px] font-semibold text-[var(--ds-ink)]'>{t(meta.label)}</span>
        <span className='block truncate text-sm text-[var(--ds-ink-muted)]'>{t(meta.description)}</span>
      </span>
    </button>
  );
}
