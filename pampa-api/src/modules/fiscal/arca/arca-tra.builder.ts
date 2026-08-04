export interface BuildTraOptions {
  service: string;
  now?: Date;
  /** How far before "now" generationTime is set, absorbing clock skew with WSAA. */
  generationMarginMinutes?: number;
  /** How far after "now" expirationTime is set. Kept short on purpose: this
   *  window only bounds how long the *request* itself is valid, not the
   *  access ticket WSAA returns. */
  expirationMarginMinutes?: number;
}

function toAfipTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function buildLoginTicketRequestXml(options: BuildTraOptions): string {
  const now = options.now ?? new Date();
  const generationMargin = options.generationMarginMinutes ?? 10;
  const expirationMargin = options.expirationMarginMinutes ?? 10;

  const generationTime = new Date(now.getTime() - generationMargin * 60_000);
  const expirationTime = new Date(now.getTime() + expirationMargin * 60_000);
  const uniqueId = Math.floor(now.getTime() / 1000);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketRequest version="1.0">',
    '  <header>',
    `    <uniqueId>${uniqueId}</uniqueId>`,
    `    <generationTime>${toAfipTimestamp(generationTime)}</generationTime>`,
    `    <expirationTime>${toAfipTimestamp(expirationTime)}</expirationTime>`,
    '  </header>',
    `  <service>${options.service}</service>`,
    '</loginTicketRequest>',
  ].join('\n');
}
