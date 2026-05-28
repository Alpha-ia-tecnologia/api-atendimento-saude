export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
