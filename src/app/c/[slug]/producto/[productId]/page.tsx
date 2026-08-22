'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react';

import { ErrorState, LoadingState, ProductImage } from '@/components/pampa-ui';
import { Button } from '@/components/ui/button';
import { storefrontService, type StorefrontProduct } from '@/services/storefront/storefront.service';

import { useCart } from '../../_lib/cart-context';
import { AvailabilityBadge } from '../../_lib/availability-badge';

export default function StorefrontProductPage() {
  const router = useRouter();
  const params = useParams<{ slug: string; productId: string }>();
  const { add } = useCart();

  const [product, setProduct] = useState<StorefrontProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setNotFound(false);
      storefrontService
        .getProduct(params.slug, params.productId)
        .then((result) => {
          if (active) setProduct(result);
        })
        .catch(() => {
          if (active) setNotFound(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [params.slug, params.productId]);

  function handleAdd() {
    if (!product) return;
    add(
      {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (loading) return <LoadingState label="Cargando producto" />;

  if (notFound || !product) {
    return (
      <ErrorState
        title="Producto no disponible"
        description="Puede que ya no esté publicado o se haya agotado."
        action={
          <Button onClick={() => router.push(`/c/${params.slug}`)}>Volver al catálogo</Button>
        }
      />
    );
  }

  const outOfStock = product.availability === 'OUT_OF_STOCK';

  return (
    <div className="space-y-4 px-4 pt-4 pb-24">
      <Button type="button" variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="size-4" /> Volver
      </Button>

      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        fill
        className="aspect-square rounded-2xl"
      />

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">{product.name}</h1>
          <AvailabilityBadge availability={product.availability} />
        </div>
        {product.category ? (
          <p className="text-xs text-muted-foreground">{product.category.name}</p>
        ) : null}
        {product.price ? (
          <p className="text-2xl font-semibold">${product.price}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Consultar precio</p>
        )}
        {product.description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {product.description}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl border-t border-border bg-background p-4">
        {outOfStock ? (
          <Button type="button" disabled className="w-full">
            Sin stock
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-border">
              <button
                type="button"
                className="flex size-10 items-center justify-center text-foreground disabled:opacity-40"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                aria-label="Restar"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <button
                type="button"
                className="flex size-10 items-center justify-center text-foreground"
                onClick={() => setQuantity((value) => value + 1)}
                aria-label="Sumar"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button type="button" variant="lime" className="flex-1" onClick={handleAdd}>
              <ShoppingCart className="size-4" />
              {added ? 'Agregado ✓' : 'Agregar al carrito'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
