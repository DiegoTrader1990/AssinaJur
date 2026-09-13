import sharp from 'sharp';

// Valida o arquivo recebido; a conferência de identidade continua manual.
export async function validateEvidenceImage(value: unknown): Promise<void> {
  const invalid = () => new Error('A foto está inválida ou incompleta. Capture novamente esta foto.');
  if (typeof value !== 'string' || value.length > 4 * 1024 * 1024) throw invalid();
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw invalid();
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length < 32 || bytes.toString('base64') !== match[2]) throw invalid();
  try {
    const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 16000000 });
    const meta = await image.metadata();
    if (meta.format !== match[1] || !meta.width || !meta.height || meta.width < 128 || meta.height < 128 || (meta.pages || 1) !== 1) throw invalid();
    // metadata isoladamente não detecta pixels truncados: força a decodificação.
    await image.resize(1, 1).raw().toBuffer();
  } catch { throw invalid(); }
}
