import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrenciesService } from './currencies.service';

@ApiTags('Currencies')
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener monedas activas para catalogos' })
  @ApiOkResponse({ description: 'Monedas recuperadas correctamente.' })
  findAll() {
    return this.currenciesService.findAll();
  }
}
