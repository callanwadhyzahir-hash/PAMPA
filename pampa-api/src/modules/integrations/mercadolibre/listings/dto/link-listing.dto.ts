import { IsUUID } from 'class-validator';

export class LinkListingDto {
  @IsUUID()
  productId!: string;
}
