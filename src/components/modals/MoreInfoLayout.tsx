import type { ReactNode } from 'react';

/**
 * Le gabarit des fiches « more info » : le contenu, et une colonne latérale
 * que la configuration du widget (`showInfoPanel`) peut masquer.
 *
 * Sept modales recopiaient ces trois div et la même expression ternaire.
 * `LightMoreInfo` et `EnergyMoreInfo` n'en sont pas : leur panneau vit à un
 * autre niveau de la mise en page.
 */
export function MoreInfoLayout({ showPanel, sidebar, children }: { showPanel: boolean; sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className={`p-8 md:p-12 ${showPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showPanel ? 'lg:col-span-3' : ''}>{children}</div>
      {showPanel && <div className='lg:col-span-2 mt-8 lg:mt-0'>{sidebar}</div>}
    </div>
  );
}
