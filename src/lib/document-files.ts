import { prisma } from './prisma';
import { deleteFile } from './storage';

// Um novo envio pode reutilizar o PDF original de um documento aprovado.
export async function removeUnusedDocumentFile(id: string, storageKey: string) {
  const removed = await prisma.storageFile.deleteMany({ where: {
    id, originalDocuments: { none: {} }, signedDocuments: { none: {} },
    templateSources: { none: {} }, processAttachments: { none: {} }, intakeFiles: { none: {} },
  } });
  if (removed.count && !(await prisma.storageFile.count({ where: { storageKey } }))) await deleteFile(storageKey);
}
