import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { saveFile } from '@/lib/storage';
import { deleteDriveFile, syncProcessFilesToDrive, uploadProcessFileToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const body = await req.json();
  const process = await prisma.legalProcess.findFirst({ where: { id: params.id, officeId: user.officeId } });
  if (!process) return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 });
  if (body.action === 'moveDocument' || body.action === 'moveAttachment') {
    const destination = await prisma.legalProcess.findFirst({ where: { id: body.targetProcessId, officeId: user.officeId, clientId: process.clientId }, include: { client: { select: { name: true } } } });
    if (!destination || destination.id === process.id) return NextResponse.json({ error: 'Escolha outro dossiê da mesma cliente.' }, { status: 400 });
    if (body.action === 'moveDocument') {
      const document = await prisma.document.findFirst({ where: { id: body.fileId, officeId: user.officeId, processId: process.id, clientId: process.clientId }, select: { id: true, driveFileId: true } });
      if (!document) return NextResponse.json({ error: 'Documento não encontrado neste dossiê.' }, { status: 404 });
      await prisma.document.update({ where: { id: document.id }, data: { processId: destination.id, driveFileId: null, driveFileUrl: null } });
      await syncProcessFilesToDrive({ id: destination.id, officeId: user.officeId, title: destination.title, client: destination.client });
      try { await deleteDriveFile(user.officeId, document.driveFileId); } catch (error) { console.error('Arquivo antigo preservado no Drive após movimentação:', error); }
    } else {
      const attachment = await prisma.processAttachment.findFirst({ where: { id: body.fileId, processId: process.id }, select: { id: true, driveFileId: true } });
      if (!attachment) return NextResponse.json({ error: 'Arquivo não encontrado neste dossiê.' }, { status: 404 });
      await prisma.processAttachment.update({ where: { id: attachment.id }, data: { processId: destination.id, driveFileId: null, driveFileUrl: null } });
      await syncProcessFilesToDrive({ id: destination.id, officeId: user.officeId, title: destination.title, client: destination.client });
      try { await deleteDriveFile(user.officeId, attachment.driveFileId); } catch (error) { console.error('Arquivo antigo preservado no Drive após movimentação:', error); }
    }
    await prisma.legalProcessActivity.create({ data: { processId: destination.id, userId: user.id, type: 'FILE_MOVED', description: 'Arquivo movimentado para este dossiê.' } });
    return NextResponse.json({ success: true });
  }
  if (body.action === 'unlinkDocument') {
    const document = await prisma.document.findFirst({ where: { id: body.fileId, officeId: user.officeId, processId: process.id }, select: { id: true } });
    if (!document) return NextResponse.json({ error: 'Documento não encontrado neste dossiê.' }, { status: 404 });
    await prisma.document.update({ where: { id: document.id }, data: { processId: null } });
    await prisma.legalProcessActivity.create({ data: { processId: process.id, userId: user.id, type: 'DOCUMENT_UNLINKED', description: 'Documento assinado removido deste dossiê, sem exclusão da Central de Documentos.' } });
    return NextResponse.json({ success: true });
  }
  if (body.action === 'removeAttachment') {
    const attachment = await prisma.processAttachment.findFirst({ where: { id: body.fileId, processId: process.id }, select: { id: true, title: true } });
    if (!attachment) return NextResponse.json({ error: 'Arquivo não encontrado neste dossiê.' }, { status: 404 });
    await prisma.processAttachment.delete({ where: { id: attachment.id } });
    await prisma.legalProcessActivity.create({ data: { processId: process.id, userId: user.id, type: 'ATTACHMENT_REMOVED', description: `Arquivo "${attachment.title}" removido deste dossiê.` } });
    return NextResponse.json({ success: true });
  }
  if (body.action === 'renameAttachment') {
    const attachment = await prisma.processAttachment.findFirst({ where: { id: body.fileId, processId: process.id }, select: { id: true, title: true } });
    if (!attachment) return NextResponse.json({ error: 'Arquivo não encontrado neste dossiê.' }, { status: 404 });
    const newTitle = String(body.newTitle || '').trim();
    if (!newTitle) return NextResponse.json({ error: 'O nome do arquivo não pode ficar em branco.' }, { status: 400 });
    await prisma.processAttachment.update({ where: { id: attachment.id }, data: { title: newTitle } });
    await prisma.legalProcessActivity.create({ data: { processId: process.id, userId: user.id, type: 'ATTACHMENT_RENAMED', description: `Arquivo "${attachment.title}" renomeado para "${newTitle}".` } });
    return NextResponse.json({ success: true });
  }
  if (body.action === 'moveAttachmentFolder') {
    const attachment = await prisma.processAttachment.findFirst({ where: { id: body.fileId, processId: process.id }, select: { id: true, title: true } });
    if (!attachment) return NextResponse.json({ error: 'Arquivo não encontrado neste dossiê.' }, { status: 404 });
    const folderName = String(body.folderName || '01. Documentos Pessoais').trim();
    await prisma.processAttachment.update({ where: { id: attachment.id }, data: { description: folderName } });
    await prisma.legalProcessActivity.create({ data: { processId: process.id, userId: user.id, type: 'ATTACHMENT_MOVED', description: `Arquivo "${attachment.title}" movido para a pasta "${folderName}".` } });
    return NextResponse.json({ success: true });
  }
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
    const folderName = String(form.get('folderName') || form.get('description') || '01. Documentos Pessoais').trim();
    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.processAttachment.create({ data: { processId: process.id, fileId: stored.id, title: String(form.get('title') || input.name).trim() || input.name, description: folderName, driveFileId: driveUpload?.id || null, driveFileUrl: driveUpload?.webViewLink || null }, include: { file: { select: { id: true, originalName: true, sizeBytes: true } } } });
      await tx.legalProcess.update({ where: { id: process.id }, data: { lastActivityAt: new Date() } });
      await tx.legalProcessActivity.create({ data: { processId: process.id, userId: user.id, type: 'ATTACHMENT_ADDED', description: `Arquivo "${created.title}" incluído na pasta "${folderName}".` } });
      return created;
    });
    return NextResponse.json({ success: true, attachment });
  } catch (error: any) { return NextResponse.json({ error: error?.message || 'Não foi possível anexar o arquivo.' }, { status: 500 }); }
}
