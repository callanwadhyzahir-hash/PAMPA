import { IsIn, IsOptional } from 'class-validator';

export class FiscalizeSaleInvoiceDto {
  /** Only honored by the mock provider; the real ARCA provider ignores it. */
  @IsOptional()
  @IsIn(['APPROVED', 'REJECTED'])
  forceOutcome?: 'APPROVED' | 'REJECTED';
}
