export class PermissionEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly module: string,
    public readonly action: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
