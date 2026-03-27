import React from 'react';
import { render } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

import { PelletCard } from './PelletCard';

test('renders PelletCard', () => {
  const { container } = render(<PelletCard />);
  expect(container).toBeDefined();
});
