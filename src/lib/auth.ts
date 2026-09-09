import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { getJwtSecret } from './server-config';

// Falha já na inicialização (inclusive no build), antes de publicar login sem chave.
const jwtSecret = getJwtSecret();

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
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d', algorithm: 'HS256' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' ||
        typeof payload.userId !== 'string' || !payload.userId ||
        typeof payload.officeId !== 'string' || !payload.officeId ||
        typeof payload.email !== 'string' ||
        !['OFFICE_ADMIN', 'LAWYER', 'STAFF', 'VIEWER'].includes(payload.role)) {
      return null;
    }
    return payload as AuthPayload;
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
      select: {
        id: true,
        officeId: true,
        name: true,
        email: true,
        role: true,
        active: true,
        office: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
        permissions: {
          select: {
            permission: true,
          },
        },
      },
    });

    if (!user || user.officeId !== decoded.officeId || !user.active || !user.office?.active) {
      return null;
    }

    return {
      id: user.id,
      officeId: user.officeId,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      officeName: user.office?.name || 'Escritório',
      permissions: (user.permissions || []).map((p) => p.permission),
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
