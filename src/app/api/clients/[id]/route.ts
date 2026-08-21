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
        processes: {
          select: {
            id: true,
            title: true,
            legalArea: true,
            status: true,
            priority: true,
            dueDate: true,
            protocolNumber: true,
            lastActivityAt: true,
            _count: { select: { documents: true, attachments: true } },
          },
          orderBy: { lastActivityAt: 'desc' },
        },
        documents: {
          select: {
            id: true,
            title: true,
            status: true,
            completedAt: true,
            createdAt: true,
            process: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        pendencies: {
          where: { resolvedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            category: true,
            priority: true,
            dueDate: true,
            updatedAt: true,
            responsible: { select: { id: true, name: true } },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
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
    const cleanCpfCnpj = String(body.cpfCnpj ?? existingClient.cpfCnpj).replace(/\D/g, '');
    const cleanPhone = String(body.phone ?? existingClient.phone).replace(/\D/g, '');

    if (!body.name?.trim() || ![11, 14].includes(cleanCpfCnpj.length)) {
      return NextResponse.json({ error: 'Informe nome e CPF/CNPJ válidos.' }, { status: 400 });
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return NextResponse.json({ error: 'Informe um telefone/WhatsApp válido com DDD.' }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Informe um endereço de e-mail válido.' }, { status: 400 });
    }
    const cleanRepresentativeCpf = String(body.representativeCpf ?? existingClient.representativeCpf ?? '').replace(/\D/g, '');
    const cleanRepresentativePhone = String(body.representativePhone ?? existingClient.representativePhone ?? '').replace(/\D/g, '');
    const representativeName = String(body.legalRepresentative ?? existingClient.legalRepresentative ?? '').trim();
    if (representativeName && cleanRepresentativeCpf.length !== 11) {
      return NextResponse.json({ error: 'Informe o CPF válido do representante legal.' }, { status: 400 });
    }
    if (representativeName && cleanRepresentativePhone && (cleanRepresentativePhone.length < 10 || cleanRepresentativePhone.length > 13)) {
      return NextResponse.json({ error: 'Informe um telefone válido do representante legal.' }, { status: 400 });
    }
    // Endereço do próprio cliente (usado quando o representante mora com ele).
    const bodyAddress = body.address ?? existingClient.address;
    const bodyNumber = body.number ?? existingClient.number;
    const bodyComplement = body.complement ?? existingClient.complement;
    const bodyNeighborhood = body.neighborhood ?? existingClient.neighborhood;
    const bodyCity = body.city ?? existingClient.city;
    const bodyState = body.state ?? existingClient.state;
    const bodyCep = body.cep ?? existingClient.cep;
    const ownAddressText = [
      bodyAddress,
      bodyNumber && !String(bodyAddress || '').includes(bodyNumber) ? `nº ${bodyNumber}` : '',
      bodyComplement,
      bodyNeighborhood,
      [bodyCity, bodyState].filter(Boolean).join('/'),
      bodyCep ? `CEP ${bodyCep}` : '',
    ].filter(Boolean).join(', ');
    const representativeSameAddress = body.representativeSameAddress ?? existingClient.representativeSameAddress;
    const resolvedRepresentativeAddress = representativeSameAddress ? ownAddressText : (body.representativeAddress ?? existingClient.representativeAddress);

    const duplicateClient = await prisma.client.findFirst({
      where: {
        officeId: user.officeId,
        cpfCnpj: cleanCpfCnpj,
        id: { not: params.id },
      },
      select: { id: true },
    });
    if (duplicateClient) {
      return NextResponse.json({ error: 'Já existe outro cliente com este CPF/CNPJ no escritório.' }, { status: 409 });
    }

    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: body.name.trim(),
        cpfCnpj: cleanCpfCnpj,
        rg: body.rg ?? existingClient.rg,
        issuingOrgan: body.issuingOrgan ?? existingClient.issuingOrgan,
        birthDate: body.birthDate ?? existingClient.birthDate,
        nationality: body.nationality ?? existingClient.nationality,
        gender: ['MASCULINO', 'FEMININO'].includes(body.gender) ? body.gender : null,
        maritalStatus: body.maritalStatus ?? existingClient.maritalStatus,
        profession: body.profession ?? existingClient.profession,
        phone: cleanPhone,
        whatsapp: body.whatsapp ? String(body.whatsapp).replace(/\D/g, '') : cleanPhone,
        email: body.email ?? existingClient.email,
        cep: body.cep ?? existingClient.cep,
        address: body.address ?? existingClient.address,
        number: body.number ?? existingClient.number,
        complement: body.complement ?? existingClient.complement,
        neighborhood: body.neighborhood ?? existingClient.neighborhood,
        city: body.city ?? existingClient.city,
        state: body.state ?? existingClient.state,
        legalRepresentative: body.legalRepresentative ?? existingClient.legalRepresentative,
        representativeCpf: cleanRepresentativeCpf || null,
        representativeRg: body.representativeRg ?? existingClient.representativeRg,
        representativeBirthDate: body.representativeBirthDate ?? existingClient.representativeBirthDate,
        representativeAddress: resolvedRepresentativeAddress || null,
        representativeSameAddress: !!representativeSameAddress,
        representativePhone: cleanRepresentativePhone || null,
        representativeRole: body.representativeRole ?? existingClient.representativeRole,
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
