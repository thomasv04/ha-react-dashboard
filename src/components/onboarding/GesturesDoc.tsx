import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from 'lucide-react';
import { useI18n } from '@/i18n';

const GESTURES = [
  { id: 'photos', Icon: ArrowLeft, Second: ArrowRight },
  { id: 'quick', Icon: ArrowUp, Second: null },
  { id: 'notifications', Icon: ArrowDown, Second: null },
  { id: 'exit', Icon: Hand, Second: null },
] as const;

/**
 * Les gestes de l'écran de veille.
 *
 * Une visite guidée ne peut rien montrer ici : ces gestes n'existent que dans
 * l'overlay plein écran, et il n'y a aucun élément d'interface à éclairer. Il
 * reste à les écrire — sans quoi personne ne devine qu'un écran de veille se
 * balaie.
 */
export function GesturesDoc() {
  const { t } = useI18n();

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-white/45 text-xs leading-relaxed'>{t('help.gestures.intro')}</p>

      <ul className='flex flex-col gap-2'>
        {GESTURES.map(({ id, Icon, Second }) => (
          <li key={id} className='flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2.5'>
            <div className='flex items-center gap-0.5 p-1.5 rounded-lg bg-teal-500/15 text-teal-300 flex-shrink-0'>
              <Icon size={13} />
              {Second && <Second size={13} />}
            </div>
            <div className='min-w-0'>
              <p className='text-white/80 text-xs font-semibold'>{t(`help.gestures.${id}.title`)}</p>
              <p className='text-white/40 text-[11px] mt-0.5 leading-relaxed'>{t(`help.gestures.${id}.body`)}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className='text-white/30 text-[11px] leading-relaxed'>{t('help.gestures.config')}</p>
    </div>
  );
}
