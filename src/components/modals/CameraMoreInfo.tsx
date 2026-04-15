import { useState, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import type { CameraCardConfig } from '@/types/widget-types';

type CameraMode = 'stream' | 'snapshot';

export default function CameraMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<CameraCardConfig>(widgetId);
  const { connection } = useHass();
  const [mode, setMode] = useState<CameraMode>('stream');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get the first camera entity if the config uses a cameras array
  const cameraEntityId = entityId || config?.cameras?.[0]?.entityId || '';
  const cameraEntity = useSafeEntity(cameraEntityId);

  const accessToken = cameraEntity?.attributes.access_token as string | undefined;
  const name = (cameraEntity?.attributes.friendly_name as string) ?? cameraEntityId;

  // Build URL based on HA connection
  const baseUrl = connection
    ? (connection as unknown as { options?: { auth?: { data?: { hassUrl?: string } } } })?.options?.auth?.data?.hassUrl || ''
    : '';

  const streamUrl = accessToken ? `${baseUrl}/api/camera_proxy_stream/${cameraEntityId}?token=${encodeURIComponent(accessToken)}` : '';
  const snapshotUrl = accessToken
    ? `${baseUrl}/api/camera_proxy/${cameraEntityId}?token=${encodeURIComponent(accessToken)}&_=${refreshKey}`
    : '';

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <div className='p-8 md:p-12'>
      <MoreInfoHeader
        icon={Camera}
        name={name}
        state={cameraEntity?.state ?? 'unknown'}
        stateColor={cameraEntity?.state === 'idle' ? '#10b981' : '#60a5fa'}
      />

      {/* Mode toggle + refresh */}
      <div className='flex items-center gap-3 mt-4 mb-6'>
        <div className='flex gap-1 bg-white/5 rounded-xl p-1'>
          {(['stream', 'snapshot'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                mode === m ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {m === 'stream' ? 'STREAM' : 'SNAPSHOT'}
            </button>
          ))}
        </div>
        {mode === 'snapshot' && (
          <button
            onClick={handleRefresh}
            className='p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors'
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Video / Image */}
      <div className='relative w-full rounded-2xl overflow-hidden bg-black/50 aspect-video'>
        {accessToken ? (
          <img
            key={mode === 'snapshot' ? `snap-${refreshKey}` : 'stream'}
            src={mode === 'stream' ? streamUrl : snapshotUrl}
            alt={name}
            className='w-full h-full object-contain'
          />
        ) : (
          <div className='flex items-center justify-center h-full text-white/30 text-sm'>Caméra non disponible</div>
        )}
      </div>
    </div>
  );
}
