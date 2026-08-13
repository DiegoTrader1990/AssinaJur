import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getFileBuffer, saveFile } from '@/lib/storage';
import { logAuditEvent } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    const data = await req.formData();
    const file = data.get('file');
    const title = String(data.get('title') || '').trim();
    const category = String(data.get('category') || 'Previdenciário');
    const documentType = String(data.get('documentType') || 'PROCURACAO');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.docx')) return NextResponse.json({ error: 'Envie um arquivo Word no formato .docx.' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'Informe o título do modelo.' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0 || buffer.length > 20 * 1024 * 1024) return NextResponse.json({ error: 'O modelo Word deve ter até 20 MB.' }, { status: 400 });
    // DOCX é um pacote ZIP; essa validação simples impede uploads descaracterizados.
    if (buffer.subarray(0, 2).toString('ascii') !== 'PK') return NextResponse.json({ error: 'O arquivo enviado não é um DOCX válido.' }, { status: 400 });
    const stored = await saveFile({ officeId: user.officeId, uploadedBy: user.id, fileBuffer: buffer, originalName: file.name, mimeType: DOCX_MIME });
    const template = await prisma.template.create({ data: { officeId: user.officeId, title, category, documentType, contentHtml: '<p>Modelo Word preservado no arquivo original.</p>', sourceFormat: 'DOCX', sourceFileId: stored.id, description: 'Modelo Word original — edição e prévia por documento.' } });
    await logAuditEvent({ officeId: user.officeId, userId: user.id, eventType: 'WORD_TEMPLATE_CREATED', description: `Modelo Word "${title}" enviado para o piloto de edição fiel.` });
    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Erro no upload do modelo Word:', error);
    return NextResponse.json({ error: 'Não foi possível salvar o modelo Word.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return new Response('Não autenticado.', { status: 401 });
    const id = new URL(req.url).searchParams.get('templateId');
    if (!id) return new Response('Modelo obrigatório.', { status: 400 });
    const template = await prisma.template.findFirst({ where: { id, officeId: user.officeId, sourceFormat: 'DOCX' }, include: { sourceFile: true } });
    if (!template?.sourceFile) return new Response('Modelo Word não encontrado.', { status: 404 });
    const buffer = await getFileBuffer(user.officeId, template.sourceFile.storageKey);
    if (!buffer) return new Response('Arquivo não encontrado.', { status: 404 });
    return new Response(new Uint8Array(buffer), { headers: { 'Content-Type': DOCX_MIME, 'Content-Disposition': `inline; filename="${template.sourceFile.originalName}"` } });
  } catch (error) {
    console.error('Erro ao carregar modelo Word:', error);
    return new Response('Erro ao carregar modelo.', { status: 500 });
  }
}
