import * as bcrypt from 'bcrypt';

export async function hashPassword(plain: string, saltRounds: number): Promise<string> {
  return bcrypt.hash(plain, saltRounds);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
