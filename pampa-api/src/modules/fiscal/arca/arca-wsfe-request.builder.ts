export interface WsfeAuth {
  cuit: string;
  token: string;
  sign: string;
}

export interface BuildFECompUltimoAutorizadoOptions {
  auth: WsfeAuth;
  ptoVta: number;
  cbteTipo: number;
}

export interface BuildFECompConsultarOptions {
  auth: WsfeAuth;
  ptoVta: number;
  cbteTipo: number;
  cbteNro: number;
}

export interface BuildFECAESolicitarOptions {
  auth: WsfeAuth;
  ptoVta: number;
  cbteTipo: number;
  cbteNro: number;
  concepto: number;
  docTipo: number;
  docNro: number;
  cbteFch: Date;
  impTotal: number;
  impNeto: number;
  impIva: number;
  impOpEx: number;
  impTotConc: number;
  impTrib: number;
  condicionIVAReceptorId: number;
  monId?: string;
  monCotiz?: number;
}

function toAfipDate(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function authXml(auth: WsfeAuth): string {
  return [
    '<ar:Auth>',
    `  <ar:Token>${auth.token}</ar:Token>`,
    `  <ar:Sign>${auth.sign}</ar:Sign>`,
    `  <ar:Cuit>${auth.cuit}</ar:Cuit>`,
    '</ar:Auth>',
  ].join('\n');
}

function soapEnvelope(bodyXml: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">',
    '  <soapenv:Header/>',
    '  <soapenv:Body>',
    bodyXml,
    '  </soapenv:Body>',
    '</soapenv:Envelope>',
  ].join('\n');
}

export function buildFECompUltimoAutorizadoXml(
  options: BuildFECompUltimoAutorizadoOptions,
): string {
  const body = [
    '<ar:FECompUltimoAutorizado>',
    authXml(options.auth),
    `<ar:PtoVta>${options.ptoVta}</ar:PtoVta>`,
    `<ar:CbteTipo>${options.cbteTipo}</ar:CbteTipo>`,
    '</ar:FECompUltimoAutorizado>',
  ].join('\n');
  return soapEnvelope(body);
}

export function buildFECompConsultarXml(
  options: BuildFECompConsultarOptions,
): string {
  const body = [
    '<ar:FECompConsultar>',
    authXml(options.auth),
    '<ar:FeCompConsReq>',
    `  <ar:CbteTipo>${options.cbteTipo}</ar:CbteTipo>`,
    `  <ar:CbteNro>${options.cbteNro}</ar:CbteNro>`,
    `  <ar:PtoVta>${options.ptoVta}</ar:PtoVta>`,
    '</ar:FeCompConsReq>',
    '</ar:FECompConsultar>',
  ].join('\n');
  return soapEnvelope(body);
}

/**
 * Builds a single-voucher FECAESolicitar request (CantReg=1). Fields follow
 * the WSFEv1 Factura C constraints (Manual del Desarrollador WSFEv1 v4.6):
 * ImpIVA/ImpOpEx must be 0 and the <Iva> array must be omitted for CbteTipo
 * C, so this builder never emits an <Iva> block.
 */
export function buildFECAESolicitarXml(
  options: BuildFECAESolicitarOptions,
): string {
  const monId = options.monId ?? 'PES';
  const monCotiz = options.monCotiz ?? 1;

  const body = [
    '<ar:FECAESolicitar>',
    authXml(options.auth),
    '<ar:FeCAEReq>',
    '  <ar:FeCabReq>',
    '    <ar:CantReg>1</ar:CantReg>',
    `    <ar:PtoVta>${options.ptoVta}</ar:PtoVta>`,
    `    <ar:CbteTipo>${options.cbteTipo}</ar:CbteTipo>`,
    '  </ar:FeCabReq>',
    '  <ar:FeDetReq>',
    '    <ar:FECAEDetRequest>',
    `      <ar:Concepto>${options.concepto}</ar:Concepto>`,
    `      <ar:DocTipo>${options.docTipo}</ar:DocTipo>`,
    `      <ar:DocNro>${options.docNro}</ar:DocNro>`,
    `      <ar:CbteDesde>${options.cbteNro}</ar:CbteDesde>`,
    `      <ar:CbteHasta>${options.cbteNro}</ar:CbteHasta>`,
    `      <ar:CbteFch>${toAfipDate(options.cbteFch)}</ar:CbteFch>`,
    `      <ar:ImpTotal>${options.impTotal}</ar:ImpTotal>`,
    `      <ar:ImpTotConc>${options.impTotConc}</ar:ImpTotConc>`,
    `      <ar:ImpNeto>${options.impNeto}</ar:ImpNeto>`,
    `      <ar:ImpOpEx>${options.impOpEx}</ar:ImpOpEx>`,
    `      <ar:ImpTrib>${options.impTrib}</ar:ImpTrib>`,
    `      <ar:ImpIVA>${options.impIva}</ar:ImpIVA>`,
    `      <ar:MonId>${monId}</ar:MonId>`,
    `      <ar:MonCotiz>${monCotiz}</ar:MonCotiz>`,
    `      <ar:CondicionIVAReceptorId>${options.condicionIVAReceptorId}</ar:CondicionIVAReceptorId>`,
    '    </ar:FECAEDetRequest>',
    '  </ar:FeDetReq>',
    '</ar:FeCAEReq>',
    '</ar:FECAESolicitar>',
  ].join('\n');
  return soapEnvelope(body);
}
