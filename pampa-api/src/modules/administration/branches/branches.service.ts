import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchRepository } from './repositories/branch.repository';

@Injectable()
export class BranchesService {
  constructor(private readonly repository: BranchRepository) {}

  findAll(context: SecurityContext) {
    return this.repository.findAll(context.companyId);
  }

  async findOne(context: SecurityContext, id: string) {
    const branch = await this.repository.findById(context.companyId, id);
    if (!branch) throw new NotFoundException('Sucursal no encontrada.');
    return branch;
  }

  async create(context: SecurityContext, input: CreateBranchDto) {
    const code = input.code.trim().toUpperCase();
    await this.assertUniqueCode(context.companyId, code);
    await this.assertCity(input.address.cityId);
    if (
      input.isMain &&
      (await this.repository.findActiveMain(context.companyId))
    ) {
      throw new ConflictException(
        'La empresa ya tiene una sucursal principal activa.',
      );
    }

    try {
      return await this.repository.create(context.companyId, {
        name: input.name.trim(),
        code,
        email: input.email?.trim().toLowerCase(),
        phone: input.phone?.trim(),
        isMain: input.isMain ?? false,
        address: this.normalizeAddress(input.address),
      });
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async update(context: SecurityContext, id: string, input: UpdateBranchDto) {
    const current = await this.findOne(context, id);
    let effectiveInput = input;
    if (input.isActive === false) {
      await this.deactivate(context, id);
      effectiveInput = {
        name: input.name,
        code: input.code,
        email: input.email,
        phone: input.phone,
        address: input.address,
      };
      if (Object.values(effectiveInput).every((value) => value === undefined)) {
        return this.findOne(context, id);
      }
    }
    if (current.is_main && effectiveInput.isMain === false) {
      throw new ConflictException(
        'Marcá primero otra sucursal activa como principal.',
      );
    }

    const code = effectiveInput.code?.trim().toUpperCase();
    if (code) await this.assertUniqueCode(context.companyId, code, id);
    if (effectiveInput.address) {
      await this.assertCity(effectiveInput.address.cityId);
    }

    try {
      const updated = await this.repository.update(context.companyId, id, {
        name: effectiveInput.name?.trim(),
        code,
        email:
          effectiveInput.email?.trim().toLowerCase() ?? effectiveInput.email,
        phone: effectiveInput.phone?.trim() ?? effectiveInput.phone,
        isMain: effectiveInput.isMain,
        isActive: effectiveInput.isActive,
        address: effectiveInput.address
          ? this.normalizeAddress(effectiveInput.address)
          : undefined,
      });
      if (!updated) throw new NotFoundException('Sucursal no encontrada.');
      return updated;
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async deactivate(context: SecurityContext, id: string) {
    const result = await this.repository.deactivate(context.companyId, id);
    switch (result.status) {
      case 'NOT_FOUND':
        throw new NotFoundException('Sucursal no encontrada.');
      case 'LAST_MAIN':
        throw new ConflictException(
          'Marcá primero otra sucursal activa como principal.',
        );
      case 'DEACTIVATED':
        return;
    }
  }

  private async assertUniqueCode(
    companyId: string,
    code: string,
    excludeId?: string,
  ) {
    if (await this.repository.findByCode(companyId, code, excludeId)) {
      throw new ConflictException(
        'Ya existe una sucursal con ese código en la empresa.',
      );
    }
  }

  private async assertCity(cityId: string) {
    if (!(await this.repository.findActiveCity(cityId))) {
      throw new NotFoundException('Ciudad no encontrada.');
    }
  }

  private normalizeAddress<
    T extends {
      cityId: string;
      street: string;
      number?: string;
      floor?: string;
      apartment?: string;
      neighborhood?: string;
      zipCode?: string;
      observations?: string;
    },
  >(address: T) {
    return {
      cityId: address.cityId,
      street: address.street.trim(),
      number: address.number?.trim(),
      floor: address.floor?.trim(),
      apartment: address.apartment?.trim(),
      neighborhood: address.neighborhood?.trim(),
      zipCode: address.zipCode?.trim(),
      observations: address.observations?.trim(),
    };
  }

  private mapConstraintError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'El código o la sucursal principal entran en conflicto.',
      );
    }
    throw error;
  }
}
