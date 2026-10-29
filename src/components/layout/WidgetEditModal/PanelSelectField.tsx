import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useDropdownPortal } from '@/hooks/useDropdownPortal';

function getLabel(value: string, customPanels: { id: string; name: string }[]): string {
  if (!value) return '';
  return customPanels.find(p => p.id === value.replace(/^custom:/, ''))?.name ?? value;
}

export function PanelSelectField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { t } = useI18n();
  const { panels } = useCustomPanels();
  const { open, toggle: handleOpen, close, triggerRef, dropRef, dropStyle } = useDropdownPortal<HTMLDivElement>();

  const displayLabel = getLabel(value, panels);

  const select = (v: string) => {
    onChange(v);
    close();
  };

  const dropdown =
    open &&
    createPortal(
      <div
        ref={dropRef}
        data-portal-dropdown
        className='bg-[var(--ds-surface-1)] shadow-[var(--ds-shadow-sheet)] fixed z-[200] rounded-[var(--ds-radius-md)] overflow-hidden'
        style={{ ...dropStyle, maxHeight: 320, overflowY: 'auto' }}
      >
        <div className='p-1.5 space-y-0.5'>
          {/* None option */}
          <button
            onClick={() => select('')}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--ds-radius-sm)] text-sm text-left transition-colors',
              !value ? 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]' : 'text-[var(--ds-ink-muted)]'
            )}
          >
            <span className='text-base leading-none'>—</span>
            <span>{t('layout.panelNone')}</span>
          </button>

          {/* Custom panels */}
          {panels.length > 0 ? (
            <>
              <div className='flex items-center gap-2 px-3 pt-2 pb-1'>
                <Layers size={11} className='text-[var(--ds-ink-muted)]' />
                <span className='text-[10px] font-semibold text-[var(--ds-ink-muted)] uppercase tracking-wider'>
                  {t('layout.panelCustom')}
                </span>
              </div>
              {panels.map(p => {
                const ref = `custom:${p.id}`;
                return (
                  <button
                    key={p.id}
                    onClick={() => select(ref)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--ds-radius-sm)] text-sm text-left transition-colors',
                      value === ref
                        ? 'bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                        : 'border border-transparent text-[var(--ds-ink)]'
                    )}
                  >
                    <Layers size={14} className='text-[var(--ds-accent)] flex-shrink-0' />
                    <span className='flex-1'>{p.name}</span>
                  </button>
                );
              })}
            </>
          ) : (
            <p className='px-3 py-2 text-xs text-[var(--ds-ink-muted)] leading-relaxed'>{t('layout.panelNoneCreated')}</p>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div>
      {label && <label className='text-[11px] text-[var(--ds-ink-muted)] mb-1 block'>{label}</label>}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border cursor-pointer transition-colors select-none',
          open ? 'border-[var(--ds-accent)] bg-[var(--ds-surface-3)]' : 'border-[var(--ds-surface-3)]'
        )}
      >
        {value ? <Layers size={14} className='text-[var(--ds-accent)] flex-shrink-0' /> : null}
        <span className={cn('text-sm flex-1 truncate', value ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]')}>
          {displayLabel || t('layout.panelNoneDisplay')}
        </span>
        {open ? (
          <ChevronUp size={14} className='text-[var(--ds-ink-muted)] flex-shrink-0' />
        ) : (
          <ChevronDown size={14} className='text-[var(--ds-ink-muted)] flex-shrink-0' />
        )}
      </div>
      {dropdown}
    </div>
  );
}
