import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { maskCpf } from '@/lib/pdfCertificate';

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
            role: true,
            status: true,
            signedAt: true,
            signatureType: true,
          },
          orderBy: { signatureOrder: 'asc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Código de verificação de autenticidade não encontrado.' }, { status: 404 });
    }

    // Mascaramento de dados em conformidade com a LGPD
    const maskedSigners = document.signers.map((s) => ({
      name: s.name,
      role: s.role,
      maskedCpf: maskCpf(s.cpf),
      status: s.status,
      signedAt: s.signedAt,
      signatureType: s.signatureType,
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
    });
  } catch (error: any) {
    console.error('Erro na verificação pública de autenticidade:', error);
    return NextResponse.json({ error: 'Erro ao verificar código de autenticidade.' }, { status: 500 });
  }
}
