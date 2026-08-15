import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useStreamActive } from '@/hooks/useStreamActive';
import { Camera, Loader2 } from 'lucide-react';
import { useCamera, useHass } from '@hakit/core';
import type { FilterByDomain, EntityName } from '@hakit/core';
import { cn } from '@/lib/utils';
import { useEntityPicture } from '@/hooks/useEntityPicture';
import type { CameraStreamMode } from '@/types/widget-types';

export type StreamProtocol = 'HLS' | 'MJPEG' | null;

interface CameraFeedProps {
  entityId: string;
  className?: string;
  streamMode?: CameraStreamMode;
  /**
   * Entité caméra dont l'image fixe est affichée pendant le chargement du flux,
   * au lieu du rectangle noir — typiquement l'entité « instantané » d'une
   * caméra, plus rapide à charger que son direct. Le voile de chargement reste
   * posé par-dessus.
   */
  posterEntity?: string;
  onProtocol?: (protocol: StreamProtocol) => void;
}

/**
 * MJPEG feed — uses a single `<img>` pointing to HA's camera_proxy_stream.
 * The browser handles the multipart/x-mixed-replace natively: one persistent
 * HTTP connection, continuous JPEG frames, zero JS overhead.
 */
const MjpegFeed = memo(function MjpegFeed({ entityId, className, posterEntity, onProtocol }: CameraFeedProps) {
  // `poster: true` : une image fixe sert de dernière vue quand le flux est en
  // pause, plutôt qu'un rectangle noir.
  const cam = useCamera(entityId as FilterByDomain<EntityName, 'camera'>, { poster: true });
  const [failed, setFailed] = useState(false);
  const holderRef = useRef<HTMLDivElement>(null);
  // Un MJPEG est un téléchargement HTTP continu : le laisser tourner hors champ
  // ou écran éteint coûte des centaines de Mo par heure pour rien.
  const active = useStreamActive(holderRef);

  const mjpegUrl = cam.mjpeg.url;
  // `?.` : `poster` n'est peuplé que si l'option est active côté `useCamera`.
  // L'image fixe est un confort, son absence ne doit pas casser le flux.
  // L'entité choisie en config prime sur le poster de la caméra elle-même.
  const configPoster = useEntityPicture(posterEntity);
  const posterUrl = configPoster ?? cam.poster?.url;

  // Build the stream URL from the mjpeg proxy URL
  // cam.mjpeg.url is typically /api/camera_proxy_stream/{entity_id}?token=...
  const streamUrl = useMemo(() => mjpegUrl || '', [mjpegUrl]);

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  useEffect(() => {
    if (streamUrl) {
      onProtocol?.('MJPEG');
      setFailed(false);
    }
  }, [streamUrl, onProtocol]);

  if (!streamUrl || failed) {
    return posterUrl ? (
      <div className={cn('relative', className)}>
        <img src={posterUrl} alt='' className='absolute inset-0 w-full h-full object-cover' referrerPolicy='no-referrer' />
      </div>
    ) : (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  // Le conteneur reste monté pour que l'IntersectionObserver ait une cible ;
  // seul le <img> du flux est démonté, ce qui ferme bien la connexion.
  //
  // L'image fixe reste dessous en permanence : un MJPEG n'affiche rien tant que
  // la première trame n'est pas arrivée, et le flux la recouvre dès qu'elle
  // l'est. Les deux couches sont positionnées, sinon l'absolue passerait devant.
  return (
    <div ref={holderRef} className={cn('relative', className)}>
      {posterUrl ? (
        <img src={posterUrl} alt='' className='absolute inset-0 w-full h-full object-cover' referrerPolicy='no-referrer' />
      ) : (
        !active && (
          <div className='absolute inset-0 flex items-center justify-center text-white/20'>
            <Camera size={28} />
          </div>
        )
      )}
      {active && (
        <img
          src={streamUrl}
          alt=''
          className='absolute inset-0 w-full h-full object-cover'
          referrerPolicy='no-referrer'
          onError={handleError}
        />
      )}
    </div>
  );
});

/** Ce dont on a besoin de hls.js, sans le charger pour le typage. */
interface HlsInstance {
  destroy: () => void;
  startLoad: () => void;
}

/** Un flux figé au-delà de ce délai est relancé. */
const STALL_TIMEOUT_MS = 8_000;

/**
 * HLS feed — uses hls.js to play an HLS stream in a `<video>` element.
 * Better compression (H.264) but higher latency (~2-5s buffer).
 */
const HlsFeed = memo(function HlsFeed({ entityId, className, posterEntity, onProtocol }: CameraFeedProps) {
  const cam = useCamera(entityId as FilterByDomain<EntityName, 'camera'>, { poster: false });
  const videoRef = useRef<HTMLVideoElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const [hlsFailed, setHlsFailed] = useState(false);
  // Tant que la première image n'est pas décodée, la `<video>` est un
  // rectangle noir : indiscernable d'une caméra en panne.
  const [ready, setReady] = useState(false);
  // Même garde-fou que le MJPEG : HLS télécharge des segments en continu.
  //
  // L'observation porte sur le conteneur, jamais sur la `<video>` : au premier
  // rendu l'URL du flux n'est pas encore résolue, la `<video>` n'existe donc
  // pas. L'`IntersectionObserver` se posait alors sur `null` et n'était plus
  // jamais recréé — `active` restait faux, hls.js ne s'attachait pas, et la
  // caméra restait grise indéfiniment.
  const active = useStreamActive(holderRef);

  const streamUrl = cam.stream.url;
  const mjpegUrl = cam.mjpeg.url;
  const posterUrl = useEntityPicture(posterEntity);

  // Le badge doit refléter ce qui est affiché, pas ce qui est en train de se
  // charger. Le signaler depuis le corps du rendu déclenchait un `setState` du
  // parent pendant le rendu, et laissait « MJPEG » affiché une fois le flux HLS
  // arrivé — le seul moment où le protocole était corrigé était l'attachement
  // de hls.js, qui n'a pas lieu quand la card est hors champ.
  useEffect(() => {
    if (hlsFailed || !streamUrl) {
      if (mjpegUrl) onProtocol?.('MJPEG');
    } else {
      onProtocol?.('HLS');
    }
  }, [hlsFailed, streamUrl, mjpegUrl, onProtocol]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || !active) return;

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;

    // hls.js pèse ~330 kB et n'est utile qu'aux caméras en mode HLS : chargé à
    // la demande plutôt que dans le bundle initial de la tablette.
    void import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) {
        const instance = new Hls({
          lowLatencyMode: false,
          backBufferLength: 0,
          maxBufferLength: 8,
          maxMaxBufferLength: 15,
          // Par défaut hls.js se tient à trois segments du direct. Home
          // Assistant annonce `TARGETDURATION: 6` : ça faisait près de 20 s de
          // retard sur une sonnette, mesuré sur une vraie installation. Et
          // quand le lecteur décrochait davantage, il sautait d'un coup au
          // direct — c'est ce qu'on voyait comme un « gel » suivi d'un bond.
          //
          // Un seul segment de marge suffit à absorber une hoquet réseau.
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 4,
          xhrSetup: (xhr, url) => {
            try {
              const u = new URL(url, window.location.href);
              if (u.searchParams.has('_HLS_msn') || u.searchParams.has('_HLS_part')) {
                u.searchParams.delete('_HLS_msn');
                u.searchParams.delete('_HLS_part');
                xhr.open('GET', u.toString(), true);
              }
            } catch {
              /* ignore */
            }
          },
        });
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setHlsFailed(true);
        });
        instance.loadSource(streamUrl);
        instance.attachMedia(video);
        hls = instance;
        hlsRef.current = instance;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
      }
    });

    return () => {
      cancelled = true;
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [streamUrl, onProtocol, active]);

  // Une nouvelle URL de flux repart d'une image noire : le voile de chargement
  // doit revenir, sinon on afficherait le dernier cadre de l'ancienne caméra.
  useEffect(() => setReady(false), [streamUrl]);

  /**
   * Chien de garde : un flux HLS peut se figer sans lever d'erreur — segment
   * manquant, caméra qui hoquette, réseau qui tousse. hls.js n'en sort pas
   * toujours seul, et l'image restait alors gelée indéfiniment.
   *
   * ponytail: relance simplement le chargement. Si la caméra elle-même est
   * tombée, ça retentera toutes les 8 s sans jamais abandonner — suffisant pour
   * un mur d'images, à revoir si on veut afficher « caméra injoignable ».
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active || !ready) return;

    let last = -1;
    const timer = setInterval(() => {
      if (video.paused || video.seeking) return;
      if (video.currentTime === last) {
        hlsRef.current?.startLoad();
      }
      last = video.currentTime;
    }, STALL_TIMEOUT_MS);

    return () => clearInterval(timer);
  }, [active, ready, streamUrl]);

  // Repli MJPEG tant que l'URL du flux n'est pas résolue, ou si HLS a échoué.
  const fallback = hlsFailed || !streamUrl;

  // Le conteneur reste monté quoi qu'il arrive : c'est la cible de
  // l'`IntersectionObserver`, et la `<video>` garde son élément d'un rendu à
  // l'autre au lieu d'être détruite puis recréée quand le flux arrive.
  return (
    <div ref={holderRef} className={cn('relative', className)}>
      {/* Image d'attente : couche la plus basse, visible tant que la vidéo n'a
          pas décodé sa première trame (ou en repli sans MJPEG). */}
      {posterUrl && !ready && (
        <img src={posterUrl} className='absolute inset-0 w-full h-full object-cover' alt='' referrerPolicy='no-referrer' />
      )}

      {fallback &&
        (mjpegUrl ? (
          <img src={mjpegUrl} className='absolute inset-0 w-full h-full object-cover' alt='' referrerPolicy='no-referrer' />
        ) : (
          !posterUrl && (
            <div className='absolute inset-0 flex items-center justify-center text-white/20'>
              <Camera size={28} />
            </div>
          )
        ))}

      {/* Voile de chargement : le temps que la première image soit décodée, la
          `<video>` est noire — on ne distingue pas « ça arrive » de « en
          panne ». Pas de voile quand le repli MJPEG montre déjà une image. */}
      {!fallback && !ready && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center text-white/40',
            // Sur une image d'attente, un voile plus léger : elle doit rester
            // lisible, le spinner suffit à dire que le direct arrive.
            posterUrl ? 'bg-black/20' : 'bg-black/40'
          )}
        >
          <Loader2 size={24} className='animate-spin' />
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onLoadedData={() => setReady(true)}
        className={cn('w-full h-full object-cover', fallback && 'opacity-0')}
      />
    </div>
  );
});

