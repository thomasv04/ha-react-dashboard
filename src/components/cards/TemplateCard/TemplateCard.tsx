import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useOptionalTemplate } from '@/hooks/useTemplate';
import { useColor } from '@/hooks/useColor';
import { colorAlpha } from '@/lib/color-value';
import type { TemplateCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { FileCode2 } from 'lucide-react';
import { useI18n } from '@/i18n';

// ── Resolve MDI icon name → lucide ────────────────────────────────────────────
function resolveIconName(raw: string): string {
  // Strip mdi: prefix for lucide resolver
  if (raw.startsWith('mdi:')) return raw.slice(4);
  return raw;
}

export function TemplateCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<TemplateCardConfig>(widgetId || 'template');

  // `useOptionalTemplate` : un template cassé doit laisser la card dans son
  // état par défaut, pas peindre « [Erreur template… ] » à la place de l'icône.
  const primaryInfo = useOptionalTemplate(config?.primaryInfo ?? '');
  const secondaryInfo = useOptionalTemplate(config?.secondaryInfo ?? '');
  const iconTemplate = useOptionalTemplate(config?.icon ?? '');
  const iconColor = useColor(config?.iconColor);
  const imageTemplate = useOptionalTemplate(config?.image ?? '');

  const iconName = iconTemplate ? resolveIconName(iconTemplate) : '';
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;

  const IconComponent = iconName && !customIconUrl ? resolveIcon(iconName) : null;
  const imageUrl = imageTemplate ?? '';

  const hasPrimary = !!primaryInfo;
  const hasSecondary = !!secondaryInfo;

  return (
    <div className='flex h-full items-center gap-4 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'>
      {/* Icon / Image */}
      {(IconComponent || imageUrl || customIconUrl) && (
        <div className='shrink-0'>
          {imageUrl ? (
            <img src={imageUrl} alt='' className='size-12 rounded-full object-cover' />
          ) : customIconUrl ? (
            <div
              className={cn('flex size-12 items-center justify-center rounded-full', iconColor ? '' : 'bg-[var(--ds-surface-3)]')}
              style={iconColor ? { backgroundColor: colorAlpha(iconColor, 12) } : undefined}
            >
              <img src={customIconUrl} alt='' className='w-5 h-5 object-contain' />
            </div>
          ) : IconComponent ? (
            <div
              className={cn('flex size-12 items-center justify-center rounded-full', iconColor ? '' : 'bg-[var(--ds-surface-3)]')}
              style={iconColor ? { backgroundColor: colorAlpha(iconColor, 12) } : undefined}
            >
              {/* eslint-disable-next-line react-hooks/static-components */}
              <IconComponent size={22} className='text-[var(--ds-ink-muted)]' style={iconColor ? { color: iconColor } : undefined} />
            </div>
          ) : null}
        </div>
      )}

      {/* Fallback icon when nothing configured */}
      {!IconComponent && !imageUrl && !customIconUrl && (
        <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'>
          <FileCode2 size={22} className='text-[var(--ds-ink-muted)]' />
        </div>
      )}

      {/* Text content */}
      <div className='min-w-0 flex-1'>
        {hasPrimary && <div className='truncate text-[17px] font-semibold leading-tight'>{primaryInfo}</div>}
        {hasSecondary && <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{secondaryInfo}</div>}
        {!hasPrimary && !hasSecondary && <div className='text-sm text-[var(--ds-ink-muted)]'>{t('widgets.template.placeholder')}</div>}
      </div>
    </div>
  );
}
