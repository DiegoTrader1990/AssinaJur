/**
 * LABORATÓRIO ASSINAJUR — Validação de qualidade da captura de documento.
 *
 * Este arquivo pertence exclusivamente ao ambiente de laboratório
 * (/lab/documento) e NÃO é utilizado pelo fluxo de assinatura em produção.
 *
 * Filosofia desta primeira fase: priorizar fluidez e confiabilidade.
 * Apenas falhas evidentes bloqueiam o avanço; o restante vira aviso
 * informativo exibido somente no painel de diagnóstico.
 */

export type QualityIssueLevel = 'BLOCK' | 'WARN';

export interface QualityIssue {
  code: string;
  level: QualityIssueLevel;
  message: string;
}

export interface QualityReport {
  /** Falso apenas quando há alguma falha evidente (nível BLOCK). */
  acceptable: boolean;
  width: number;
  height: number;
  bytes: number;
  /** Luminância média (0–255). Valores muito baixos indicam foto escura. */
  meanLuminance: number;
  /** Variância do Laplaciano — proxy simples de nitidez. Quanto maior, mais nítida. */
  sharpness: number;
  issues: QualityIssue[];
}

/**
 * Resolução mínima aceitável, já considerando que a imagem é RECORTADA na
 * moldura antes de chegar aqui. Um RG tem 85,6 x 54 mm: a 500 px no lado
 * maior isso dá cerca de 150 DPI, suficiente para leitura humana.
 * Limites mais altos barrariam câmeras VGA sem necessidade.
 */
export const MIN_WIDTH = 500;
export const MIN_HEIGHT = 300;
/** Abaixo disso a imagem quase certamente está vazia/corrompida. */
export const MIN_BYTES = 15_000;
/** Abaixo disso a foto está praticamente no escuro. */
export const MIN_MEAN_LUMINANCE = 25;
/** Aviso (não bloqueio) de imagem pouco iluminada. */
export const LOW_LIGHT_LUMINANCE = 55;
/** Aviso (não bloqueio) de imagem possivelmente desfocada. */
export const LOW_SHARPNESS = 45;

/**
 * Calcula luminância média e um proxy de nitidez a partir do canvas capturado.
 * A amostragem é feita em uma versão reduzida para manter o custo baixo no celular.
 */
export function analyseCanvas(canvas: HTMLCanvasElement): {
  meanLuminance: number;
  sharpness: number;
} {
  const SAMPLE_W = 160;
  const ratio = canvas.height / Math.max(canvas.width, 1);
  const SAMPLE_H = Math.max(2, Math.round(SAMPLE_W * ratio));

  const sample = document.createElement('canvas');
  sample.width = SAMPLE_W;
  sample.height = SAMPLE_H;

  const ctx = sample.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { meanLuminance: 0, sharpness: 0 };

  ctx.drawImage(canvas, 0, 0, SAMPLE_W, SAMPLE_H);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
  } catch {
    // Canvas "tainted" ou indisponível — não bloqueia o fluxo.
    return { meanLuminance: 0, sharpness: 0 };
  }

  // Escala de cinza (luminância perceptual).
  const gray = new Float32Array(SAMPLE_W * SAMPLE_H);
  let sum = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = lum;
    sum += lum;
  }
  const meanLuminance = sum / gray.length;

  // Variância do Laplaciano (kernel 4-vizinhos) como proxy de nitidez.
  let lapSum = 0;
  let lapSqSum = 0;
  let count = 0;
  for (let y = 1; y < SAMPLE_H - 1; y += 1) {
    for (let x = 1; x < SAMPLE_W - 1; x += 1) {
      const idx = y * SAMPLE_W + x;
      const lap =
        4 * gray[idx] -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - SAMPLE_W] -
        gray[idx + SAMPLE_W];
      lapSum += lap;
      lapSqSum += lap * lap;
      count += 1;
    }
  }

  if (count === 0) return { meanLuminance, sharpness: 0 };
  const lapMean = lapSum / count;
  const sharpness = lapSqSum / count - lapMean * lapMean;

  return { meanLuminance, sharpness };
}

/**
 * Consolida o relatório de qualidade da captura.
 * Somente falhas evidentes recebem nível BLOCK.
 */
export function buildQualityReport(params: {
  width: number;
  height: number;
  bytes: number;
  meanLuminance: number;
  sharpness: number;
}): QualityReport {
  const { width, height, bytes, meanLuminance, sharpness } = params;
  const issues: QualityIssue[] = [];

  if (!width || !height) {
    issues.push({
      code: 'EMPTY_IMAGE',
      level: 'BLOCK',
      message: 'Não foi possível capturar a imagem. Tente novamente.',
    });
  }

  // A menor dimensão é comparada ao menor limite, permitindo retrato ou paisagem.
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  if (width && height && (longSide < MIN_WIDTH || shortSide < MIN_HEIGHT)) {
    issues.push({
      code: 'LOW_RESOLUTION',
      level: 'BLOCK',
      message: 'A imagem ficou com resolução baixa demais para leitura. Tente novamente.',
    });
  }

  if (bytes > 0 && bytes < MIN_BYTES) {
    issues.push({
      code: 'TOO_SMALL',
      level: 'BLOCK',
      message: 'A foto não ficou nítida o suficiente. Tente novamente.',
    });
  }

  if (meanLuminance > 0 && meanLuminance < MIN_MEAN_LUMINANCE) {
    issues.push({
      code: 'TOO_DARK',
      level: 'BLOCK',
      message: 'A foto ficou escura demais. Procure um local mais iluminado.',
    });
  } else if (meanLuminance > 0 && meanLuminance < LOW_LIGHT_LUMINANCE) {
    issues.push({
      code: 'LOW_LIGHT',
      level: 'WARN',
      message: 'Iluminação abaixo do ideal.',
    });
  }

  if (sharpness > 0 && sharpness < LOW_SHARPNESS) {
    issues.push({
      code: 'POSSIBLY_BLURRY',
      level: 'WARN',
      message: 'A imagem pode estar levemente desfocada.',
    });
  }

  return {
    acceptable: !issues.some((i) => i.level === 'BLOCK'),
    width,
    height,
    bytes,
    meanLuminance: Math.round(meanLuminance),
    sharpness: Math.round(sharpness),
    issues,
  };
}

/** Mensagem principal a exibir ao usuário quando a captura é rejeitada. */
export function firstBlockingMessage(report: QualityReport): string {
  const blocking = report.issues.find((i) => i.level === 'BLOCK');
  return blocking?.message || 'A foto não ficou nítida o suficiente. Tente novamente.';
}
