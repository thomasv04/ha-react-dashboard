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
        className='fixed z-[200] overflow-hidden rounded-[20px] bg-[var(--ds-sheet)] shadow-[var(--ds-shadow-sheet)]'
        style={{ ...dropStyle, maxHeight: 320, overflowY: 'auto' }}
      >
        <div className='p-1.5 space-y-0.5'>
          {/* None option */}
          <button
            onClick={() => select('')}
            className={cn(
              'flex h-11 w-full items-center gap-2.5 rounded-[var(--ds-radius-md)] px-3 text-left text-base',
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
                <span className='text-xs font-semibold text-[var(--ds-ink-muted)] uppercase tracking-wider'>{t('layout.panelCustom')}</span>
              </div>
              {panels.map(p => {
                const ref = `custom:${p.id}`;
                return (
                  <button
                    key={p.id}
                    onClick={() => select(ref)}
                    className={cn(
                      'flex h-11 w-full items-center gap-2.5 rounded-[var(--ds-radius-md)] px-3 text-left text-base',
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
      {label && <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{label}</label>}
      <div
        ref={triggerRef}
        onClick={handleOpen}
        className={cn(
          'flex h-12 cursor-pointer select-none items-center gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4',
          open && 'outline-2 outline-[var(--ds-accent)]'
        )}
      >
        {value ? <Layers size={14} className='text-[var(--ds-accent)] flex-shrink-0' /> : null}
        <span className={cn('flex-1 truncate text-base', value ? 'text-[var(--ds-ink)]' : 'text-[var(--ds-ink-muted)]')}>
          {displayLabel || t('layout.panelNoneDisplay')}
        </span>
        {open ? (
          <ChevronUp size={18} className='shrink-0 text-[var(--ds-ink-muted)]' />
        ) : (
          <ChevronDown size={18} className='shrink-0 text-[var(--ds-ink-muted)]' />
        )}
      </div>
      {dropdown}
    </div>
  );
}
