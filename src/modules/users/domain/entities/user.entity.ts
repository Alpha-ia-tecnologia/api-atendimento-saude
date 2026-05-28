import { UserStatus } from '@prisma/client';

export class UserEntity {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly email: string,
    public passwordHash: string,
    public status: UserStatus,
    public organizationId: string | null,
    public lastLoginAt: Date | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null,
    public roles: Array<{ id: string; name: string; permissions: string[] }> = [],
  ) {}

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE && this.deletedAt === null;
  }

  allPermissions(): string[] {
    const set = new Set<string>();
    for (const role of this.roles) {
      for (const p of role.permissions) set.add(p);
    }
    return Array.from(set);
  }

  roleNames(): string[] {
    return this.roles.map((r) => r.name);
  }
}
