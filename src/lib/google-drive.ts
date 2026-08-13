import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getFileBuffer } from '@/lib/storage';

const DRIVE_SCOPE = 'openid email https://www.googleapis.com/auth/drive.file';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://assinajur.vercel.app').replace(/\/$/, '');
}

function encryptionKey() {
  const source = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) throw new Error('A chave de proteção da integração Google Drive não foi configurada.');
  return crypto.createHash('sha256').update(source).digest();
}

export function encryptDriveValue(value: string | null | undefined) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptDriveValue(value: string | null | undefined) {
  if (!value) return null;
  const [iv, tag, content] = value.split('.');
  if (!iv || !tag || !content) throw new Error('Dados da conexão Google Drive inválidos.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(content, 'base64url')), decipher.final()]).toString('utf8');
}

export function googleDriveConfigured() {
  return Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET);
}

export function googleDriveCallbackUrl() {
  return `${appUrl()}/api/integrations/google-drive/callback`;
}

export function createGoogleDriveAuthorizeUrl(state: string) {
  if (!googleDriveConfigured()) throw new Error('A integração Google Drive ainda não foi configurada pelo administrador.');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!, redirect_uri: googleDriveCallbackUrl(), response_type: 'code',
    scope: DRIVE_SCOPE, access_type: 'offline', prompt: 'consent', state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in?: number };

async function refreshAccessToken(connection: { refreshTokenEncrypted: string; accessTokenEncrypted: string | null; accessTokenExpiresAt: Date | null }) {
  const current = decryptDriveValue(connection.accessTokenEncrypted);
  if (current && connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() > Date.now() + 60_000) return current;
  const refresh = decryptDriveValue(connection.refreshTokenEncrypted);
  const body = new URLSearchParams({ client_id: process.env.GOOGLE_DRIVE_CLIENT_ID || '', client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '', refresh_token: refresh || '', grant_type: 'refresh_token' });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const token = await res.json() as TokenResponse & { error?: string };
  if (!res.ok || !token.access_token) throw new Error(token.error || 'Não foi possível renovar a conexão com o Google Drive.');
  const expires = new Date(Date.now() + (token.expires_in || 3600) * 1000);
  return { token: token.access_token, expires };
}

async function driveFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Google Drive: ${error || 'erro ao acessar o serviço.'}`);
  }
  return res;
}

export async function deleteDriveFile(officeId: string, fileId: string | null | undefined) {
  if (!fileId) return;
  const access = await accessForOffice(officeId);
  if (!access) return;
  await driveFetch(`/files/${encodeURIComponent(fileId)}`, access.token, { method: 'DELETE' });
}

async function accessForOffice(officeId: string) {
  const connection = await prisma.googleDriveConnection.findUnique({ where: { officeId } });
  if (!connection) return null;
  const refreshed = await refreshAccessToken(connection);
  const token = typeof refreshed === 'string' ? refreshed : refreshed.token;
  if (typeof refreshed !== 'string') await prisma.googleDriveConnection.update({ where: { officeId }, data: { accessTokenEncrypted: encryptDriveValue(token), accessTokenExpiresAt: refreshed.expires } });
  return { connection, token };
}

async function createFolder(token: string, name: string, parentId?: string) {
  const res = await driveFetch('/files?fields=id,name,webViewLink', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }) });
  return res.json() as Promise<{ id: string; webViewLink?: string }>;
}

async function findChildFolder(token: string, parentId: string, name: string) {
  const query = encodeURIComponent(`'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = '${FOLDER_MIME}' and trashed = false`);
  const res = await driveFetch(`/files?q=${query}&fields=files(id,webViewLink)&pageSize=1`, token);
  const data = await res.json() as { files?: Array<{ id: string; webViewLink?: string }> };
  return data.files?.[0] || null;
}

export async function ensureDriveRoot(officeId: string) {
  const access = await accessForOffice(officeId); if (!access) return null;
  if (access.connection.rootFolderId) return { id: access.connection.rootFolderId, url: `https://drive.google.com/drive/folders/${access.connection.rootFolderId}` };
  const root = await createFolder(access.token, 'AssinaJur');
  await prisma.googleDriveConnection.update({ where: { officeId }, data: { rootFolderId: root.id } });
  return { id: root.id, url: root.webViewLink || `https://drive.google.com/drive/folders/${root.id}` };
}

