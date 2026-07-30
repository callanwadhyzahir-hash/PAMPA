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
  Put,
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
import { CreateRoleDto } from './dto/create-role.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ROLE_PERMISSIONS } from './role.permissions';
import { RolesService } from './roles.service';
import { SecurityAuditService } from '../../auth/audit/security-audit.service';

@ApiTags('Roles')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Recurso no encontrado en la empresa.' })
@Controller()
export class RolesController {
  constructor(
    private readonly service: RolesService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get('roles')
  @RequirePermissions(ROLE_PERMISSIONS.read)
  findAll(@CurrentSecurityContext() context: SecurityContext) {
    return this.service.findAll(context);
  }

  @Get('roles/:id')
  @RequirePermissions(ROLE_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post('roles')
  @RequirePermissions(ROLE_PERMISSIONS.create)
  create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateRoleDto,
  ) {
    return this.service.create(context, input);
  }

  @Patch('roles/:id')
  @RequirePermissions(ROLE_PERMISSIONS.update)
  update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateRoleDto,
  ) {
    return this.service.update(context, id, input);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(ROLE_PERMISSIONS.delete)
  delete(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.delete(context, id);
  }

  @Get('permissions')
  @RequirePermissions(ROLE_PERMISSIONS.readPermissions)
  findPermissions() {
    return this.service.findPermissions();
  }

  @Put('roles/:id/permissions')
  @RequirePermissions(ROLE_PERMISSIONS.assignPermissions)
  async replacePermissions(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplaceRolePermissionsDto,
  ) {
    const role = await this.service.replacePermissions(context, id, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType: 'ROLE_PERMISSIONS_REPLACED',
      result: 'SUCCESS',
      metadata: { roleId: id, permissionCount: input.permissionIds.length },
    });
    return role;
  }
}
