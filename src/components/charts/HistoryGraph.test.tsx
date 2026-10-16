import { it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));

import { HistoryGraph } from './HistoryGraph';

const data = [
  { time: new Date(2026, 0, 1, 10), value: 18, state: '18' },
  { time: new Date(2026, 0, 1, 11), value: 21, state: '21' },
];

// Les ids sont globaux au document : `url(#id)` désigne le premier élément qui
// le porte. Chaque graphe doit donc pointer vers **son** dégradé (#42).
it('chaque graphe remplit son aire avec son propre dégradé', () => {
  render(
    <>
      <HistoryGraph data={data} color='#ff0000' />
      <HistoryGraph data={data} color='#00ff00' />
    </>
  );
  const colors = [...document.querySelectorAll('path[fill^="url(#"]')].map(area => {
    const id = area.getAttribute('fill')!.slice('url(#'.length, -1);
    return document.getElementById(id)?.querySelector('stop')?.getAttribute('stop-color');
  });
  expect(colors).toEqual(['#ff0000', '#00ff00']);
});
