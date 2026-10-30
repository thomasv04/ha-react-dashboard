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
      <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className='h-12 w-full rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 text-base text-[var(--ds-ink)] outline-none focus:outline-2 focus:outline-[var(--ds-accent)]'
      />
    </div>
  );
}
