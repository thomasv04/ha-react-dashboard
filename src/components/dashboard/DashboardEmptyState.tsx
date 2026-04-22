import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useUser } from '@hakit/core';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { useI18n } from '@/i18n';

function EmptyIllustration() {
  return (
    <svg viewBox='0 0 280 200' fill='none' xmlns='http://www.w3.org/2000/svg' width='280' height='200'>
      {/* Main back card */}
      <rect x='65' y='38' width='150' height='108' rx='16' fill='#1e1b4b' stroke='rgba(139,92,246,0.25)' strokeWidth='1.5' />
      <rect x='78' y='52' width='62' height='8' rx='4' fill='rgba(139,92,246,0.45)' />
      <rect x='78' y='70' width='124' height='5' rx='2.5' fill='rgba(255,255,255,0.1)' />
      <rect x='78' y='82' width='100' height='5' rx='2.5' fill='rgba(255,255,255,0.07)' />
      <rect x='78' y='94' width='115' height='5' rx='2.5' fill='rgba(255,255,255,0.07)' />
      <rect x='78' y='106' width='85' height='5' rx='2.5' fill='rgba(255,255,255,0.05)' />

      {/* Left card */}
      <rect x='15' y='72' width='70' height='62' rx='14' fill='#3730a3' stroke='rgba(139,92,246,0.4)' strokeWidth='1.5' />
      <rect x='24' y='82' width='40' height='6' rx='3' fill='rgba(167,139,250,0.45)' />
      <circle cx='50' cy='110' r='14' fill='rgba(109,40,217,0.45)' />
      {/* Arrow icon */}
      <polyline points='44,110 50,104 56,110' fill='none' stroke='rgba(255,255,255,0.7)' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' />
      <line x1='50' y1='104' x2='50' y2='116' stroke='rgba(255,255,255,0.7)' strokeWidth='2.2' strokeLinecap='round' />

      {/* Right card with orange header */}
      <rect x='193' y='28' width='70' height='62' rx='14' fill='#1a1740' stroke='rgba(139,92,246,0.3)' strokeWidth='1.5' />
      <rect x='193' y='28' width='70' height='26' rx='14' fill='#f97316' />
      <rect x='193' y='42' width='70' height='12' rx='0' fill='#ea7a1a' />
      <circle cx='211' cy='68' r='4' fill='rgba(255,255,255,0.22)' />
      <circle cx='228' cy='68' r='4' fill='rgba(255,255,255,0.22)' />
      <circle cx='245' cy='68' r='4' fill='rgba(255,255,255,0.22)' />

      {/* Plus circle */}
      <circle cx='140' cy='122' r='25' fill='url(#plusGrad)' />
      {/* Glow ring */}
      <circle cx='140' cy='122' r='25' fill='none' stroke='rgba(139,92,246,0.5)' strokeWidth='6' opacity='0.4' />
      <line x1='140' y1='112' x2='140' y2='132' stroke='white' strokeWidth='2.8' strokeLinecap='round' />
      <line x1='130' y1='122' x2='150' y2='122' stroke='white' strokeWidth='2.8' strokeLinecap='round' />

      {/* Bell badge */}
      <circle cx='207' cy='148' r='15' fill='rgba(79,70,229,0.22)' stroke='rgba(139,92,246,0.3)' strokeWidth='1' />
      <path d='M207 141 C203.8 141 202 143 202 145.5 L201 150 L213 150 L212 145.5 C212 143 210.2 141 207 141Z' fill='rgba(196,181,253,0.65)' />
      <path d='M204.5 150 C204.5 151.8 209.5 151.8 209.5 150' fill='none' stroke='rgba(196,181,253,0.65)' strokeWidth='1.3' />
      <circle cx='213' cy='139' r='4.5' fill='#f97316' />

      {/* Decorative dots */}
      <circle cx='56' cy='45' r='5.5' fill='#8b5cf6' opacity='0.72' />
      <circle cx='220' cy='108' r='3.5' fill='#a78bfa' opacity='0.6' />
      <circle cx='178' cy='168' r='5' fill='#7c3aed' opacity='0.5' />
      <circle cx='96' cy='170' r='3.5' fill='#818cf8' opacity='0.45' />
      <circle cx='36' cy='152' r='4' fill='#6d28d9' opacity='0.4' />
      <circle cx='255' cy='75' r='3' fill='#a78bfa' opacity='0.5' />

      <defs>
        <linearGradient id='plusGrad' x1='115' y1='97' x2='165' y2='147' gradientUnits='userSpaceOnUse'>
          <stop stopColor='#7c3aed' />
          <stop offset='1' stopColor='#4f46e5' />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function DashboardEmptyState() {
  const { t } = useI18n();
  const user = useUser();
  const { setEditMode } = useEditMode();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddWidget = () => {
    setEditMode(true);
    setShowAddModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className='flex flex-col items-center justify-center min-h-[calc(100svh-14rem)] px-4 text-center'
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <EmptyIllustration />
        </motion.div>

        <h2 className='mt-8 text-2xl font-bold text-white'>{t('dashboard.emptyState.title')}</h2>
        <p className='mt-3 text-white/50 text-sm max-w-xs leading-relaxed'>{t('dashboard.emptyState.subtitle')}</p>

        {user?.is_admin && (
          <motion.button
            onClick={handleAddWidget}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.03 }}
            className='mt-8 flex items-center gap-2 px-7 py-3 rounded-full text-white font-semibold text-sm shadow-lg shadow-violet-900/40'
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
          >
            <Plus size={16} />
            {t('dashboard.addWidget')}
          </motion.button>
        )}
      </motion.div>

      <AnimatePresence>{showAddModal && <AddWidgetModal onClose={() => setShowAddModal(false)} />}</AnimatePresence>
    </>
  );
}
