import { useState } from 'react';
import { SquareDashed, Trash2 } from 'lucide-react';
import type { FloorplanRoom } from '@/lib/floorplan';
import { useI18n } from '@/i18n';

/** Pièce tout juste fermée : on la nomme, et elle est enregistrée. */
export function RoomNamePopover({
  at,
  defaultName,
  onAdd,
  onCancel,
}: {
  /** Où ouvrir la fenêtre — le centre de la pièce, en % du plan. */
  at: { x: number; y: number };
  defaultName: string;
  onAdd: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(defaultName);
  return (
    <form
      role='dialog'
      aria-label={t('layout.floorplan.roomName')}
      onClick={e => e.stopPropagation()}
      onSubmit={e => {
        e.preventDefault();
        onAdd(name.trim() || defaultName);
      }}
      className='absolute z-40 w-56 p-2 rounded-xl gc-overlay cursor-default flex flex-col gap-2'
      style={{
        left: `clamp(7rem, ${at.x}%, calc(100% - 7rem))`,
        top: `clamp(0.5rem, ${at.y}%, calc(100% - 7rem))`,
        translate: '-50% 0',
      }}
    >
      <label htmlFor='floorplan-room-name' className='text-[11px] text-white/50 px-1'>
        {t('layout.floorplan.roomName')}
      </label>
      <input
        id='floorplan-room-name'
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onFocus={e => e.currentTarget.select()}
        className='w-full px-3 py-1.5 rounded-lg text-sm bg-white/8 border border-white/15 text-white focus:outline-none focus:border-blue-500/60'
      />
      <div className='flex justify-end gap-2'>
        <button type='button' onClick={onCancel} className='px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white'>
          {t('common.cancel')}
        </button>
        <button type='submit' className='px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/80 text-white hover:bg-blue-500'>
          {t('common.add')}
        </button>
      </div>
    </form>
  );
}

/** Pièces dessinées sur la maquette, pour les retirer. */
export function RoomList({ rooms, onRemove }: { rooms: FloorplanRoom[]; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  if (!rooms.length) return null;
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-[11px] text-white/40 px-0.5'>{t('layout.floorplan.rooms')}</span>
      {rooms.map(room => (
        <div key={room.id} className='flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70'>
          <SquareDashed size={13} className='text-white/40 shrink-0' />
          <span className='flex-1 truncate'>{room.name}</span>
          <button
            onClick={() => onRemove(room.id)}
            title={t('layout.floorplan.roomRemove')}
            aria-label={t('layout.floorplan.roomRemove')}
            className='text-red-400/70 hover:text-red-400'
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
