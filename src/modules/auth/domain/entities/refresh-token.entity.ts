export class RefreshTokenEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly sessionId: string,
    public readonly expiresAt: Date,
    public readonly revokedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isActive(now: Date = new Date()): boolean {
    return !this.revokedAt && this.expiresAt.getTime() > now.getTime();
  }
}
