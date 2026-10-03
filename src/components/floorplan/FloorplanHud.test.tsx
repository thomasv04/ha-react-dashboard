import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';

const callService = vi.fn();
vi.mock('@hakit/core', () => ({
  useHass: (selector: (s: unknown) => unknown) => selector({ helpers: { callService } }),
}));

import { StatusChips } from './FloorplanHud';

const light = (state: string, name: string) => ({ state, attributes: { friendly_name: name } }) as unknown as HassEntity;

describe('StatusChips', () => {
  it('counts the lit lamps, and switches one from their list', () => {
    render(
      <StatusChips
        lamps={[
          { entityId: 'light.salon', entity: light('on', 'Salon') },
          { entityId: 'light.chambre', entity: light('off', 'Chambre') },
        ]}
        open={[]}
        security={false}
        onAlarm={() => {}}
        onSecurity={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'layout.floorplan.lightsOn' }));
    fireEvent.click(screen.getByRole('button', { name: /Chambre/ }));

    expect(callService).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'homeassistant', service: 'toggle', target: { entity_id: 'light.chambre' } })
    );
    // Rien d'ouvert : tout est fermé ; pas d'alarme, pas de chip d'alarme.
    expect(screen.getByRole('button', { name: 'layout.floorplan.securityClosed' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });
});
