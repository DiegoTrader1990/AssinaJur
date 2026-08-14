import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function documentType(title: string) {
  const value = normalize(title);
  if (value.includes('rg') || value.includes('identidade') || value.includes('cnh')) return 'Identificação';
  if (value.includes('cpf')) return 'CPF';
  if (value.includes('cadunico') || value.includes('cad unico') || value.includes('nis')) return 'CadÚnico / NIS';
  if (value.includes('laudo') || value.includes('relatorio med')) return 'Laudo / relatório médico';
  if (value.includes('residencia') || value.includes('endereco') || value.includes('agua') || value.includes('energia')) return 'Comprovante de residência';
  if (value.includes('cnis') || value.includes('inss') || value.includes('beneficio') || value.includes('bpc') || value.includes('loas')) return 'INSS / benefício';
  if (value.includes('procuracao')) return 'Procuração';
  if (value.includes('contrato')) return 'Contrato';
  if (value.includes('declaracao')) return 'Declaração';
  return 'Documento recebido';
}

function assessment(files: Array<{ title: string }>, suggestedArea?: string | null) {
  const types = files.map((file) => documentType(file.title));
  const counts = types.reduce<Record<string, number>>((total, type) => ({ ...total, [type]: (total[type] || 0) + 1 }), {});
  const isBpc = suggestedArea === 'Previdenciário' || files.some((file) => /\bbpc\b|loas|inss/i.test(file.title));
  const expected = isBpc ? ['Identificação', 'CPF', 'Comprovante de residência', 'CadÚnico / NIS', 'Laudo / relatório médico'] : ['Identificação', 'CPF', 'Comprovante de residência'];
  return { categories: counts, pending: expected.filter((item) => !counts[item]), isBpc };
}

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
  return NextResponse.json({ folders: folders.map((folder) => ({
    ...folder,
    files: folder.files.map((file) => ({ ...file, classification: documentType(file.title) })),
    assessment: assessment(folder.files, folder.suggestedArea),
  })) });
}
