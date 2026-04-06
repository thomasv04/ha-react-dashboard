import { useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Camera } from 'lucide-react';
import { useCamera } from '@hakit/core';
import type { FilterByDomain, EntityName } from '@hakit/core';
import { cn } from '@/lib/utils';

export type StreamProtocol = 'HLS' | 'MJPEG' | null;

interface CameraFeedProps {
  entityId: string;
  className?: string;
  onProtocol?: (protocol: StreamProtocol) => void;
}

/**
 * Displays a HA camera entity as a live stream.
 * HLS (via hls.js) when stream.url is available, MJPEG fallback.
 * Calls onProtocol once the active protocol is determined.
 */
export function CameraFeed({ entityId, className, onProtocol }: CameraFeedProps) {
  const cam = useCamera(entityId as FilterByDomain<EntityName, 'camera'>, { poster: false });
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamUrl = cam.stream.url;
  const mjpegUrl = cam.mjpeg.url;
  const shouldMJPEG = cam.mjpeg.shouldRenderMJPEG;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || shouldMJPEG) return;

    onProtocol?.('HLS');

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: false,
        backBufferLength: 0,
        maxBufferLength: 8,
        maxMaxBufferLength: 15,
        // Strip LL-HLS blocking params (_HLS_msn / _HLS_part) advertised by
        // go2rtc via CAN-BLOCK-RELOAD=YES → server returns 400 when parts aren't ready.
        // hls.js uses XHR: re-open with cleaned URL when params are present.
        xhrSetup: (xhr, url) => {
          try {
            const u = new URL(url, window.location.href);
            if (u.searchParams.has('_HLS_msn') || u.searchParams.has('_HLS_part')) {
              u.searchParams.delete('_HLS_msn');
              u.searchParams.delete('_HLS_part');
              xhr.open('GET', u.toString(), true);
            }
          } catch { /* ignore */ }
        },
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = streamUrl;
    }
  }, [streamUrl, shouldMJPEG, onProtocol]);

  if (!streamUrl && !mjpegUrl) {
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  if (shouldMJPEG && mjpegUrl) {
    onProtocol?.('MJPEG');
    return <img src={mjpegUrl} className={cn('object-cover', className)} alt='' />;
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className={cn('object-cover', className)}
    />
  );
}
