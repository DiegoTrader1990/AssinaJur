import sharp from 'sharp';

// Erro tipado com um motivo técnico curto (para log e trilha) separado da
// mensagem amigável (para o signatário). Antes só existia uma mensagem única
// e genérica, e nada era registrado quando a validação recusava a foto -
// uma pessoa que tentasse e fosse recusada repetidas vezes ficava
// indistinguível, no painel do escritório, de quem nunca tinha aberto o link.
export class InvalidEvidenceImageError extends Error {
  reason: string;
  constructor(reason: string, message: string) {
    super(message);
    this.reason = reason;
  }
}

const fail = (reason: string, message: string): never => {
  throw new InvalidEvidenceImageError(reason, message);
};

// Valida o arquivo recebido; a conferência de identidade continua manual.
export async function validateEvidenceImage(value: unknown): Promise<void> {
  if (typeof value !== 'string' || value.length > 4 * 1024 * 1024) fail('tamanho', 'A foto excedeu o tamanho máximo aceito. Tente novamente com menos zoom.');
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value as string);
  if (!match) fail('formato', 'A foto não chegou em um formato de imagem aceito.');
  const bytes = Buffer.from(match![2], 'base64');
  if (bytes.length < 32 || bytes.toString('base64') !== match![2]) fail('codificacao', 'A foto chegou corrompida durante o envio.');
  try {
    // failOn: 'error' recusa só o que é de fato inválido/corrompido. O modo
    // anterior ('warning') também recusava fotos legítimas de celular com
    // metadado incomum (perfil de cor, EXIF) que qualquer visualizador normal
    // abre sem problema - a pessoa tirava a foto certo e o sistema recusava
    // do mesmo jeito, sem dizer por quê.
    const image = sharp(bytes, { failOn: 'error', limitInputPixels: 16000000 });
    const meta = await image.metadata();
    if (meta.format !== match![1]) fail('formato-real', 'O conteúdo da foto não corresponde ao formato informado.');
    if (!meta.width || !meta.height || meta.width < 128 || meta.height < 128) fail('dimensao', 'A foto ficou pequena demais. Afaste um pouco menos a câmera.');
    if ((meta.pages || 1) !== 1) fail('multipagina', 'A foto tem múltiplos quadros, o que não é aceito.');
    // metadata isoladamente não detecta pixels truncados: força a decodificação.
    await image.resize(1, 1).raw().toBuffer();
  } catch (error) {
    if (error instanceof InvalidEvidenceImageError) throw error;
    fail('decodificacao', 'A foto não pôde ser aberta. Pode ter ficado corrompida durante o envio - tente novamente.');
  }
}
