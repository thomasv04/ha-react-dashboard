import type { SectionHeaderBlock } from '@/types/custom-panel';

export function SectionHeaderBlockRenderer({ block }: { block: SectionHeaderBlock }) {
  return <h3 className='px-1 pt-2 text-[17px] font-bold'>{block.title}</h3>;
}
