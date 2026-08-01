import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { RegisterDto } from '../dto/register.dto';
import { RegistrationRepository } from './registration.repository';

@Injectable()
export class RegistrationService {
  constructor(private readonly repository: RegistrationRepository) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.repository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      companyName: dto.companyName,
      taxId: dto.taxId,
      email: dto.email,
      passwordHash,
    });
  }
}
