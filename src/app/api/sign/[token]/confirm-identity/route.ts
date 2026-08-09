import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Confirma que o CPF informado corresponde ao signatário do link, antes de liberar a
// etapa de prova de presença (selfies). Não envolve mais código OTP: o link já é
// individual e único por signatário, e a prova de presença com 3 selfies + geolocalização
// + IP é um fator de autenticação mais forte do que um código que, no fluxo anterior,
// nunca chegava a ser efetivamente entregue ao signatário por e-mail/SMS.
export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const signer = await prisma.signer.findUnique({
      where: { token: params.token },
      include: { document: true },
    });

    if (!signer || !signer.document) {
      return NextResponse.json({ error: 'Signatário não encontrado ou link de assinatura inválido.' }, { status: 404 });
    }

    if (signer.status === 'ASSINADO') {
      return NextResponse.json({ error: 'Você já assinou este documento.' }, { status: 400 });
    }
    if (signer.document.status === 'CANCELADO' || signer.document.status === 'EXPIRADO' || (signer.document.expirationDate && new Date(signer.document.expirationDate).getTime() < Date.now())) {
      return NextResponse.json({ error: 'Este link foi cancelado ou expirou.' }, { status: 400 });
    }

    const body = await req.json();
    const { cpf } = body;

    if (!cpf) {
      return NextResponse.json({ error: 'CPF é obrigatório.' }, { status: 400 });
    }

    const cleanInputCpf = cpf.replace(/\D/g, '');
    const cleanSignerCpf = signer.cpf.replace(/\D/g, '');

    if (cleanInputCpf !== cleanSignerCpf) {
      return NextResponse.json({ error: 'O CPF informado não corresponde ao cadastrado para este signatário.' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Navegador Mobile';

    await prisma.documentEvent.create({
      data: {
        documentId: signer.document.id,
        signerId: signer.id,
        eventType: 'IDENTITY_CONFIRMED',
        description: `CPF confirmado pelo signatário ${signer.name}. Liberada a etapa de prova de presença.`,
        ipAddress: clientIp,
        userAgent,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao confirmar identidade:', error);
    return NextResponse.json({ error: 'Erro ao confirmar identidade.' }, { status: 500 });
  }
}
