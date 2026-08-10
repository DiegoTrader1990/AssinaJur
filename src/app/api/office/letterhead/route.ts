import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { saveFile, deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
    }

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
      select: { letterheadFileId: true },
    });

    if (!office?.letterheadFileId) {
      return NextResponse.json({ hasLetterhead: false });
    }

    const storageFile = await prisma.storageFile.findUnique({
      where: { id: office.letterheadFileId },
    });

    if (!storageFile) {
      return NextResponse.json({ hasLetterhead: false });
    }

    return NextResponse.json({
      hasLetterhead: true,
      file: {
        id: storageFile.id,
        originalName: storageFile.originalName,
        sizeBytes: storageFile.sizeBytes,
        createdAt: storageFile.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar papel timbrado:', error);
    return NextResponse.json({ error: 'Erro ao buscar papel timbrado.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
    }

    if (user.role !== 'OFFICE_ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem alterar o papel timbrado.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Apenas arquivos PDF sao aceitos para papel timbrado.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'O arquivo de papel timbrado deve ter no maximo 5MB.' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
      select: { letterheadFileId: true },
    });

    if (office?.letterheadFileId) {
      const oldFile = await prisma.storageFile.findUnique({
        where: { id: office.letterheadFileId },
      });
      if (oldFile) {
        await deleteFile(oldFile.storageKey);
        await prisma.storageFile.delete({ where: { id: oldFile.id } });
      }
    }

    const storageRecord = await saveFile({
      officeId: user.officeId,
      uploadedBy: user.id,
      fileBuffer,
      originalName: file.name || 'papel-timbrado.pdf',
      mimeType: 'application/pdf',
    });

    await prisma.office.update({
      where: { id: user.officeId },
      data: { letterheadFileId: storageRecord.id },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'LETTERHEAD_UPLOADED',
      description: 'Papel timbrado enviado com sucesso: ' + (file.name || 'papel-timbrado.pdf'),
    });

    return NextResponse.json({
      success: true,
      file: {
        id: storageRecord.id,
        originalName: storageRecord.originalName,
        sizeBytes: storageRecord.sizeBytes,
      },
    });
  } catch (error: any) {
    console.error('Erro ao enviar papel timbrado:', error);
    return NextResponse.json({ error: 'Erro ao salvar papel timbrado.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
    }

    if (user.role !== 'OFFICE_ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem remover o papel timbrado.' },
        { status: 403 }
      );
    }

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
      select: { letterheadFileId: true },
    });

    if (!office?.letterheadFileId) {
      return NextResponse.json({ error: 'Nenhum papel timbrado cadastrado.' }, { status: 404 });
    }

    const storageFile = await prisma.storageFile.findUnique({
      where: { id: office.letterheadFileId },
    });

    if (storageFile) {
      await deleteFile(storageFile.storageKey);
      await prisma.storageFile.delete({ where: { id: storageFile.id } });
    }

    await prisma.office.update({
      where: { id: user.officeId },
      data: { letterheadFileId: null },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'LETTERHEAD_REMOVED',
      description: 'Papel timbrado removido.',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover papel timbrado:', error);
    return NextResponse.json({ error: 'Erro ao remover papel timbrado.' }, { status: 500 });
  }
}
