'use client';

import { useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { ProductImage } from '@/components/pampa-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StorefrontApiError } from '@/lib/storefront-api';
import { buildOrderWhatsAppMessage, buildWhatsAppUrl, normalizeWhatsappDigits } from '@/lib/whatsapp';
import { storefrontService, type SubmitOrderResult } from '@/services/storefront/storefront.service';

import { useCart } from '../_lib/cart-context';
import { useCatalog } from '../_lib/catalog-context';

export default function StorefrontCartPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const { catalog } = useCatalog();
  const { items, setQuantity, remove, clear, removeMany } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitOrderResult | null>(null);

  const subtotal = items.reduce(
    (sum, item) => sum + (item.price ? Number(item.price) * item.quantity : 0),
    0,
  );
  const hasPrices = items.every((item) => item.price !== null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await storefrontService.submitOrder(params.slug, {
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
        })),
      });
      setResult(order);
      clear();
    } catch (reason) {
      if (reason instanceof StorefrontApiError) {
        if (reason.code === 'ITEMS_UNAVAILABLE' && reason.unavailableProductIds) {
          removeMany(reason.unavailableProductIds);
        }
        setError(reason.message);
      } else {
        setError('No pudimos enviar tu pedido. Probá de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const whatsappDigits = normalizeWhatsappDigits(catalog?.whatsapp);
    const whatsappUrl = whatsappDigits
      ? buildWhatsAppUrl(
          whatsappDigits,
          buildOrderWhatsAppMessage({
            companyName: catalog?.displayName ?? 'la tienda',
            orderNumber: result.orderNumber,
            items: result.items,
            total: result.total,
            customerName: name,
            customerPhone: phone,
          }),
        )
      : null;

    return (
      <div className="flex flex-col items-center gap-4 px-6 pt-12 text-center">
        <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
        <div>
          <h1 className="text-lg font-semibold">Pedido recibido</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu pedido <span className="font-medium text-foreground">{result.orderNumber}</span> fue
            enviado. El comercio todavía tiene que confirmarlo — te van a contactar para coordinar
            el pago y la entrega.
          </p>
        </div>
        <div className="w-full space-y-1 rounded-xl border border-border p-4 text-left text-sm">
          {result.items.map((item, index) => (
            <div key={index} className="flex justify-between">
              <span>
                {item.quantity} × {item.productName}
                {item.variantLabel ? ` (${item.variantLabel})` : ''}
              </span>
              <span>${item.subtotal}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span>${result.total}</span>
          </div>
        </div>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Continuar por WhatsApp
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            El comercio no tiene WhatsApp configurado. Te van a contactar al teléfono que dejaste.
          </p>
        )}
        <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/c/${params.slug}`)}>
          Seguir viendo el catálogo
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Tu carrito está vacío.</p>
        <Button type="button" onClick={() => router.push(`/c/${params.slug}`)}>
          Ver catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pt-4">
      <h1 className="text-lg font-semibold">Tu pedido</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={`${item.productId}:${item.variantId ?? ''}`} className="flex items-center gap-3">
            <ProductImage src={item.imageUrl} alt={item.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {item.name}
                {item.variantLabel ? (
                  <span className="text-muted-foreground"> · {item.variantLabel}</span>
                ) : null}
              </p>
              {item.price ? (
                <p className="text-xs text-muted-foreground">${item.price} c/u</p>
              ) : null}
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center"
                    onClick={() => setQuantity(item.productId, item.variantId, item.quantity - 1)}
                    aria-label="Restar"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center"
                    onClick={() => setQuantity(item.productId, item.variantId, item.quantity + 1)}
                    aria-label="Sumar"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center text-muted-foreground hover:text-destructive"
                  onClick={() => remove(item.productId, item.variantId)}
                  aria-label="Quitar"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            {item.price ? (
              <span className="shrink-0 text-sm font-medium">
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {hasPrices ? (
        <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
        <h2 className="text-sm font-semibold">Tus datos</h2>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Nombre y apellido</span>
          <Input required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Teléfono</span>
          <Input
            required
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+54 9 11 1234-5678"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email (opcional)</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Observaciones (opcional)</span>
          <Textarea
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Horario de entrega, color preferido, etc."
          />
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" variant="lime" className="w-full" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Enviar pedido'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Al enviar, el comercio recibe tu pedido y te contacta para confirmarlo. Todavía no es una
          compra confirmada.
        </p>
      </form>
    </div>
  );
}
