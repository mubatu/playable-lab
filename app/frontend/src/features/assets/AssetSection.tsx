import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { FileArchive, ImageIcon, Music2, Play, Plus, X } from 'lucide-react';
import type { AssetPreview, AssetSelectOption } from '../../appTypes';
import type { TemplateAsset, TemplateAssetFile } from '../../types';
import { buildAssetMetadata, cx, fileExtension, formatBytes, isAudioAsset, isImageAsset } from '../../lib/appUtils';

function AssetIcon({ asset }: { asset: TemplateAsset }) {
  const value = `${asset.id} ${asset.label} ${asset.accept || ''}`.toLowerCase();
  const Icon = value.includes('audio') || value.includes('sound') || value.includes('mp3') ? Music2 : ImageIcon;

  return (
    <span className="grid size-12 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
      <Icon className="size-6" />
    </span>
  );
}

export function AssetSection({ assets, onAssetOptionsChange }: { assets: TemplateAsset[]; onAssetOptionsChange: (assetId: string, options: AssetSelectOption[]) => void }) {
  if (assets.length === 0) return null;
  return (
    <section>
      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {assets.map((asset) => (
          <AssetUploadField
            key={asset.id}
            asset={asset}
            onAssetOptionsChange={onAssetOptionsChange}
          />
        ))}
      </div>
    </section>
  );
}

