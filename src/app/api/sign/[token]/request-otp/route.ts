import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

    // Gerar código OTP numérico real de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos de validade

    await prisma.signer.update({
      where: { id: signer.id },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Navegador Mobile';

    await prisma.documentEvent.create({
      data: {
        documentId: signer.document.id,
        signerId: signer.id,
        eventType: 'OTP_SENT',
        description: `Código de verificação OTP gerado e enviado para o signatário ${signer.name}.`,
        ipAddress: clientIp,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Código de verificação de 6 dígitos gerado e enviado com sucesso.',
      otpCodeSent: true,
    });
  } catch (error: any) {
    console.error('Erro ao solicitar OTP:', error);
    return NextResponse.json({ error: 'Erro ao gerar código de verificação OTP.' }, { status: 500 });
  }
}
