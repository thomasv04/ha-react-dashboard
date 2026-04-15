import { useState } from 'react';
import { Settings, Palette, Zap, X } from 'lucide-react';
import { AppearanceSection } from './AppearanceSection';
import { PerformanceSection } from './PerformanceSection';

type SettingsSection = 'appearance' | 'performance';

const NAV_ITEMS: { id: SettingsSection; label: string; Icon: React.ElementType }[] = [
  { id: 'appearance', label: 'Apparence', Icon: Palette },
  { id: 'performance', label: 'Performances', Icon: Zap },
];

const SECTION_TITLES: Record<SettingsSection, string> = {
  appearance: 'Apparence',
  performance: 'Performances',
};

export function SettingsContent({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<SettingsSection>('appearance');

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <div
        className="w-52 flex-shrink-0 flex flex-col rounded-l-2xl border-r border-white/6"
        style={{ background: 'rgba(6, 8, 22, 0.98)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-5 border-b border-white/6">
          <div className="p-1.5 rounded-lg bg-blue-500/20">
            <Settings size={14} className="text-blue-400" />
          </div>
          <span className="text-white font-semibold text-sm">Paramètres</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                section === id
                  ? 'bg-blue-500 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/6'
              }`}
            >
              <Icon size={14} />
              <span className="text-[11px] font-semibold tracking-widest uppercase">{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <span className="text-white/20 text-[10px] tracking-widest uppercase">HA Dashboard</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0 flex flex-col rounded-r-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/6 flex-shrink-0">
          <h2 className="text-white font-semibold text-base">{SECTION_TITLES[section]}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {section === 'appearance' && <AppearanceSection />}
          {section === 'performance' && <PerformanceSection />}
        </div>
      </div>
    </div>
  );
}
