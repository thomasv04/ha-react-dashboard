import { usePanel } from '@/context/PanelContext';
import { ShuttersPanel } from '@/components/panels/ShuttersPanel';
import { LightsPanel } from '@/components/panels/LightsPanel';
import { VacuumPanel } from '@/components/panels/VacuumPanel';
import { SecurityPanel } from '@/components/panels/SecurityPanel';
import { NotificationsPanel } from '@/components/panels/NotificationsPanel';
import { FlowersPanel } from '@/components/panels/FlowersPanel';
import { CameraPanel } from '@/components/panels/CameraPanel';
import { CustomPanelRenderer } from '@/components/custom-panels';

export function ActivePanel() {
  const { activePanel } = usePanel();

  if (activePanel?.startsWith('custom:')) {
    return <CustomPanelRenderer panelId={activePanel.slice(7)} />;
  }

  switch (activePanel) {
    case 'volets':
      return <ShuttersPanel />;
    case 'lumieres':
      return <LightsPanel />;
    case 'aspirateur':
      return <VacuumPanel />;
    case 'security':
      return <SecurityPanel />;
    case 'notifications':
      return <NotificationsPanel />;
    case 'flowers':
      return <FlowersPanel />;
    case 'cameras':
      return <CameraPanel />;
    case 'alarme':
      return <SecurityPanel />;
    default:
      return null;
  }
}
