import type { SectionHeaderBlock } from '@/types/custom-panel';

export function SectionHeaderBlockRenderer({ block }: { block: SectionHeaderBlock }) {
  return (
    <div className='flex items-center gap-3 py-1'>
      <div className='flex-1 h-px bg-white/10' />
      <span className='text-white/40 text-xs font-medium uppercase tracking-wider'>{block.title}</span>
      <div className='flex-1 h-px bg-white/10' />
    </div>
  );
}
