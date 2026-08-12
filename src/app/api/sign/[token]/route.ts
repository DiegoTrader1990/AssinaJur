import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSignatureOrderBlock, signatureOrderError } from '@/lib/signatureOrder';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const signer = await prisma.signer.findUnique({
      where: { token: params.token },
      include: {
        document: {
          include: {
            office: {
              select: {
                id: true,
                name: true,
                tradeName: true,
                logoUrl: true,
                primaryColor: true,
                secondaryColor: true,
                phone: true,
                email: true,
                welcomeMessage: true,
              },
            },
            originalFile: {
              select: { mimeType: true },
            },
            signers: {
              select: {
                id: true,
                name: true,
                role: true,
                status: true,
                signatureOrder: true,
              },
              orderBy: { signatureOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!signer || !signer.document) {
      return NextResponse.json({ error: 'Link de assinatura inválido ou não encontrado.' }, { status: 404 });
    }

    const { document } = signer;
    const kitDocuments = document.kitBatchId && signer.role === 'CLIENTE'
      ? await prisma.document.findMany({
          where: { kitBatchId: document.kitBatchId, clientId: document.clientId },
          select: {
            id: true, title: true, status: true,
            signers: { select: { id: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    if (document.status === 'CANCELADO') {
      return NextResponse.json({ error: 'Este documento foi cancelado pelo escritório responsável.' }, { status: 400 });
    }

    if (document.status === 'EXPIRADO') {
      return NextResponse.json({ error: 'O prazo de validade deste link de assinatura expirou.' }, { status: 400 });
    }
    if (document.expirationDate && new Date(document.expirationDate).getTime() < Date.now()) {
      await prisma.document.update({ where: { id: document.id }, data: { status: 'EXPIRADO' } });
      return NextResponse.json({ error: 'O prazo de validade deste link de assinatura expirou.' }, { status: 400 });
    }

    const blocker = await getSignatureOrderBlock(document.id, signer.id);
    if (blocker) {
      return NextResponse.json({ error: signatureOrderError(blocker), orderEnforced: true, waitingFor: blocker.name }, { status: 409 });
    }

    // Registrar evento de abertura do link (primeira visualização)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Mobile Browser';

    if (signer.status === 'PENDENTE') {
      await prisma.signer.update({
        where: { id: signer.id },
        data: { status: 'VISUALIZADO' },
      });

      if (document.status === 'ENVIADO') {
        await prisma.document.update({
          where: { id: document.id },
          data: { status: 'VISUALIZADO' },
        });
      }

      await prisma.documentEvent.create({
        data: {
          documentId: document.id,
          signerId: signer.id,
          eventType: 'LINK_OPENED',
          description: `Link seguro aberto pelo signatário ${signer.name} (${signer.role}).`,
          ipAddress: clientIp,
          userAgent,
        },
      });

      // A mesma abertura dá início à sessão única do pacote. Registramos a abertura
      // também em cada documento complementar, usando o respectivo signatário,
      // para que os certificados individuais tenham uma trilha completa e verdadeira.
      if (kitDocuments.length > 1) {
        const companionEvents = kitDocuments
          .filter((item) => item.id !== document.id)
          .map((item) => {
            const companionSigner = item.signers.find((candidate) => candidate.role === 'CLIENTE');
            return companionSigner ? {
              documentId: item.id,
              signerId: companionSigner.id,
              eventType: 'LINK_OPENED',
              description: `Link seguro da sessão única acessado por ${signer.name}; documento disponibilizado para leitura e assinatura.`,
              ipAddress: clientIp,
              userAgent,
            } : null;
          })
          .filter(Boolean) as Array<any>;
        if (companionEvents.length) await prisma.documentEvent.createMany({ data: companionEvents });
      }
    }

    // Retorna payload público seguro (sem segredos de autenticação)
    return NextResponse.json({
      signer: {
        id: signer.id,
        name: signer.name,
        cpf: signer.cpf,
        email: signer.email,
        phone: signer.phone,
        role: signer.role,
        status: signer.status,
        signatureOrder: signer.signatureOrder,
      },
      office: document.office,
      document: {
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        customMessage: document.customMessage,
        status: document.status,
        originalHash: document.originalHash,
        isIlliterate: document.isIlliterate,
        rogoName: document.rogoName,
        rogoCpf: document.rogoCpf,
        rogoRelationship: document.rogoRelationship,
        signers: document.signers,
        pdfUrl: `/api/sign/${params.token}/document`,
        mimeType: document.originalFile?.mimeType || 'application/pdf',
      },
      kit: kitDocuments.length > 1 ? { documents: kitDocuments } : null,
    });
  } catch (error: any) {
    console.error('Erro na rota pública de assinatura:', error);
    return NextResponse.json({ error: 'Erro ao carregar documento para assinatura.' }, { status: 500 });
  }
}
