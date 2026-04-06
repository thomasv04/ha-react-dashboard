import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Image, Sliders, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES, type ThemeId, type BackgroundMode } from '@/config/themes';

function ThemeModalContent({ onClose }: { onClose: () => void }) {
  const { themeId, setTheme, background, setBackground, cardOpacity, setCardOpacity } = useTheme();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-md w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-base">Apparence</h2>
          <p className="text-white/35 text-xs mt-0.5">Personnalise le thème et le fond du dashboard</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Theme selector */}
      <div>
        <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
          <Palette size={16} /> Thème
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(THEMES) as [ThemeId, (typeof THEMES)[ThemeId]][]).map(([id, theme]) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                themeId === id
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <div
                className="w-full h-6 rounded-lg mb-2"
                style={{
                  backgroundColor: theme.tokens.bgPrimary,
                  border: `1px solid ${theme.tokens.border}`,
                }}
              />
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card opacity */}
      <div>
        <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
          <Sliders size={16} /> Opacité des cards — {Math.round(cardOpacity * 100)}%
        </h3>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(cardOpacity * 100)}
          onChange={(e) => setCardOpacity(parseInt(e.target.value, 10) / 100)}
          className="w-full accent-blue-500"
        />
      </div>

      {/* Background mode */}
      <div>
        <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
          <Image size={16} /> Fond d'écran
        </h3>
        <div className="flex gap-2 mb-3">
          {(['solid', 'gradient', 'image'] as BackgroundMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setBackground({ ...background, mode })}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                background.mode === mode
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              {mode === 'solid' ? 'Couleur' : mode === 'gradient' ? 'Gradient' : 'Image'}
            </button>
          ))}
        </div>

        {background.mode === 'gradient' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-white/50 text-xs w-16">Couleur 1</label>
              <input
                type="color"
                value={background.gradientFrom ?? '#0a0a14'}
                onChange={(e) => setBackground({ ...background, gradientFrom: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-white/50 text-xs w-16">Couleur 2</label>
              <input
                type="color"
                value={background.gradientTo ?? '#1a1a2e'}
                onChange={(e) => setBackground({ ...background, gradientTo: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-white/50 text-xs w-16">Angle</label>
              <input
                type="range"
                min={0}
                max={360}
                value={background.gradientAngle ?? 135}
                onChange={(e) => setBackground({ ...background, gradientAngle: parseInt(e.target.value, 10) })}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white/40 text-xs w-8">{background.gradientAngle ?? 135}°</span>
            </div>
          </div>
        )}

        {background.mode === 'image' && (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="URL de l'image (https://...)"
              value={background.imageUrl ?? ''}
              onChange={(e) => setBackground({ ...background, imageUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-xs bg-white/8 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60"
            />
            <div className="flex items-center gap-2">
              <label className="text-white/50 text-xs w-16">Overlay</label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((background.overlayOpacity ?? 0.5) * 100)}
                onChange={(e) => setBackground({ ...background, overlayOpacity: parseInt(e.target.value, 10) / 100 })}
                className="flex-1 accent-blue-500"
              />
              <span className="text-white/40 text-xs w-8">{Math.round((background.overlayOpacity ?? 0.5) * 100)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ThemeControlsModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle button – fixed top-left */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        title="Apparence"
        className={`fixed top-4 left-4 z-50 p-2.5 rounded-xl border transition-colors backdrop-blur-sm ${
          isOpen
            ? 'bg-purple-500/30 border-purple-500/50 text-purple-200'
            : 'bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20'
        }`}
      >
        <Palette size={17} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="theme-modal-backdrop"
              className="fixed inset-0 z-[60] bg-black/55"
              style={{ backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            {/* Panel */}
            <motion.div
              key="theme-modal"
              className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="pointer-events-auto w-full max-w-md mx-4 rounded-2xl border border-white/12 shadow-2xl overflow-y-auto max-h-[90vh]"
                style={{ background: 'rgba(12, 16, 40, 0.95)', backdropFilter: 'blur(20px)' }}
              >
                <ThemeModalContent onClose={() => setIsOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
