import { useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Camera } from 'lucide-react';
import { useCamera } from '@hakit/core';
import type { FilterByDomain, EntityName } from '@hakit/core';
import { cn } from '@/lib/utils';

/**
 * Displays a HA camera entity as a live stream.
 * Uses HLS via hls.js for 30fps when the camera supports streaming (Frigate etc.),
 * falls back to MJPEG for cameras that don't expose an HLS stream.
 */
export function CameraFeed({ entityId, className }: { entityId: string; className?: string }) {
  const cam = useCamera(entityId as FilterByDomain<EntityName, 'camera'>);
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamUrl = cam.stream.url;
  const mjpegUrl = cam.mjpeg.url;
  const shouldMJPEG = cam.mjpeg.shouldRenderMJPEG;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || shouldMJPEG) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = streamUrl;
    }
  }, [streamUrl, shouldMJPEG]);

  if (!streamUrl && !mjpegUrl) {
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  if (shouldMJPEG && mjpegUrl) {
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
