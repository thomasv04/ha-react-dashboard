import { Camera } from 'lucide-react';
import { useHass } from '@hakit/core';
import { cn } from '@/lib/utils';

// Read HA URL at render time so tests that modify `import.meta.env` pick it up
// (some test runners mutate env between module loads).
// Note: keep empty string as fallback so template paths begin with '/'.


/**
 * Displays a HA camera entity as a live MJPEG stream.
 * Extracts the camera token from entity_picture and uses the
 * /api/camera_proxy_stream/ endpoint for smooth continuous video.
 */
export function CameraFeed({ entityId, className }: { entityId: string; className?: string }) {
  const entityPicture = useHass(s => s.entities?.[entityId]?.attributes?.entity_picture as string | undefined);
  const HA_URL = (import.meta.env.VITE_HA_URL as string | undefined) ?? '';

  if (import.meta.env.TEST) {
    // Helpful during local test debugging
    // eslint-disable-next-line no-console
    console.debug('[CameraFeed] entityId=', entityId, 'entityPicture=', entityPicture, 'HA_URL=', HA_URL);
  }

  if (!entityPicture) {
    return (
      <div className={cn('flex items-center justify-center text-white/20', className)}>
        <Camera size={28} />
      </div>
    );
  }

  // entity_picture looks like /api/camera_proxy/camera.xxx?token=YYY
  // we swap proxy → proxy_stream for a continuous MJPEG feed (no polling needed)
  const params = new URLSearchParams(entityPicture.split('?')[1] ?? '');
  const token = params.get('token');
  const src = token ? `${HA_URL}/api/camera_proxy_stream/${entityId}?token=${token}` : `${HA_URL}${entityPicture}`;

  return <img src={src} className={cn('object-cover', className)} alt='' />;
}
