import { Injectable } from '@nestjs/common';

import { PlatformAdminRepository } from './platform-admin.repository';

@Injectable()
export class PlatformAdminBootstrapService {
  constructor(private readonly repository: PlatformAdminRepository) {}

  async bootstrapByEmail(email: string) {
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      throw new Error('USER_NOT_FOUND: no existe un usuario con ese correo.');
    }

    const existing = await this.repository.findPlatformAdminByUserId(user.id);
    if (existing) {
      return {
        alreadyPlatformAdmin: true,
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`,
        companyName: user.company.name,
      };
    }

    await this.repository.createPlatformAdmin(user.id);
    return {
      alreadyPlatformAdmin: false,
      userId: user.id,
      userName: `${user.first_name} ${user.last_name}`,
      companyName: user.company.name,
    };
  }
}
