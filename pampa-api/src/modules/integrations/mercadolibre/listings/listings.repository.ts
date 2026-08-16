import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import type { MercadoLibreListingData } from '../client/mercadolibre-client.interface';

const listingSelect = {
  id: true,
  ml_item_id: true,
  title: true,
  status: true,
  price: true,
  currency_id: true,
  available_quantity: true,
  sold_quantity: true,
  thumbnail_url: true,
  permalink: true,
  last_synced_at: true,
  mercadolibre_product_link: {
    select: {
      id: true,
      product_id: true,
      product: { select: { id: true, name: true, code: true } },
    },
  },
} satisfies Prisma.mercadolibre_listingSelect;

export type MercadoLibreListingWithLink = Prisma.mercadolibre_listingGetPayload<{
  select: typeof listingSelect;
}>;

interface ListingFilters {
  search?: string;
  status?: string;
  page: number;
  limit: number;
}

@Injectable()
export class MercadoLibreListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, filters: ListingFilters) {
    const where: Prisma.mercadolibre_listingWhereInput = {
      company_id: companyId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { ml_item_id: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mercadolibre_listing.findMany({
        where,
        select: listingSelect,
        orderBy: [{ last_synced_at: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.mercadolibre_listing.count({ where }),
    ]);

    return { items, total };
  }

  findByIdForCompany(companyId: string, id: string) {
    return this.prisma.mercadolibre_listing.findFirst({
      where: { id, company_id: companyId },
      select: listingSelect,
    });
  }

  async upsertMany(
    companyId: string,
    connectionId: string,
    listings: MercadoLibreListingData[],
  ) {
    await this.prisma.$transaction(
      listings.map((listing) =>
        this.prisma.mercadolibre_listing.upsert({
          where: {
            connection_id_ml_item_id: {
              connection_id: connectionId,
              ml_item_id: listing.itemId,
            },
          },
          create: {
            company_id: companyId,
            connection_id: connectionId,
            ml_item_id: listing.itemId,
            title: listing.title,
            status: listing.status,
            price: listing.price,
            currency_id: listing.currencyId,
            available_quantity: listing.availableQuantity,
            sold_quantity: listing.soldQuantity,
            thumbnail_url: listing.thumbnailUrl,
            permalink: listing.permalink,
          },
          update: {
            title: listing.title,
            status: listing.status,
            price: listing.price,
            currency_id: listing.currencyId,
            available_quantity: listing.availableQuantity,
            sold_quantity: listing.soldQuantity,
            thumbnail_url: listing.thumbnailUrl,
            permalink: listing.permalink,
            last_synced_at: new Date(),
          },
        }),
      ),
    );
  }

  findListingForCompany(companyId: string, listingId: string) {
    return this.prisma.mercadolibre_listing.findFirst({
      where: { id: listingId, company_id: companyId },
      select: { id: true },
    });
  }

  findLinkByListing(companyId: string, listingId: string) {
    return this.prisma.mercadolibre_product_link.findFirst({
      where: { listing_id: listingId, company_id: companyId },
    });
  }

  createLink(companyId: string, listingId: string, productId: string) {
    return this.prisma.mercadolibre_product_link.create({
      data: { company_id: companyId, listing_id: listingId, product_id: productId },
    });
  }

  async unlink(companyId: string, listingId: string) {
    await this.prisma.mercadolibre_product_link.deleteMany({
      where: { listing_id: listingId, company_id: companyId },
    });
  }
}
