import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { WallPanelProvider, useWallPanel } from './WallPanelContext';
import { DEFAULT_WALLPANEL_CONFIG, type WallPanelConfig } from '@/types/wallpanel';

const configWith = (urls: string[]): WallPanelConfig => ({ ...DEFAULT_WALLPANEL_CONFIG, image_urls: urls });

/** Rend le hook sous un fournisseur dont la config servie peut changer entre deux rendus. */
function setup(first: WallPanelConfig) {
  let served = first;
  const view = renderHook(() => useWallPanel(), {
    wrapper: ({ children }: { children: ReactNode }) => <WallPanelProvider initialConfig={served}>{children}</WallPanelProvider>,
  });
  return {
    ...view,
    serve(next: WallPanelConfig) {
      served = next;
      view.rerender();
    },
  };
}

describe('WallPanelContext', () => {
  it('adopte la configuration servie quand elle arrive après le premier rendu', () => {
    // Le dashboard se peint depuis son cache local, la réponse du serveur suit.
    // Sans adoption, l'écran de veille gardait l'ancienne liste d'images.
    const { result, serve } = setup(configWith(['media-source://ancien_album/1']));
    expect(result.current.config.image_urls).toEqual(['media-source://ancien_album/1']);

    serve(configWith(['media-source://nouvel_album/1']));
    expect(result.current.config.image_urls).toEqual(['media-source://nouvel_album/1']);
  });

  it('garde les réglages modifiés localement tant que rien ne change côté serveur', () => {
    const { result, rerender } = setup(configWith(['media-source://album/1']));

    act(() => result.current.updateConfig({ image_duration: 12 }));
    rerender();

    expect(result.current.config.image_duration).toBe(12);
    expect(result.current.config.image_urls).toEqual(['media-source://album/1']);
  });
});
