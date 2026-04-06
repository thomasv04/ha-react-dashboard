import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import type { Connection } from 'home-assistant-js-websocket';
import { cn } from '@/lib/utils';

interface WebRTCOfferResult {
  answer: string;
}

async function negotiate(
  connection: Connection,
  entityId: string,
  pc: RTCPeerConnection,
): Promise<void> {
  // Only receive, never send
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering (max 3s)
  await new Promise<void>((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return; }
    const timeout = setTimeout(resolve, 3000);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve();
      }
    };
  });

  const result = await connection.sendMessagePromise<WebRTCOfferResult>({
    type: 'camera/webrtc_offer',
    entity_id: entityId,
    offer: pc.localDescription!.sdp,
  });

  await pc.setRemoteDescription({ type: 'answer', sdp: result.answer });
}

export function WebRTCFeed({ entityId, className }: { entityId: string; className?: string }) {
  const connection = useHass(s => s.connection);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!connection) return;
    const video = videoRef.current;
    if (!video) return;

    const pc = new RTCPeerConnection();

    pc.ontrack = (event) => {
      if (video.srcObject !== event.streams[0]) {
        video.srcObject = event.streams[0];
      }
    };

    negotiate(connection, entityId, pc).catch(() => {
      // Negotiation failed — caller (CameraFeed) will fall back to HLS
    });

    return () => {
      pc.close();
      video.srcObject = null;
    };
  }, [entityId, connection]);

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
