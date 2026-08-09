import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatFullCpf, formatFullPhone } from '@/lib/pdfCertificate';
import { dedupePublicAuditEvents } from '@/lib/publicAuditTrail';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: { verificationCode: params.code },
      include: {
        office: {
          select: {
            name: true,
            tradeName: true,
            cpfCnpj: true,
            oabNumber: true,
          },
        },
        signers: {
          select: {
            id: true,
            name: true,
            cpf: true,
            phone: true,
            role: true,
            status: true,
            signedAt: true,
            signatureType: true,
            selfieCenterImage: true,
            geoCity: true,
            geoState: true,
          },
          orderBy: { signatureOrder: 'asc' },
        },
        events: {
          select: { eventType: true, description: true, createdAt: true, signerId: true },
          where: { NOT: { eventType: 'OTP_SENT' } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Código de verificação de autenticidade não encontrado.' }, { status: 404 });
    }

    const formattedSigners = document.signers.map((s) => ({
      name: s.name,
      role: s.role,
      cpf: formatFullCpf(s.cpf),
      phone: formatFullPhone(s.phone),
      status: s.status,
      signedAt: s.signedAt,
      signatureType: s.signatureType,
      livenessVerified: Boolean(s.selfieCenterImage),
      approximateLocation:
        s.geoCity || s.geoState
          ? `${s.geoCity || ''}${s.geoCity && s.geoState ? '/' : ''}${s.geoState || ''}`
          : null,
    }));

    const auditTrail = dedupePublicAuditEvents(document.events).map((ev) => ({
      eventType: ev.eventType,
      description: ev.description,
      createdAt: ev.createdAt,
    }));

    return NextResponse.json({
      valid: true,
      verificationCode: document.verificationCode,
      status: document.status,
      documentTitle: document.title,
      documentType: document.documentType,
      createdAt: document.createdAt,
      completedAt: document.completedAt,
      originalHash: document.originalHash,
      signedHash: document.signedHash,
      office: document.office,
      signers: formattedSigners,
      auditTrail,
    });
  } catch (error: any) {
    console.error('Erro na verificação pública de autenticidade:', error);
    return NextResponse.json({ error: 'Erro ao verificar código de autenticidade.' }, { status: 500 });
  }
}
