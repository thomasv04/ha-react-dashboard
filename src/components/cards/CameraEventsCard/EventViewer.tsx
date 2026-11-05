import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Radio } from 'lucide-react';
import { useHass } from '@hakit/core';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { frigateMedia, type FrigateEvent } from '@/lib/frigate';

/**
 * Une caméra en plein écran, comme la maquette « Caméra — chronologie » : le
 * clip de l'événement choisi, les filtres par étiquette, la chronologie des
 * événements, et « Direct » pour le flux en temps réel.
 */
export function EventViewer({ events, initialId, onClose }: { events: FrigateEvent[]; initialId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const resolve = useHaUrl();
  const [selectedId, setSelectedId] = useState(initialId);
  const [label, setLabel] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const selected = events.find(e => e.id === selectedId) ?? events[0];
  const cameraEntity = `camera.${selected?.camera}`;
  const hasLive = useHass(s => !!s.entities?.[cameraEntity]);
  // La chronologie ne montre que la caméra de l'événement, comme sur l'Echo.
  const sameCamera = useMemo(() => events.filter(e => e.camera === selected?.camera), [events, selected?.camera]);
  const labels = useMemo(() => [...new Set(sameCamera.map(e => e.label))], [sameCamera]);
  const shown = label ? sameCamera.filter(e => e.label === label) : sameCamera;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!selected) return null;
  const labelText = (l: string) => {
    const key = `widgets.camera_events.labels.${l}`;
    const text = t(key);
    return text === key ? l : text;
  };

  return createPortal(
    <div role='dialog' aria-modal='true' aria-label={selected.camera} className='fixed inset-0 z-[90] bg-black text-white'>
      {live && hasLive ? (
        <CameraFeed entityId={cameraEntity} className='absolute inset-0 size-full object-contain' />
      ) : selected.has_clip ? (
        <video
          key={selected.id}
          src={resolve(frigateMedia(selected.id, 'clip.mp4'))}
          autoPlay
          muted
          controls
          playsInline
          className='absolute inset-0 size-full object-contain'
        />
      ) : (
        <img src={resolve(frigateMedia(selected.id, 'snapshot.jpg'))} alt='' className='absolute inset-0 size-full object-contain' />
      )}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/85 to-transparent'
      />

      <button
        onClick={onClose}
        aria-label={t('widgets.camera_events.back')}
        title={t('widgets.camera_events.back')}
        className='absolute left-10 top-10 flex size-14 items-center justify-center rounded-full bg-white/15'
      >
        <ChevronLeft size={26} />
      </button>

      <div className='absolute inset-x-10 bottom-8 flex flex-col gap-4'>
        <p className='text-2xl font-semibold'>
          {live ? t('widgets.camera_events.live') : `${labelText(selected.label)} · ${formatTime(new Date(selected.start_time * 1000))}`}
        </p>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='mr-2 text-[15px] font-bold'>{selected.camera}</span>
          {[null, ...labels].map(l => (
            <button
              key={l ?? 'all'}
              onClick={() => setLabel(l)}
              aria-pressed={label === l}
              className={cn(
                'h-11 rounded-[var(--ds-radius-pill)] border px-5 text-[15px] font-semibold',
                label === l ? 'border-white bg-white text-black' : 'border-white/30 bg-white/10'
              )}
            >
              {l ? labelText(l) : t('widgets.camera_events.all')}
            </button>
          ))}
          {hasLive && (
            <button
              onClick={() => setLive(true)}
              aria-pressed={live}
              className={cn(
                'ml-auto flex h-11 items-center gap-2 rounded-[var(--ds-radius-pill)] px-5 text-[15px] font-bold',
                live ? 'bg-[var(--ds-alert)]' : 'bg-white/15'
              )}
            >
              <Radio size={18} aria-hidden='true' />
              {t('widgets.camera_events.live')}
            </button>
          )}
        </div>
        {/* La chronologie : les événements de la caméra, le plus récent à gauche. */}
        <div className='flex gap-3 overflow-x-auto pb-1' style={{ scrollbarWidth: 'none' }}>
          {shown.map(e => (
            <button
              key={e.id}
              onClick={() => {
                setSelectedId(e.id);
                setLive(false);
              }}
              aria-pressed={e.id === selected.id && !live}
              className='flex w-36 shrink-0 flex-col gap-1.5 text-left'
            >
              <img
                src={resolve(frigateMedia(e.id, 'thumbnail.jpg'))}
                alt=''
                className={cn(
                  'aspect-video w-full rounded-[var(--ds-radius-md)] object-cover',
                  e.id === selected.id && !live && 'outline outline-[3px] outline-[var(--ds-accent)]'
                )}
              />
              <span className='text-sm font-semibold'>
                {formatTime(new Date(e.start_time * 1000))} · {labelText(e.label)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
