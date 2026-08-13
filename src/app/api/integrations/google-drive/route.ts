import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createGoogleDriveAuthorizeUrl, googleDriveConfigured } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';
const stateSecret = () => process.env.JWT_SECRET || 'assinajur_google_drive_state_2026';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const connection = await prisma.googleDriveConnection.findUnique({ where: { officeId: user.officeId }, select: { googleEmail: true, rootFolderId: true, createdAt: true, updatedAt: true } });
  return NextResponse.json({ configured: googleDriveConfigured(), connected: Boolean(connection), connection: connection ? { ...connection, folderUrl: connection.rootFolderId ? `https://drive.google.com/drive/folders/${connection.rootFolderId}` : null } : null });
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
