import { createContext, useContext } from 'react';
import type { CardRect } from '@/context/MoreInfoContext';

/**
 * Ce que fait un toucher sur la pastille d'une lumière, quand la page en
 * décide autrement que de la basculer — sur le plan 3D, il ouvre son
 * popover. Absent : la pastille garde son geste par défaut.
 */
export type ChipLightTap = (entityId: string, rect: CardRect) => void;

export const ChipTapContext = createContext<ChipLightTap | null>(null);

export const useChipLightTap = () => useContext(ChipTapContext);
