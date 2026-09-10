import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { removeUnusedDocumentFile } from '@/lib/document-files';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'OFFICE_ADMIN') return NextResponse.json({ error: 'Apenas o administrador pode excluir documentos.' }, { status: 403 });

    const { ids } = await req.json();
    const documentIds = Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string'))] : [];
    if (!documentIds.length) return NextResponse.json({ error: 'Selecione ao menos um documento.' }, { status: 400 });
    if (documentIds.length > 100) return NextResponse.json({ error: 'Selecione no máximo 100 documentos por vez.' }, { status: 400 });

    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds }, officeId: user.officeId },
      include: { originalFile: true, signedFile: true },
    });
    const protectedDocuments = documents.filter((document) => document.status === 'CONCLUIDO');
    const deletableDocuments = documents.filter((document) => document.status !== 'CONCLUIDO');

    const deletedIds: string[] = [];
    for (const document of deletableDocuments) {
      const removed = await prisma.document.deleteMany({ where: { id: document.id, officeId: user.officeId, status: { not: 'CONCLUIDO' } } });
      if (!removed.count) continue;
      deletedIds.push(document.id);
      const files = [document.originalFile, document.signedFile].filter(Boolean) as Array<{ id: string; storageKey: string }>;
      for (const file of files) {
        await removeUnusedDocumentFile(file.id, file.storageKey);
      }
    }

    await logAuditEvent({
      officeId: user.officeId,
      userId: user.id,
      eventType: 'DOCUMENTS_BULK_DELETED',
      description: `${deletedIds.length} documento(s) excluído(s) em lote por ${user.name}.`,
    });
    return NextResponse.json({ success: true, deletedIds, protectedCount: documents.length - deletedIds.length });
  } catch (error) {
    console.error('Erro ao excluir documentos em lote:', error);
    return NextResponse.json({ error: 'Erro ao excluir documentos em lote.' }, { status: 500 });
  }
}
