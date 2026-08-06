import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from './prisma';

const STORAGE_ROOT = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export async function saveFile({
  officeId,
  uploadedBy,
  fileBuffer,
  originalName,
  mimeType,
}: {
  officeId: string;
  uploadedBy?: string;
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
}) {
  const officeFolder = path.join(STORAGE_ROOT, officeId);
  if (!fs.existsSync(officeFolder)) {
    fs.mkdirSync(officeFolder, { recursive: true });
  }

  const ext = path.extname(originalName) || '.bin';
  const fileKey = `${randomUUID()}${ext}`;
  const absolutePath = path.join(officeFolder, fileKey);

  await fs.promises.writeFile(absolutePath, fileBuffer);

  const storageRecord = await prisma.storageFile.create({
    data: {
      officeId,
      originalName,
      mimeType,
      sizeBytes: fileBuffer.length,
      storageKey: fileKey,
      uploadedBy: uploadedBy || null,
    },
  });

  return storageRecord;
}

export async function getFilePath(officeId: string, storageKey: string): Promise<string | null> {
  const filePath = path.join(STORAGE_ROOT, officeId, storageKey);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
