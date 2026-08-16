'use client';

import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/pampa-ui/feedback/empty-state';
import { SearchInput } from '@/components/pampa-ui/search/search-input';
import {
  mercadolibreService,
  type MercadoLibreListing,
} from '@/services/integrations/mercadolibre.service';

import { LinkListingDialog } from './link-listing-dialog';

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  paused: 'Pausada',
  closed: 'Cerrada',
  under_review: 'En revisión',
};

const currency = (value: string, currencyId: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyId || 'ARS' }).format(
    Number(value),
  );

function ListingsTab({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<MercadoLibreListing[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkTarget, setLinkTarget] = useState<MercadoLibreListing | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    mercadolibreService
      .listListings({ search: search || undefined, limit: 50 })
      .then((page) => setItems(page.items))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  const handleLink = async (productId: string) => {
    if (!linkTarget) return;
    await mercadolibreService.linkListing(linkTarget.id, productId);
    setLinkTarget(null);
    load();
  };

  const handleUnlink = async (listingId: string) => {
    setUnlinkingId(listingId);
    try {
      await mercadolibreService.unlinkListing(listingId);
      load();
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <SearchInput
        placeholder="Buscar publicación por título o ID"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando publicaciones…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Sin publicaciones"
          description="Ejecutá una sincronización para traer las publicaciones de Mercado Libre."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Publicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock ML</TableHead>
              <TableHead>Producto PAMPA</TableHead>
              <TableHead>Última sincronización</TableHead>
              {canManage ? <TableHead className="text-right">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell>
                  <p className="font-medium">{listing.title}</p>
                  <p className="text-xs text-muted-foreground">{listing.ml_item_id}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={listing.status === 'active' ? 'success' : 'neutral'}>
                    {STATUS_LABEL[listing.status] ?? listing.status}
                  </Badge>
                </TableCell>
                <TableCell>{currency(listing.price, listing.currency_id)}</TableCell>
                <TableCell>{listing.available_quantity}</TableCell>
                <TableCell>
                  {listing.mercadolibre_product_link ? (
                    <Badge variant="info">{listing.mercadolibre_product_link.product.name}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin vincular</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(
                    new Date(listing.last_synced_at),
                  )}
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    {listing.mercadolibre_product_link ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={unlinkingId === listing.id}
                        onClick={() => handleUnlink(listing.id)}
                      >
                        {unlinkingId === listing.id ? 'Desvinculando…' : 'Desvincular'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setLinkTarget(listing)}
                      >
                        Vincular
                      </Button>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <LinkListingDialog
        listing={linkTarget}
        onOpenChange={(open) => !open && setLinkTarget(null)}
        onLink={handleLink}
      />
    </div>
  );
}

export { ListingsTab };
