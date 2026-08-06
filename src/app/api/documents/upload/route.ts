import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { saveFile } from '@/lib/storage';
import { calculateHash } from '@/lib/pdfHash';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Por favor, envie um arquivo em formato PDF.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const hash = calculateHash(buffer);

    const storageRecord = await saveFile({
      officeId: user.officeId, // INJEÇÃO OBRIGATÓRIA DE TENANT
      uploadedBy: user.id,
      fileBuffer: buffer,
      originalName: file.name,
      mimeType: file.type || 'application/pdf',
    });

    return NextResponse.json({
      success: true,
      file: {
        id: storageRecord.id,
        name: storageRecord.originalName,
        sizeBytes: storageRecord.sizeBytes,
        hash,
      },
    });
  } catch (error: any) {
    console.error('Erro no upload de PDF:', error);
    return NextResponse.json({ error: 'Erro ao processar upload do PDF: ' + (error?.message || '') }, { status: 500 });
  }
}
