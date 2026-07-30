import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Optional,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { BRANCH_PERMISSIONS } from './branch.permissions';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { SecurityAuditService } from '../../auth/audit/security-audit.service';

@ApiTags('Branches')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Sucursal no encontrada en la empresa.' })
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly service: BranchesService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(BRANCH_PERMISSIONS.read)
  findAll(@CurrentSecurityContext() context: SecurityContext) {
    return this.service.findAll(context);
  }

  @Get(':id')
  @RequirePermissions(BRANCH_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post()
  @RequirePermissions(BRANCH_PERMISSIONS.create)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateBranchDto,
  ) {
    const branch = await this.service.create(context, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'BRANCH_CREATED',
      result: 'SUCCESS',
      metadata: { branchId: branch.id },
    });
    return branch;
  }

  @Patch(':id')
  @RequirePermissions(BRANCH_PERMISSIONS.update)
  async update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateBranchDto,
  ) {
    const branch = await this.service.update(context, id, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'BRANCH_UPDATED',
      result: 'SUCCESS',
      metadata: { branchId: id },
    });
    return branch;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(BRANCH_PERMISSIONS.delete)
  async deactivate(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.deactivate(context, id);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'BRANCH_DEACTIVATED',
      result: 'SUCCESS',
      metadata: { branchId: id },
    });
  }
}
