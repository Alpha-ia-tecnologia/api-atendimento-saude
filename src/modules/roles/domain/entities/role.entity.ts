import { RoleStatus } from '@prisma/client';

export class RoleEntity {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | null,
    public status: RoleStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null,
    public permissions: Array<{ id: string; name: string }> = [],
  ) {}
}
