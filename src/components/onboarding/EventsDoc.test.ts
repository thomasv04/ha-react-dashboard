import { describe, it, expect } from 'vitest';
import { toDevTools } from './EventsDoc';

const AUTOMATION = `action:
  - event: ha_dashboard_notification
    event_data:
      id: update-2.3.0
      title: "Mise à jour"
      actions:
        - label: "Installer"
          service: hassio.addon_update

# Pour la retirer :
#   dismiss: true`;

describe('toDevTools', () => {
  it("ne garde que le contenu de event_data, désindenté, et rappelle le type", () => {
    expect(toDevTools(AUTOMATION, 'ha_dashboard_notification')).toBe(
      `# Type d'événement : ha_dashboard_notification
# Données d'événement :
id: update-2.3.0
title: "Mise à jour"
actions:
  - label: "Installer"
    service: hassio.addon_update`
    );
  });

  it('rend le bloc tel quel si event_data est absent', () => {
    const plain = 'action:\n  - event: ha_dashboard_toast';
    expect(toDevTools(plain, 'ha_dashboard_toast')).toBe(plain);
  });
});
