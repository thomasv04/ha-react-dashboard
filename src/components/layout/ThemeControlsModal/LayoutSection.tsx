import { LayoutGrid, Square, RotateCcw } from 'lucide-react';
import { useTheme, type LayoutSettings } from '@/context/ThemeContext';
import { useI18n } from '@/i18n';

const DEFAULT_LAYOUT: LayoutSettings = {
  gridGap: 16,
  cardRadius: 24,
  rowHeight: 80,
};

interface SliderRowProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, description, value, min, max, step = 1, unit = 'px', onChange }: SliderRowProps) {
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between'>
        <div>
          <span className='text-white/70 text-xs font-medium'>{label}</span>
          {description && <p className='text-white/30 text-[10px] mt-0.5'>{description}</p>}
        </div>
        <span className='text-white/50 text-xs tabular-nums w-14 text-right'>
          {value}
          {unit}
        </span>
      </div>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        className='w-full accent-blue-500'
      />
      <div className='flex justify-between text-white/20 text-[9px]'>
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

export function LayoutSection() {
  const { t } = useI18n();
  const { layoutSettings, setLayoutSettings } = useTheme();

  const update = (patch: Partial<LayoutSettings>) => setLayoutSettings({ ...layoutSettings, ...patch });

  const isDefault =
    layoutSettings.gridGap === DEFAULT_LAYOUT.gridGap &&
    layoutSettings.cardRadius === DEFAULT_LAYOUT.cardRadius &&
    layoutSettings.rowHeight === DEFAULT_LAYOUT.rowHeight;

  return (
    <div className='flex flex-col gap-7'>
      {/* Grid section */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-4 flex items-center gap-2'>
          <LayoutGrid size={12} /> {t('settings.layout_section.grid')}
        </h3>
        <div className='flex flex-col gap-5'>
          <SliderRow
            label={t('settings.layout_section.gridGap')}
            description={t('settings.layout_section.gridGapDesc')}
            value={layoutSettings.gridGap}
            min={4}
            max={40}
            onChange={v => update({ gridGap: v })}
          />
          <SliderRow
            label={t('settings.layout_section.rowHeight')}
            description={t('settings.layout_section.rowHeightDesc')}
            value={layoutSettings.rowHeight}
            min={60}
            max={160}
            step={4}
            onChange={v => update({ rowHeight: v })}
          />
        </div>
      </div>

      {/* Cards section */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-4 flex items-center gap-2'>
          <Square size={12} /> {t('settings.layout_section.cards')}
        </h3>
        <div className='flex flex-col gap-5'>
          <SliderRow
            label={t('settings.layout_section.cardRadius')}
            description={t('settings.layout_section.cardRadiusDesc')}
            value={layoutSettings.cardRadius}
            min={0}
            max={32}
            onChange={v => update({ cardRadius: v })}
          />
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className='text-white/45 text-[11px] font-semibold tracking-widest uppercase mb-3'>Preview</h3>
        <div
          className='p-3 rounded-xl bg-white/[0.03] border border-white/6'
          style={{ gap: `${layoutSettings.gridGap}px`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className='gc h-10' style={{ borderRadius: `${layoutSettings.cardRadius}px` }} />
          ))}
        </div>
      </div>

      {/* Reset */}
      {!isDefault && (
        <button
          onClick={() => setLayoutSettings(DEFAULT_LAYOUT)}
          className='flex items-center gap-2 text-white/40 hover:text-white/70 text-xs transition-colors self-start'
        >
          <RotateCcw size={11} />
          {t('settings.layout_section.reset')}
        </button>
      )}
    </div>
  );
}
