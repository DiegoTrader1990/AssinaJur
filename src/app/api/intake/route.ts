import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const folders = await prisma.intakeFolder.findMany({
    where: { officeId: user.officeId },
    include: {
      suggestedClient: { select: { id: true, name: true, cpfCnpj: true } },
      files: { include: { file: { select: { id: true, originalName: true, sizeBytes: true } } }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 60,
  });
  return NextResponse.json({ folders });
}
