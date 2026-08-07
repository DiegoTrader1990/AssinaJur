import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const query = searchParams.get('q') || '';

    const documents = await prisma.document.findMany({
      where: {
        officeId: user.officeId, // MULTI-TENANT ISOLATION
        AND: [
          status ? { status } : {},
          query
            ? {
                OR: [
                  { title: { contains: query } },
                  { client: { name: { contains: query } } },
                  { client: { cpfCnpj: { contains: query } } },
                ],
              }
            : {},
        ],
      },
      include: {
        client: {
          select: { id: true, name: true, cpfCnpj: true, phone: true, email: true },
        },
        signers: {
          orderBy: { signatureOrder: 'asc' },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Erro ao listar documentos:', error);
    return NextResponse.json({ error: 'Erro ao carregar lista de documentos.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      documentType,
      originalFileId,
      originalHash,
      clientId,
      expirationDate,
      customMessage,
      signers,
    } = body;

    if (!title || !originalFileId || !originalHash || !signers || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json(
        { error: 'Título, arquivo PDF e ao menos 1 signatário são obrigatórios.' },
        { status: 400 }
      );
    }

    // Criar documento e signatários em transação
    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          officeId: user.officeId,
          clientId: clientId || null,
          title,
          documentType: documentType || 'Não informado',
          originalFileId,
          originalHash,
          status: 'PRONTO_PARA_ENVIO',
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          customMessage: customMessage || null,
          createdById: user.id,
        },
      });

      const signerRecords = [];
      for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        const createdSigner = await tx.signer.create({
          data: {
            documentId: doc.id,
            name: s.name,
            cpf: s.cpf.replace(/\D/g, ''),
            email: s.email || null,
            phone: s.phone || null,
            role: s.role || 'CLIENTE',
            signatureOrder: s.signatureOrder || i + 1,
            status: 'PENDENTE',
            authMethod: s.authMethod || 'EMAIL_OTP_CPF',
          },
        });
        signerRecords.push(createdSigner);
      }

      await tx.documentEvent.create({
        data: {
          documentId: doc.id,
          userId: user.id,
          eventType: 'DOCUMENT_CREATED',
          description: `Documento "${doc.title}" criado por ${user.name}.`,
        },
      });

      return { doc, signerRecords };
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'DOCUMENT_CREATED',
      description: `Documento ${result.doc.title} cadastrado e pronto para envio.`,
    });

    return NextResponse.json({
      success: true,
      document: result.doc,
      signers: result.signerRecords,
    });
  } catch (error: any) {
    console.error('Erro ao criar documento:', error);
    return NextResponse.json({ error: 'Erro ao criar documento: ' + (error?.message || '') }, { status: 500 });
  }
}
