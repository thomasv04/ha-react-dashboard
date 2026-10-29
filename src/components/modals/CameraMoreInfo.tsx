import { useState, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import type { CameraCardConfig } from '@/types/widget-types';
import { friendlyName } from '@/lib/ha-service';
import { useI18n } from '@/i18n';

type CameraMode = 'stream' | 'snapshot';

export default function CameraMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<CameraCardConfig>(widgetId);
  const connection = useHass(s => s.connection);
  const [mode, setMode] = useState<CameraMode>('stream');
  const [refreshKey, setRefreshKey] = useState(0);

  // La card caméra n'a pas d'`entityId` : sa liste vit dans `cameras`. Et si un
  // `entityId` arrive quand même, il doit être une caméra — pas l'input_select
  // de sélection.
  const cameraEntityId = (entityId.startsWith('camera.') ? entityId : config?.cameras?.[0]?.entityId) || '';
  const cameraEntity = useSafeEntity(cameraEntityId);

  const accessToken = cameraEntity?.attributes.access_token as string | undefined;
  const name = friendlyName(cameraEntity) ?? cameraEntityId;

  // Build URL based on HA connection
  const baseUrl = connection
    ? (connection as unknown as { options?: { auth?: { data?: { hassUrl?: string } } } })?.options?.auth?.data?.hassUrl || ''
    : '';

  const snapshotUrl = accessToken
    ? `${baseUrl}/api/camera_proxy/${cameraEntityId}?token=${encodeURIComponent(accessToken)}&_=${refreshKey}`
    : '';

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <div className='p-6'>
      <MoreInfoHeader
        icon={Camera}
        name={name}
        state={cameraEntity?.state ?? 'unknown'}
        stateColor={cameraEntity?.state === 'idle' ? 'var(--ds-good)' : 'var(--ds-accent)'}
      />

      {/* Mode toggle + refresh */}
      <div className='flex items-center gap-3 mt-4 mb-6'>
        <div className='flex gap-1 bg-[var(--ds-sheet-section)] rounded-[var(--ds-radius-md)] p-1'>
          {(['stream', 'snapshot'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`h-10 rounded-[var(--ds-radius-sm)] px-4 text-sm font-semibold transition-colors ${
                mode === m ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'text-[var(--ds-ink-muted)]'
              }`}
            >
              {m === 'stream' ? t('common.moreInfo.stream') : t('common.moreInfo.snapshot')}
            </button>
          ))}
        </div>
        {mode === 'snapshot' && (
          <button
            onClick={handleRefresh}
            aria-label={t('common.moreInfo.refresh')}
            title={t('common.moreInfo.refresh')}
            className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-sheet-section)]'
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Video / Image */}
      <div className='relative w-full rounded-[var(--ds-radius-lg)] overflow-hidden bg-black aspect-video'>
        {mode === 'stream' ? (
          // Même moteur que la card : une caméra RTSP passe en HLS, sinon MJPEG.
          <CameraFeed
            entityId={cameraEntityId}
            className='w-full h-full'
            streamMode={config?.streamMode}
            posterEntity={config?.cameras?.find(c => c.entityId === cameraEntityId)?.posterEntity}
          />
        ) : accessToken ? (
          <img key={`snap-${refreshKey}`} src={snapshotUrl} alt={name} className='w-full h-full object-contain' />
        ) : (
          <div className='flex items-center justify-center h-full text-[var(--ds-ink-muted)] text-sm'>
            {t('common.moreInfo.cameraUnavailable')}
          </div>
        )}
      </div>
    </div>
  );
}
