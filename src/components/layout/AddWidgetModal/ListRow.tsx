import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import type { WidgetMeta } from './widget-meta';

/**
 * Une ligne du catalogue.
 *
 * Le chevron de fin a disparu : il ne menait nulle part — la sélection ouvre le
 * volet de droite, déjà visible. Vingt-quatre chevrons empilés faisaient une
 * colonne de bruit dans une liste dont chaque ligne portait déjà une pastille
 * colorée. La sélection se dit maintenant par un filet à la couleur du widget.
 */
export function ListRow({ meta, selected, onClick }: { meta: WidgetMeta; selected: boolean; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-left transition-colors',
        selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
      )}
    >
      <span
        aria-hidden
        className='absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-opacity'
        style={{ background: meta.color, opacity: selected ? 1 : 0 }}
      />
      <meta.icon size={15} className='shrink-0 transition-opacity' style={{ color: meta.color, opacity: selected ? 1 : 0.65 }} />
      <span className={cn('text-[13px] flex-1 truncate transition-colors', selected ? 'text-white font-medium' : 'text-white/55')}>
        {t(meta.label)}
      </span>
    </button>
  );
}
