import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useTemplate } from '@/hooks/useTemplate';
import { useColor } from '@/hooks/useColor';
import { colorAlpha } from '@/lib/color-value';
import type { TemplateCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { FileCode2 } from 'lucide-react';

// ── Resolve MDI icon name → lucide ────────────────────────────────────────────
function resolveIconName(raw: string): string {
  // Strip mdi: prefix for lucide resolver
  if (raw.startsWith('mdi:')) return raw.slice(4);
  return raw;
}

export function TemplateCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<TemplateCardConfig>(widgetId || 'template');

  const primaryInfo = useTemplate(config?.primaryInfo ?? '');
  const secondaryInfo = useTemplate(config?.secondaryInfo ?? '');
  const iconTemplate = useTemplate(config?.icon ?? '');
  const iconColor = useColor(config?.iconColor);
  const imageTemplate = useTemplate(config?.image ?? '');

  const iconName = iconTemplate && !iconTemplate.startsWith('[Erreur') ? resolveIconName(iconTemplate) : '';
  const customIconUrl = iconName && isCustomIcon(iconName) ? getCustomIconUrl(iconName) : undefined;

  const IconComponent = iconName && !customIconUrl ? resolveIcon(iconName) : null;
  const imageUrl = imageTemplate && !imageTemplate.startsWith('[Erreur') ? imageTemplate : '';

  const hasPrimary = primaryInfo && !primaryInfo.startsWith('[Erreur');
  const hasSecondary = secondaryInfo && !secondaryInfo.startsWith('[Erreur');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className='gc rounded-3xl p-5 flex items-center gap-4 h-full'
    >
      {/* Icon / Image */}
      {(IconComponent || imageUrl || customIconUrl) && (
        <div className='shrink-0'>
          {imageUrl ? (
            <img src={imageUrl} alt='' className='w-10 h-10 rounded-xl object-cover' />
          ) : customIconUrl ? (
            <div
              className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconColor ? '' : 'bg-white/5')}
              style={iconColor ? { backgroundColor: colorAlpha(iconColor, 12) } : undefined}
            >
              <img src={customIconUrl} alt='' className='w-5 h-5 object-contain' />
            </div>
          ) : IconComponent ? (
            <div
              className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconColor ? '' : 'bg-white/5')}
              style={iconColor ? { backgroundColor: colorAlpha(iconColor, 12) } : undefined}
            >
              {/* eslint-disable-next-line react-hooks/static-components */}
              <IconComponent size={20} className='text-white/60' style={iconColor ? { color: iconColor } : undefined} />
            </div>
          ) : null}
        </div>
      )}

      {/* Fallback icon when nothing configured */}
      {!IconComponent && !imageUrl && !customIconUrl && (
        <div className='shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center'>
          <FileCode2 size={20} className='text-white/40' />
        </div>
      )}

      {/* Text content */}
      <div className='min-w-0 flex-1'>
        {hasPrimary && <div className='text-white text-sm font-medium truncate'>{primaryInfo}</div>}
        {hasSecondary && <div className='text-white/40 text-xs mt-0.5 truncate'>{secondaryInfo}</div>}
        {!hasPrimary && !hasSecondary && <div className='text-white/20 text-sm'>Carte template</div>}
      </div>
    </motion.div>
  );
}
