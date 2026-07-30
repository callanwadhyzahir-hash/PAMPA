import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { CitiesService } from './cities.service';

@ApiTags('Cities')
@ApiCookieAuth('pampa_access')
@Controller('cities')
export class CitiesController {
  constructor(private readonly service: CitiesService) {}

  @Get()
  @RequirePermissions('branches.read')
  findAll() {
    return this.service.findAll();
  }
}
