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
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50'
      />
    </div>
  );
}
