import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const legalArea = searchParams.get('legalArea') || '';

    const clients = await prisma.client.findMany({
      where: {
        officeId: user.officeId, // ISOLAMENTO RIGOROSO MULTI-TENANT
        AND: [
          query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { cpfCnpj: { contains: query, mode: 'insensitive' } },
                  { phone: { contains: query, mode: 'insensitive' } },
                  { email: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {},
          legalArea ? { legalArea } : {},
        ],
      },
      include: {
        lawyerInCharge: {
          select: { id: true, name: true, oabNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error('Erro ao listar clientes:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes.' }, { status: 500 });
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
      name,
      cpfCnpj,
      rg,
      issuingOrgan,
      birthDate,
      nationality,
      gender,
      maritalStatus,
      profession,
      phone,
      whatsapp,
      email,
      cep,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      legalRepresentative,
      representativeCpf,
      representativeRg,
      representativeBirthDate,
      representativeAddress,
      representativeSameAddress,
      representativePhone,
      representativeRole,
      financialResponsible,
      notes,
      legalArea,
      lawyerInChargeId,
      processNumber,
    } = body;

    if (!name || !cpfCnpj || !phone) {
      return NextResponse.json(
        { error: 'Nome, CPF/CNPJ e telefone são campos obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
    const cleanPhone = phone.replace(/\D/g, '');
    if (![11, 14].includes(cleanCpfCnpj.length)) {
      return NextResponse.json({ error: 'Informe um CPF ou CNPJ com a quantidade correta de dígitos.' }, { status: 400 });
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return NextResponse.json({ error: 'Informe um telefone/WhatsApp válido com DDD.' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Informe um endereço de e-mail válido.' }, { status: 400 });
    }
    const cleanRepresentativeCpf = String(representativeCpf || '').replace(/\D/g, '');
    const cleanRepresentativePhone = String(representativePhone || '').replace(/\D/g, '');
    if (legalRepresentative && cleanRepresentativeCpf.length !== 11) {
      return NextResponse.json({ error: 'Informe o CPF válido do representante legal.' }, { status: 400 });
    }
    if (legalRepresentative && cleanRepresentativePhone && (cleanRepresentativePhone.length < 10 || cleanRepresentativePhone.length > 13)) {
      return NextResponse.json({ error: 'Informe um telefone válido do representante legal.' }, { status: 400 });
    }
    // Endereço do próprio cliente (usado quando o representante mora com ele).
    const ownAddressText = [
      address,
      number && !String(address || '').includes(number) ? `nº ${number}` : '',
      complement,
      neighborhood,
      [city, state].filter(Boolean).join('/'),
      cep ? `CEP ${cep}` : '',
    ].filter(Boolean).join(', ');
    const resolvedRepresentativeAddress = representativeSameAddress ? ownAddressText : (representativeAddress || '');
    if (lawyerInChargeId) {
      const lawyer = await prisma.user.findFirst({ where: { id: lawyerInChargeId, officeId: user.officeId, active: true } });
      if (!lawyer) return NextResponse.json({ error: 'O advogado responsável não pertence a este escritório.' }, { status: 400 });
    }

    // Verificar se cliente com mesmo CPF/CNPJ já existe NESTE escritório
    const existingClient = await prisma.client.findUnique({
      where: {
        officeId_cpfCnpj: {
          officeId: user.officeId,
          cpfCnpj: cleanCpfCnpj,
        },
      },
    });

    if (existingClient) {
      return NextResponse.json(
        { error: `Já existe um cliente cadastrado neste escritório com o CPF/CNPJ ${cpfCnpj}.` },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        officeId: user.officeId, // INJEÇÃO OBRIGATÓRIA DE TENANT
        name,
        cpfCnpj: cleanCpfCnpj,
        rg: rg || null,
        issuingOrgan: issuingOrgan || null,
        birthDate: birthDate || null,
        nationality: nationality || 'Brasileira',
        gender: ['MASCULINO', 'FEMININO'].includes(gender) ? gender : null,
        maritalStatus: maritalStatus || null,
        profession: profession || null,
        phone: cleanPhone,
        whatsapp: (whatsapp || phone).replace(/\D/g, ''),
        email: email || null,
        cep: cep || null,
        address: address || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        legalRepresentative: legalRepresentative || null,
        representativeCpf: cleanRepresentativeCpf || null,
        representativeRg: representativeRg || null,
        representativeBirthDate: representativeBirthDate || null,
        representativeAddress: resolvedRepresentativeAddress || null,
        representativeSameAddress: !!representativeSameAddress,
        representativePhone: cleanRepresentativePhone || null,
        representativeRole: representativeRole || null,
        financialResponsible: financialResponsible || null,
        notes: notes || null,
        legalArea: legalArea || null,
        lawyerInChargeId: lawyerInChargeId || null,
        processNumber: processNumber || null,
      },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'CLIENT_CREATED',
      description: `Cliente ${client.name} (${client.cpfCnpj}) cadastrado com sucesso.`,
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error('Erro ao cadastrar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao cadastrar cliente: ' + (error?.message || '') },
      { status: 500 }
    );
  }
}
