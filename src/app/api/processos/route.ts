import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { ensureProcessDriveFolders } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

const processInclude = {
  client: {
    select: {
      id: true,
      name: true,
      cpfCnpj: true,
      rg: true,
      issuingOrgan: true,
      phone: true,
      whatsapp: true,
      email: true,
      address: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      state: true,
      cep: true,
      nationality: true,
      maritalStatus: true,
      profession: true,
      birthDate: true,
      legalRepresentative: true,
      representativeCpf: true,
      representativeRg: true,
      representativePhone: true,
      representativeRole: true,
      financialResponsible: true,
      notes: true,
      legalArea: true,
    },
  },
  documents: { select: { id: true, title: true, status: true, signedFileId: true, completedAt: true }, orderBy: { createdAt: 'desc' as const } },
  activities: { orderBy: { createdAt: 'desc' as const }, take: 8 },
  attachments: { include: { file: { select: { id: true, originalName: true, sizeBytes: true } } }, orderBy: { createdAt: 'desc' as const } },
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  // Recuperação assíncrona em segundo plano: não bloqueia a resposta do usuário
  prisma.legalProcess.findMany({ where: { officeId: user.officeId, driveFolderId: null }, include: { client: { select: { name: true } } }, take: 10 })
    .then(async (pendingDriveFolders) => {
      for (const process of pendingDriveFolders) {
        try {
          await ensureProcessDriveFolders({ id: process.id, officeId: process.officeId, title: process.title, client: process.client });
        } catch (e) { /* silent catch */ }
      }
    }).catch(() => {});

  const processes = await prisma.legalProcess.findMany({ where: { officeId: user.officeId }, include: processInclude, orderBy: [{ priority: 'desc' }, { lastActivityAt: 'desc' }] });
  return NextResponse.json({ processes });
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const body = await req.json();
    const { clientId, title, legalArea, status, priority, dueDate, processNumber, protocolNumber, notes, documentIds = [] } = body;
    if (!clientId || !title?.trim()) return NextResponse.json({ error: 'Cliente e título do processo são obrigatórios.' }, { status: 400 });
    const client = await prisma.client.findFirst({ where: { id: clientId, officeId: user.officeId } });
    if (!client) return NextResponse.json({ error: 'Cliente não pertence ao escritório.' }, { status: 400 });
    // Um novo dossiê deve começar vazio. Documentos só entram quando foram
    // escolhidos explicitamente na Central de Documentos, evitando que um
    // atendimento novo herde arquivos de testes ou de outro fluxo.
    const eligibleDocuments = await prisma.document.findMany({ where: documentIds.length ? { id: { in: documentIds }, officeId: user.officeId, clientId, status: 'CONCLUIDO' } : { id: { in: [] } }, select: { id: true } });
    if (documentIds.length && eligibleDocuments.length !== documentIds.length) return NextResponse.json({ error: 'Apenas documentos assinados desta cliente podem ser vinculados.' }, { status: 400 });
    const process = await prisma.$transaction(async (tx) => {
      const created = await tx.legalProcess.create({ data: { officeId: user.officeId, clientId, title: title.trim(), legalArea: legalArea || null, status: status || 'EM_TRIAGEM', priority: priority || 'NORMAL', dueDate: dueDate ? new Date(dueDate) : null, processNumber: processNumber || null, protocolNumber: protocolNumber || null, notes: notes || null } });
      if (eligibleDocuments.length) await tx.document.updateMany({ where: { id: { in: eligibleDocuments.map((item) => item.id) }, officeId: user.officeId }, data: { processId: created.id } });
      await tx.legalProcessActivity.create({ data: { processId: created.id, userId: user.id, type: 'CREATED', description: `Dossiê criado${eligibleDocuments.length ? ` com ${eligibleDocuments.length} documento(s) assinado(s) vinculado(s)` : ''}.` } });
      return created;
    });
    // A organização no Drive é complementar: uma eventual indisponibilidade não
    // impede a criação do dossiê no AssinaJur.
    try { await ensureProcessDriveFolders({ id: process.id, officeId: user.officeId, title: process.title, client: { name: client.name } }); } catch (driveError) { console.error('Não foi possível criar pasta no Drive:', driveError); }
    await logAuditEvent({ officeId: user.officeId, userId: user.id, eventType: 'PROCESS_CREATED', description: `Processo "${process.title}" criado para ${client.name}.` });
    return NextResponse.json({ success: true, process });
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Erro ao criar processo.' }, { status: 500 }); }
}
