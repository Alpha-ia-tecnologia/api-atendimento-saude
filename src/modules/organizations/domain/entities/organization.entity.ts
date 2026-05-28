import { OrganizationStatus } from '@prisma/client';

export class OrganizationEntity {
  constructor(
    public readonly id: string,
    public name: string,
    public document: string | null,
    public status: OrganizationStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public deletedAt: Date | null,
  ) {}

  isActive(): boolean {
    return this.status === OrganizationStatus.ACTIVE && this.deletedAt === null;
  }
}
