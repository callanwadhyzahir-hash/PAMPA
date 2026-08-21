'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Package, X } from 'lucide-react';

import { cn } from '@/lib/utils';

type ProductImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Literal Tailwind classes (not interpolated) so the JIT scanner picks them
// up — see SIZE_PX below for the matching pixel values passed to next/image.
const SIZE_CLASSES: Record<ProductImageSize, string> = {
  xs: 'size-6',
  sm: 'size-10',
  md: 'size-16',
  lg: 'size-28',
  xl: 'size-52',
};

const SIZE_PX: Record<ProductImageSize, number> = {
  xs: 24,
  sm: 40,
  md: 64,
  lg: 112,
  xl: 208,
};

const ICON_SIZE_CLASSES: Record<ProductImageSize, string> = {
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-10',
  xl: 'size-16',
};

type ProductImageProps = {
  /** Product's image_url. Null/undefined renders the placeholder — never a
   * fake or stock photo (see PAMPA product images spec §3). */
  src?: string | null;
  /** Product name — used as alt text and as the placeholder's accessible label. */
  alt: string;
  size?: ProductImageSize;
  className?: string;
  /** Loads eagerly instead of lazily — use on the one instance that's likely above the fold (e.g. the detail page hero). */
  priority?: boolean;
  /** Click to view full-size in an overlay. Intended for the product detail page. */
  expandable?: boolean;
  /** Skip Next's image optimizer — required for external hosts not covered by
   * next.config's remotePatterns, e.g. a Mercado Libre listing thumbnail
   * (see the ML integration's "own PAMPA photo vs. ML photo" split). */
  unoptimized?: boolean;
  /** Fills its container instead of a fixed `size` square — for responsive
   * grids (e.g. the products catalog cards). Caller's className controls
   * the container's dimensions (typically `aspect-square w-full`). */
  fill?: boolean;
  /** next/image `sizes` attribute, only used with `fill`. */
  sizes?: string;
};

function ProductImage({
  src,
  alt,
  size = 'md',
  className,
  priority,
  expandable,
  unoptimized,
  fill,
  sizes,
}: ProductImageProps) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [trackedSrc, setTrackedSrc] = useState(src);

  // Reset per-src so switching a product's image (replace flow) re-attempts
  // loading instead of getting stuck on a stale error/loaded state. Adjusted
  // during render (React's documented pattern) rather than in an effect, so
  // it doesn't cost an extra render pass.
  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setErrored(false);
    setLoaded(false);
  }

  const showPlaceholder = !src || errored;

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  const frameClasses = cn(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground',
    fill ? 'aspect-square w-full' : SIZE_CLASSES[size],
    expandable && !showPlaceholder && 'cursor-zoom-in',
    className,
  );

  return (
    <>
      <div
        className={frameClasses}
        {...(showPlaceholder
          ? { role: 'img', 'aria-label': alt }
          : {})}
        onClick={
          expandable && !showPlaceholder ? () => setExpanded(true) : undefined
        }
      >
        {showPlaceholder ? (
          <Package className={ICON_SIZE_CLASSES[size]} aria-hidden="true" />
        ) : fill ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes ?? '(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw'}
            priority={priority}
            unoptimized={unoptimized}
            className={cn(
              'object-cover transition-opacity duration-200',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={SIZE_PX[size]}
            height={SIZE_PX[size]}
            priority={priority}
            unoptimized={unoptimized}
            className={cn(
              'size-full object-cover transition-opacity duration-200',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        )}
      </div>

      {expanded && src
        ? createPortal(
            // Portaled straight to <body>: a `fixed` element positions
            // relative to the nearest transformed ancestor, not the
            // viewport — and the detail Dialog's own centering transform
            // would otherwise trap this overlay inside the modal instead
            // of covering the screen.
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              onClick={() => setExpanded(false)}
            >
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                aria-label="Cerrar"
                onClick={() => setExpanded(false)}
              >
                <X className="size-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element -- on-demand full-size preview, not worth a next/image size contract */}
              <img
                src={src}
                alt={alt}
                className="max-h-full max-w-full rounded-md object-contain"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export { ProductImage };
export type { ProductImageProps, ProductImageSize };