export async function ensureProcessDriveFolders(process: { id: string; officeId: string; title: string; client: { name: string } }) {
  const access = await accessForOffice(process.officeId); if (!access) return null;
  const existing = await prisma.legalProcess.findUnique({ where: { id: process.id }, select: { driveFolderId: true, driveFolderUrl: true } });
  if (existing?.driveFolderId) return { id: existing.driveFolderId, url: existing.driveFolderUrl || `https://drive.google.com/drive/folders/${existing.driveFolderId}` };
  const root = await ensureDriveRoot(process.officeId); if (!root) return null;
  const processFolder = await createFolder(access.token, `${process.client.name} — ${process.title}`, root.id);
  await Promise.all(['Documentos assinados', 'Documentos do escritório', 'Protocolos e comprovantes'].map((name) => createFolder(access.token, name, processFolder.id)));
  const url = processFolder.webViewLink || `https://drive.google.com/drive/folders/${processFolder.id}`;
  await prisma.legalProcess.update({ where: { id: process.id }, data: { driveFolderId: processFolder.id, driveFolderUrl: url } });
  return { id: processFolder.id, url };
}

export async function uploadProcessFileToDrive(process: { id: string; officeId: string; title: string; client: { name: string } }, file: { name: string; mimeType: string; buffer: Buffer }, area = 'Documentos do escritório') {
  const access = await accessForOffice(process.officeId); if (!access) return null;
  const folder = await ensureProcessDriveFolders(process); if (!folder) return null;
  const areaFolder = await findChildFolder(access.token, folder.id, area) || await createFolder(access.token, area, folder.id);
  const metadata = Buffer.from(JSON.stringify({ name: file.name, parents: [areaFolder.id] }));
  const boundary = `assinajur-${crypto.randomUUID()}`;
  const payload = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`), metadata, Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\n\r\n`), file.buffer, Buffer.from(`\r\n--${boundary}--`)]);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', { method: 'POST', headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: payload });
  if (!res.ok) throw new Error('Não foi possível enviar este arquivo ao Google Drive.');
  return res.json() as Promise<{ id: string; webViewLink?: string }>;
}

// Recupera arquivos que já existiam no AssinaJur antes da conexão com o Drive.
// Cada item recebe seu identificador no Drive, evitando novo envio em sincronizações futuras.
export async function syncProcessFilesToDrive(process: { id: string; officeId: string; title: string; client: { name: string } }) {
  const folder = await ensureProcessDriveFolders(process);
  if (!folder) return { documents: 0, attachments: 0 };
  let documents = 0;
  let attachments = 0;
  const [signedDocuments, pendingAttachments] = await Promise.all([
    prisma.document.findMany({
      where: { processId: process.id, officeId: process.officeId, signedFileId: { not: null }, driveFileId: null },
      include: { signedFile: true },
    }),
    prisma.processAttachment.findMany({ where: { processId: process.id, driveFileId: null }, include: { file: true } }),
  ]);
  for (const document of signedDocuments) {
    if (!document.signedFile) continue;
    const buffer = await getFileBuffer(process.officeId, document.signedFile.storageKey);
    if (!buffer) throw new Error(`Não foi possível localizar o PDF assinado de "${document.title}".`);
    const uploaded = await uploadProcessFileToDrive(process, { name: document.signedFile.originalName, mimeType: document.signedFile.mimeType, buffer }, 'Documentos assinados');
    if (uploaded) {
      await prisma.document.update({ where: { id: document.id }, data: { driveFileId: uploaded.id, driveFileUrl: uploaded.webViewLink || null } });
      documents += 1;
    }
  }
  for (const attachment of pendingAttachments) {
    const buffer = await getFileBuffer(process.officeId, attachment.file.storageKey);
    if (!buffer) throw new Error(`Não foi possível localizar o arquivo "${attachment.title}".`);
    const uploaded = await uploadProcessFileToDrive(process, { name: attachment.file.originalName, mimeType: attachment.file.mimeType, buffer });
    if (uploaded) {
      await prisma.processAttachment.update({ where: { id: attachment.id }, data: { driveFileId: uploaded.id, driveFileUrl: uploaded.webViewLink || null } });
      attachments += 1;
    }
  }
  return { documents, attachments };
}
