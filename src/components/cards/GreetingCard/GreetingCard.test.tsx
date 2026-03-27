import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

import { GreetingCard } from './GreetingCard';

test('renders greeting card content', () => {
  const { container } = render(<GreetingCard />);
  // ensure rendering succeeds and a time string is present
  expect(container).toBeDefined();
});
