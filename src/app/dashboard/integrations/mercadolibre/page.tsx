'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/pampa-ui/dialogs/confirm-dialog';
import { ErrorState } from '@/components/pampa-ui/feedback/error-state';
import { useAuthSession } from '@/hooks/use-auth-session';
import {
  mercadolibreService,
  type MercadoLibreStatus,
} from '@/services/integrations/mercadolibre.service';
import { ApiError } from '@/services/api';

import { ListingsTab } from './_components/listings-tab';
import { OrdersTab } from './_components/orders-tab';

function formatDate(value: string | null) {
  if (!value) return 'Nunca';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export default function MercadoLibreIntegrationPage() {
  const { user } = useAuthSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<MercadoLibreStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const canManage = Boolean(user?.permissions.includes('integrations.mercadolibre.manage'));

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    mercadolibreService
      .getStatus()
      .then(setStatus)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el estado.'),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = searchParams.get('ml');
      if (result === 'error') {
        const reason = searchParams.get('reason');
        setActionError(
          reason === 'MERCADOLIBRE_ACCOUNT_ALREADY_LINKED'
            ? 'Esta cuenta de Mercado Libre ya está conectada a otra empresa en PAMPA. Desconectala ahí primero, o iniciá sesión en Mercado Libre con una cuenta distinta antes de conectar.'
            : 'No se pudo completar la conexión con Mercado Libre. Intentá nuevamente.',
        );
        router.replace('/dashboard/integrations/mercadolibre');
      } else if (result === 'connected') {
        router.replace('/dashboard/integrations/mercadolibre');
      }
      load();
    }, 0);
    return () => window.clearTimeout(timer);
    // Only re-run for the initial load and OAuth-redirect params, not on every `load` identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnect = async () => {
    setConnecting(true);
    setActionError(null);
    try {
      const result = await mercadolibreService.connect();
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      load();
    } catch (reason: unknown) {
      setActionError(reason instanceof ApiError ? reason.message : 'No se pudo iniciar la conexión.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setActionError(null);
    try {
      await mercadolibreService.sync();
      load();
    } catch (reason: unknown) {
      setActionError(reason instanceof ApiError ? reason.message : 'No se pudo sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await mercadolibreService.disconnect();
      setDisconnectOpen(false);
      load();
    } catch (reason: unknown) {
      setActionError(reason instanceof ApiError ? reason.message : 'No se pudo desconectar.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
        <p className="text-sm text-muted-foreground">Cargando integración…</p>
      </main>
    );
  }

  if (error || !status) {
    return (
      <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
        <ErrorState
          title="No se pudo cargar la integración"
          description={error ?? 'Ocurrió un error inesperado.'}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integraciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conectá servicios externos para centralizar tu operación en PAMPA.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Mercado Libre</CardTitle>
              {status.mockMode ? <Badge variant="warning">Datos de prueba</Badge> : null}
            </div>
            <CardDescription className="mt-1">
              Conectá tu cuenta de Mercado Libre para centralizar publicaciones y
              ventas dentro de PAMPA.
            </CardDescription>
          </div>
          {status.connected && canManage ? (
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDisconnectOpen(true)}
              >
                Desconectar
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {actionError ? (
            <p className="mb-4 rounded-sm border border-destructive/30 bg-destructive-bg px-3 py-2 text-sm text-destructive">
              {actionError}
            </p>
          ) : null}

          {!status.configured ? (
            <EmptyStateBlock
              title="Integración no disponible"
              description="Mercado Libre todavía no fue configurado para esta instalación. Contactá a un administrador técnico."
            />
          ) : !status.connected ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm font-medium text-foreground">Mercado Libre no conectado</p>
              {canManage ? (
                <Button type="button" onClick={handleConnect} disabled={connecting}>
                  {connecting ? 'Conectando…' : 'Conectar Mercado Libre'}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Necesitás el permiso de gestión de Mercado Libre para conectar la cuenta.
                </p>
              )}
            </div>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-4">
              <Field label="Nickname" value={status.account?.nickname ?? '—'} />
              <Field label="ML User ID" value={status.account?.mlUserId ?? '—'} />
              <Field label="Sitio" value={status.account?.siteId ?? '—'} />
              <Field label="Última sincronización" value={formatDate(status.lastSyncAt)} />
            </dl>
          )}
        </CardContent>
      </Card>

      {status.connected ? (
        <Tabs defaultValue="resumen">
          <TabsList>
            <TabsIndicator />
            <TabsTab value="resumen">Resumen</TabsTab>
            <TabsTab value="listings">Publicaciones</TabsTab>
            <TabsTab value="orders">Ventas</TabsTab>
            <TabsTab value="settings">Configuración</TabsTab>
          </TabsList>

          <TabsPanel value="resumen">
            <Card>
              <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
                <Field label="Estado" value={status.account?.status ?? '—'} />
                <Field label="Proveedor" value={status.account?.provider === 'MOCK' ? 'Datos de prueba' : 'Real'} />
                <Field label="Última sincronización" value={formatDate(status.lastSyncAt)} />
                <Field label="Último error" value={status.lastError ?? 'Ninguno'} />
              </CardContent>
            </Card>
          </TabsPanel>

          <TabsPanel value="listings">
            <ListingsTab canManage={canManage} />
          </TabsPanel>

          <TabsPanel value="orders">
            <OrdersTab />
          </TabsPanel>

          <TabsPanel value="settings">
            <Card>
              <CardContent className="space-y-3 py-6 text-sm text-muted-foreground">
                <p>
                  Esta es una integración v1: vincular una publicación con un
                  producto de PAMPA es solo una asociación manual — no sincroniza
                  stock ni precio automáticamente.
                </p>
                <p>La sincronización es manual, no hay procesos automáticos en segundo plano.</p>
                <p>Las credenciales de Mercado Libre se configuran a nivel de servidor.</p>
              </CardContent>
            </Card>
          </TabsPanel>
        </Tabs>
      ) : null}

      <ConfirmDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title="Desconectar Mercado Libre"
        description="Se cerrará el acceso a la cuenta conectada. Las publicaciones y órdenes ya sincronizadas se conservan como historial."
        confirmLabel="Desconectar"
        destructive
        loading={disconnecting}
        onConfirm={handleDisconnect}
      />
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function EmptyStateBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-sm border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
