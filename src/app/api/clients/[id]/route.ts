import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const client = await prisma.client.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId, // INJEÇÃO RIGOROSA DO TENANT
      },
      include: {
        lawyerInCharge: {
          select: { id: true, name: true, oabNumber: true, email: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json({ error: 'Erro ao carregar detalhes do cliente.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Verificar se o cliente pertence a este escritório
    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const body = await req.json();

    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: body.name ?? existingClient.name,
        rg: body.rg ?? existingClient.rg,
        issuingOrgan: body.issuingOrgan ?? existingClient.issuingOrgan,
        birthDate: body.birthDate ?? existingClient.birthDate,
        nationality: body.nationality ?? existingClient.nationality,
        maritalStatus: body.maritalStatus ?? existingClient.maritalStatus,
        profession: body.profession ?? existingClient.profession,
        phone: body.phone ?? existingClient.phone,
        whatsapp: body.whatsapp ?? existingClient.whatsapp,
        email: body.email ?? existingClient.email,
        cep: body.cep ?? existingClient.cep,
        address: body.address ?? existingClient.address,
        number: body.number ?? existingClient.number,
        complement: body.complement ?? existingClient.complement,
        neighborhood: body.neighborhood ?? existingClient.neighborhood,
        city: body.city ?? existingClient.city,
        state: body.state ?? existingClient.state,
        legalRepresentative: body.legalRepresentative ?? existingClient.legalRepresentative,
        financialResponsible: body.financialResponsible ?? existingClient.financialResponsible,
        notes: body.notes ?? existingClient.notes,
        legalArea: body.legalArea ?? existingClient.legalArea,
        lawyerInChargeId: body.lawyerInChargeId ?? existingClient.lawyerInChargeId,
        processNumber: body.processNumber ?? existingClient.processNumber,
      },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'CLIENT_UPDATED',
      description: `Cadastro do cliente ${updatedClient.name} atualizado.`,
    });

    return NextResponse.json({ success: true, client: updatedClient });
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cadastro do cliente.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        id: params.id,
        officeId: user.officeId,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
    }

    await prisma.client.delete({
      where: { id: params.id },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'CLIENT_DELETED',
      description: `Cliente ${existingClient.name} (${existingClient.cpfCnpj}) removido.`,
    });

    return NextResponse.json({ success: true, message: 'Cliente excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json({ error: 'Erro ao excluir cliente.' }, { status: 500 });
  }
}
