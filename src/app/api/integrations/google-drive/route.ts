import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createGoogleDriveAuthorizeUrl, ensureDriveRoot, ensureProcessDriveFolders, googleDriveConfigured, syncProcessFilesToDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';
const stateSecret = () => process.env.JWT_SECRET || 'assinajur_google_drive_state_2026';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  let connection = await prisma.googleDriveConnection.findUnique({ where: { officeId: user.officeId }, select: { googleEmail: true, rootFolderId: true, createdAt: true, updatedAt: true } });
  let setupError: string | null = null;
  // Uma conexão só é considerada pronta quando a pasta raiz realmente existe.
  // Este reparo também recupera conexões feitas antes de o Drive concluir a criação.
  if (connection && !connection.rootFolderId) {
    try {
      await ensureDriveRoot(user.officeId);
      connection = await prisma.googleDriveConnection.findUnique({ where: { officeId: user.officeId }, select: { googleEmail: true, rootFolderId: true, createdAt: true, updatedAt: true } });
    } catch (error: any) {
      console.error('[Google Drive] Falha ao concluir a pasta principal:', error);
      setupError = 'Não foi possível concluir a pasta principal no Google Drive. Reconecte a integração para autorizar o acesso novamente.';
    }
  }
  // Assim que a pasta principal estiver disponível, recupera também os dossiês
  // criados antes da conexão. Cada processo é tratado isoladamente para que um
  // erro eventual não impeça os demais de receberem sua pasta.
  if (connection?.rootFolderId) {
    const pendingProcesses = await prisma.legalProcess.findMany({
      where: { officeId: user.officeId },
      include: { client: { select: { name: true } } },
      take: 50,
    });
    const outcomes = await Promise.allSettled(pendingProcesses.map(async (process) => {
      await ensureProcessDriveFolders({ id: process.id, officeId: process.officeId, title: process.title, client: process.client });
      return syncProcessFilesToDrive({ id: process.id, officeId: process.officeId, title: process.title, client: process.client });
    }));
    outcomes.forEach((outcome) => {
      if (outcome.status === 'rejected') console.error('[Google Drive] Falha ao criar pasta de processo:', outcome.reason);
    });
  }
  const ready = Boolean(connection?.rootFolderId);
  return NextResponse.json({ configured: googleDriveConfigured(), connected: ready, needsRepair: Boolean(connection && !ready), setupError, connection: connection ? { ...connection, folderUrl: connection.rootFolderId ? `https://drive.google.com/drive/folders/${connection.rootFolderId}` : null } : null });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (user.role !== 'OFFICE_ADMIN') return NextResponse.json({ error: 'Apenas o administrador do escritório pode conectar o Drive.' }, { status: 403 });
  if (!googleDriveConfigured()) return NextResponse.json({ error: 'A integração ainda está sendo preparada. Informe as credenciais protegidas no ambiente do AssinaJur.' }, { status: 503 });
  const state = jwt.sign({ officeId: user.officeId, userId: user.id, action: 'google_drive_connect' }, stateSecret(), { expiresIn: '10m' });
  return NextResponse.json({ url: createGoogleDriveAuthorizeUrl(state) });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (user.role !== 'OFFICE_ADMIN') return NextResponse.json({ error: 'Apenas o administrador pode desconectar o Drive.' }, { status: 403 });
  await prisma.googleDriveConnection.deleteMany({ where: { officeId: user.officeId } });
  return NextResponse.json({ success: true });
}
