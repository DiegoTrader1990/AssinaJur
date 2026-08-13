import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { saveFile } from '@/lib/storage';
import { uploadProcessFileToDrive } from '@/lib/google-drive';

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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const process = await prisma.legalProcess.findFirst({ where: { id: params.id, officeId: user.officeId }, include: { client: { select: { name: true } } } });
    if (!process) return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 });
    const form = await req.formData(); const input = form.get('file');
    if (!(input instanceof File)) return NextResponse.json({ error: 'Selecione um arquivo PDF.' }, { status: 400 });
    if (input.type !== 'application/pdf' && !input.name.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Por segurança, anexe apenas arquivos PDF.' }, { status: 400 });
    const buffer = Buffer.from(await input.arrayBuffer());
    if (!buffer.length || buffer.length > 20 * 1024 * 1024) return NextResponse.json({ error: 'O PDF deve ter até 20 MB.' }, { status: 400 });
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') return NextResponse.json({ error: 'O arquivo enviado não é um PDF válido.' }, { status: 400 });
    const stored = await saveFile({ officeId: user.officeId, uploadedBy: user.id, fileBuffer: buffer, originalName: input.name, mimeType: input.type || 'application/pdf' });
    let driveUpload: { id: string; webViewLink?: string } | null = null;
    try { driveUpload = await uploadProcessFileToDrive({ id: process.id, officeId: user.officeId, title: process.title, client: process.client }, { name: input.name, mimeType: input.type || 'application/pdf', buffer }); } catch (driveError) { console.error('Arquivo mantido no AssinaJur, mas não enviado ao Drive:', driveError); }
    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.processAttachment.create({ data: { processId: process.id, fileId: stored.id, title: String(form.get('title') || input.name).trim() || input.name, description: String(form.get('description') || '').trim() || null, driveFileId: driveUpload?.id || null, driveFileUrl: driveUpload?.webViewLink || null }, include: { file: { select: { id: true, originalName: true, sizeBytes: true } } } });
      await tx.legalProcess.update({ where: { id: process.id }, data: { lastActivityAt: new Date() } });
      await tx.legalProcessActivity.create({ data: { processId: process.id, userId: user.id, type: 'ATTACHMENT_ADDED', description: `Arquivo "${created.title}" incluído no dossiê.` } });
      return created;
    });
    return NextResponse.json({ success: true, attachment });
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Não foi possível anexar o arquivo.' }, { status: 500 }); }
}
