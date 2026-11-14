import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { useHass } from '@hakit/core';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import { EventViewer } from '@/components/cards/CameraEventsCard/EventViewer';
import { useFrigateEvents } from '@/hooks/useFrigateEvents';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useFormats } from '@/hooks/useFormats';
import { frigateLabel, frigateMedia } from '@/lib/frigate';
import { friendlyName } from '@/lib/ha-service';
import { clamp, cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { PHONE_ROUND, PHONE_TOP } from './PhoneShell';

/**
 * Une caméra au téléphone (maquette « Caméra — chronologie ») : le direct en
 * pleine largeur, zoomable à deux doigts, un bouton plein écran qui passe en
 * paysage, puis les événements Frigate de la caméra — un appui ouvre leur
 * visionneuse (clip, chronologie, « Direct »).
 */
export function PhoneCamera({ entityId, onBack }: { entityId: string; onBack: () => void }) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const resolve = useHaUrl();
  const name = useHass(s => friendlyName(s.entities[entityId]) ?? entityId);
  const { events } = useFrigateEvents({ instanceId: 'frigate', cameras: entityId.replace(/^camera\./, ''), hours: 24 });
  const [eventId, setEventId] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const enterFull = async () => {
    setFull(true);
    // Android : vrai plein écran, verrouillé en paysage. iPhone (pas d'API) : la vue tourne en CSS.
    try {
      await boxRef.current?.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape');
    } catch {
      /* refusé ou non pris en charge : la rotation CSS prend le relais */
    }
  };
  const exitFull = () => {
    setFull(false);
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  };
  // Sortie par le geste retour ou Échap : le plein écran natif se ferme seul.
  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setFull(false);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <div className={cn('flex flex-col pb-[180px]', PHONE_TOP)}>
      <div className='flex h-11 items-center gap-3 px-4'>
        <button onClick={onBack} aria-label={t('layout.phone.back')} title={t('layout.phone.back')} className={PHONE_ROUND}>
          <ChevronLeft size={22} aria-hidden='true' />
        </button>
        <h1 className='min-w-0 flex-1 truncate text-[22px] font-bold'>{name}</h1>
      </div>

      <div
        ref={boxRef}
        className={cn(
          'relative mt-3 overflow-hidden bg-black',
          full
            ? 'fixed inset-0 z-[95] mt-0 portrait:inset-auto portrait:left-0 portrait:top-0 portrait:h-[100vw] portrait:w-[100dvh] portrait:origin-top-left portrait:translate-x-[100vw] portrait:rotate-90'
            : 'aspect-[16/10] w-full'
        )}
      >
        <ZoomPan>
          <CameraFeed entityId={entityId} className='size-full object-contain' />
        </ZoomPan>
        <button
          onClick={full ? exitFull : enterFull}
          aria-label={t(full ? 'layout.phone.cameras.exitFullscreen' : 'layout.phone.cameras.fullscreen')}
          title={t(full ? 'layout.phone.cameras.exitFullscreen' : 'layout.phone.cameras.fullscreen')}
          className='absolute bottom-3 right-3 z-10 flex size-11 items-center justify-center rounded-full bg-[rgba(7,9,12,0.66)] text-white'
        >
          {full ? <Minimize size={20} aria-hidden='true' /> : <Maximize size={20} aria-hidden='true' />}
        </button>
      </div>

      {events.length > 0 && (
        <section className='mt-6 px-2'>
          <h2 className='mb-2 px-2 text-xl font-bold'>{t('layout.phone.cameras.events')}</h2>
          <ul className='flex flex-col gap-1'>
            {events.map(e => (
              <li key={e.id}>
                <button onClick={() => setEventId(e.id)} className='flex h-[68px] w-full items-center gap-3 rounded-[18px] px-2 text-left'>
                  <img
                    src={resolve(frigateMedia(e.id, 'thumbnail.jpg'))}
                    alt=''
                    className='h-[46px] w-[72px] shrink-0 rounded-[10px] bg-[var(--ds-surface-3)] object-cover'
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-[17px] font-semibold'>{frigateLabel(t, e.label)}</span>
                    <span className='block text-sm text-[var(--ds-ink-muted)]'>{formatTime(new Date(e.start_time * 1000))}</span>
                  </span>
                  <ChevronRight size={20} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {eventId && <EventViewer events={events} initialId={eventId} onClose={() => setEventId(null)} />}
    </div>
  );
}

/**
 * Zoom à deux doigts (jusqu'à ×5) et déplacement à un doigt une fois zoomé ;
 * double appui pour revenir. `touch-none` : le navigateur ne zoome pas la page.
 */
function ZoomPan({ children }: { children: ReactNode }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      start.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale };
    } else if (Date.now() - lastTap.current < 300) {
      setView({ scale: 1, x: 0, y: 0 });
    }
    lastTap.current = Date.now();
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && start.current) {
      const [a, b] = [...pointers.current.values()];
      const scale = clamp((start.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / start.current.dist, 1, 5);
      setView(v => (scale === 1 ? { scale, x: 0, y: 0 } : { ...v, scale }));
    } else if (pointers.current.size === 1 && view.scale > 1) {
      setView(v => ({ ...v, x: v.x + (e.clientX - prev.x) / v.scale, y: v.y + (e.clientY - prev.y) / v.scale }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) start.current = null;
  };

  return (
    <div className='size-full touch-none' onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className='size-full' style={{ transform: `scale(${view.scale}) translate(${view.x}px, ${view.y}px)` }}>
        {children}
      </div>
    </div>
  );
}
