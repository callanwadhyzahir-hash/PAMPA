import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientRepository } from './repositories/client.repository';

@Injectable()
export class ClientsService {
  constructor(private readonly repository: ClientRepository) {}

  findAll(context: SecurityContext, search?: string, isActive?: boolean) {
    return this.repository.findAll(
      context.companyId,
      this.optional(search),
      isActive,
    );
  }

  async findOne(context: SecurityContext, id: string) {
    const client = await this.repository.findById(context.companyId, id);
    if (!client) throw new NotFoundException('Cliente no encontrado.');
    return client;
  }

  async create(context: SecurityContext, input: CreateClientDto) {
    const normalized = await this.normalizeAndValidate(context, input);
    try {
      return await this.repository.create(context.companyId, {
        ...normalized,
        code: this.code(input.code),
      } as Prisma.clientUncheckedCreateInput);
    } catch (error) {
      this.mapError(error);
    }
  }

  async update(context: SecurityContext, id: string, input: UpdateClientDto) {
    await this.findOne(context, id);
    const normalized = await this.normalizeAndValidate(context, input, id);
    try {
      const client = await this.repository.update(
        context.companyId,
        id,
        normalized,
      );
      if (!client) throw new NotFoundException('Cliente no encontrado.');
      return client;
    } catch (error) {
      this.mapError(error);
    }
  }

  async deactivate(context: SecurityContext, id: string) {
    const client = await this.repository.deactivate(context.companyId, id);
    if (!client) throw new NotFoundException('Cliente no encontrado.');
    return client;
  }

  async sales(context: SecurityContext, id: string) {
    await this.findOne(context, id);
    return this.repository.sales(context.companyId, id);
  }

  async account(context: SecurityContext, id: string) {
    const client = await this.findOne(context, id);
    const sales = await this.repository.sales(context.companyId, id);
    const salesTotal = sales
      .filter((sale) => sale.status !== 'CANCELLED')
      .reduce((total, sale) => total.plus(sale.total), new Prisma.Decimal(0));
    const paidTotal = sales.reduce(
      (total, sale) =>
        total.plus(
          sale.payment
            .filter((payment) => payment.status === 'COMPLETED')
            .reduce(
              (payments, payment) => payments.plus(payment.total),
              new Prisma.Decimal(0),
            ),
        ),
      new Prisma.Decimal(0),
    );
    return {
      clientId: client.id,
      salesTotal,
      paidTotal,
      balance: salesTotal.minus(paidTotal),
      creditLimit: client.credit_limit,
    };
  }

  private async normalizeAndValidate(
    context: SecurityContext,
    input: UpdateClientDto,
    excludeId?: string,
  ): Promise<Prisma.clientUncheckedUpdateManyInput> {
    const code = input.code ? this.code(input.code) : undefined;
    const taxId = input.taxId ? input.taxId.replace(/\D/g, '') : undefined;
    if (code || taxId) {
      const duplicate = await this.repository.findByCodeOrTaxId(
        context.companyId,
        code,
        taxId,
        excludeId,
      );
      if (duplicate?.code.toLocaleUpperCase() === code) {
        throw new ConflictException('Ya existe un cliente con ese código.');
      }
      if (duplicate) {
        throw new ConflictException(
          'Ya existe un cliente con ese CUIT o documento.',
        );
      }
    }
    if (
      input.addressId &&
      !(await this.repository.findAddress(input.addressId))
    ) {
      throw new NotFoundException('Dirección no encontrada.');
    }
    return {
      code,
      first_name: this.optional(input.firstName),
      last_name: this.optional(input.lastName),
      business_name: this.optional(input.businessName ?? input.legalName),
      tax_id: taxId,
      email: this.optional(input.email)?.toLocaleLowerCase(),
      phone: this.optional(input.phone),
      mobile: this.optional(input.mobile),
      is_company: input.isCompany,
      address_id: input.addressId,
      credit_limit:
        input.creditLimit === undefined
          ? undefined
          : new Prisma.Decimal(input.creditLimit),
      notes: this.optional(input.notes),
      is_active: input.isActive,
    };
  }

  private optional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private code(value: string) {
    return value.trim().replace(/\s+/g, '').toLocaleUpperCase();
  }

  private mapError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('El cliente ya existe en la empresa.');
    }
    throw error;
  }
}
