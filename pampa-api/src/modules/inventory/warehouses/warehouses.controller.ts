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
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SecurityAuditService } from '../../auth/audit/security-audit.service';
import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WAREHOUSE_PERMISSIONS } from './warehouse.permissions';
import { WarehousesService } from './warehouses.service';

@ApiTags('Warehouses')
@ApiCookieAuth('pampa_access')
@ApiUnauthorizedResponse({ description: 'Sesión ausente o inválida.' })
@ApiForbiddenResponse({ description: 'Permiso insuficiente.' })
@ApiNotFoundResponse({ description: 'Depósito no encontrado en la empresa.' })
@Controller('warehouses')
export class WarehousesController {
  constructor(
    private readonly service: WarehousesService,
    @Optional() private readonly audit?: SecurityAuditService,
  ) {}

  @Get()
  @RequirePermissions(WAREHOUSE_PERMISSIONS.read)
  findAll(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.findAll(context, branchId);
  }

  @Get(':id')
  @RequirePermissions(WAREHOUSE_PERMISSIONS.read)
  findOne(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(context, id);
  }

  @Post()
  @RequirePermissions(WAREHOUSE_PERMISSIONS.create)
  async create(
    @CurrentSecurityContext() context: SecurityContext,
    @Body() input: CreateWarehouseDto,
  ) {
    const warehouse = await this.service.create(context, input);
    await this.record(context, 'WAREHOUSE_CREATED', warehouse.id);
    return warehouse;
  }

  @Patch(':id')
  @RequirePermissions(WAREHOUSE_PERMISSIONS.update)
  async update(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateWarehouseDto,
  ) {
    const warehouse = await this.service.update(context, id, input);
    await this.record(context, 'WAREHOUSE_UPDATED', id);
    return warehouse;
  }

  @Delete(':id')
  @RequirePermissions(WAREHOUSE_PERMISSIONS.delete)
  async deactivate(
    @CurrentSecurityContext() context: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.service.deactivate(context, id);
    await this.record(context, 'WAREHOUSE_DEACTIVATED', id);
    return result;
  }

  private record(
    context: SecurityContext,
    eventType: string,
    warehouseId: string,
  ) {
    return this.audit?.record({
      companyId: context.companyId,
      actorUserId: context.userId,
      sessionId: context.sessionId,
      eventType,
      result: 'SUCCESS',
      metadata: { warehouseId },
    });
  }
}
