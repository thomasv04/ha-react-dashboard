import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalProvider, useModal } from '@/context/ModalContext';
import { ModalContainer } from '@/components/ui/Modal/composents/Modal';

function TestComponent() {
  const { openModal } = useModal();

  return (
    <div>
      <button onClick={() => openModal({ title: 'Test Modal', content: 'Test content' })}>Open Modal</button>
      <ModalContainer />
    </div>
  );
}

describe('Modal', () => {
  it('opens and displays modal content', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    fireEvent.click(screen.getByText('Open Modal'));

    await waitFor(() => {
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  it('closes modal on close button click', async () => {
    render(
      <ModalProvider>
        <TestComponent />
      </ModalProvider>
    );

    fireEvent.click(screen.getByText('Open Modal'));
    await waitFor(() => expect(screen.getByText('Test Modal')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Fermer'));
    await waitFor(() => expect(screen.queryByText('Test Modal')).not.toBeInTheDocument());
  });

  it('executes action onClick', async () => {
    const actionMock = vi.fn();

    function TestWithAction() {
      const { openModal } = useModal();

      return (
        <div>
          <button
            onClick={() =>
              openModal({
                title: 'Action Modal',
                actions: [{ label: 'Execute', onClick: actionMock }],
              })
            }
          >
            Open
          </button>
          <ModalContainer />
        </div>
      );
    }

    render(
      <ModalProvider>
        <TestWithAction />
      </ModalProvider>
    );

    fireEvent.click(screen.getByText('Open'));
    await waitFor(() => expect(screen.getByText('Execute')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Execute'));
    expect(actionMock).toHaveBeenCalled();
  });

  it('closes persistent modal when action.closeOnClick is true', async () => {
    const actionMock = vi.fn();

    function TestPersistent() {
      const { openModal } = useModal();

      return (
        <div>
          <button
            onClick={() =>
              openModal({
                title: 'Persistent Modal',
                persistent: true,
                dismissible: false,
                actions: [{ label: 'Confirm', onClick: actionMock, closeOnClick: true }],
              })
            }
          >
            OpenPersistent
          </button>
          <ModalContainer />
        </div>
      );
    }

    render(
      <ModalProvider>
        <TestPersistent />
      </ModalProvider>
    );

    fireEvent.click(screen.getByText('OpenPersistent'));
    await waitFor(() => expect(screen.getByText('Confirm')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Confirm'));
    expect(actionMock).toHaveBeenCalled();

    await waitFor(() => expect(screen.queryByText('Persistent Modal')).not.toBeInTheDocument());
  });

  it('does not close persistent modal when action.closeOnClick is not set', async () => {
    const actionMock = vi.fn();

    function TestPersistentNoClose() {
      const { openModal } = useModal();

      return (
        <div>
          <button
            onClick={() =>
              openModal({
                title: 'Persistent NoClose',
                persistent: true,
                dismissible: false,
                actions: [{ label: 'NoClose', onClick: actionMock }],
              })
            }
          >
            OpenNoClose
          </button>
          <ModalContainer />
        </div>
      );
    }

    render(
      <ModalProvider>
        <TestPersistentNoClose />
      </ModalProvider>
    );

    fireEvent.click(screen.getByText('OpenNoClose'));
    await waitFor(() => expect(screen.getByText('NoClose')).toBeInTheDocument());

    fireEvent.click(screen.getByText('NoClose'));
    expect(actionMock).toHaveBeenCalled();

    // The modal should still be present because closeOnClick was not set
    expect(screen.getByText('Persistent NoClose')).toBeInTheDocument();
  });
});
