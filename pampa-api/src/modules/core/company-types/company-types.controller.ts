import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CompanyTypesService } from './company-types.service';

@ApiTags('Company Types')
@Controller('company-types')
export class CompanyTypesController {
  constructor(private readonly companyTypesService: CompanyTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener tipos de empresa para catalogos' })
  @ApiOkResponse({ description: 'Tipos de empresa recuperados correctamente.' })
  findAll() {
    return this.companyTypesService.findAll();
  }
}
