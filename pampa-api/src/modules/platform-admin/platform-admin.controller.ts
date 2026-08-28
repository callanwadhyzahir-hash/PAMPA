import {
  Body,
  Controller,
  Delete,
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
import { PlatformActivityQueryDto } from './dto/activity-query.dto';
import { PlatformCompanyQueryDto } from './dto/company-query.dto';
import { DeleteReasonDto } from './dto/delete-reason.dto';
import { PlatformGrowthQueryDto } from './dto/growth-query.dto';
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

  @Get('overview/growth')
  growth(@Query() query: PlatformGrowthQueryDto) {
    return this.service.growth(query);
  }

  @Get('security')
  security() {
    return this.service.securitySummary();
  }

  @Get('system')
  system() {
    return this.service.systemStatus();
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

  @Delete('companies/:id')
  deleteCompany(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteReasonDto,
  ) {
    return this.service.deleteCompany(context, id, dto);
  }

  @Get('users')
  users(@Query() query: PlatformUserQueryDto) {
    return this.service.listUsers(query);
  }

  @Get('users/:id')
  user(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getUser(id);
  }

  @Delete('users/:id')
  deleteUser(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteReasonDto,
  ) {
    return this.service.deleteUser(context, id, dto);
  }

  @Get('activity')
  activity(@Query() query: PlatformActivityQueryDto) {
    return this.service.listActivity(query);
  }
}