/**
 * Displays a HA camera entity as a live stream.
 *
 * `streamMode` controls the streaming strategy:
 * - `'auto'` (default) — HLS dès que la caméra expose un vrai flux, MJPEG sinon.
 * - `'mjpeg'` — Single `<img>` tag using HA's MJPEG proxy stream.
 *   One persistent HTTP connection, zero JS overhead — mais pour une caméra
 *   RTSP, HA fabrique ce flux en repollant `camera_image()`, ce qui plafonne
 *   souvent à ~0,3 image/s. À réserver aux caméras nativement MJPEG.
 * - `'hls'` — hls.js-based `<video>` with HLS stream. Better compression
 *   (H.264) but ~2-5s latency due to buffering. Falls back to MJPEG on error.
 *
 * Calls `onProtocol` once the active protocol is determined.
 */
export function CameraFeed({ entityId, className, streamMode = 'auto', posterEntity, onProtocol }: CameraFeedProps) {
  // Booléen dérivé : un flux caméra remonté à chaque update d'entité
  // relançait la connexion MJPEG/HLS pour rien.
  const exists = useHass(s => !!s.entities?.[entityId]);
  // `CAMERA_SUPPORT_STREAM` (bit 2) : la caméra a un vrai flux vidéo côté HA.
  const supportsStream = useHass(
    s => !!(((s.entities?.[entityId]?.attributes as { supported_features?: number })?.supported_features ?? 0) & 2)
  );

  if (!exists) {
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  if (streamMode === 'hls' || (streamMode === 'auto' && supportsStream)) {
    return <HlsFeed entityId={entityId} className={className} posterEntity={posterEntity} onProtocol={onProtocol} />;
  }

  return <MjpegFeed entityId={entityId} className={className} posterEntity={posterEntity} onProtocol={onProtocol} />;
}
