import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock dependencies before importing
vi.mock('@hakit/core', () => ({ useHass: vi.fn() }));
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({
    getWidgetConfig: () => undefined,
    updateWidgetConfig: vi.fn(),
  }),
}));

import { DashboardLayoutProvider, useDashboardLayout, useEditMode, type GridWidget } from './DashboardLayoutContext';

import { PageProvider } from './PageContext';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <PageProvider>
        <DashboardLayoutProvider>{children}</DashboardLayoutProvider>
      </PageProvider>
    );
  };
}

describe('DashboardLayoutProvider', () => {
  it('provides default layout', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    expect(result.current.layout).toBeDefined();
    expect(result.current.layout.cols).toEqual({ lg: 12, md: 8, sm: 4 });
    expect(Array.isArray(result.current.layout.widgets.lg)).toBe(true);
  });

  it('addWidget adds a widget to the layout', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    const initialCount = result.current.layout.widgets.lg.length;
    const newWidget: GridWidget = {
      id: 'test-widget',
      type: 'sensor',
      x: 0,
      y: 20,
      w: 3,
      h: 2,
    };

    act(() => {
      result.current.addWidget(newWidget);
    });

    expect(result.current.layout.widgets.lg.length).toBe(initialCount + 1);
    const found = result.current.layout.widgets.lg.find(w => w.id === 'test-widget');
    expect(found).toBeDefined();
    expect(found!.type).toBe('sensor');
  });

  it('removeWidget removes a widget from all breakpoints', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    // First add to a known state
    act(() => {
      result.current.addWidget({ id: 'to-remove', type: 'light', x: 0, y: 30, w: 2, h: 2 });
    });
    expect(result.current.layout.widgets.lg.find(w => w.id === 'to-remove')).toBeDefined();

    act(() => {
      result.current.removeWidget('to-remove');
    });

    expect(result.current.layout.widgets.lg.find(w => w.id === 'to-remove')).toBeUndefined();
  });

  it('updateWidget updates a widget property', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    // Add a widget first, then update it
    act(() => {
      result.current.addWidget({ id: 'weather', type: 'weather', x: 0, y: 0, w: 3, h: 3 });
    });

    const weatherBefore = result.current.layout.widgets.lg.find(w => w.id === 'weather');
    expect(weatherBefore).toBeDefined();

    act(() => {
      result.current.updateWidget('weather', { w: 5, h: 4 });
    });

    const weatherAfter = result.current.layout.widgets.lg.find(w => w.id === 'weather');
    expect(weatherAfter!.w).toBe(5);
    expect(weatherAfter!.h).toBe(4);
  });
});

describe('useEditMode', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useEditMode(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isEditMode).toBe(false);
  });

  it('toggles edit mode', () => {
    const { result } = renderHook(() => useEditMode(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setEditMode(true);
    });
    expect(result.current.isEditMode).toBe(true);

    act(() => {
      result.current.setEditMode(false);
    });
    expect(result.current.isEditMode).toBe(false);
  });
});
