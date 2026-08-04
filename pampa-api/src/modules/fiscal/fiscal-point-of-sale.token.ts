export interface FiscalPointOfSaleConfig {
  pointOfSale: string;
  voucherTypeCode: string;
}

/** DI token for the {pointOfSale, voucherTypeCode} pair, resolved by
 *  FiscalModule.forRoot() per active provider (real ARCA config vs. a
 *  fixed dev value for the mock — never requires ARCA_* env vars in mock mode). */
export const FISCAL_POINT_OF_SALE = Symbol('FISCAL_POINT_OF_SALE');
