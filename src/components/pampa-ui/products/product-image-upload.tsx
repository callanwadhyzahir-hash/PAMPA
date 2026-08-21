'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Camera, ImageUp, Loader2, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ApiError } from '@/services/api';
import { productsService } from '@/services/catalog/products.service';
import { ProductImage } from './product-image';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type ProductImageUploadProps = {
  /**
   * Present → "managed" mode: the widget calls the upload/remove endpoints
   * itself for this existing product. Absent → "staged" mode, for the
   * create-product form: the widget only holds the File locally and hands
   * it to the parent via onFileStaged, to be uploaded once the product
   * (and its id) exists.
   */
  productId?: string;
  /** Current product.image_url — ignored while a local file is staged/uploading. */
  value?: string | null;
  /** Used for alt text and the placeholder's accessible label. */
  productName?: string;
  onFileStaged?: (file: File | null) => void;
  onUploaded?: (imageUrl: string) => void;
  onRemoved?: () => void;
  disabled?: boolean;
  className?: string;
};

function ProductImageUpload({
  productId,
  value,
  productName = 'Producto',
  onFileStaged,
  onUploaded,
  onRemoved,
  disabled,
  className,
}: ProductImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const managed = Boolean(productId);
  const displaySrc = localPreview ?? value ?? null;
  const locked = disabled || busy;

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Formato no soportado. Usá JPG, PNG o WebP.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'La imagen supera el tamaño máximo permitido (5 MB).';
    }
    return null;
  }

  async function handleFile(file: File) {
    setError(null);
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    if (!managed) {
      onFileStaged?.(file);
      return;
    }

    setBusy(true);
    try {
      const result = await productsService.uploadImage(productId!, file);
      onUploaded?.(result.imageUrl);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo subir la imagen. Intentá nuevamente.',
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);

    if (!managed) {
      setLocalPreview(null);
      onFileStaged?.(null);
      return;
    }

    setBusy(true);
    try {
      await productsService.removeImage(productId!);
      onRemoved?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'No se pudo eliminar la imagen. Intentá nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (file) void handleFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (locked) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-4">
        <ProductImage src={displaySrc} alt={productName} size="lg" />

        <div
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground transition-colors',
            dragOver && 'border-primary bg-primary/5',
            locked && 'pointer-events-none opacity-60',
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImageUp className="size-5" aria-hidden="true" />
          )}
          <p>
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => fileInputRef.current?.click()}
              disabled={locked}
            >
              Hacé clic para elegir una imagen
            </button>{' '}
            o arrastrala acá
          </p>
          <p className="text-xs">JPG, PNG o WebP. Máximo 5 MB.</p>

          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={locked}
            >
              <Camera className="size-3.5" aria-hidden="true" />
              Tomar foto
            </button>

            {displaySrc ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                onClick={handleRemove}
                disabled={locked}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Eliminar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={onInputChange}
      />
      {/* Separate input: `capture` only makes sense for the camera action —
          keeping it off the main picker avoids forcing the camera open when
          the user just wants to pick an existing photo. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export { ProductImageUpload };
export type { ProductImageUploadProps };
