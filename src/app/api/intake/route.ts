import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const rawFolders = await prisma.intakeFolder.findMany({
    where: { officeId: user.officeId },
    include: {
      suggestedClient: { select: { id: true, name: true, cpfCnpj: true } },
      files: { include: { file: { select: { id: true, originalName: true, sizeBytes: true } } }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 60,
  });
  // Compatibilidade com entradas geradas pela primeira versão do conector,
  // que cadastrava uma subpasta como se ela fosse outro atendimento. A tela
  // sempre apresenta a pasta principal como um único cartão, preservando todos
  // os documentos, inclusive os que já haviam sido importados.
  const folders = [...rawFolders].sort((a, b) => (a.sourceFolderPath?.length || 0) - (b.sourceFolderPath?.length || 0)).reduce<typeof rawFolders>((result, folder) => {
    const parent = result.find((candidate) => {
      if (!candidate.sourceFolderPath || !folder.sourceFolderPath || candidate.id === folder.id) return false;
      const base = candidate.sourceFolderPath.replace(/[\\/]+$/, '');
      return folder.sourceFolderPath.startsWith(`${base}\\`) || folder.sourceFolderPath.startsWith(`${base}/`);
    });
    if (!parent) {
      result.push(folder);
      return result;
    }
    parent.files.push(...folder.files.filter((file) => !parent.files.some((existing) => existing.contentHash === file.contentHash)));
    return result;
  }, []);
  return NextResponse.json({ folders });
}
