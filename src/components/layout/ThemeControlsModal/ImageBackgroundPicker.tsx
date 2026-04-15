import { useState, useRef } from 'react';
import { Image, Upload, Trash2, Link } from 'lucide-react';
import type { BackgroundConfig } from '@/config/themes';

type ImageInputMode = 'url' | 'file';

export function ImageBackgroundPicker({
  background,
  setBackground,
}: {
  background: BackgroundConfig;
  setBackground: (bg: BackgroundConfig) => void;
}) {
  const [mode, setMode] = useState<ImageInputMode>(() =>
    background.imageUrl?.startsWith('/uploads/') ? 'file' : 'url',
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nom du fichier actuellement utilisé (pour l'affichage)
  const currentFilename = background.imageUrl?.startsWith('/uploads/')
    ? background.imageUrl.split('/').pop()
    : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/uploads/background', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload');
      setBackground({ ...background, imageUrl: json.url });
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
      await fetch(`/api/uploads/background/${encodeURIComponent(currentFilename)}`, { method: 'DELETE' });
    } catch {
      // Ignore — on nettoie l'URL quand même
    }
    setBackground({ ...background, imageUrl: '' });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle : URL vs Fichier */}
      <div className="flex gap-1.5 p-0.5 rounded-lg bg-white/5 border border-white/10 w-fit">
        <button
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'url' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Link size={11} /> URL
        </button>
        <button
          onClick={() => setMode('file')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'file' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Upload size={11} /> Fichier
        </button>
      </div>

      {mode === 'url' && (
        <input
          type="text"
          placeholder="URL de l'image (https://...)"
          value={background.imageUrl?.startsWith('/uploads/') ? '' : (background.imageUrl ?? '')}
          onChange={(e) => setBackground({ ...background, imageUrl: e.target.value })}
          className="w-full px-3 py-2 rounded-lg text-xs bg-white/8 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60"
        />
      )}

      {mode === 'file' && (
        <div className="flex flex-col gap-2">
          {currentFilename ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/8 border border-white/15">
              <Image size={12} className="text-white/40 flex-shrink-0" />
              <span className="text-white/70 text-xs truncate flex-1">{currentFilename}</span>
              <button
                onClick={handleDeleteUpload}
                className="text-red-400/70 hover:text-red-400 transition-colors flex-shrink-0"
                title="Supprimer l'image"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-medium bg-white/5 border border-dashed border-white/20 text-white/50 hover:bg-white/10 hover:text-white/70 hover:border-white/30 transition-all disabled:opacity-40"
            >
              <Upload size={13} />
              {uploading ? 'Envoi en cours…' : 'Choisir une image'}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={handleFileChange}
            className="hidden"
          />
          {uploadError && (
            <p className="text-red-400 text-xs px-1">{uploadError}</p>
          )}
          <p className="text-white/25 text-[10px]">JPEG · PNG · WebP · GIF · AVIF — max 10 Mo</p>
        </div>
      )}
    </div>
  );
}
