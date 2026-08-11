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

import { CurrentSecurityContext } from '../auth/decorators/current-security-context.decorator';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import type { SecurityContext } from '../auth/types/security-context';
import { PlatformCompanyQueryDto } from './dto/company-query.dto';
import { PlatformUserQueryDto } from './dto/user-query.dto';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto';
import { PlatformAdminService } from './platform-admin.service';

@ApiTags('PlatformAdmin')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Se requiere autoridad de plataforma.' })
@UseGuards(PlatformAdminGuard)
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private readonly service: PlatformAdminService) {}

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @Get('companies')
  companies(@Query() query: PlatformCompanyQueryDto) {
    return this.service.listCompanies(query);
  }

  @Get('companies/:id')
  company(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCompany(id);
  }

  @Patch('companies/:id/status')
  updateCompanyStatus(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyStatusDto,
  ) {
    return this.service.updateCompanyStatus(context, id, dto);
  }

  @Get('users')
  users(@Query() query: PlatformUserQueryDto) {
    return this.service.listUsers(query);
  }
}
