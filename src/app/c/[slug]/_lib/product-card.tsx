import Link from 'next/link';
import { Star } from 'lucide-react';

import { ProductImage } from '@/components/pampa-ui';
import type { StorefrontProduct } from '@/services/storefront/storefront.service';

import { AvailabilityBadge } from './availability-badge';

function ProductCard({ slug, product }: { slug: string; product: StorefrontProduct }) {
  return (
    <Link
      href={`/c/${slug}/producto/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          fill
          className="rounded-none rounded-t-xl border-0"
        />
        {product.featured ? (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
            <Star className="size-3" aria-hidden="true" /> Destacado
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {product.price ? (
            <span className="text-base font-semibold">${product.price}</span>
          ) : (
            <span className="text-xs text-muted-foreground">Consultar precio</span>
          )}
          <AvailabilityBadge availability={product.availability} />
        </div>
      </div>
    </Link>
  );
}

export { ProductCard };
