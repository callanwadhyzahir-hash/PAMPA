import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../auth/decorators/public.decorator';
import { StorefrontProductQueryDto } from './dto/storefront-product-query.dto';
import { SubmitOrderDto } from './dto/submit-order.dto';
import { StorefrontService } from './storefront.service';

@ApiTags('Public Storefront')
@Public()
@Controller('storefront/:slug')
export class StorefrontController {
  constructor(private readonly service: StorefrontService) {}

  @Get()
  getCatalog(@Param('slug') slug: string) {
    return this.service.getCatalog(slug);
  }

  @Get('categories')
  listCategories(@Param('slug') slug: string) {
    return this.service.listCategories(slug);
  }

  @Get('products')
  listProducts(
    @Param('slug') slug: string,
    @Query() query: StorefrontProductQueryDto,
  ) {
    return this.service.listProducts(slug, query);
  }

  @Get('products/:productId')
  getProduct(
    @Param('slug') slug: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.service.getProduct(slug, productId);
  }

  @Post('orders')
  submitOrder(
    @Param('slug') slug: string,
    @Body() input: SubmitOrderDto,
    @Req() request: Request,
  ) {
    return this.service.submitOrder(slug, input, this.clientIp(request));
  }

  private clientIp(request: Request): string {
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }
}
