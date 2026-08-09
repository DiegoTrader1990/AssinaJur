import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { getFileBuffer } from '@/lib/storage';
import { calculateHash } from '@/lib/pdfHash';

export const dynamic = 'force-dynamic';

function hasValidCpfCnpjCheckDigits(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (![11, 14].includes(digits.length) || /^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11) {
    const digit = (length: number) => {
      const sum = digits.slice(0, length).split('').reduce((total, current, index) => total + Number(current) * (length + 1 - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return digit(9) === Number(digits[9]) && digit(10) === Number(digits[10]);
  }
  const digit = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const remainder = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return digit(12) === Number(digits[12]) && digit(13) === Number(digits[13]);
}

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
        tags: {
          select: { id: true, name: true, color: true },
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
      signaturePosition,
      originalFileId,
      clientId,
      expirationDate,
      customMessage,
      signers,
      isIlliterate,
      rogoName,
      rogoCpf,
      rogoRelationship,
    } = body;

    if (!title || !originalFileId || !signers || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json(
        { error: 'Título, arquivo PDF e ao menos 1 signatário são obrigatórios.' },
        { status: 400 }
      );
    }

    const [office, originalFile, linkedClient] = await Promise.all([
      prisma.office.findUnique({ where: { id: user.officeId } }),
      prisma.storageFile.findFirst({ where: { id: originalFileId, officeId: user.officeId } }),
      clientId ? prisma.client.findFirst({ where: { id: clientId, officeId: user.officeId } }) : Promise.resolve(null),
    ]);
    if (!office || office.planStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'O plano do escritório está inativo.' }, { status: 403 });
    }
    if (!originalFile) {
      return NextResponse.json({ error: 'O PDF informado não pertence a este escritório.' }, { status: 400 });
    }
    const originalBuffer = await getFileBuffer(user.officeId, originalFile.storageKey);
    if (!originalBuffer) {
      return NextResponse.json({ error: 'O PDF original não foi encontrado no armazenamento.' }, { status: 400 });
    }
    const verifiedOriginalHash = calculateHash(originalBuffer);
    if (clientId && !linkedClient) {
      return NextResponse.json({ error: 'O cliente informado não pertence a este escritório.' }, { status: 400 });
    }
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthDocsCount = await prisma.document.count({ where: { officeId: user.officeId, createdAt: { gte: firstDayOfMonth } } });
    if (monthDocsCount >= office.monthlyDocLimit + office.additionalCredits) {
      return NextResponse.json({ error: 'O limite mensal de documentos do plano foi atingido.' }, { status: 403 });
    }
    if (signers.some((signer: any) => !signer?.name || !hasValidCpfCnpjCheckDigits(String(signer?.cpf || '')))) {
      return NextResponse.json({ error: 'Todos os signatários precisam ter nome e CPF/CNPJ válido.' }, { status: 400 });
    }

    // Criar documento e signatários em transação
    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          officeId: user.officeId,
          clientId: clientId || null,
          title,
          documentType: documentType || 'Não informado',
          signaturePosition: signaturePosition || 'BOTTOM',
          originalFileId,
          originalHash: verifiedOriginalHash,
          status: 'PRONTO_PARA_ENVIO',
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          customMessage: customMessage || null,
          createdById: user.id,
          isIlliterate: !!isIlliterate,
          rogoName: rogoName || null,
          rogoCpf: rogoCpf ? rogoCpf.replace(/\D/g, '') : null,
          rogoRelationship: rogoRelationship || null,
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
