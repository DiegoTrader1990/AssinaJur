import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { maskCpf, maskPhone } from '@/lib/pdfCertificate';

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
          select: { eventType: true, description: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Código de verificação de autenticidade não encontrado.' }, { status: 404 });
    }

    // Mascaramento de dados em conformidade com a LGPD — a página pública nunca expõe
    // CPF completo, telefone completo, fotos de selfie ou coordenadas exatas de
    // geolocalização (isso fica reservado ao certificado em PDF, de posse do escritório
    // e do próprio signatário).
    const maskedSigners = document.signers.map((s) => ({
      name: s.name,
      role: s.role,
      maskedCpf: maskCpf(s.cpf),
      maskedPhone: maskPhone(s.phone),
      status: s.status,
      signedAt: s.signedAt,
      signatureType: s.signatureType,
      livenessVerified: Boolean(s.selfieCenterImage),
      approximateLocation:
        s.geoCity || s.geoState
          ? `${s.geoCity || ''}${s.geoCity && s.geoState ? '/' : ''}${s.geoState || ''}`
          : null,
    }));

    const auditTrail = document.events.map((ev) => ({
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
      signers: maskedSigners,
      auditTrail,
    });
  } catch (error: any) {
    console.error('Erro na verificação pública de autenticidade:', error);
    return NextResponse.json({ error: 'Erro ao verificar código de autenticidade.' }, { status: 500 });
  }
}
