import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TaxConditionsService } from './tax-conditions.service';

@ApiTags('Tax Conditions')
@Controller('tax-conditions')
export class TaxConditionsController {
  constructor(private readonly taxConditionsService: TaxConditionsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener condiciones fiscales para catalogos' })
  @ApiOkResponse({
    description: 'Condiciones fiscales recuperadas correctamente.',
  })
  findAll() {
    return this.taxConditionsService.findAll();
  }
}
