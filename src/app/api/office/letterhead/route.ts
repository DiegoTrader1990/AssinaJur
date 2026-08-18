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
      select: { letterheadFileId: true, documentLetterheadMode: true },
    });

    const mode = office?.documentLetterheadMode || 'DEFAULT';

    if (!office?.letterheadFileId) {
      return NextResponse.json({ hasLetterhead: false, mode });
    }

    const storageFile = await prisma.storageFile.findUnique({
      where: { id: office.letterheadFileId },
    });

    if (!storageFile) {
      return NextResponse.json({ hasLetterhead: false, mode });
    }

    const fileData = {
      id: storageFile.id,
      originalName: storageFile.originalName,
      sizeBytes: storageFile.sizeBytes,
      createdAt: storageFile.createdAt,
    };

    return NextResponse.json({
      hasLetterhead: true,
      file: fileData,
      letterhead: fileData,
      mode,
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
      const oldFileId = office.letterheadFileId;
      await prisma.office.update({
        where: { id: user.officeId },
        data: { letterheadFileId: null },
      });

      const oldFile = await prisma.storageFile.findUnique({
        where: { id: oldFileId },
      });

      if (oldFile) {
        try {
          await deleteFile(oldFile.storageKey);
          await prisma.storageFile.delete({ where: { id: oldFile.id } });
        } catch (delErr) {
          console.warn('[Letterhead API] Aviso ao remover arquivo antigo:', delErr);
        }
      }
    }

    const storageRecord = await saveFile({
      officeId: user.officeId,
      uploadedBy: user.id,
      fileBuffer,
      originalName: file.name || 'papel-timbrado.pdf',
      mimeType: 'application/pdf',
    });

    // Enviar um papel timbrado próprio já seleciona automaticamente o modo
    // "meu próprio modelo" - não faria sentido enviar e continuar usando o
    // modelo original do AssinaJur.
    await prisma.office.update({
      where: { id: user.officeId },
      data: { letterheadFileId: storageRecord.id, documentLetterheadMode: 'CUSTOM' },
    });

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'LETTERHEAD_UPLOADED',
      description: 'Papel timbrado enviado com sucesso: ' + (file.name || 'papel-timbrado.pdf'),
    });

    const fileData = {
      id: storageRecord.id,
      originalName: storageRecord.originalName,
      sizeBytes: storageRecord.sizeBytes,
    };

    return NextResponse.json({
      success: true,
      file: fileData,
      letterhead: fileData,
      mode: 'CUSTOM',
    });
  } catch (error: any) {
    console.error('Erro ao enviar papel timbrado:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao salvar papel timbrado.' }, { status: 500 });
  }
}

// Alterna entre DEFAULT (modelo original do AssinaJur) e CUSTOM (o arquivo já
// enviado, se houver). Não remove o arquivo enviado ao voltar para DEFAULT -
// assim o escritório pode voltar para CUSTOM depois sem reenviar o PDF.
export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
    }

    const { mode } = await req.json();
    if (mode !== 'DEFAULT' && mode !== 'CUSTOM') {
      return NextResponse.json({ error: 'Modo inválido.' }, { status: 400 });
    }

    const office = await prisma.office.findUnique({
      where: { id: user.officeId },
      select: { letterheadFileId: true },
    });

    if (mode === 'CUSTOM' && !office?.letterheadFileId) {
      return NextResponse.json({ error: 'Envie um PDF antes de selecionar "Meu próprio papel timbrado".' }, { status: 400 });
    }

    await prisma.office.update({
      where: { id: user.officeId },
      data: { documentLetterheadMode: mode },
    });

    return NextResponse.json({ success: true, mode });
  } catch (error: any) {
    console.error('Erro ao alterar modo do papel timbrado:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao alterar o papel timbrado.' }, { status: 500 });
  }
}

export async function DELETE() {
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
      return NextResponse.json({ error: 'Nenhum papel timbrado cadastrado.' }, { status: 404 });
    }

    const oldFileId = office.letterheadFileId;
    await prisma.office.update({
      where: { id: user.officeId },
      data: { letterheadFileId: null, documentLetterheadMode: 'DEFAULT' },
    });

    const storageFile = await prisma.storageFile.findUnique({
      where: { id: oldFileId },
    });

    if (storageFile) {
      try {
        await deleteFile(storageFile.storageKey);
        await prisma.storageFile.delete({ where: { id: storageFile.id } });
      } catch (delErr) {
        console.warn('[Letterhead API] Aviso ao apagar arquivo no storage:', delErr);
      }
    }

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'LETTERHEAD_REMOVED',
      description: 'Papel timbrado removido.',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover papel timbrado:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao remover papel timbrado.' }, { status: 500 });
  }
}
