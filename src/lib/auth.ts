import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return 'assinajur-development-only-secret';
  throw new Error('JWT_SECRET não configurado em produção.');
}
export const TOKEN_COOKIE_NAME = 'assinajur_token';

export type UserRole = 'OFFICE_ADMIN' | 'LAWYER' | 'STAFF' | 'VIEWER';

export interface AuthPayload {
  userId: string;
  officeId: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  officeId: string;
  name: string;
  email: string;
  role: UserRole;
  officeName: string;
  permissions: string[];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId || !decoded.officeId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        office: true,
        permissions: true,
      },
    });

    if (!user || !user.active || !user.office.active) {
      return null;
    }

    return {
      id: user.id,
      officeId: user.officeId,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      officeName: user.office.name,
      permissions: user.permissions.map((p) => p.permission),
    };
  } catch (error) {
    console.error('Erro ao resolver sessão do usuário:', error);
    return null;
  }
}

export function checkPermission(user: AuthUser, requiredPermission: string): boolean {
  if (user.role === 'OFFICE_ADMIN') return true;
  return user.permissions.includes(requiredPermission);
}
