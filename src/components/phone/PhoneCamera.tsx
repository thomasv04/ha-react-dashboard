import { createElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, History, Maximize, Minimize, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useHass } from '@hakit/core';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useFormats } from '@/hooks/useFormats';
import { useNow } from '@/hooks/useNow';
import { frigateIcon, frigateLabel, frigateMedia, type FrigateEvent } from '@/lib/frigate';
import { friendlyName } from '@/lib/ha-service';
import { clamp, cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { buildTimeline, dayOf, timeAtX, timelineX } from './camera-timeline';
import { PHONE_ROUND, PHONE_TOP } from './PhoneShell';

/** Fenêtre de la frise et des événements, en heures. */
export const CAMERA_HOURS = 24;
/** Bleu clair du titre en cours et son fond, ceux de l'appli Musique. */
const HIGHLIGHT = '#8fb8f5';

/**
 * Une caméra au téléphone (maquette « Caméra — chronologie ») : le direct en
 * pleine largeur, ou le clip de l'événement choisi ; une frise des dernières
 * heures avec « Direct » ; précédent, pause, suivant ; puis les événements.
 *
 * Frise lâchée au doigt : l'enregistrement continu de Frigate se lit à l'heure
 * passée sous la tête de lecture (proxy VOD de l'intégration, adresse signée).
 *
 * L'image se zoome à deux doigts, et le bouton plein écran passe en paysage :
 * verrouillé sur Android, la vue tournée en CSS sur iPhone (pas d'API).
 */
export function PhoneCamera({
  entityId,
  events,
  initialEventId = null,
  frigate,
  onBack,
}: {
  entityId: string;
  /** La caméra côté Frigate : sans elle, pas d'enregistrement à parcourir. */
  frigate?: { camera: string; instance: string };
  /** Les événements de cette caméra, du plus récent au plus ancien. */
  events: FrigateEvent[];
  initialEventId?: string | null;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const resolve = useHaUrl();
  const name = useHass(s => friendlyName(s.entities[entityId]) ?? entityId);
  const now = useNow().getTime();
  // `null` : le direct.
  const [selectedId, setSelectedId] = useState<string | null>(initialEventId);
  const index = events.findIndex(e => e.id === selectedId);
  const selected = index >= 0 ? events[index] : undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState(0);
  // L'enregistrement continu lu depuis cet instant (secondes) ; `null` hors enregistrement.
  const [at, setAt] = useState<number | null>(null);
  const select = (id: string | null) => {
    setSelectedId(id);
    setAt(null);
    setPosition(0);
    setPaused(false);
  };
  // Lâchée à moins de 30 s de maintenant, la frise revient au direct.
  const scrub = (time: number) => {
    if (time * 1000 > now - 30_000) return select(null);
    select(null);
    setAt(time);
  };
  // Précédent : plus ancien ; suivant : plus récent, puis le direct. Depuis l'enregistrement : les
  // événements de part et d'autre de l'heure lue.
  const older = selected ? events[index + 1] : at !== null ? events.find(e => e.start_time < at) : events[0];
  const newer = selected
    ? index > 0
      ? events[index - 1].id
      : null
    : at !== null
      ? (events.filter(e => e.start_time > at).at(-1)?.id ?? null)
      : undefined;

  const [full, setFull] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const enterFull = async () => {
    setFull(true);
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
  // Plein écran en portrait : la vue est tournée, les gestes aussi. Relu au pivotement du téléphone :
  // le rendu suivant recalcule `rotated`.
  const [, setTurns] = useState(0);
  useEffect(() => {
    if (!full) return;
    const onResize = () => setTurns(n => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [full]);
  const rotated = full && !!window.matchMedia?.('(orientation: portrait)').matches;
  // Sortie par le geste retour ou Échap : le plein écran natif se ferme seul.
  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setFull(false);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  };

  const fullLabel = t(full ? 'layout.phone.cameras.exitFullscreen' : 'layout.phone.cameras.fullscreen');

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
        className={cn('overflow-hidden bg-black text-white', full ? 'fixed inset-0 z-[95]' : 'relative mt-2 aspect-video w-full')}
      >
        {/* La rotation vit sur ce calque et non sur le cadre : en vrai plein écran, le navigateur impose
            `transform: none` à l'élément en plein écran. Paysage : tout l'écran ; portrait (iPhone, ou
            verrou d'orientation refusé) : la vue tourne d'un quart de tour. */}
        <div
          data-testid='phone-camera-view'
          className={cn(
            'absolute',
            full
              ? 'inset-0 portrait:inset-auto portrait:left-0 portrait:top-0 portrait:h-[100vw] portrait:w-[100dvh] portrait:origin-top-left portrait:translate-x-[100vw] portrait:rotate-90'
              : 'inset-0'
          )}
        >
          <ZoomPan resetKey={selectedId ?? at} rotated={rotated}>
            {!selected && at !== null && frigate ? (
              <RecordingVideo
                key={at}
                {...frigate}
                start={at}
                videoRef={videoRef}
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onTime={setPosition}
              />
            ) : !selected ? (
              <CameraFeed entityId={entityId} className='size-full object-contain' />
            ) : selected.has_clip ? (
              <video
                key={selected.id}
                ref={videoRef}
                src={resolve(frigateMedia(selected.id, 'clip.mp4'))}
                autoPlay
                muted
                playsInline
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onTimeUpdate={e => setPosition(e.currentTarget.currentTime)}
                className='size-full object-contain'
              />
            ) : (
              <img src={resolve(frigateMedia(selected.id, 'snapshot.jpg'))} alt='' className='size-full object-contain' />
            )}
          </ZoomPan>
          <span className='pointer-events-none absolute left-4 top-3.5 flex h-7 items-center gap-1.5 rounded-full bg-[rgba(7,9,12,0.66)] px-2.5 text-[13px] font-semibold'>
            {!selected && at !== null ? (
              <>
                <History size={14} aria-hidden='true' />
                {t('layout.phone.cameras.recording')} · {formatTime(new Date((at + position) * 1000), { seconds: true })}
              </>
            ) : selected ? (
              <>
                {createElement(frigateIcon(selected.label), { size: 14, 'aria-hidden': true })}
                {frigateLabel(t, selected.label)} · {formatTime(new Date((selected.start_time + position) * 1000), { seconds: true })}
              </>
            ) : (
              <>
                <span aria-hidden='true' className='size-2 rounded-full bg-[#ff7b93]' />
                {t('layout.phone.cameras.live')}
              </>
            )}
          </span>
          <button
            onClick={full ? exitFull : enterFull}
            aria-label={fullLabel}
            title={fullLabel}
            className='absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-[rgba(7,9,12,0.66)]'
          >
            {full ? <Minimize size={20} aria-hidden='true' /> : <Maximize size={20} aria-hidden='true' />}
          </button>
        </div>
      </div>

      <CameraTimeline
        events={events}
        now={now}
        selected={selected}
        at={at}
        position={position}
        onSelect={select}
        onScrub={frigate ? scrub : undefined}
      />

      <div className='mt-3.5 flex items-center justify-center gap-5'>
        <button
          onClick={() => older && select(older.id)}
          disabled={!older}
          aria-label={t('layout.phone.cameras.previous')}
          title={t('layout.phone.cameras.previous')}
          className='flex size-[52px] items-center justify-center rounded-full bg-[var(--ds-surface-2)] disabled:opacity-40'
        >
          <SkipBack size={20} aria-hidden='true' className='fill-current' />
        </button>
        <button
          onClick={togglePlay}
          disabled={!selected?.has_clip && at === null}
          aria-label={t(paused || (!selected && at === null) ? 'widgets.media_player.play' : 'widgets.media_player.pause')}
          className='flex size-16 items-center justify-center rounded-full bg-[var(--ds-ink)] text-[var(--ds-ground)] disabled:opacity-40'
        >
          {paused ? (
            <Play size={26} aria-hidden='true' className='ml-0.5 fill-current' />
          ) : (
            <Pause size={26} strokeWidth={3} aria-hidden='true' />
          )}
        </button>
        <button
          onClick={() => newer !== undefined && select(newer)}
          disabled={newer === undefined}
          aria-label={t('layout.phone.cameras.next')}
          title={t('layout.phone.cameras.next')}
          className='flex size-[52px] items-center justify-center rounded-full bg-[var(--ds-surface-2)] disabled:opacity-40'
        >
          <SkipForward size={20} aria-hidden='true' className='fill-current' />
        </button>
      </div>

      {events.length > 0 && (
        <section className='mt-6 px-2'>
          <h2 className='mb-2 px-2 text-lg font-bold'>{t('layout.phone.cameras.events')}</h2>
          <ul className='flex flex-col gap-1'>
            {events.map(e => (
              <li key={e.id}>
                <EventRow event={e} now={now} current={e.id === selectedId} onOpen={() => select(e.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Un événement : sa vignette, son étiquette, son jour et son heure. */
export function EventRow({
  event,
  now,
  current = false,
  camera,
  onOpen,
}: {
  event: FrigateEvent;
  now: number;
  current?: boolean;
  /** Le nom de la caméra, quand la liste les mêle. */
  camera?: ReactNode;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const { formatTime, formatDate } = useFormats();
  const resolve = useHaUrl();
  const at = event.start_time * 1000;
  const day = dayOf(at, now);
  const when = `${day ? t(`layout.phone.cameras.${day}`) : formatDate(new Date(at))} · ${formatTime(new Date(at))}`;
  return (
    <button
      onClick={onOpen}
      aria-current={current || undefined}
      className={cn('flex h-16 w-full items-center gap-3 rounded-[16px] pl-2 pr-2.5 text-left', current && 'bg-[rgba(143,184,245,0.14)]')}
    >
      <span className='h-[46px] w-[72px] shrink-0 overflow-hidden rounded-[10px] bg-[var(--ds-surface-3)]'>
        {/* Vignette introuvable (Frigate injoignable, événement purgé) : la case grise, pas l'icône cassée. */}
        <img
          src={resolve(frigateMedia(event.id, 'thumbnail.jpg'))}
          alt=''
          onError={e => (e.currentTarget.style.visibility = 'hidden')}
          className='size-full object-cover'
        />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-base font-semibold' style={current ? { color: HIGHLIGHT } : undefined}>
          {frigateLabel(t, event.label)}
          {camera && <span className='font-normal text-[var(--ds-ink-muted)]'> · {camera}</span>}
        </span>
        <span className='block truncate text-[13px] text-[var(--ds-ink-muted)]'>{when}</span>
      </span>
      <ChevronRight size={20} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />
    </button>
  );
}

/**
 * La frise : un trait par minute, les événements en blocs bleus à leur heure,
 * la tête de lecture, et « Direct » à droite. Elle défile au doigt ; elle se
 * recale sur la tête de lecture quand on change d'événement.
 */
function CameraTimeline({
  events,
  now,
  selected,
  at,
  position,
  onSelect,
  onScrub,
}: {
  events: FrigateEvent[];
  now: number;
  selected: FrigateEvent | undefined;
  /** L'enregistrement lu depuis cet instant (secondes), hors événement. */
  at: number | null;
  position: number;
  onSelect: (id: string | null) => void;
  /** Frise lâchée au doigt : l'instant (secondes) passé sous sa tête de lecture. Absent sans Frigate. */
  onScrub?: (time: number) => void;
}) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeline = buildTimeline(events, now, CAMERA_HOURS);
  const head = selected
    ? timelineX((selected.start_time + position) * 1000, now, CAMERA_HOURS)
    : at !== null
      ? timelineX((at + position) * 1000, now, CAMERA_HOURS)
      : timeline.width;
  // Un défilement qu'un doigt a commencé, et non le recentrage ci-dessous : lui seul déplace la lecture.
  const touched = useRef(false);
  const settle = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(settle.current), []);
  const onScroll = () => {
    if (!touched.current || !onScrub) return;
    clearTimeout(settle.current);
    // La frise est lâchée quand elle ne bouge plus depuis 400 ms (l'élan compris).
    settle.current = window.setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      touched.current = false;
      onScrub(Math.floor(timeAtX(el.scrollLeft + el.clientWidth / 2, now, CAMERA_HOURS) / 1000));
    }, 400);
  };
  const touch = () => {
    touched.current = true;
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    touched.current = false;
    el.scrollTo?.({ left: head - el.clientWidth / 2, behavior: 'smooth' });
    // Seulement au changement d'événement : pendant la lecture, la frise reste où le doigt l'a mise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  return (
    <div className='mx-4 mt-3.5 flex h-[72px] overflow-hidden rounded-[20px] bg-[var(--ds-surface-2)]'>
      <div
        ref={scrollRef}
        role='group'
        aria-label={t('layout.phone.cameras.timeline')}
        className='relative min-w-0 flex-1 overflow-x-auto scrollbar-none'
        onPointerDown={touch}
        onTouchStart={touch}
        onWheel={touch}
        onScroll={onScroll}
      >
        {/* Au milieu, le repère de ce qu'on lira en lâchant la frise. */}
        {onScrub && (
          <span
            aria-hidden='true'
            className='pointer-events-none sticky left-1/2 top-0 z-10 float-left -ml-px h-1.5 w-0.5 rounded-b bg-[var(--ds-ink-muted)]'
          />
        )}
        {/* 40 px d'air à droite : la tête de lecture du direct ne colle pas à « Direct ». */}
        <div className='relative h-full' style={{ width: timeline.width + 40 }}>
          <div
            aria-hidden='true'
            className='absolute inset-x-0 top-6 h-5 bg-[repeating-linear-gradient(90deg,#4a5566_0_2px,transparent_2px_20px)]'
          />
          {timeline.blocks.map(b => {
            const current = b.id === selected?.id;
            return (
              <button
                key={b.id}
                onClick={() => {
                  touched.current = false;
                  onSelect(b.id);
                }}
                aria-label={frigateLabel(t, b.label)}
                aria-pressed={current}
                className={cn(
                  'absolute top-5 flex h-7 items-center justify-center rounded-[8px] bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]',
                  !current && 'opacity-70'
                )}
                style={{ left: b.left, width: b.width }}
              >
                {createElement(frigateIcon(b.label), { size: 14, 'aria-hidden': true })}
              </button>
            );
          })}
          {timeline.marks.map(m => (
            <span
              key={m.at}
              aria-hidden='true'
              className='absolute bottom-[5px] -translate-x-1/2 text-[11px] text-[var(--ds-ink-muted)]'
              style={{ left: m.left }}
            >
              {formatTime(new Date(m.at))}
            </span>
          ))}
          <span aria-hidden='true' className='pointer-events-none absolute inset-y-2 w-0.5 bg-[var(--ds-ink)]' style={{ left: head }} />
        </div>
      </div>
      <button
        onClick={() => onSelect(null)}
        aria-pressed={!selected && at === null}
        className='flex w-[76px] shrink-0 items-center justify-center border-l border-[var(--ds-surface-3)] text-[15px] font-bold'
        style={!selected && at === null ? { color: HIGHLIGHT } : undefined}
      >
        {t('layout.phone.cameras.live')}
      </button>
    </div>
  );
}

/**
 * L'enregistrement continu de Frigate depuis `start` (secondes), une heure au
 * plus : le proxy VOD de l'intégration, en HLS. Une `<video>` ne porte pas
 * d'en-tête d'authentification : Home Assistant signe l'adresse, et Frigate
 * ajoute la signature aux segments de la liste de lecture.
 */
function RecordingVideo({
  instance,
  camera,
  start,
  videoRef,
  onPlay,
  onPause,
  onTime,
}: {
  instance: string;
  camera: string;
  start: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onPlay: () => void;
  onPause: () => void;
  onTime: (seconds: number) => void;
}) {
  const { t } = useI18n();
  const connection = useHass(s => s.connection);
  const resolve = useHaUrl();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !connection) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    const end = Math.min(start + 3600, Math.floor(Date.now() / 1000));
    const path = `/api/frigate/${instance}/vod/${camera}/start/${start}/end/${end}/index.m3u8`;
    connection
      .sendMessagePromise<{ path: string }>({ type: 'auth/sign_path', path, expires: 3600 })
      .then(async ({ path: signed }) => {
        const url = resolve(signed);
        if (cancelled || !url) return;
        // hls.js n'est chargé qu'à la demande, comme pour le direct.
        const { default: Hls } = await import('hls.js');
        if (cancelled) return;
        if (Hls.isSupported()) {
          const instanceHls = new Hls({ maxBufferLength: 20 });
          instanceHls.on(Hls.Events.ERROR, (_event, data) => data.fatal && setFailed(true));
          instanceHls.loadSource(url);
          instanceHls.attachMedia(video);
          hls = instanceHls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
        }
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [connection, instance, camera, start, resolve, videoRef]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={e => onTime(e.currentTarget.currentTime)}
        onError={() => setFailed(true)}
        className='size-full object-contain'
      />
      {failed && (
        <p className='absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/80'>
          {t('layout.phone.cameras.noRecording')}
        </p>
      )}
    </>
  );
}

/**
 * Zoom à deux doigts (jusqu'à ×5) et déplacement à un doigt une fois zoomé ;
 * double appui pour revenir. `touch-none` : le navigateur ne zoome pas la page.
 * `resetKey` : une autre image (direct ↔ clip) repart sans zoom. `rotated` : la
 * vue a tourné d'un quart de tour, un glissé vers la droite la fait descendre.
 */
function ZoomPan({ resetKey, rotated, children }: { resetKey: unknown; rotated: boolean; children: ReactNode }) {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  // L'image ne quitte jamais le cadre : au plus, son bord touche celui du cadre. Tailles locales
  // (`offset*`), comme le déplacement : vraies aussi dans la vue tournée.
  type View = typeof view;
  const bound = (v: View): View => {
    const el = boxRef.current;
    if (!el) return v;
    const mx = ((v.scale - 1) * el.offsetWidth) / (2 * v.scale);
    const my = ((v.scale - 1) * el.offsetHeight) / (2 * v.scale);
    return { ...v, x: clamp(v.x, -mx, mx), y: clamp(v.y, -my, my) };
  };
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setView({ scale: 1, x: 0, y: 0 });
  }

  const onDown = (e: React.PointerEvent) => {
    // Garder le doigt même s'il sort de l'image ; un pointeur déjà levé fait lever l'appel.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* rien à capturer */
    }
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
      setView(v => bound({ ...v, scale }));
    } else if (pointers.current.size === 1 && view.scale > 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      const [lx, ly] = rotated ? [dy, -dx] : [dx, dy];
      setView(v => bound({ ...v, x: v.x + lx / v.scale, y: v.y + ly / v.scale }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) start.current = null;
  };

  return (
    <div
      ref={boxRef}
      className='size-full touch-none'
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className='size-full' style={{ transform: `scale(${view.scale}) translate(${view.x}px, ${view.y}px)` }}>
        {children}
      </div>
    </div>
  );
}
