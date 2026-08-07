import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Exclui a tag do escritório. Não apaga documentos — apenas remove o vínculo
// N:N (o Prisma cuida da linha da tabela de junção implícita automaticamente).
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const tag = await prisma.tag.findFirst({
      where: { id: params.id, officeId: user.officeId }, // INJEÇÃO RIGOROSA DO TENANT
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag não encontrada.' }, { status: 404 });
    }

    await prisma.tag.delete({ where: { id: tag.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir tag:', error);
    return NextResponse.json({ error: 'Erro ao excluir tag.' }, { status: 500 });
  }
}
