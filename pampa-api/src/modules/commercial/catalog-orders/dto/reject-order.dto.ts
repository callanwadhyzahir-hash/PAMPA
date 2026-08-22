import { IsString, Length } from 'class-validator';

export class RejectOrderDto {
  @IsString()
  @Length(3, 300)
  reason!: string;
}
