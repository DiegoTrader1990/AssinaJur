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
  const updated = await prisma.legalProcess.update({ where: { id: process.id }, data: {
    title: body.title?.trim() || process.title, legalArea: body.legalArea ?? process.legalArea,
    status: body.status || process.status, processNumber: body.processNumber ?? process.processNumber,
    protocolNumber: body.protocolNumber ?? process.protocolNumber, notes: body.notes ?? process.notes,
  } });
  return NextResponse.json({ success: true, process: updated });
}
