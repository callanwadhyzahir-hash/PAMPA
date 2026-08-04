/** WSFEv1 rejected the request or returned an unparseable response. */
export class ArcaWsfeError extends Error {
  constructor(
    message: string,
    readonly errors: Array<{ code: string; msg: string }> = [],
  ) {
    super(message);
    this.name = 'ArcaWsfeError';
  }
}
