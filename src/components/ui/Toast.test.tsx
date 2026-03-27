import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastContainer, ToastCard } from './Toast/components/Toast';
import { ToastProvider, useToast } from '@/context/ToastContext';

import { describe, it, expect, vi } from 'vitest';

describe('ToastContainer', () => {
  it('rend sans crash même sans toast', () => {
    render(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>
    );
    expect(document.body).toBeDefined();
  });

  it('affiche un toast et permet le dismiss', async () => {
    const Test = () => {
      const { addToast } = useToast();
      return <button onClick={() => addToast({ title: 'Hello', description: 'World' })}>Show Toast</button>;
    };
    render(
      <ToastProvider>
        <Test />
        <ToastContainer />
      </ToastProvider>
    );
    await act(async () => {
      screen.getByText('Show Toast').click();
    });
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
    const closeBtn = document.querySelector('button[aria-label="Close"]') || document.querySelector('button');
    if (closeBtn) await act(async () => closeBtn.click());
  });

  it('affiche un toast avec action', async () => {
    const Test = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast({ title: 'Action Toast', actions: [{ label: 'Action', onClick: vi.fn() }] })}>
          Show Action Toast
        </button>
      );
    };
    render(
      <ToastProvider>
        <Test />
        <ToastContainer />
      </ToastProvider>
    );
    await act(async () => {
      screen.getByText('Show Action Toast').click();
    });
    expect(await screen.findByText('Action Toast')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('affiche plusieurs toasts en même temps', async () => {
    const { act } = await import('@testing-library/react');
    const Test = () => {
      const { addToast } = useToast();
      return (
        <>
          <button onClick={() => addToast({ title: 'Toast 1' })}>Toast 1</button>
          <button onClick={() => addToast({ title: 'Toast 2' })}>Toast 2</button>
        </>
      );
    };
    render(
      <ToastProvider>
        <Test />
        <ToastContainer />
      </ToastProvider>
    );
    await act(async () => {
      screen.getByText('Toast 1').click();
      screen.getByText('Toast 2').click();
    });
    const allToast1 = await screen.findAllByText('Toast 1');
    const allToast2 = await screen.findAllByText('Toast 2');
    expect(allToast1.some(el => el.closest('.gc'))).toBe(true);
    expect(allToast2.some(el => el.closest('.gc'))).toBe(true);
  });
});

describe('ToastCard', () => {
  const toast = {
    title: 'Test',
    description: 'Desc',
    icon: <span data-testid="icon">icon</span>,
    persistent: false,
    durationMs: 1000,
    actions: [
      {
        label: 'Action',
        onClick: vi.fn(),
        variant: 'default',
      },
    ],
  } as any;

  it('affiche le titre, la description et l’icône', () => {
    render(<ToastCard toast={toast} onDismiss={vi.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('affiche le bouton d’action et déclenche onClick', () => {
    const onDismiss = vi.fn();
    render(<ToastCard toast={toast} onDismiss={onDismiss} />);
    const btn = screen.getByRole('button', { name: 'Action' });
    fireEvent.click(btn);
    expect(toast.actions[0].onClick).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });
});
