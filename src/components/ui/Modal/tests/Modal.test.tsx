import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModalProvider, useModal } from '@/context/ModalContext';
import { ThemeContextProvider } from '@/context/ThemeContext';
import { ModalContainer } from '@/components/ui/Modal/components/Modal';

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
      <ThemeContextProvider>
        <ModalProvider>
          <TestComponent />
        </ModalProvider>
      </ThemeContextProvider>
    );

    fireEvent.click(screen.getByText('Open Modal'));

    await waitFor(() => {
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  it('closes modal on close button click', async () => {
    render(
      <ThemeContextProvider>
        <ModalProvider>
          <TestComponent />
        </ModalProvider>
      </ThemeContextProvider>
    );

    fireEvent.click(screen.getByText('Open Modal'));
    await waitFor(() => expect(screen.getByText('Test Modal')).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('common.close'));
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
      <ThemeContextProvider>
        <ModalProvider>
          <TestWithAction />
        </ModalProvider>
      </ThemeContextProvider>
    );

    fireEvent.click(screen.getByText('Open'));
    await waitFor(() => expect(screen.getByText('Execute')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Execute'));
    expect(actionMock).toHaveBeenCalled();
  });

  it('closes a modal on any of its actions, even one neither Escape nor a click outside closes', async () => {
    const actionMock = vi.fn();

    function TestNonDismissible() {
      const { openModal } = useModal();

      return (
        <div>
          <button
            onClick={() =>
              openModal({
                title: 'Non-dismissible Modal',
                dismissible: false,
                actions: [{ label: 'Confirm', onClick: actionMock }],
              })
            }
          >
            OpenNonDismissible
          </button>
          <ModalContainer />
        </div>
      );
    }

    render(
      <ThemeContextProvider>
        <ModalProvider>
          <TestNonDismissible />
        </ModalProvider>
      </ThemeContextProvider>
    );

    fireEvent.click(screen.getByText('OpenNonDismissible'));
    await waitFor(() => expect(screen.getByText('Confirm')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Confirm'));
    expect(actionMock).toHaveBeenCalled();

    await waitFor(() => expect(screen.queryByText('Non-dismissible Modal')).not.toBeInTheDocument());
  });
});
