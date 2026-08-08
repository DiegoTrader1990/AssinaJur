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
        maritalStatus: maritalStatus || null,
        profession: profession || null,
        phone,
        whatsapp: whatsapp || phone,
        email: email || null,
        cep: cep || null,
        address: address || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        legalRepresentative: legalRepresentative || null,
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
