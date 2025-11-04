import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FileDropProps {
  onFiles: (files: File[]) => void;
  previewUrl?: string | null;
  uploading?: boolean;
  onClear?: () => void;
  className?: string;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  emptyTitle?: string; // override main empty-state title
  formatsHint?: string; // override formats hint text
  ariaLabel?: string; // accessibility label override
}

export function FileDrop({
  onFiles,
  previewUrl,
  uploading = false,
  onClear,
  className,
  accept = { 'image/*': [] },
  multiple = false,
  emptyTitle,
  formatsHint,
  ariaLabel = 'Agregar imagen de referencia',
}: FileDropProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (!accepted?.length) return;
      onFiles(accepted);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive, isFocused } = useDropzone({
    onDrop,
    accept,
    multiple,
  });

  const isSvgAccept = !!accept && Object.keys(accept).includes('image/svg+xml');
  const formatsHintText =
    formatsHint ?? (isSvgAccept ? 'SVG • máx. 10 MB' : 'PNG, JPG, WEBP • máx. 10\u00A0MB');
  const emptyTitleText =
    emptyTitle ??
    (isSvgAccept
      ? isDragActive
        ? 'Suelta el SVG aquí…'
        : 'Arrastra y suelta un SVG'
      : isDragActive
        ? 'Suelta la imagen aquí…'
        : 'Arrastra y suelta una imagen');

  const emptyState = (
    <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
      <div className="inline-flex items-center justify-center rounded-full p-2 border border-foreground/20">
        <ImageIcon className="h-4 w-4 opacity-80" />
      </div>
      <p className="text-sm font-medium">{emptyTitleText}</p>
      <p className="text-xs text-muted-foreground">
        o <span className="underline underline-offset-2">haz clic para seleccionar</span>
      </p>
      <p className="text-[10px] text-muted-foreground">{formatsHintText}</p>
    </div>
  );

  const previewState = (
    <>
      <img
        src={previewUrl!}
        alt="Vista previa"
        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-2xl
                      bg-linear-to-t from-black/50 to-transparent"
      />
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold
                       bg-white/90 text-zinc-900 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              const root = (e.currentTarget.closest('[data-filedrop-root]') as HTMLElement) ?? null;
              root?.querySelector<HTMLInputElement>('input[type="file"]')?.click();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Reemplazar
          </Button>

          {onClear && (
            <Button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold
                         bg-red-600 text-white hover:bg-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </div>
      {uploading && (
        <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            Subiendo imagen…
          </div>
        </div>
      )}
    </>
  );

  return (
    <div
      {...getRootProps()}
      data-filedrop-root
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn(
        'relative min-h-[180px] grid place-items-center rounded-2xl cursor-pointer select-none',
        'transition-all outline-dotted outline-4 outline-[#E5E5E5]',
        'bg-muted/60 text-foreground dark:bg-white/5',
        isDragActive && 'bg-[#0B4D67]/8',
        previewUrl ? 'p-0 border-0' : 'p-4',
        className
      )}
    >
      <input {...getInputProps()} />
      {!previewUrl ? emptyState : previewState}
    </div>
  );
}

export default FileDrop;
