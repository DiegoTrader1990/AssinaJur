import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFileBuffer } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { id } = await params;
  const intakeFile = await prisma.intakeFile.findFirst({
    where: { id, intakeFolder: { officeId: user.officeId } },
    include: { file: true },
  });
  if (!intakeFile) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
  const buffer = await getFileBuffer(user.officeId, intakeFile.file.storageKey);
  if (!buffer) return NextResponse.json({ error: 'Arquivo indisponível.' }, { status: 404 });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': intakeFile.file.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(intakeFile.file.originalName)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
