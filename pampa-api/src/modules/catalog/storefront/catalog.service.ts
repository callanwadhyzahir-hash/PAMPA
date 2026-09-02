import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { SecurityContext } from '../../auth/types/security-context';
import { UpsertCatalogDto } from './dto/upsert-catalog.dto';
import { CatalogRepository } from './repositories/catalog.repository';

const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'dashboard',
  'login',
  'register',
  'app',
  'www',
  'c',
  'catalogo',
  'catalog',
]);

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async getOwn(context: SecurityContext) {
    const catalog = await this.repository.findByCompany(context.companyId);
    const publishedProducts = await this.repository.countVisibleProducts(
      context.companyId,
    );
    return { catalog, publishedProducts, configured: catalog !== null };
  }

  async upsert(context: SecurityContext, input: UpsertCatalogDto) {
    const slug = this.normalizeSlug(input.slug);
    if (RESERVED_SLUGS.has(slug)) {
      throw new ConflictException('Ese enlace está reservado. Elegí otro.');
    }
    const branch = await this.repository.findBranch(
      context.companyId,
      input.branchId,
    );
    if (!branch) throw new NotFoundException('Sucursal no encontrada.');
    const warehouse = await this.repository.findWarehouse(
      context.companyId,
      input.branchId,
      input.warehouseId,
    );
    if (!warehouse) throw new NotFoundException('Depósito no encontrado.');

    const taken = await this.repository.existsSlug(slug, context.companyId);
    if (taken) {
      throw new ConflictException('Ese enlace ya está en uso. Elegí otro.');
    }

    const catalog = await this.repository.upsert(context.companyId, {
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      slug,
      displayName: this.required(input.displayName),
      description: this.optional(input.description),
      whatsapp: this.normalizeWhatsapp(input.whatsapp),
      contactEmail: this.optional(input.contactEmail)?.toLocaleLowerCase(),
      isEnabled: input.isEnabled,
      showPrices: input.showPrices,
      showAvailability: input.showAvailability,
    });
    return catalog;
  }

  private normalizeSlug(value: string) {
    return value
      .trim()
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private required(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private optional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  /**
   * Stores the WhatsApp number as bare digits (country code included, no
   * spaces/dashes/parens) so it can be dropped straight into a wa.me link
   * without re-parsing free-typed input later.
   */
  private normalizeWhatsapp(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;
    const digits = trimmed.replace(/[^\d]/g, '');
    if (digits.length < 8 || digits.length > 15) {
      throw new BadRequestException(
        'El WhatsApp debe tener entre 8 y 15 dígitos, incluyendo el código de país (ej: 5491112345678).',
      );
    }
    return digits;
  }
}
