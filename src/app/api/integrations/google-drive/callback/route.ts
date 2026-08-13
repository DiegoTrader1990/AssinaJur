import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { encryptDriveValue, googleDriveCallbackUrl, ensureDriveRoot } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || 'https://assinajur.vercel.app').replace(/\/$/, '');
const stateSecret = () => process.env.JWT_SECRET || 'assinajur_google_drive_state_2026';

export async function GET(req: Request) {
  const url = new URL(req.url); const error = url.searchParams.get('error'); const code = url.searchParams.get('code'); const state = url.searchParams.get('state');
  if (error || !code || !state) return NextResponse.redirect(`${appUrl()}/configuracoes?drive=error`);
  try {
    const payload = jwt.verify(state, stateSecret()) as { officeId: string; action: string };
    if (!payload.officeId || payload.action !== 'google_drive_connect') throw new Error('Estado de conexão inválido.');
    const body = new URLSearchParams({ code, client_id: process.env.GOOGLE_DRIVE_CLIENT_ID || '', client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '', redirect_uri: googleDriveCallbackUrl(), grant_type: 'authorization_code' });
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const token = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!tokenRes.ok || !token.access_token || !token.refresh_token) throw new Error('O Google não devolveu uma autorização completa. Tente conectar novamente.');
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = profileRes.ok ? await profileRes.json() as { email?: string } : {};
    await prisma.googleDriveConnection.upsert({ where: { officeId: payload.officeId }, create: { officeId: payload.officeId, googleEmail: profile.email || null, refreshTokenEncrypted: encryptDriveValue(token.refresh_token)!, accessTokenEncrypted: encryptDriveValue(token.access_token), accessTokenExpiresAt: new Date(Date.now() + (token.expires_in || 3600) * 1000) }, update: { googleEmail: profile.email || null, refreshTokenEncrypted: encryptDriveValue(token.refresh_token)!, accessTokenEncrypted: encryptDriveValue(token.access_token), accessTokenExpiresAt: new Date(Date.now() + (token.expires_in || 3600) * 1000) } });
    await ensureDriveRoot(payload.officeId);
    return NextResponse.redirect(`${appUrl()}/configuracoes?drive=connected`);
  } catch (error) { console.error('Erro ao conectar Google Drive:', error); return NextResponse.redirect(`${appUrl()}/configuracoes?drive=error`); }
}
