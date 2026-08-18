import fs from 'fs';
import path from 'path';
import { prisma } from './prisma';
import { getFileBuffer } from './storage';

// Papel timbrado usado nos CONTRATOS/PROCURAÇÕES/DECLARAÇÕES gerados a partir
// de modelo. Isto é diferente do papel timbrado do CERTIFICADO de evidências
// (public/certificado/papel-timbrado.jpg, fixo, com a logo do AssinaJur, que
// não muda). Aqui o escritório escolhe entre:
//   - DEFAULT: o modelo original do AssinaJur (este arquivo, sem a logo do
//     AssinaJur - é o papel timbrado dos documentos do próprio escritório).
//   - CUSTOM: o PDF que o escritório enviou em Configurações (office.letterheadFileId).
const DEFAULT_LETTERHEAD_PATH = path.join(process.cwd(), 'public', 'certificado', 'papel-timbrado-documentos.pdf');

export async function getDocumentLetterheadBuffer(office: {
  id: string;
  letterheadFileId?: string | null;
  documentLetterheadMode?: string | null;
}): Promise<Buffer | undefined> {
  const mode = office.documentLetterheadMode || 'DEFAULT';

  if (mode === 'CUSTOM' && office.letterheadFileId) {
    try {
      const file = await prisma.storageFile.findUnique({ where: { id: office.letterheadFileId } });
      if (file) {
        const buf = await getFileBuffer(office.id, file.storageKey);
        if (buf) return buf;
      }
    } catch (err) {
      console.error('Erro ao carregar papel timbrado próprio do escritório:', err);
    }
  }

  // DEFAULT, ou CUSTOM selecionado mas sem arquivo ainda enviado: cai no
  // modelo original do AssinaJur, se já estiver disponível no projeto.
  try {
    if (fs.existsSync(DEFAULT_LETTERHEAD_PATH)) {
      return fs.readFileSync(DEFAULT_LETTERHEAD_PATH);
    }
  } catch (err) {
    console.error('Erro ao carregar papel timbrado padrão do AssinaJur:', err);
  }
  return undefined;
}
