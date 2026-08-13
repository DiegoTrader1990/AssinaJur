import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json();
  const process = await prisma.legalProcess.findFirst({ where: { id: params.id, officeId: user.officeId } });
  if (!process) return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 });
  const changedStatus = body.status && body.status !== process.status;
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.legalProcess.update({ where: { id: process.id }, data: { title: body.title?.trim() || process.title, legalArea: body.legalArea ?? process.legalArea, status: body.status || process.status, priority: body.priority || process.priority, dueDate: body.dueDate === '' ? null : body.dueDate ? new Date(body.dueDate) : process.dueDate, processNumber: body.processNumber ?? process.processNumber, protocolNumber: body.protocolNumber ?? process.protocolNumber, notes: body.notes ?? process.notes, lastActivityAt: new Date() } });
    const description = body.activityDescription?.trim() || (changedStatus ? `Etapa alterada para ${body.status}.` : 'Dados do processo atualizados.');
    await tx.legalProcessActivity.create({ data: { processId: process.id, userId: user.id, type: changedStatus ? 'STATUS_CHANGED' : 'UPDATED', description } });
    return item;
  });
  return NextResponse.json({ success: true, process: updated });
}