function AssetUploadField({ asset, onAssetOptionsChange }: { asset: TemplateAsset; onAssetOptionsChange: (assetId: string, options: AssetSelectOption[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileOptions, setFileOptions] = useState<AssetSelectOption[]>([]);
  const [defaultFilesVisible, setDefaultFilesVisible] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<AssetPreview | null>(null);
  const defaultFiles = useMemo(() => asset.defaultFiles || [], [asset.defaultFiles]);
  const defaultFileKey = defaultFiles.map((file) => file.url).join('|');

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!form) return;

    function handleReset() {
      setFiles([]);
      setDefaultFilesVisible(true);
      setDragActive(false);
      setPreview(null);
    }

    form.addEventListener('reset', handleReset);
    return () => form.removeEventListener('reset', handleReset);
  }, []);

  useEffect(() => {
    setFiles([]);
    setDefaultFilesVisible(true);
    setDragActive(false);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [asset.id, defaultFileKey]);

  useEffect(() => {
    const objectUrls: string[] = [];
    const nextOptions = files.map((file, index) => {
      const supportsPreview = isImageAsset(file.name, file.type);
      const previewUrl = supportsPreview ? URL.createObjectURL(file) : undefined;
      if (previewUrl) objectUrls.push(previewUrl);
      return { value: index, label: file.name, previewUrl };
    });

    setFileOptions(nextOptions);
    return () => objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function syncInputFiles(nextFiles: File[]) {
    const input = inputRef.current;
    if (!input) return;

    if (nextFiles.length === 0) {
      input.value = '';
      return;
    }

    const transfer = new DataTransfer();
    nextFiles.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
  }

  function updateFiles(nextFiles: File[]) {
    setFiles(nextFiles);
    syncInputFiles(nextFiles);
  }

  function openFileDialog() {
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;
    setDefaultFilesVisible(false);
    updateFiles(asset.multiple ? [...files, ...selectedFiles] : [selectedFiles[0]]);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []);
    if (droppedFiles.length === 0) return;
    setDefaultFilesVisible(false);
    updateFiles(asset.multiple ? [...files, ...droppedFiles] : [droppedFiles[0]]);
  }

  function removeFile(index: number) {
    updateFiles(files.filter((_, fileIndex) => fileIndex !== index));
  }

  const selectedDefaults = useMemo(() => (files.length === 0 && defaultFilesVisible ? defaultFiles : []), [defaultFiles, defaultFilesVisible, files.length]);
  const defaultOptions = useMemo(() => selectedDefaults.map((file, index) => ({ value: index, label: file.name, previewUrl: file.url })), [selectedDefaults]);
  const visibleAssetOptions = useMemo(() => (files.length > 0 ? fileOptions : defaultOptions), [defaultOptions, fileOptions, files.length]);
  useEffect(() => {
    onAssetOptionsChange(asset.id, visibleAssetOptions);
  }, [asset.id, onAssetOptionsChange, visibleAssetOptions]);

  const hasVisibleSelection = files.length > 0 || selectedDefaults.length > 0;
  const canAddFile = asset.multiple || !hasVisibleSelection;
  const selectedAssets = [
    ...selectedDefaults.map((file) => ({ size: file.size })),
    ...files.map((file) => ({ size: file.size }))
  ];
  const metadata = buildAssetMetadata(asset.accept, selectedAssets.map((item) => item.size));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/80">
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-4">
        <AssetIcon asset={asset} />
        <div className="min-w-0">
          <span className="block text-base font-semibold text-zinc-950">{asset.label}</span>
          {asset.description ? <span className="mt-1 block text-sm leading-5 text-zinc-500">{asset.description}</span> : null}
        </div>
      </div>

      <div className={cx('mt-5 gap-3', asset.multiple ? 'flex flex-wrap' : 'grid')}>
        {selectedDefaults.map((file) => (
          <DefaultAssetTile key={file.url} asset={asset} file={file} onPreview={setPreview} onRemove={() => setDefaultFilesVisible(false)} />
        ))}
        {files.map((file, index) => (
          <UploadedAssetTile key={`${file.name}-${file.lastModified}-${index}`} asset={asset} file={file} onPreview={setPreview} onRemove={() => removeFile(index)} />
        ))}
        {canAddFile ? (
          <button
            type="button"
            className={cx(
              'grid place-items-center rounded-lg border border-dashed border-blue-200 bg-white p-5 text-center text-blue-700 transition hover:border-blue-300 hover:bg-blue-50/40 focus:outline-none focus:ring-2 focus:ring-blue-100',
              asset.multiple ? 'size-29' : 'h-29 w-full',
              dragActive && 'border-blue-400 bg-blue-50'
            )}
            onClick={openFileDialog}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            aria-label={`Upload ${asset.label}`}
          >
            <span className="grid size-16 place-items-center rounded-full bg-blue-100 text-blue-700">
              <Plus className="size-7" />
            </span>
          </button>
        ) : null}
      </div>
      {metadata ? <div className="mt-5 text-xs font-semibold text-zinc-500">{metadata}</div> : null}
      <input
        ref={inputRef}
        className="sr-only"
        id={asset.id}
        name={asset.id}
        type="file"
        accept={asset.accept || ''}
        multiple={Boolean(asset.multiple)}
        onChange={handleChange}
        aria-required={Boolean(asset.required)}
      />
      {preview ? <AssetPreviewModal preview={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}

function DefaultAssetTile({ asset, file, onPreview, onRemove }: { asset: TemplateAsset; file: TemplateAssetFile; onPreview: (preview: AssetPreview) => void; onRemove: () => void }) {
  return <AssetTile asset={asset} name={file.name} type={file.type} size={file.size} previewUrl={file.url} onPreview={onPreview} onRemove={onRemove} />;
}

function UploadedAssetTile({ asset, file, onPreview, onRemove }: { asset: TemplateAsset; file: File; onPreview: (preview: AssetPreview) => void; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const supportsPreview = isImageAsset(file.name, file.type) || isAudioAsset(file.name, file.type);

  useEffect(() => {
    if (!supportsPreview) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, supportsPreview]);

  return <AssetTile asset={asset} name={file.name} type={file.type} size={file.size} previewUrl={previewUrl} onPreview={onPreview} onRemove={onRemove} />;
}

function AssetTile({
  asset,
  name,
  type,
  size,
  previewUrl,
  onPreview,
  onRemove
}: {
  asset: TemplateAsset;
  name: string;
  type: string;
  size?: number;
  previewUrl?: string;
  onPreview: (preview: AssetPreview) => void;
  onRemove: () => void;
}) {
  const isImage = isImageAsset(name, type);
  const isAudio = isAudioAsset(name, type);
  const canPreview = Boolean(previewUrl && (isImage || isAudio));
  const extension = fileExtension(name).toUpperCase() || type.split('/')[0]?.toUpperCase();

  function handlePreview() {
    if (canPreview && previewUrl) onPreview({ name, type, size, url: previewUrl });
  }

  return (
    <div
      className={cx(
        'group relative grid place-items-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-200',
        asset.multiple ? 'size-29' : 'h-29 w-full',
        canPreview && 'cursor-pointer hover:border-blue-300 hover:shadow-md'
      )}
      role={canPreview ? 'button' : undefined}
      tabIndex={canPreview ? 0 : undefined}
      onClick={handlePreview}
      onKeyDown={(event) => {
        if (!canPreview) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePreview();
        }
      }}
      aria-label={canPreview ? `Preview ${name}` : undefined}
    >
      <div className="grid h-full w-full place-items-center bg-zinc-100">
        {isImage && previewUrl ? (
          <div
            className="h-full w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${previewUrl}")` }}
            role="img"
            aria-label={name}
          />
        ) : (
          <span className="grid justify-items-center gap-3 text-zinc-500">
            <span className="grid size-14 place-items-center rounded-full bg-white text-blue-700 shadow-sm">
              {isAudio ? <Play className="size-6" /> : <FileArchive className="size-6" />}
            </span>
            <span className="text-xs font-bold uppercase leading-none">{extension || 'FILE'}</span>
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-zinc-950/80 text-white opacity-0 shadow-sm transition hover:bg-red-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-200 group-hover:opacity-100"
        aria-label={`Remove ${name}`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function AssetPreviewModal({ preview, onClose }: { preview: AssetPreview; onClose: () => void }) {
  const isImage = isImageAsset(preview.name, preview.type);
  const isAudio = isAudioAsset(preview.name, preview.type);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/70 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`} onClick={onClose}>
      <div className="grid max-h-[min(820px,calc(100dvh-32px))] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md border border-zinc-300 bg-white text-zinc-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold">{preview.name}</h4>
            <p className="mt-0.5 text-xs font-medium text-zinc-500">
              {isImage ? 'Image preview' : isAudio ? 'Audio preview' : 'Asset preview'}
              {preview.size !== undefined ? ` · ${formatBytes(preview.size)}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 hover:bg-zinc-50" aria-label="Close asset preview">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid min-h-0 place-items-center bg-zinc-100 p-4">
          {isImage ? (
            <img className="max-h-[calc(100dvh-180px)] max-w-full rounded-md object-contain shadow-sm" src={preview.url} alt={preview.name} />
          ) : isAudio ? (
            <div className="grid w-full max-w-xl justify-items-center gap-5 rounded-md border border-zinc-200 bg-white p-6">
              <span className="grid size-16 place-items-center rounded-md bg-blue-50 text-blue-700">
                <Play className="size-7" />
              </span>
              <div className="w-full">
                <p className="mb-3 truncate text-center text-sm font-semibold text-zinc-800">{preview.name}</p>
                <audio className="w-full" controls src={preview.url} />
              </div>
            </div>
          ) : (
            <div className="grid justify-items-center gap-3 text-zinc-500">
              <FileArchive className="size-10" />
              <p className="text-sm font-medium">Preview is not available for this file type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
