import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetMeta } from './widget-meta';

export function ListRow({ meta, selected, onClick }: { meta: WidgetMeta; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
        selected
          ? 'bg-white/8 border border-white/12'
          : 'border border-transparent hover:bg-white/5 hover:border-white/6',
      )}
    >
      <div
        className='p-2 rounded-lg shrink-0'
        style={{
          background: selected ? `${meta.color}28` : `${meta.color}12`,
          border: `1px solid ${meta.color}${selected ? '45' : '22'}`,
        }}
      >
        <meta.icon size={15} color={meta.color} />
      </div>
      <span className={cn('text-sm font-medium flex-1 truncate transition-colors', selected ? 'text-white' : 'text-white/55')}>
        {meta.label}
      </span>
      <ChevronRight size={14} className={cn('shrink-0 transition-colors', selected ? 'text-white/40' : 'text-white/12')} />
    </button>
  );
}
