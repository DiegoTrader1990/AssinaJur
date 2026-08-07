import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from './prisma';

// Este módulo tem dois modos de operação, escolhidos automaticamente:
//
// 1. Vercel Blob (produção / qualquer ambiente com BLOB_READ_WRITE_TOKEN definido):
//    os arquivos são salvos num "private store" da Vercel Blob — leitura exige
//    autenticação (token OIDC/BLOB_READ_WRITE_TOKEN), então uma URL de arquivo
//    sozinha não é suficiente para acessá-lo. Necessário porque hospedagem
//    serverless (Vercel) não tem disco persistente entre requisições.
//
// 2. Disco local (desenvolvimento, ou qualquer ambiente sem esse token):
//    mantém o comportamento original, gravando em STORAGE_DIR/uploads. Isso
//    preserva o fluxo de trabalho local sem exigir conta na Vercel só para
//    rodar o projeto na sua máquina.
const useBlobStorage = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), 'uploads');

if (!useBlobStorage && !fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export async function saveFile({
  officeId,
  uploadedBy,
  fileBuffer,
  originalName,
  mimeType,
}: {
  officeId: string;
  uploadedBy?: string;
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
}) {
  const ext = path.extname(originalName) || '.bin';
  // O storageKey já inclui o officeId como prefixo do caminho — isso vale tanto
  // para o Blob (isolamento lógico por pasta/prefixo) quanto para o disco local
  // (isolamento físico por subpasta), então o resto do código não precisa saber
  // qual dos dois modos está ativo.
  const storageKey = `${officeId}/${randomUUID()}${ext}`;

  if (useBlobStorage) {
    const { put } = await import('@vercel/blob');
    await put(storageKey, fileBuffer, {
      access: 'private',
      contentType: mimeType,
      addRandomSuffix: false,
    });
  } else {
    const officeFolder = path.join(STORAGE_ROOT, officeId);
    if (!fs.existsSync(officeFolder)) {
      fs.mkdirSync(officeFolder, { recursive: true });
    }
    await fs.promises.writeFile(path.join(STORAGE_ROOT, storageKey), fileBuffer);
  }

  const storageRecord = await prisma.storageFile.create({
    data: {
      officeId,
      originalName,
      mimeType,
      sizeBytes: fileBuffer.length,
      storageKey,
      uploadedBy: uploadedBy || null,
    },
  });

  return storageRecord;
}

// Exclui o arquivo físico do armazenamento (Blob em produção, disco local em dev).
// Não remove o registro StorageFile no banco — isso fica a cargo de quem chama,
// depois de garantir que nenhum outro registro ainda referencia esse storageKey.
export async function deleteFile(storageKey: string): Promise<void> {
  if (useBlobStorage) {
    try {
      const { del } = await import('@vercel/blob');
      await del(storageKey);
    } catch (err) {
      console.error('Erro ao excluir arquivo do Vercel Blob:', err);
    }
    return;
  }

  const filePath = path.join(STORAGE_ROOT, storageKey);
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error('Erro ao excluir arquivo local:', err);
  }
}

// Substitui a antiga getFilePath(): em vez de devolver um caminho de arquivo
// (que só faz sentido para disco local), devolve diretamente o conteúdo em
// memória — funciona igual nos dois modos de armazenamento, então quem chama
// essa função não precisa mais saber se o arquivo está no Blob ou em disco.
export async function getFileBuffer(officeId: string, storageKey: string): Promise<Buffer | null> {
  if (useBlobStorage) {
    const { get } = await import('@vercel/blob');
    const result = await get(storageKey, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    const chunks: Buffer[] = [];
    const reader = result.stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  const filePath = path.join(STORAGE_ROOT, storageKey);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.promises.readFile(filePath);
}
