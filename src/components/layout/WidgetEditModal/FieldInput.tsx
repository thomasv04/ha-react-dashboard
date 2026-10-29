export function FieldInput({
  value,
  onChange,
  label,
  type = 'text',
}: {
  value: string | number;
  onChange: (v: string | number) => void;
  label: string;
  type?: 'text' | 'number';
}) {
  return (
    <div>
      <label className='text-[11px] text-[var(--ds-ink-muted)] mb-1 block'>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)]'
      />
    </div>
  );
}
