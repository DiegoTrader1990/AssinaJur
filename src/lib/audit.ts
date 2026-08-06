import { prisma } from './prisma';

export interface AuditParams {
  officeId: string;
  userId?: string;
  eventType: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export async function logAuditEvent(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        officeId: params.officeId,
        userId: params.userId || null,
        eventType: params.eventType,
        description: params.description,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Falha ao registrar log de auditoria:', error);
  }
}
