import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Blinds, ChevronUp, ChevronDown, Square } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { CoverCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';

export function CoverCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CoverCardConfig>(widgetId || 'cover');
  const entityId = config?.entityId ?? 'cover.living_room';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<number | null>(null);

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="gc rounded-3xl p-5 flex items-center justify-center h-full"
      >
        <span className="text-white/30 text-sm">Volet introuvable</span>
      </motion.div>
    );
  }

  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const state = entity.state; // open, closed, opening, closing
  const position = (entity.attributes.current_position as number | undefined) ?? 0;
  const isOpen = state === 'open' || position > 0;
  const isMoving = state === 'opening' || state === 'closing';

  const openCover = () => {
    helpers.callService({
      domain: 'cover',
      service: 'open_cover',
      target: { entity_id: entityId },
    });
  };

  const closeCover = () => {
    helpers.callService({
      domain: 'cover',
      service: 'close_cover',
      target: { entity_id: entityId },
    });
  };

  const stopCover = () => {
    helpers.callService({
      domain: 'cover',
      service: 'stop_cover',
      target: { entity_id: entityId },
    });
  };

  const setPosition = (pos: number) => {
    helpers.callService({
      domain: 'cover',
      service: 'set_cover_position',
      target: { entity_id: entityId },
      serviceData: { position: Math.round(pos) },
    });
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((rect.bottom - e.clientY) / rect.height) * 100));
    setDragPosition(pct);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (dragPosition !== null) {
      setPosition(dragPosition);
      setDragPosition(null);
    }
    setIsDragging(false);
  }, [dragPosition]);

  // HA: position 100 = open, 0 = closed — bar shows the "closed" portion from top
  const displayPosition = dragPosition ?? position;
  const closedPercent = 100 - displayPosition;

  const stateLabel =
    state === 'open' ? 'Ouvert' :
    state === 'closed' ? 'Fermé' :
    state === 'opening' ? 'Ouverture...' :
    state === 'closing' ? 'Fermeture...' : state;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="gc rounded-3xl p-5 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Blinds size={20} className={cn(
          isOpen ? 'text-blue-400' : 'text-white/40',
          isMoving && 'animate-pulse',
        )} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {stateLabel}
        </span>
      </div>

      {/* Vertical slider — visual representation of the cover */}
      <div
        ref={sliderRef}
        className="flex-1 relative mx-auto w-16 rounded-xl bg-white/5 overflow-hidden cursor-ns-resize min-h-[80px]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* "Closed" portion — from top */}
        <div
          className="absolute top-0 left-0 right-0 bg-blue-500/30 transition-all duration-300 rounded-t-xl"
          style={{ height: `${closedPercent}%` }}
        >
          {/* Horizontal slats */}
          {Array.from({ length: Math.max(1, Math.floor(closedPercent / 12)) }, (_, i) => (
            <div
              key={i}
              className="w-full h-px bg-blue-400/30 mt-3 first:mt-0"
            />
          ))}
        </div>

        {/* Position label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg drop-shadow-lg">
            {Math.round(displayPosition)}%
          </span>
        </div>
      </div>

      {/* Open / Stop / Close buttons */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={openCover}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ChevronUp size={18} className="text-white/60" />
        </button>
        <button
          onClick={stopCover}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <Square size={14} className="text-white/60" />
        </button>
        <button
          onClick={closeCover}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ChevronDown size={18} className="text-white/60" />
        </button>
      </div>

      {/* Name */}
      <div className="text-white/40 text-xs uppercase tracking-wider text-center mt-2">
        {name}
      </div>
    </motion.div>
  );
}
