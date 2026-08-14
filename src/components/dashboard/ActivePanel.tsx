import { usePanel } from '@/context/PanelContext';
import { CustomPanelRenderer } from '@/components/custom-panels';

export function ActivePanel() {
  const { activePanel } = usePanel();

  if (activePanel?.startsWith('custom:')) {
    return <CustomPanelRenderer panelId={activePanel.slice(7)} />;
  }

  return null;
}
