import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import type { TransactionClient } from '../../../inventory/stock/repositories/stock.repository';

const clientSelect = {
  id: true,
  code: true,
  first_name: true,
  last_name: true,
  business_name: true,
  tax_id: true,
  email: true,
  phone: true,
  mobile: true,
  is_company: true,
  credit_limit: true,
  current_balance: true,
  notes: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  address: {
    select: {
      id: true,
      street: true,
      number: true,
      zip_code: true,
      city: {
        select: {
          id: true,
          name: true,
          state: { select: { id: true, name: true } },
        },
      },
    },
  },
  _count: { select: { sale: true } },
} satisfies Prisma.clientSelect;

@Injectable()
export class ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string, search?: string, isActive?: boolean) {
    return this.prisma.client.findMany({
      where: {
        company_id: companyId,
        ...(isActive === undefined ? {} : { is_active: isActive }),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { business_name: { contains: search, mode: 'insensitive' } },
                { tax_id: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: clientSelect,
      orderBy: [
        { is_active: 'desc' },
        { business_name: 'asc' },
        { last_name: 'asc' },
      ],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.client.findFirst({
      where: { id, company_id: companyId },
      select: clientSelect,
    });
  }

  findByCodeOrTaxId(
    companyId: string,
    code?: string,
    taxId?: string,
    excludeId?: string,
  ) {
    return this.prisma.client.findFirst({
      where: {
        company_id: companyId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [
          ...(code
            ? [{ code: { equals: code, mode: 'insensitive' as const } }]
            : []),
          ...(taxId ? [{ tax_id: taxId }] : []),
        ],
      },
      select: { id: true, code: true, tax_id: true },
    });
  }

  findByPhoneOrEmail(companyId: string, phone?: string, email?: string) {
    if (!phone && !email) return Promise.resolve(null);
    return this.prisma.client.findFirst({
      where: {
        company_id: companyId,
        is_active: true,
        OR: [
          ...(phone ? [{ phone }, { mobile: phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: clientSelect,
    });
  }

  countByCompany(companyId: string) {
    return this.prisma.client.count({ where: { company_id: companyId } });
  }

  findByPhoneOrEmailTx(
    tx: TransactionClient,
    companyId: string,
    phone?: string,
    email?: string,
  ) {
    if (!phone && !email) return Promise.resolve(null);
    return tx.client.findFirst({
      where: {
        company_id: companyId,
        is_active: true,
        OR: [
          ...(phone ? [{ phone }, { mobile: phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: clientSelect,
    });
  }

  createTx(
    tx: TransactionClient,
    companyId: string,
    data: Omit<Prisma.clientUncheckedCreateInput, 'company_id'>,
  ) {
    return tx.client.create({
      data: { ...data, company_id: companyId },
      select: clientSelect,
    });
  }

  findAddress(id: string) {
    return this.prisma.address.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  create(companyId: string, data: Prisma.clientUncheckedCreateInput) {
    return this.prisma.client.create({
      data: { ...data, company_id: companyId },
      select: clientSelect,
    });
  }

  async update(
    companyId: string,
    id: string,
    data: Prisma.clientUncheckedUpdateManyInput,
  ) {
    const result = await this.prisma.client.updateMany({
      where: { id, company_id: companyId },
      data,
    });
    return result.count === 1 ? this.findById(companyId, id) : null;
  }

  deactivate(companyId: string, id: string) {
    return this.update(companyId, id, { is_active: false });
  }

  sales(companyId: string, clientId: string) {
    return this.prisma.sale.findMany({
      where: { company_id: companyId, client_id: clientId },
      select: {
        id: true,
        sale_number: true,
        sale_date: true,
        total: true,
        status: true,
        branch: { select: { id: true, name: true, code: true } },
        payment: {
          select: {
            id: true,
            total: true,
            payment_date: true,
            status: true,
          },
        },
      },
      orderBy: { sale_date: 'desc' },
    });
  }
}
