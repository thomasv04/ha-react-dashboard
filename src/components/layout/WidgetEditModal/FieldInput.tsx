import { useId } from 'react';

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
  // `htmlFor` : sans lui, le champ n'avait aucun nom pour un lecteur d'écran.
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className='h-12 w-full rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 text-base text-[var(--ds-ink)] outline-none focus:outline-2 focus:outline-[var(--ds-accent)]'
      />
    </div>
  );
}
