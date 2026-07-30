import { ForbiddenException } from '@nestjs/common';

import { SystemRolePolicyService } from './system-role-policy.service';

describe('SystemRolePolicyService', () => {
  const service = new SystemRolePolicyService();

  it('blocks mutation of a system role', () => {
    expect(() =>
      service.assertCustomRoleCanBeMutated({
        companyId: 'company-a',
        systemCode: 'OWNER',
        isSystem: true,
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows mutation of a custom role with null system_code', () => {
    expect(() =>
      service.assertCustomRoleCanBeMutated({
        companyId: 'company-a',
        systemCode: null,
        isSystem: false,
      }),
    ).not.toThrow();
  });

  it('blocks cross-tenant role use', () => {
    expect(() =>
      service.assertRoleBelongsToCompany(
        {
          companyId: 'company-b',
          systemCode: null,
          isSystem: false,
        },
        'company-a',
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows OWNER assignment only by another OWNER', () => {
    expect(() =>
      service.assertOwnerAssignmentAllowed(true, false),
    ).not.toThrow();
    expect(() => service.assertOwnerAssignmentAllowed(false, false)).toThrow(
      ForbiddenException,
    );
    expect(() => service.assertOwnerAssignmentAllowed(true, true)).toThrow(
      ForbiddenException,
    );
  });
});
