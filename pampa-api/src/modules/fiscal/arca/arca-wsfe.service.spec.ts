import { ArcaConfigService } from './arca.config';
import { ArcaWsaaService } from './arca-wsaa.service';
import { ArcaWsfeService, WsfeFetchLike } from './arca-wsfe.service';

function fakeArcaConfig(): ArcaConfigService {
  return {
    config: {
      environment: 'HOMOLOGACION',
      cuit: '20304050607',
      wsfeUrl: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
      wsfePuntoVenta: 1,
    },
  } as unknown as ArcaConfigService;
}

function fakeWsaaService(): ArcaWsaaService {
  return {
    getAccessTicket: jest.fn().mockResolvedValue({
      token: 'TOKEN',
      sign: 'SIGN',
      expirationTime: new Date(Date.now() + 60 * 60 * 1000),
    }),
  } as unknown as ArcaWsaaService;
}

function fakeFetchReturning(body: string): jest.Mock {
  return jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(body) }),
  );
}

function buildService(fetchImpl: WsfeFetchLike) {
  return new ArcaWsfeService(fakeArcaConfig(), fakeWsaaService(), fetchImpl);
}

describe('ArcaWsfeService', () => {
  it('returns the last authorized voucher number', async () => {
    const body = `<?xml version="1.0"?><soap:Envelope><soap:Body>
      <FECompUltimoAutorizadoResponse>
        <FECompUltimoAutorizadoResult>
          <PtoVta>1</PtoVta>
          <CbteTipo>11</CbteTipo>
          <CbteNro>42</CbteNro>
        </FECompUltimoAutorizadoResult>
      </FECompUltimoAutorizadoResponse>
    </soap:Body></soap:Envelope>`;
    const service = buildService(fakeFetchReturning(body));

    const cbteNro = await service.getLastAuthorizedVoucherNumber({
      companyId: 'company-1',
      environment: 'HOMOLOGACION',
      pointOfSale: '0001',
      voucherTypeCode: '11',
    });

    expect(cbteNro).toBe(42);
  });

  it('parses an approved FECAESolicitar response with CAE', async () => {
    const body = `<?xml version="1.0"?><soap:Envelope><soap:Body>
      <FECAESolicitarResponse>
        <FECAESolicitarResult>
          <FeCabResp><Resultado>A</Resultado></FeCabResp>
          <FeDetResp>
            <FEDetResponse>
              <Resultado>A</Resultado>
              <CAE>71234567890123</CAE>
              <CAEFchVto>20260815</CAEFchVto>
            </FEDetResponse>
          </FeDetResp>
        </FECAESolicitarResult>
      </FECAESolicitarResponse>
    </soap:Body></soap:Envelope>`;
    const service = buildService(fakeFetchReturning(body));

    const result = await service.requestCae({
      companyId: 'company-1',
      invoiceId: 'invoice-1',
      environment: 'HOMOLOGACION',
      pointOfSale: '0001',
      voucherTypeCode: '11',
      voucherNumber: 43,
      itemsSnapshot: [],
      totalsSnapshot: { subtotal: '100.00', total: '100.00' },
      clientSnapshot: null,
    });

    expect(result.status).toBe('APPROVED');
    expect(result.cae).toBe('71234567890123');
    expect(result.caeExpiration?.toISOString().slice(0, 10)).toBe('2026-08-15');
  });

  it('parses a rejected FECAESolicitar response without CAE', async () => {
    const body = `<?xml version="1.0"?><soap:Envelope><soap:Body>
      <FECAESolicitarResponse>
        <FECAESolicitarResult>
          <FeCabResp><Resultado>R</Resultado></FeCabResp>
          <FeDetResp>
            <FEDetResponse>
              <Resultado>R</Resultado>
            </FEDetResponse>
          </FeDetResp>
          <Errors>
            <Err><Code>10016</Code><Msg>Comprobante ya autorizado.</Msg></Err>
          </Errors>
        </FECAESolicitarResult>
      </FECAESolicitarResponse>
    </soap:Body></soap:Envelope>`;
    const service = buildService(fakeFetchReturning(body));

    const result = await service.requestCae({
      companyId: 'company-1',
      invoiceId: 'invoice-1',
      environment: 'HOMOLOGACION',
      pointOfSale: '0001',
      voucherTypeCode: '11',
      voucherNumber: 43,
      itemsSnapshot: [],
      totalsSnapshot: { subtotal: '100.00', total: '100.00' },
      clientSnapshot: null,
    });

    expect(result.status).toBe('REJECTED');
    expect(result.cae).toBeUndefined();
    expect(result.errorCode).toBe('10016');
  });

  it('returns null from getExistingVoucher when ARCA has no matching comprobante', async () => {
    const body = `<?xml version="1.0"?><soap:Envelope><soap:Body>
      <FECompConsultarResponse>
        <FECompConsultarResult>
          <Errors>
            <Err><Code>602</Code><Msg>Comprobante inexistente.</Msg></Err>
          </Errors>
        </FECompConsultarResult>
      </FECompConsultarResponse>
    </soap:Body></soap:Envelope>`;
    const service = buildService(fakeFetchReturning(body));

    const result = await service.getExistingVoucher({
      companyId: 'company-1',
      environment: 'HOMOLOGACION',
      pointOfSale: '0001',
      voucherTypeCode: '11',
      voucherNumber: 43,
    });

    expect(result).toBeNull();
  });
});
