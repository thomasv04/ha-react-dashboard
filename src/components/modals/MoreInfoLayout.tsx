import type { ReactNode } from 'react';

/**
 * Le gabarit des fiches « more info » : le contenu, puis la colonne
 * d'informations que la configuration du widget (`showInfoPanel`) peut
 * masquer. Le panneau d'appareil est étroit : tout s'empile.
 *
 * `LightMoreInfo` et `EnergyMoreInfo` n'en sont pas : leur panneau vit à un
 * autre niveau de la mise en page.
 */
export function MoreInfoLayout({ showPanel, sidebar, children }: { showPanel: boolean; sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className='flex flex-col gap-4 p-6'>
      <div>{children}</div>
      {showPanel && sidebar}
    </div>
  );
}
