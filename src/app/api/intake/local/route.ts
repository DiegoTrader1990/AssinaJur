import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveFile } from '@/lib/storage';
import { calculateHash } from '@/lib/pdfHash';

export const dynamic = 'force-dynamic';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function classify(name: string) {
  const value = normalize(name);
  if (value.includes('rg') || value.includes('identidade') || value.includes('cnh')) return 'Identificação';
  if (value.includes('cpf')) return 'CPF';
  if (value.includes('cnis')) return 'CNIS';
  if (value.includes('laudo') || value.includes('relatorio medico')) return 'Laudo médico';
  if (value.includes('indeferimento') || value.includes('inss') || value.includes('beneficio')) return 'INSS / Administrativo';
  if (value.includes('residencia') || value.includes('endereco')) return 'Comprovante de residência';
  return 'Documento recebido';
}

async function readIdentity(bytes: Buffer, mimeType: string) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!key || (!mimeType.includes('pdf') && !mimeType.startsWith('image/'))) return null;
  for (const model of ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash']) try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType, data: bytes.toString('base64') } }, { text: 'Extraia apenas JSON com name, cpf e legalArea (Previdenciário se o documento indicar INSS, BPC ou LOAS). Não invente dados.' }] }], generationConfig: { temperature: 0, response_mime_type: 'application/json' } }),
    });
    if (!response.ok) continue;
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch { /* tenta o próximo modelo disponível */ }
  return null;
}

function validKey(request: Request) {
  const expected = process.env.LOCAL_INGEST_KEY;
  return Boolean(expected && request.headers.get('x-assinajur-intake-key') === expected);
}

export async function POST(request: Request) {
  if (!validKey(request)) return NextResponse.json({ error: 'Conector local não autorizado.' }, { status: 401 });
  try {
    const formData = await request.formData();
    const officeId = String(formData.get('officeId') || '');
    const sourceFolderName = String(formData.get('sourceFolderName') || '').trim();
    const sourceFolderPath = String(formData.get('sourceFolderPath') || '').trim();
    const file = formData.get('file') as File | null;
    if (!officeId || !sourceFolderName || !file) return NextResponse.json({ error: 'Pasta e arquivo são obrigatórios.' }, { status: 400 });
    // O conector local é vinculado ao escritório configurado no servidor. O id
    // enviado pelo computador é apenas uma verificação adicional e não define
    // o tenant que receberá documentos.
    let office = process.env.LOCAL_INGEST_OFFICE_EMAIL
      ? await prisma.office.findFirst({ where: { email: process.env.LOCAL_INGEST_OFFICE_EMAIL }, select: { id: true } })
      : await prisma.office.findUnique({ where: { id: officeId }, select: { id: true } });
    if (!office) return NextResponse.json({ error: 'Escritório do conector não foi encontrado.' }, { status: 404 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.length || bytes.length > 20 * 1024 * 1024) return NextResponse.json({ error: 'O arquivo precisa ter até 20 MB.' }, { status: 400 });
    const contentHash = calculateHash(bytes);
    const searchText = `${sourceFolderName} ${file.name}`;
    const detected = await readIdentity(bytes, file.type || 'application/pdf');
    const cpf = String(detected?.cpf || searchText.match(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b|\b\d{11}\b/)?.[0] || '').replace(/\D/g, '') || null;
    const targetOfficeId = office.id;
    const clients = await prisma.client.findMany({ where: { officeId: targetOfficeId }, select: { id: true, name: true, cpfCnpj: true } });
    const normalizedSource = normalize(String(detected?.name || sourceFolderName));
    const suggested = clients.find((client) => cpf && client.cpfCnpj === cpf) || clients.find((client) => normalize(client.name) === normalizedSource || normalizedSource.includes(normalize(client.name)) || normalize(client.name).includes(normalizedSource));
    const area = detected?.legalArea || (/\bbpc\b|loas|inss|previdenc/.test(normalize(searchText)) ? 'Previdenciário' : null);
    let folder = await prisma.intakeFolder.findFirst({ where: { officeId: targetOfficeId, sourceFolderName, status: 'AGUARDANDO_REVISAO' }, orderBy: { updatedAt: 'desc' } });
    if (!folder) {
      folder = await prisma.intakeFolder.create({ data: { officeId: targetOfficeId, sourceFolderName, sourceFolderPath: sourceFolderPath || null, suggestedClientId: suggested?.id || null, extractedName: suggested?.name || detected?.name || sourceFolderName, extractedCpf: cpf, suggestedArea: area, confidence: suggested ? (cpf ? 96 : 78) : detected?.name ? 70 : 35 } });
    } else if (suggested && !folder.suggestedClientId) {
      folder = await prisma.intakeFolder.update({ where: { id: folder.id }, data: { suggestedClientId: suggested.id, extractedName: suggested.name, extractedCpf: cpf || folder.extractedCpf, suggestedArea: area || folder.suggestedArea, confidence: cpf ? 96 : 78 } });
    } else if (!folder.extractedCpf && (cpf || detected?.name)) {
      folder = await prisma.intakeFolder.update({ where: { id: folder.id }, data: { extractedName: detected?.name || folder.extractedName, extractedCpf: cpf || null, suggestedArea: area || folder.suggestedArea, confidence: detected?.name ? 70 : folder.confidence } });
    }
    // Versões antigas tratavam subpastas como novos atendimentos. Todos os
    // documentos da pasta principal agora são reunidos em uma única entrada.
    if (sourceFolderPath) {
      const fragmented = await prisma.intakeFolder.findMany({
        where: { officeId: targetOfficeId, sourceFolderPath: { startsWith: sourceFolderPath }, id: { not: folder.id }, status: 'AGUARDANDO_REVISAO' },
        include: { files: true },
      });
      for (const oldFolder of fragmented) {
        for (const oldFile of oldFolder.files) {
          const alreadyImported = await prisma.intakeFile.findUnique({ where: { intakeFolderId_contentHash: { intakeFolderId: folder.id, contentHash: oldFile.contentHash } } });
          if (!alreadyImported) await prisma.intakeFile.update({ where: { id: oldFile.id }, data: { intakeFolderId: folder.id } });
          else await prisma.intakeFile.delete({ where: { id: oldFile.id } });
        }
        await prisma.intakeFolder.delete({ where: { id: oldFolder.id } });
      }
    }
    const duplicate = await prisma.intakeFile.findUnique({ where: { intakeFolderId_contentHash: { intakeFolderId: folder.id, contentHash } } });
    if (duplicate) return NextResponse.json({ success: true, duplicate: true, folderId: folder.id });
    const stored = await saveFile({ officeId: targetOfficeId, fileBuffer: bytes, originalName: file.name, mimeType: file.type || 'application/pdf' });
    await prisma.intakeFile.create({ data: { intakeFolderId: folder.id, fileId: stored.id, title: file.name, classification: classify(file.name), contentHash } });
    await prisma.intakeFolder.update({ where: { id: folder.id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ success: true, folderId: folder.id, suggestedClient: suggested?.name || null });
  } catch (error: any) {
    console.error('Erro na entrada inteligente:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao receber arquivo do conector local.' }, { status: 500 });
  }
}
