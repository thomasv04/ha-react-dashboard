import { useState, useRef } from 'react';
import { Image, Upload, Trash2, Link } from 'lucide-react';
import { useI18n } from '@/i18n';
import { apiFetch } from '@/lib/api-base';

type ImageInputMode = 'url' | 'file';

export function ImageBackgroundPicker({ imageUrl, onChange }: { imageUrl: string; onChange: (url: string) => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<ImageInputMode>(() => (imageUrl.startsWith('/uploads/') ? 'file' : 'url'));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nom du fichier actuellement utilisé (pour l'affichage)
  const currentFilename = imageUrl.startsWith('/uploads/') ? imageUrl.split('/').pop() : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiFetch('/api/uploads/background', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload');
      onChange(json.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
      // Reset le champ pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteUpload() {
    if (!currentFilename) return;
    try {
      await apiFetch(`/api/uploads/background/${encodeURIComponent(currentFilename)}`, { method: 'DELETE' });
    } catch {
      // Ignore — on nettoie l'URL quand même
    }
    onChange('');
  }

  return (
    <div className='flex flex-col gap-3'>
      {/* Mode toggle : URL vs Fichier */}
      <div className='flex gap-1.5 p-0.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] w-fit'>
        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'url'
              ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] border border-[var(--ds-accent)]'
              : 'text-[var(--ds-ink-muted)]'
          }`}
        >
          <Link size={11} /> {t('settings.appearance_section.imageUrl')}
        </button>
        <button
          onClick={() => setMode('file')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'file'
              ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] border border-[var(--ds-accent)]'
              : 'text-[var(--ds-ink-muted)]'
          }`}
        >
          <Upload size={11} /> {t('settings.appearance_section.imageFile')}
        </button>
      </div>

      {mode === 'url' && (
        <input
          type='text'
          placeholder={t('settings.appearance_section.imageUrlPlaceholder')}
          value={imageUrl.startsWith('/uploads/') ? '' : imageUrl}
          onChange={e => onChange(e.target.value)}
          className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] text-xs bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)] text-[var(--ds-ink)] placeholder:text-[var(--ds-ink-muted)] focus:outline-none focus:outline-2 focus:outline-[var(--ds-accent)]'
        />
      )}

      {mode === 'file' && (
        <div className='flex flex-col gap-2'>
          {currentFilename ? (
            <div className='flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)]'>
              <Image size={12} className='text-[var(--ds-ink-muted)] flex-shrink-0' />
              <span className='text-[var(--ds-ink)] text-xs truncate flex-1'>{currentFilename}</span>
              <button
                onClick={handleDeleteUpload}
                className='text-[var(--ds-alert)] transition-colors flex-shrink-0'
                title={t('settings.appearance_section.imageDelete')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className='flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-[var(--ds-radius-sm)] text-xs font-medium bg-[var(--ds-surface-2)] border border-dashed border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] transition-all disabled:opacity-40'
            >
              <Upload size={13} />
              {uploading ? t('settings.appearance_section.imageUploading') : t('settings.appearance_section.imageChoose')}
            </button>
          )}
          <input
            ref={fileInputRef}
            type='file'
            accept='image/jpeg,image/png,image/webp,image/gif,image/avif'
            onChange={handleFileChange}
            className='hidden'
          />
          {uploadError && <p className='text-[var(--ds-alert)] text-xs px-1'>{uploadError}</p>}
          <p className='text-[var(--ds-ink-muted)] text-xs'>{t('settings.appearance_section.imageFormats')}</p>
        </div>
      )}
    </div>
  );
}
