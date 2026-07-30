import { ConflictException, Injectable } from '@nestjs/common';

import { TenantIntegrityRepository } from './tenant-integrity.repository';

@Injectable()
export class TenantIntegrityService {
  constructor(private readonly repository: TenantIntegrityRepository) {}

  async auditOrFail() {
    const result = await this.repository.audit();
    if (Object.values(result).some((count) => count > 0)) {
      throw new ConflictException(
        `Tenant integrity audit failed: ${JSON.stringify(result)}`,
      );
    }
    return result;
  }
}
