import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import type { SecurityContext } from '../../auth/types/security-context';
import { AiAdminService } from './ai-admin.service';
import { AiCompanyQueryDto } from './dto/ai-company-query.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';

@ApiTags('PlatformAdmin - AI')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere autoridad de plataforma.' })
@UseGuards(PlatformAdminGuard)
@Controller('platform-admin/ai')
export class AiAdminController {
  constructor(private readonly service: AiAdminService) {}

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @Get('companies')
  companies(@Query() query: AiCompanyQueryDto) {
    return this.service.listCompanies(query);
  }

  @Get('companies/:id')
  company(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCompany(id);
  }

  @Patch('companies/:id')
  updateSettings(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    return this.service.updateSettings(context, id, dto);
  }
}
