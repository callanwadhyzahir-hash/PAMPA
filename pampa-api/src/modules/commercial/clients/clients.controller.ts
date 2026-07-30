import {
  Body,
  Controller,
  Delete,
  Get,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { CLIENT_PERMISSIONS } from './client.permissions';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@ApiCookieAuth('pampa_access')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly service: ClientsService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(CLIENT_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll(
      context,
      search,
      isActive === undefined ? undefined : isActive === 'true',
    );
  }

  @Get(':id/sales')
  @RequirePermissions(CLIENT_PERMISSIONS.read)
  sales(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.sales(context, id);
  }

  @Get(':id/account')
  @RequirePermissions(CLIENT_PERMISSIONS.read)
  account(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.account(context, id);
  }

  @Get(':id')
  @RequirePermissions(CLIENT_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post()
  @RequirePermissions(CLIENT_PERMISSIONS.create)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateClientDto,
  ) {
    const client = await this.service.create(context, input);
    await this.record(context, 'CLIENT_CREATED', client.id);
    return client;
  }

  @Patch(':id')
  @RequirePermissions(CLIENT_PERMISSIONS.update)
  async update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateClientDto,
  ) {
    const client = await this.service.update(context, id, input);
    await this.record(context, 'CLIENT_UPDATED', id);
    return client;
  }

  @Delete(':id')
  @RequirePermissions(CLIENT_PERMISSIONS.delete)
  async deactivate(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const client = await this.service.deactivate(context, id);
    await this.record(context, 'CLIENT_DEACTIVATED', id);
    return client;
  }

  private record(
    context: SecurityContext,
    eventType: string,
    clientId: string,
  ) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { clientId },
    });
  }
}
