const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export interface ApiErrorResponse {
  details?: unknown;
  message?: string | string[];
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: ApiErrorResponse,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(response?: ApiErrorResponse): string {
  if (typeof response?.message === "string") {
    return response.message;
  }

  if (Array.isArray(response?.message)) {
    return response.message.join(". ");
  }

  return "No se pudo completar la solicitud.";
}

async function getErrorResponse(response: Response): Promise<ApiErrorResponse | undefined> {
  try {
    const body: unknown = await response.json();
    return isApiErrorResponse(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("No fue posible conectarse con el servidor.", 0);
  }

  if (!response.ok) {
    const errorResponse = await getErrorResponse(response);
    throw new ApiError(
      getErrorMessage(errorResponse),
      response.status,
      errorResponse,
      errorResponse?.details,
    );
  }

  return response.json() as Promise<T>;
}

export { apiFetch };
