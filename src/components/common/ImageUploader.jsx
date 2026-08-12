import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';

export const ImageUploader = ({
  value = '',
  onChange,
  label = 'Company Logo',
  className = '',
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    // ImgBB allows up to 32MB files
    if (file.size > 32 * 1024 * 1024) {
      setError('Image size exceeds 32MB limit.');
      return;
    }

    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) {
      setError('ImgBB API key (VITE_IMGBB_API_KEY) is missing in .env.local');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      const directUrl = data.data?.display_url || data.data?.url || data.data?.image?.url;
      if (data.success && directUrl) {
        console.log('[ImgBB Upload Success]', directUrl, data.data);
        onChange(directUrl);
      } else {
        throw new Error(data.error?.message || 'Failed to upload image to ImgBB.');
      }
    } catch (err) {
      setError(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label className="text-xs font-semibold text-[var(--text-secondary)]">{label}</Label>}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
      />

      {value ? (
        /* PREVIEW MODE */
        <div className="relative group p-3 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-2xl flex items-center justify-between gap-4 shadow-md transition-all">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
              <img
                src={value}
                alt="Logo preview"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.warn('[ImageUploader Preview Failed]:', value);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <ImageIcon className="w-6 h-6 text-slate-600 hidden absolute" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Uploaded to ImgBB</span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-muted)] truncate max-w-[220px] sm:max-w-xs mt-0.5" title={value}>
                {value}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="text-xs py-1.5 px-3 h-8 border-slate-700 hover:border-sky-500 hover:text-sky-400"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Change
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="text-xs py-1.5 px-2.5 h-8 text-slate-400 hover:text-red-400 hover:bg-red-950/30"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* UPLOAD DRAG & DROP ZONE */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && !disabled && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-sky-400 bg-sky-950/20 scale-[0.99]'
              : 'border-[var(--border-default)] bg-[var(--surface-900)]/60 hover:border-[var(--cst-blue-500)] hover:bg-[var(--surface-800)]/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <div className="py-2 flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 text-[var(--cst-blue-400)] animate-spin" />
              <span className="text-xs font-semibold text-[var(--cst-blue-300)]">Uploading to ImgBB...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-[var(--cst-blue-800)]/30 text-[var(--cst-blue-400)] flex items-center justify-center border border-[var(--cst-blue-600)]/40 shadow-sm">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Click to upload or drag & drop company logo
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  PNG, JPG, WebP, GIF (Max 32MB)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium px-2 py-1 bg-red-950/40 border border-red-900/50 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
