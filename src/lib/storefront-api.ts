const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

interface ApiEnvelope<T> {
  data: T;
}

interface ErrorBody {
  message?: string | string[];
  details?: { code?: string; unavailableProductIds?: string[] };
}

export class StorefrontApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly unavailableProductIds?: string[],
  ) {
    super(message);
    this.name = 'StorefrontApiError';
  }
}

function messageFrom(body?: ErrorBody) {
  if (typeof body?.message === 'string') return body.message;
  if (Array.isArray(body?.message)) return body.message.join('. ');
  return 'No se pudo completar la solicitud.';
}

export async function storefrontFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/storefront${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch {
    throw new StorefrontApiError('No fue posible conectarse con el servidor.', 0);
  }

  if (!response.ok) {
    let body: ErrorBody | undefined;
    try {
      body = (await response.json()) as ErrorBody;
    } catch {
      body = undefined;
    }
    throw new StorefrontApiError(
      messageFrom(body),
      response.status,
      body?.details?.code,
      body?.details?.unavailableProductIds,
    );
  }

  if (response.status === 204) return undefined as T;
  const envelope = (await response.json()) as ApiEnvelope<T>;
  return envelope.data;
}
