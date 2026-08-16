import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';
import type { SecurityContext } from '../../../auth/types/security-context';
import { MercadoLibreLinkConflictError } from '../mercadolibre.errors';
import { ListingQueryDto } from './dto/listing-query.dto';
import { MercadoLibreListingRepository } from './listings.repository';

@Injectable()
export class MercadoLibreListingsService {
  constructor(
    private readonly repository: MercadoLibreListingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(context: SecurityContext, query: ListingQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.findAll(context.companyId, {
      search: query.search,
      status: query.status,
      page,
      limit,
    });
    return {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  async link(context: SecurityContext, listingId: string, productId: string) {
    const listing = await this.repository.findListingForCompany(
      context.companyId,
      listingId,
    );
    if (!listing) throw new NotFoundException('Publicación no encontrada.');

    const product = await this.prisma.product.findFirst({
      where: { id: productId, company_id: context.companyId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado.');

    const existing = await this.repository.findLinkByListing(
      context.companyId,
      listingId,
    );
    if (existing) {
      if (existing.product_id === productId) return existing;
      throw new MercadoLibreLinkConflictError();
    }

    return this.repository.createLink(context.companyId, listingId, productId);
  }

  async unlink(context: SecurityContext, listingId: string) {
    const listing = await this.repository.findListingForCompany(
      context.companyId,
      listingId,
    );
    if (!listing) throw new NotFoundException('Publicación no encontrada.');
    await this.repository.unlink(context.companyId, listingId);
  }
}
