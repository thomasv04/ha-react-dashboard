import { useState } from 'react';
import { useI18n } from '@/i18n';
import { isPanelMode } from '@/lib/api-base';
import { isKioskEnabled, setKiosk } from '@/lib/kiosk';
import { PerfToggle } from './PerfToggle';
import { SECTION_HEADING } from './typography';
import { cn } from '@/lib/utils';

/**
 * Plein écran — réglage **par appareil**, donc hors du thème partagé : la
 * tablette murale le veut, le portable préfère souvent garder la navigation HA.
 * N'a de sens qu'en carte Lovelace ; servi par l'add-on, il n'y a pas d'en-tête
 * HA à masquer.
 */
function KioskToggle() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(() => isKioskEnabled());

  if (!isPanelMode()) return null;

  return (
    <div className='flex flex-col gap-3'>
      <h3 className={cn(SECTION_HEADING, 'px-1')}>{t('settings.layout_section.display')}</h3>
      <PerfToggle
        checked={enabled}
        onChange={value => {
          setKiosk(value);
          setEnabled(value);
        }}
        label={t('settings.layout_section.kiosk')}
        description={t('settings.layout_section.kioskDesc')}
      />
    </div>
  );
}

export function LayoutSection() {
  return (
    <div className='flex flex-col gap-3'>
      <KioskToggle />
    </div>
  );
}
