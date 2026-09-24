import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

// Une note fictive : la dernière vraie version ne propose pas toujours de
// visite, et le test ne doit pas dépendre de ce qu'elle annonce.
vi.mock('@/data/release-notes', () => ({
  RELEASE_NOTES: [{ version: '9.9.9', date: '2026-01-01', title: 'Nouveautés', items: [{ text: 'Les panneaux', tour: 'panels' }] }],
}));
vi.mock('./TourOverlay', () => ({ startTour: vi.fn() }));

import { ReleaseNotesModal } from './ReleaseNotesModal';
import { startTour } from './TourOverlay';

test('une note lance sa visite, fenêtre fermée', () => {
  const onClose = vi.fn();
  render(<ReleaseNotesModal onClose={onClose} />);
  fireEvent.click(screen.getByTestId('release-tour-panels'));
  expect(onClose).toHaveBeenCalled();
  expect(startTour).toHaveBeenCalledWith('panels');
});
