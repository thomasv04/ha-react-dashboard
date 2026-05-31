import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import Hls from 'hls.js';
import { Camera } from 'lucide-react';
import { useCamera, useHass } from '@hakit/core';
import type { FilterByDomain, EntityName } from '@hakit/core';
import { cn } from '@/lib/utils';
import type { CameraStreamMode } from '@/types/widget-types';

export type StreamProtocol = 'HLS' | 'MJPEG' | null;

interface CameraFeedProps {
  entityId: string;
  className?: string;
  streamMode?: CameraStreamMode;
  onProtocol?: (protocol: StreamProtocol) => void;
}

/**
 * MJPEG feed — uses a single `<img>` pointing to HA's camera_proxy_stream.
 * The browser handles the multipart/x-mixed-replace natively: one persistent
 * HTTP connection, continuous JPEG frames, zero JS overhead.
 */
const MjpegFeed = memo(function MjpegFeed({ entityId, className, onProtocol }: CameraFeedProps) {
  const cam = useCamera(entityId as FilterByDomain<EntityName, 'camera'>, { poster: false });
  const [failed, setFailed] = useState(false);

  const mjpegUrl = cam.mjpeg.url;

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
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  return <img src={streamUrl} alt='' className={cn('object-cover', className)} referrerPolicy='no-referrer' onError={handleError} />;
});

/**
 * HLS feed — uses hls.js to play an HLS stream in a `<video>` element.
 * Better compression (H.264) but higher latency (~2-5s buffer).
 */
const HlsFeed = memo(function HlsFeed({ entityId, className, onProtocol }: CameraFeedProps) {
  const cam = useCamera(entityId as FilterByDomain<EntityName, 'camera'>, { poster: false });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsFailed, setHlsFailed] = useState(false);

  const streamUrl = cam.stream.url;
  const mjpegUrl = cam.mjpeg.url;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    onProtocol?.('HLS');

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: false,
        backBufferLength: 0,
        maxBufferLength: 8,
        maxMaxBufferLength: 15,
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
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setHlsFailed(true);
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    }
  }, [streamUrl, onProtocol]);

  if (!streamUrl && !mjpegUrl) {
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  // Fallback to MJPEG if HLS failed or stream URL not available
  if (hlsFailed || !streamUrl) {
    if (mjpegUrl) {
      onProtocol?.('MJPEG');
      return <img src={mjpegUrl} className={cn('object-cover', className)} alt='' referrerPolicy='no-referrer' />;
    }
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  return <video ref={videoRef} autoPlay muted playsInline className={cn('object-cover', className)} />;
});

/**
 * Displays a HA camera entity as a live stream.
 *
 * `streamMode` controls the streaming strategy:
 * - `'mjpeg'` (default) — Single `<img>` tag using HA's MJPEG proxy stream.
 *   One persistent HTTP connection, ~100-300ms latency, zero JS overhead.
 * - `'hls'` — hls.js-based `<video>` with HLS stream. Better compression
 *   (H.264) but ~2-5s latency due to buffering. Falls back to MJPEG on error.
 *
 * Calls `onProtocol` once the active protocol is determined.
 */
export function CameraFeed({ entityId, className, streamMode = 'mjpeg', onProtocol }: CameraFeedProps) {
  const entities = useHass(s => s.entities);
  const exists = !!entities?.[entityId];

  if (!exists) {
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  if (streamMode === 'hls') {
    return <HlsFeed entityId={entityId} className={className} onProtocol={onProtocol} />;
  }

  return <MjpegFeed entityId={entityId} className={className} onProtocol={onProtocol} />;
}
