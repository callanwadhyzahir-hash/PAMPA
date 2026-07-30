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
import { CreateUserDto } from './dto/create-user.dto';
import { ReplaceUserRolesDto } from './dto/replace-user-roles.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { USER_PERMISSIONS } from './user.permissions';
import { UsersService } from './users.service';
import { SecurityAuditService } from '../../auth/audit/security-audit.service';

@ApiTags('Users')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Usuario no encontrado en la empresa.' })
@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(USER_PERMISSIONS.read)
  findAll(@CurrentSecurityContext() context: SecurityContext) {
    return this.service.findAll(context);
  }

  @Get(':id')
  @RequirePermissions(USER_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post()
  @RequirePermissions(USER_PERMISSIONS.create)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateUserDto,
  ) {
    const user = await this.service.create(context, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      targetUserId: user.id,
      sessionId: context.sessionId,
      eventType: 'USER_CREATED',
      result: 'SUCCESS',
    });
    return user;
  }

  @Patch(':id')
  @RequirePermissions(USER_PERMISSIONS.update)
  async update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserDto,
  ) {
    const user = await this.service.update(context, id, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      targetUserId: id,
      sessionId: context.sessionId,
      eventType:
        input.isActive === undefined ? 'USER_UPDATED' : 'USER_STATUS_CHANGED',
      result: 'SUCCESS',
      metadata:
        input.isActive === undefined ? undefined : { isActive: input.isActive },
    });
    return user;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(USER_PERMISSIONS.delete)
  async deactivate(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.deactivate(context, id);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      targetUserId: id,
      sessionId: context.sessionId,
      eventType: 'USER_DEACTIVATED',
      result: 'SUCCESS',
    });
  }

  @Get(':id/roles')
  @RequirePermissions(USER_PERMISSIONS.read)
  getRoles(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getRoles(context, id);
  }

  @Put(':id/roles')
  @RequirePermissions(USER_PERMISSIONS.assignRoles)
  async replaceRoles(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ReplaceUserRolesDto,
  ) {
    const roles = await this.service.replaceRoles(context, id, input);
    await this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      targetUserId: id,
      sessionId: context.sessionId,
      eventType: 'USER_ROLES_REPLACED',
      result: 'SUCCESS',
      metadata: { roleCount: input.roleIds.length },
    });
    return roles;
  }
}
