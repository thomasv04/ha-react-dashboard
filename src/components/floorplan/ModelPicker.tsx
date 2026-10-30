import { useRef, useState } from 'react';
import { Box as BoxIcon, Link, Trash2, Upload } from 'lucide-react';
import { useI18n } from '@/i18n';
import { apiFetch } from '@/lib/api-base';

/**
 * Maquette d'une page plan : une adresse (`/local/…`) ou un `.glb` téléversé.
 *
 * Même présentation que le choix de l'image, à un détail près : l'adresse
 * n'est validée qu'à la sortie du champ. À chaque frappe, la maquette serait
 * rechargée depuis une adresse incomplète.
 */
export function ModelPicker({ model, onChange }: { model?: string; onChange: (model: string | undefined) => void }) {
  const { t } = useI18n();
  const uploaded = model?.startsWith('/uploads/') ? model.slice('/uploads/'.length) : null;
  const url = uploaded ? '' : (model ?? '');
  const [mode, setMode] = useState<'url' | 'file'>(uploaded ? 'file' : 'url');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('model', file);
      const res = await apiFetch('/api/uploads/model', { method: 'POST', body });
      // Au-delà de sa limite, Home Assistant répond en texte, pas en JSON.
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      onChange(json.url);
    } catch (err) {
      // Le serveur explique en anglais : la console le garde, l'écran le dit
      // dans la langue du dashboard.
      console.warn('[floorplan] model upload:', err);
      setError(t('layout.floorplan.modelUploadError'));
    } finally {
      setUploading(false);
      // Pour pouvoir choisir de nouveau le même fichier.
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function remove() {
    try {
      // Rangée avec les images côté serveur : même route de suppression.
      await apiFetch(`/api/uploads/background/${encodeURIComponent(uploaded ?? '')}`, { method: 'DELETE' });
    } catch {
      // Le fichier restera sur le serveur ; la page, elle, n'y renvoie plus.
    }
    onChange(undefined);
  }

  const tab = (id: 'url' | 'file', Icon: typeof Link, label: string) => (
    <button
      onClick={() => setMode(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        mode === id ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] border border-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]'
      }`}
    >
      <Icon size={11} /> {label}
    </button>
  );

  return (
    <div role='group' aria-label={t('layout.floorplan.model')} className='flex flex-col gap-3'>
      <div className='flex gap-1.5 p-0.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] w-fit'>
        {tab('url', Link, t('settings.appearance_section.imageUrl'))}
        {tab('file', Upload, t('settings.appearance_section.imageFile'))}
      </div>

      {mode === 'url' ? (
        <div className='flex flex-col gap-1.5'>
          <input
            key={url}
            defaultValue={url}
            placeholder={t('layout.floorplan.modelPlaceholder')}
            aria-label={t('layout.floorplan.model')}
            onBlur={e => {
              const next = e.target.value.trim();
              if (next !== url) onChange(next || undefined);
            }}
            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
            className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] text-xs bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)] text-[var(--ds-ink)] placeholder:text-[var(--ds-ink-muted)] focus:outline-none focus:border-[var(--ds-accent)]'
          />
          <p className='text-[var(--ds-ink-muted)] text-[10px] leading-snug'>{t('layout.floorplan.modelHint')}</p>
        </div>
      ) : (
        <div className='flex flex-col gap-2'>
          {uploaded ? (
            <div className='flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)]'>
              <BoxIcon size={12} className='text-[var(--ds-ink-muted)] flex-shrink-0' />
              <span className='text-[var(--ds-ink)] text-xs truncate flex-1'>{uploaded}</span>
              <button
                onClick={remove}
                title={t('layout.floorplan.modelDelete')}
                aria-label={t('layout.floorplan.modelDelete')}
                className='text-[var(--ds-alert)] transition-colors flex-shrink-0'
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className='flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-[var(--ds-radius-sm)] text-xs font-medium bg-[var(--ds-surface-2)] border border-dashed border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] transition-all disabled:opacity-40'
            >
              <Upload size={13} />
              {uploading ? t('settings.appearance_section.imageUploading') : t('layout.floorplan.modelChoose')}
            </button>
          )}
          <input
            ref={fileInput}
            type='file'
            accept='.glb,model/gltf-binary'
            aria-label={t('layout.floorplan.modelChoose')}
            onChange={e => upload(e.target.files?.[0])}
            className='hidden'
          />
          {error && <p className='text-[var(--ds-alert)] text-xs px-1'>{error}</p>}
          <p className='text-[var(--ds-ink-muted)] text-[10px]'>{t('layout.floorplan.modelFormats')}</p>
        </div>
      )}
    </div>
  );
}
