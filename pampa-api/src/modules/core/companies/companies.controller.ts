import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentSecurityContext } from '../../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../../auth/types/security-context';
import { CompaniesService } from './companies.service';
import { COMPANY_PERMISSIONS } from './company.permissions';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@ApiCookieAuth('pampa_access')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('current')
  @RequirePermissions(COMPANY_PERMISSIONS.read)
  @ApiOperation({
    summary: 'Obtener la empresa autenticada',
    description:
      'Requiere companies.read. La empresa se obtiene de la sesion autenticada.',
  })
  @ApiOkResponse({ description: 'Empresa autenticada recuperada.' })
  @ApiUnauthorizedResponse({ description: 'Sesion ausente o invalida.' })
  @ApiForbiddenResponse({ description: 'Falta el permiso companies.read.' })
  @ApiNotFoundResponse({ description: 'Empresa no encontrada o inactiva.' })
  findCurrent(@CurrentSecurityContext() securityContext: SecurityContext) {
    return this.companiesService.findCurrent(securityContext);
  }

  @Patch('current')
  @RequirePermissions(COMPANY_PERMISSIONS.update)
  @ApiOperation({
    summary: 'Actualizar la empresa autenticada',
    description:
      'Requiere companies.update. No acepta un identificador de empresa.',
  })
  @ApiOkResponse({ description: 'Empresa actualizada correctamente.' })
  @ApiUnauthorizedResponse({ description: 'Sesion ausente o invalida.' })
  @ApiForbiddenResponse({ description: 'Falta el permiso companies.update.' })
  @ApiNotFoundResponse({
    description: 'Empresa o relacion de catalogo no encontrada.',
  })
  @ApiConflictResponse({ description: 'Ya existe una empresa con ese CUIT.' })
  updateCurrent(
    @CurrentSecurityContext() securityContext: SecurityContext,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateCurrent(
      securityContext,
      updateCompanyDto,
    );
  }
}
