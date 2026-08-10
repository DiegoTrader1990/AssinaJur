import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
    });

    if (!office) {
      return NextResponse.json({ error: 'Escritório não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ office });
  } catch (error: any) {
    console.error('Erro ao buscar dados do escritório:', error);
    return NextResponse.json({ error: 'Erro ao carregar escritório.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();

    const updatedOffice = await prisma.office.update({
      where: { id: user.officeId },
      data: {
        name: body.name,
        tradeName: body.tradeName,
        cpfCnpj: body.cpfCnpj,
        oabNumber: body.oabNumber,
        phone: body.phone,
        whatsapp: body.whatsapp,
        email: body.email,
        website: body.website,
        primaryColor: body.primaryColor,
        secondaryColor: body.secondaryColor,
        welcomeMessage: body.welcomeMessage,
        defaultFooter: body.defaultFooter,
        clientEmailMessage: body.clientEmailMessage,
        address: body.address,
      },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'OFFICE_SETTINGS_UPDATED',
      description: 'Configurações institucionais do escritório atualizadas.',
    });

    return NextResponse.json({ success: true, office: updatedOffice });
  } catch (error: any) {
    console.error('Erro ao atualizar escritório:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações do escritório.' }, { status: 500 });
  }
}
