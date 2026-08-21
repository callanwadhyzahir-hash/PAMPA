import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Session-only prior turns the client echoes back — never persisted server-side (see docs/pampa-ai-architecture.md §Conversaciones). Only role+text; no security-relevant field is ever read from here. */
export class AiConversationTurnDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

export class AiChatRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => AiConversationTurnDto)
  conversationContext?: AiConversationTurnDto[];
}
