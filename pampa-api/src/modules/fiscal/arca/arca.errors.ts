/** Invalid/missing ARCA_* configuration. Thrown eagerly at module init. */
export class ArcaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArcaConfigurationError';
  }
}

/** WSAA rejected the login attempt (SOAP fault, invalid CMS, expired cert). */
export class ArcaAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArcaAuthenticationError';
  }
}

/** Network-level failure reaching WSAA (timeout, DNS, non-SOAP HTTP error). */
export class ArcaTransportError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ArcaTransportError';
  }
}
