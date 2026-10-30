import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Fan } from 'lucide-react';
import { dialGeometry, Dial } from './Dial';
import { DeviceTile } from './DeviceTile';
import { PillSlider } from './PillSlider';

describe('Dial', () => {
  it('remplit depuis le début en chauffage, depuis la fin en clim, sans passer sous la pastille', () => {
    const heat = dialGeometry(20, 15, 25, 'heat');
    const cool = dialGeometry(20, 15, 25, 'cool');
    // Les deux segments s'arrêtent de part et d'autre de la pastille.
    expect(heat.fill.from).toBe(0);
    expect(heat.fill.to).toBeLessThan(heat.track.from);
    expect(cool.fill).toEqual(heat.track);
    expect(cool.track).toEqual(heat.fill);
    // À mi-course, la pastille est en haut du cadran (arc ouvert en bas).
    expect(heat.knob.x).toBeCloseTo(100);
    expect(heat.knob.y).toBeCloseTo(12);
  });

  it('borne la pastille au min et au max', () => {
    expect(dialGeometry(40, 15, 25, 'heat').knob).toEqual(dialGeometry(25, 15, 25, 'heat').knob);
    expect(dialGeometry(0, 15, 25, 'heat').knob).toEqual(dialGeometry(15, 15, 25, 'heat').knob);
  });

  it("montre l'actif entre ses voisins et change de mode", () => {
    const onModeChange = vi.fn();
    render(
      <Dial
        value={21}
        min={16}
        max={26}
        onChange={() => {}}
        display='21°'
        modes={[
          { id: 'heat', label: 'Chauffage' },
          { id: 'cool', label: 'Clim' },
          { id: 'off', label: 'Arrêt' },
        ]}
        activeMode='cool'
        onModeChange={onModeChange}
        labels={{ decrease: 'Baisser', increase: 'Monter', modes: 'Mode' }}
      />
    );
    expect(screen.getByRole('radio', { name: 'Clim' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Arrêt' }));
    expect(onModeChange).toHaveBeenCalledWith('off');
  });

  it('ne dépasse pas les bornes avec les boutons', () => {
    const onChange = vi.fn();
    render(<Dial value={25} min={15} max={25} onChange={onChange} display='25°' labels={{ decrease: 'Baisser', increase: 'Monter' }} />);
    expect(screen.getByRole('button', { name: 'Monter' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Baisser' }));
    expect(onChange).toHaveBeenCalledWith(24.5);
  });
});

describe('DeviceTile', () => {
  it("annonce son état et bascule l'appareil", () => {
    const onToggle = vi.fn();
    render(<DeviceTile name='Ventilateur' state='Arrêté' icon={Fan} active={false} onToggle={onToggle} />);
    const tile = screen.getByRole('button', { name: /Ventilateur/ });
    expect(tile).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(tile);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

describe('PillSlider', () => {
  it('renvoie un nombre', () => {
    const onChange = vi.fn();
    render(<PillSlider value={10} onChange={onChange} label='Volume' />);
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '30' } });
    expect(onChange).toHaveBeenCalledWith(30);
  });
});
