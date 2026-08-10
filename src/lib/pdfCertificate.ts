import { PDFDocument, PDFPage, rgb, StandardFonts, LineCapStyle, PDFName, PDFString, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getFileBuffer, saveFile } from './storage';
import { calculateHash } from './pdfHash';
import { formatBrasiliaDateTime } from './dateUtils';
import sharp from 'sharp';
import { dedupePublicAuditEvents } from './publicAuditTrail';

// CPF e Telefone completos (SEM MASCARAMENTO no certificado oficial de evidências)
export function formatFullCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
}

export function formatFullPhone(phone?: string | null): string {
  if (!phone) return 'Não informado';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  }
  return phone;
}

export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AJ-${p1}-${p2}`;
}

function safeText(value: any, maximum = 200): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/\u2713/g, 'V')
    .replace(/[^\x00-\xFF]/g, '') // Remove caracteres fora da tabela Latin-1 WinAnsi
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function wrapText(text: any, maximumCharacters = 88): string[] {
  const words = safeText(text, 2000).split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maximumCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapTextToWidth(text: any, font: any, size: number, maximumWidth: number): string[] {
  const clean = safeText(text, 5000) || 'Não informado';
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  const pushLongWord = (word: string) => {
    let piece = '';
    for (const character of word) {
      const candidate = `${piece}${character}`;
      if (piece && font.widthOfTextAtSize(candidate, size) > maximumWidth) {
        lines.push(piece);
        piece = character;
      } else {
        piece = candidate;
      }
    }
    return piece;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maximumWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = font.widthOfTextAtSize(word, size) <= maximumWidth ? word : pushLongWord(word);
  }
  if (current) lines.push(current);
  return lines.length ? lines : ['Não informado'];
}

function parseUserAgentFriendly(ua: string | null | undefined): string {
  if (!ua) return 'Não informado';
  const str = String(ua);

  let browser = 'Navegador Web';
  if (str.includes('Edg/')) browser = 'Microsoft Edge';
  else if (str.includes('Chrome/')) browser = 'Google Chrome';
  else if (str.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (str.includes('Safari/') && !str.includes('Chrome/')) browser = 'Apple Safari';
  else if (str.includes('OPR/') || str.includes('Opera/')) browser = 'Opera';

  let os = 'Desktop';
  if (str.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (str.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (str.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (str.includes('Mac OS X')) os = 'macOS';
  else if (str.includes('Android')) os = 'Android Mobile';
  else if (str.includes('iPhone')) os = 'iOS (iPhone)';
  else if (str.includes('iPad')) os = 'iOS (iPad)';
  else if (str.includes('Linux')) os = 'Linux';

  return `${browser} (${os})`;
}

function addLinkAnnotation(
  pdfDoc: PDFDocument,
  page: PDFPage,
  { x, y, width, height, url }: { x: number; y: number; width: number; height: number; url: string }
) {
  try {
    const linkAnnotation = pdfDoc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [x, Math.max(0, y), x + width, Math.max(0, y + height)],
      Border: [0, 0, 0],
      F: 4,
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(url),
      },
    });
    const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);
    const annots = (page as any).node.get(PDFName.of('Annots'));
    if (annots && typeof annots.push === 'function') {
      annots.push(linkAnnotationRef);
    } else {
      (page as any).node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkAnnotationRef]));
    }
  } catch (err) {
    console.error('Erro ao adicionar link interativo no PDF:', err);
  }
}

async function embedBase64Image(
  pdfDoc: PDFDocument,
  base64: string | null | undefined,
  cover?: { width: number; height: number }
) {
  if (!base64) return null;
  try {
    const raw = String(base64).trim();
    const clean = raw.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/i, '').trim();
    let bytes = Buffer.from(clean, 'base64');
    if (bytes.length === 0) return null;

    if (cover) {
      bytes = Buffer.from(await sharp(bytes)
        .rotate()
        .resize(cover.width, cover.height, { fit: 'cover', position: 'top' })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer());
      return await pdfDoc.embedPng(bytes);
    }
    return await pdfDoc.embedJpg(bytes);
  } catch (err) {
    console.error('Erro ao incorporar imagem no certificado PDF:', err);
    return null;
  }
}

// Rótulos públicos em português amigável (sem OTP ou nomes técnicos)
const PUBLIC_EVENT_LABELS: Record<string, string> = {
  ROGO_FLOW_CONFIGURED: 'Fluxo a rogo configurado',
  ROGO_CONSENT_RECORDED: 'Ciência e autorização do cliente',
  SIGNATURE_ORDER_ENFORCED: 'Ordem de assinatura protegida',
  DOCUMENT_CREATED: 'Documento criado',
  DOCUMENT_GENERATED_BY_WHATSAPP: 'Documento gerado pelo WhatsApp',
  LINK_SENT: 'Link de assinatura enviado',
  LINK_OPENED: 'Link de assinatura acessado',
  IDENTITY_CONFIRMED: 'CPF confirmado pelo signatário',
  CAMERA_PERMITTED: 'Permissão de câmera concedida',
  LIVENESS_STARTED: 'Prova de presença iniciada',
  SELFIE_CENTER_VALIDATED: 'Imagem frontal validada',
  SELFIE_LEFT_VALIDATED: 'Perfil esquerdo validado',
  SELFIE_RIGHT_VALIDATED: 'Perfil direito validado',
  LIVENESS_CAPTURED: 'Prova de presença concluída (3 registros faciais)',
  SIGNATURE_SUBMITTED: 'Assinatura eletrônica registrada',
  DOCUMENT_COMPLETED: 'Documento finalizado e certificado emitido',
  DOCUMENT_CANCELLED: 'Documento cancelado',
};

const SIGNER_ROLE_LABELS: Record<string, string> = {
  CLIENTE: 'Cliente / Outorgante',
  ASSINANTE_A_ROGO: 'Assinante a Rogo',
  TESTEMUNHA: 'Testemunha',
  ADVOGADO: 'Advogado',
  CONTRATANTE: 'Contratante',
  CONTRATADO: 'Contratado',
  REPRESENTANTE_LEGAL: 'Representante Legal',
  RESPONSAVEL_FINANCEIRO: 'Responsável Financeiro',
};

function signerRoleLabel(role?: string | null) {
  return SIGNER_ROLE_LABELS[String(role || '')] || String(role || 'Signatário').replace(/_/g, ' ');
}

export async function generateFinalPdfCertificate(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      office: true,
      originalFile: true,
      signers: true,
      events: {
        where: {
          // Filtrar qualquer evento de OTP se existisse no histórico antigo
          NOT: { eventType: 'OTP_SENT' }
        },
        orderBy: { createdAt: 'asc' }
      },
    },
  });

  if (!doc || !doc.originalFile) {
    throw new Error('Documento ou arquivo original não encontrado.');
  }

  const publicEvents = dedupePublicAuditEvents(doc.events);

  const originalBytes = await getFileBuffer(doc.officeId, doc.originalFile.storageKey);
  if (!originalBytes) {
    throw new Error('Arquivo original não encontrado no armazenamento.');
  }

  const pdfDoc = await PDFDocument.load(originalBytes);

  let verificationCode = doc.verificationCode;
  if (!verificationCode) {
    verificationCode = generateVerificationCode();
    await prisma.document.update({
      where: { id: doc.id },
      data: { verificationCode },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assinajur.vercel.app';
  const verificationUrl = `${baseUrl}/verificar/${verificationCode}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 240,
    color: { dark: '#0B1D3D', light: '#FFFFFF' },
  });
  const qrImage = await pdfDoc.embedPng(Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);

  const navy = rgb(11 / 255, 29 / 255, 61 / 255);
  const gold = rgb(212 / 255, 175 / 255, 55 / 255);
  const text = rgb(0.16, 0.19, 0.24);
  const muted = rgb(0.44, 0.49, 0.56);
  const green = rgb(0.04, 0.45, 0.23);
  const linkBlue = rgb(0.11, 0.36, 0.74);
  const panelBg = rgb(1, 1, 1);
  const panelBorder = rgb(0.82, 0.86, 0.91);
  const paperBg = rgb(0.965, 0.974, 0.988);
  const paleGreen = rgb(0.92, 0.98, 0.95);

  const PAGE_W = 595.28; // A4 width
  const PAGE_H = 841.89; // A4 height
  const CX = 40;
  const CW = 515;
  const CR = CX + CW;

  // ── 1. FAIXA / CARIMBO NAS PÁGINAS DO DOCUMENTO ORIGINAL (Grampo Escolhido) ──
  const originalPages = pdfDoc.getPages();
  const totalOrigPages = originalPages.length;
  const sigPos = (doc as any).signaturePosition || 'BOTTOM';
  const customStampMatch = String(sigPos).match(/^CUSTOM:(\d+):([\d.]+):([\d.]+):([\d.]+):([\d.]+)$/);
  const customStamp = customStampMatch ? {
    page: Math.max(1, Number(customStampMatch[1])),
    x: Math.min(0.92, Math.max(0, Number(customStampMatch[2]))),
    y: Math.min(0.92, Math.max(0, Number(customStampMatch[3]))),
    width: Math.min(0.6, Math.max(0.18, Number(customStampMatch[4]))),
    height: Math.min(0.22, Math.max(0.065, Number(customStampMatch[5]))),
  } : null;

  let drawnSigImg: any = null;
  const activeSigner = doc.signers[0];
  if (activeSigner?.signatureImage && activeSigner.signatureImage.startsWith('data:image/')) {
    try {
      const sigBytes = Buffer.from(activeSigner.signatureImage.split(',')[1], 'base64');
      drawnSigImg = await pdfDoc.embedPng(sigBytes);
    } catch (sigErr) {
      console.warn('Erro ao carregar imagem de rubrica:', sigErr);
    }
  }

  originalPages.forEach((p, idx) => {
    const { width: pW, height: pH } = p.getSize();
    // O carimbo precisa caber em qualquer página sem abreviar dados com "...".
    // Os nomes completos permanecem no certificado de evidências.
    const stampText = `Documento assinado eletronicamente  |  Código: ${verificationCode}  |  Página ${idx + 1}/${totalOrigPages}  |  AssinaJur`;

    if (customStamp) {
      if (idx + 1 !== customStamp.page) return;
      const stampW = Math.min(pW * customStamp.width, pW - 16);
      const stampH = Math.min(pH * customStamp.height, 92);
      const stampX = Math.min(pW - stampW - 12, Math.max(12, pW * customStamp.x));
      const rawY = pH * (1 - customStamp.y - customStamp.height);
      const stampY = Math.max(88, Math.min(pH - stampH - 120, rawY));
      const witnessCount = doc.signers.filter((item) => item.role === 'TESTEMUNHA').length;
      const signerSummary = doc.isIlliterate
        ? `${safeText(doc.rogoName || 'Assinante a rogo', 70)} (A ROGO) + ${witnessCount} TESTEMUNHAS`
        : doc.signers.length > 2
          ? `${doc.signers.length} PARTICIPANTES COM EVIDÊNCIAS INDIVIDUAIS`
          : doc.signers.map((item) => item.name).join(', ');
      const signerNames = safeText(signerSummary, 180);
      const qrStampSize = Math.min(38, Math.max(26, stampH - 27));
      const contentX = stampX + qrStampSize + 15;
      const contentW = stampX + stampW - contentX - 10;
      const nameLines = wrapTextToWidth(signerNames, bold, 7.1, contentW).slice(0, 2);
      const signedAt = doc.signers.find((item) => item.signedAt)?.signedAt || doc.completedAt || new Date();
      p.drawRectangle({ x: stampX + 2.5, y: stampY - 2.5, width: stampW, height: stampH, color: rgb(0.78, 0.81, 0.86), opacity: 0.35 });
      p.drawRectangle({ x: stampX, y: stampY, width: stampW, height: stampH, color: rgb(1, 1, 1), opacity: 0.98, borderWidth: 1.35, borderColor: navy });
      p.drawRectangle({ x: stampX, y: stampY + stampH - 4, width: stampW, height: 4, color: gold });

      nameLines.forEach((line, lineIndex) => {
        p.drawText(line.toUpperCase(), { x: contentX, y: stampY + stampH - 14 - lineIndex * 8.5, size: 7.2, font: bold, color: navy });
      });

      const firstSignerCpf = formatFullCpf(doc.signers[0]?.cpf || '');
      p.drawText(`CPF: ${firstSignerCpf}`, { x: contentX, y: stampY + stampH - 24, size: 6.2, font: bold, color: text });

      p.drawText('ASSINATURA ELETRÔNICA QUALIFICADA', { x: contentX, y: stampY + stampH - 33, size: 5.4, font: bold, color: green });
      p.drawImage(qrImage, { x: stampX + 8, y: stampY + 6, width: qrStampSize, height: qrStampSize });
      p.drawLine({ start: { x: contentX - 7, y: stampY + 6 }, end: { x: contentX - 7, y: stampY + stampH - 8 }, thickness: 0.7, color: panelBorder });

      // Se o signatário desenhou uma rubrica opcional, desenha por cima do selo com opacidade suave
      if (drawnSigImg) {
        const sigW = Math.min(stampW * 0.6, 100);
        const sigH = Math.min(stampH * 0.6, 36);
        p.drawImage(drawnSigImg, {
          x: stampX + (stampW - sigW) / 2 + 10,
          y: stampY + (stampH - sigH) / 2,
          width: sigW,
          height: sigH,
          opacity: 0.75,
        });
      }

      p.drawText(doc.signers.length > 1 ? `${doc.signers.length} CPFs + SELFIES + GEOLOCALIZAÇÃO` : 'CPF + 3 SELFIES + GEOLOCALIZAÇÃO', { x: contentX, y: stampY + 20, size: 5.1, font: regular, color: text });
      p.drawText(formatBrasiliaDateTime(signedAt, false).replace(/\s*\(.+$/, ''), { x: contentX, y: stampY + 12, size: 5.1, font: regular, color: muted });
      p.drawText(`CÓD: ${verificationCode}`, { x: contentX, y: stampY + 4, size: 6.8, font: bold, color: navy });
    } else if (sigPos === 'TOP') {
      const stripH = 22;
      const stripY = pH - stripH;
      p.drawRectangle({
        x: 0,
        y: stripY,
        width: pW,
        height: stripH,
        color: rgb(0.96, 0.97, 0.99),
        borderWidth: 0,
      });
      p.drawLine({
        start: { x: 0, y: stripY },
        end: { x: pW, y: stripY },
        thickness: 0.8,
        color: navy,
      });
      p.drawText(stampText, {
        x: 14,
        y: stripY + 7,
        size: 6,
        font: bold,
        color: navy,
      });
    } else if (sigPos === 'RIGHT_MARGIN') {
      const stripW = 20;
      const stripX = pW - stripW;
      p.drawRectangle({
        x: stripX,
        y: 0,
        width: stripW,
        height: pH,
        color: rgb(0.96, 0.97, 0.99),
        borderWidth: 0,
      });
      p.drawLine({
        start: { x: stripX, y: 0 },
        end: { x: stripX, y: pH },
        thickness: 0.8,
        color: navy,
      });
      p.drawText(stampText, {
        x: stripX + 13,
        y: 20,
        size: 5.8,
        font: bold,
        color: navy,
        rotate: degrees(90),
      });
    } else if (sigPos === 'LEFT_MARGIN') {
      const stripW = 20;
      p.drawRectangle({
        x: 0,
        y: 0,
        width: stripW,
        height: pH,
        color: rgb(0.96, 0.97, 0.99),
        borderWidth: 0,
      });
      p.drawLine({
        start: { x: stripW, y: 0 },
        end: { x: stripW, y: pH },
        thickness: 0.8,
        color: navy,
      });
      p.drawText(stampText, {
        x: 13,
        y: 20,
        size: 5.8,
        font: bold,
        color: navy,
        rotate: degrees(90),
      });
    } else {
      // BOTTOM (Padrão Rodapé)
      const stripH = 22;
      const stripY = 0;
      p.drawRectangle({
        x: 0,
        y: stripY,
        width: pW,
        height: stripH,
        color: rgb(0.96, 0.97, 0.99),
        borderWidth: 0,
      });
      p.drawLine({
        start: { x: 0, y: stripY + stripH },
        end: { x: pW, y: stripY + stripH },
        thickness: 0.8,
        color: navy,
      });
      p.drawText(stampText, {
        x: 14,
        y: stripY + 7,
        size: 6,
        font: bold,
        color: navy,
      });
    }
  });

  const drawFrame = (p: PDFPage, subtitle: string) => {
    const cleanSubtitle = safeText(subtitle, 120);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: paperBg });
    p.drawRectangle({ x: 20, y: 20, width: 555.28, height: 801.89, borderWidth: 1.2, borderColor: panelBorder });
    p.drawRectangle({ x: 20, y: 760, width: 555.28, height: 61.89, color: navy });
    p.drawRectangle({ x: 20, y: 757, width: 555.28, height: 3, color: gold });
    p.drawText('ASSINAJUR', { x: CX, y: 794, size: 14, font: bold, color: rgb(1, 1, 1) });
    p.drawText('ASSINATURA ELETRÔNICA PARA ADVOCACIA', { x: CX, y: 780, size: 6.2, font: regular, color: rgb(0.72, 0.79, 0.9) });
    const subtitleWidth = bold.widthOfTextAtSize(cleanSubtitle, 8.2);
    p.drawText(cleanSubtitle, { x: CR - subtitleWidth, y: 787, size: 8.2, font: bold, color: rgb(1, 1, 1) });
  };

  // ── 2. CERTIFICADO COMPACTO DE 1 PÁGINA (GARANTE 2 FOLHAS NO TOTAL PARA DOCUMENTOS DE 1 A 2 SIGNATÁRIOS) ──
  const compactCertificate = doc.signers.length <= 2;
  if (compactCertificate) {
    const certificatePage = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const signer = doc.signers[0];
    if (!signer) throw new Error('Documento concluído sem signatário associado.');

    certificatePage.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: paperBg });
    certificatePage.drawRectangle({ x: 20, y: 20, width: 555.28, height: 801.89, borderWidth: 1.2, borderColor: panelBorder });
    certificatePage.drawRectangle({ x: 20, y: 760, width: 555.28, height: 61.89, color: navy });
    certificatePage.drawRectangle({ x: 20, y: 757, width: 555.28, height: 3, color: gold });
    certificatePage.drawText('ASSINAJUR', { x: CX, y: 794, size: 14, font: bold, color: rgb(1, 1, 1) });
    certificatePage.drawText('ASSINATURA ELETRÔNICA PARA ADVOCACIA', { x: CX, y: 780, size: 6.2, font: regular, color: rgb(0.72, 0.79, 0.9) });
    const compactHeader = 'CERTIFICADO DE EVIDÊNCIAS JURÍDICAS';
    certificatePage.drawText(compactHeader, { x: CR - bold.widthOfTextAtSize(compactHeader, 8.4), y: 787, size: 8.4, font: bold, color: rgb(1, 1, 1) });

    const compactTitleLines = wrapTextToWidth(doc.title, bold, 11.2, 320).slice(0, 2);
    compactTitleLines.forEach((line, index) => certificatePage.drawText(line, { x: CX, y: 736 - index * 13, size: 11.2, font: bold, color: navy }));
    certificatePage.drawText(`Código: ${verificationCode}`, { x: CX, y: 702, size: 7.2, font: mono, color: muted });
    certificatePage.drawText(`ID: ${doc.id}`, { x: CX, y: 691, size: 6.5, font: mono, color: muted });

    const compactBadgeX = 380;
    certificatePage.drawRectangle({ x: compactBadgeX, y: 704, width: 175, height: 38, color: navy });
    certificatePage.drawRectangle({ x: compactBadgeX, y: 738, width: 175, height: 4, color: gold });
    certificatePage.drawText('ASSINATURA E PRESENÇA', { x: compactBadgeX + 11, y: 724, size: 7.2, font: bold, color: rgb(1, 1, 1) });
    certificatePage.drawText('VERIFICADAS', { x: compactBadgeX + 11, y: 713, size: 7.2, font: bold, color: gold });
    certificatePage.drawText('QR E TRILHA PÚBLICA', { x: compactBadgeX + 105, y: 713, size: 5, font: bold, color: rgb(0.72, 0.79, 0.9) });

    const compactTrustY = 651;
    const compactTrustW = 160;
    const compactTrust = (x: number, label: string, value: string, accent: any) => {
      certificatePage.drawRectangle({ x, y: compactTrustY, width: compactTrustW, height: 29, color: rgb(1, 1, 1), borderWidth: 0.7, borderColor: panelBorder });
      certificatePage.drawRectangle({ x, y: compactTrustY, width: 4, height: 29, color: accent });
      certificatePage.drawText(label.toUpperCase(), { x: x + 11, y: compactTrustY + 18, size: 5.4, font: bold, color: muted });
      certificatePage.drawText(value, { x: x + 11, y: compactTrustY + 7, size: 7.1, font: bold, color: navy });
    };
    compactTrust(CX, 'Autenticidade', verificationCode, gold);
    compactTrust(CX + 177, 'Conclusão', formatBrasiliaDateTime(doc.completedAt || new Date(), false).replace(/\s*\(.+$/, ''), navy);
    compactTrust(CX + 354, 'Integridade', 'SHA-256 completo', navy);

    const compactPanelTop = 638;
    const compactPanelY = 475;
    certificatePage.drawRectangle({ x: CX, y: compactPanelY, width: CW, height: compactPanelTop - compactPanelY, color: rgb(1, 1, 1), borderWidth: 0.8, borderColor: panelBorder });
    certificatePage.drawRectangle({ x: CX, y: compactPanelTop - 23, width: CW, height: 23, color: navy });
    certificatePage.drawRectangle({ x: CX, y: compactPanelTop - 3, width: CW, height: 3, color: gold });
    certificatePage.drawText('1. IDENTIFICAÇÃO, ASSINATURA E DISPOSITIVO', { x: CX + 14, y: compactPanelTop - 15, size: 7.3, font: bold, color: rgb(1, 1, 1) });

    const leftX = CX + 14;
    const rightX = 315;
    const compactLabel = (x: number, yPos: number, label: string) => certificatePage.drawText(label.toUpperCase(), { x, y: yPos, size: 5.8, font: bold, color: muted });
    const compactValue = (x: number, yPos: number, value: string, width: number, size = 8, valueFont = regular, color = text, maxLines = 1) => {
      wrapTextToWidth(value, valueFont, size, width).slice(0, maxLines).forEach((line, index) => {
        certificatePage.drawText(line, { x, y: yPos - index * (size + 1.5), size, font: valueFont, color });
      });
    };
    compactLabel(leftX, 601, 'Signatário');
    compactValue(leftX, 588, signer.name, 235, 9.2, bold, navy, 2);
    compactLabel(rightX, 601, 'CPF completo');
    compactValue(rightX, 588, formatFullCpf(signer.cpf), 225, 9.2, bold, navy);
    compactLabel(leftX, 568, 'Telefone');
    compactValue(leftX, 556, formatFullPhone(signer.phone), 235, 8.2);
    compactLabel(rightX, 568, 'Data e hora da assinatura');
    compactValue(rightX, 556, formatBrasiliaDateTime(signer.signedAt), 225, 7.2, bold, text, 2);
    compactLabel(leftX, 536, 'Endereço IP');
    compactValue(leftX, 524, signer.ipAddress || 'Não informado', 235, 7.4, mono);
    compactLabel(rightX, 536, 'Geolocalização');
    const compactLocation = signer.geoLat != null && signer.geoLng != null
      ? `${signer.geoCity || ''}${signer.geoState ? '/' + signer.geoState : ''} | ${Number(signer.geoLat).toFixed(6)}, ${Number(signer.geoLng).toFixed(6)}${signer.geoAccuracy != null ? ` | precisão ${Math.round(signer.geoAccuracy)} m` : ''}`
      : 'Não coletada';
    compactValue(rightX, 524, compactLocation, 225, 6.8, regular, signer.geoLat != null ? linkBlue : muted, 2);
    if (signer.geoLat != null && signer.geoLng != null) {
      const mapsUrl = `https://www.google.com/maps?q=${Number(signer.geoLat)},${Number(signer.geoLng)}`;
      addLinkAnnotation(pdfDoc, certificatePage, {
        x: rightX,
        y: 512,
        width: 225,
        height: 20,
        url: mapsUrl,
      });
    }
    compactLabel(leftX, 505, 'Dispositivo e navegador');
    compactValue(leftX, 493, parseUserAgentFriendly(signer.userAgent), CW - 28, 7.8, bold, navy, 1);

    certificatePage.drawText('2. PROVA DE PRESENÇA AO VIVO - 3 REGISTROS FACIAIS', { x: CX, y: 458, size: 7.4, font: bold, color: navy });
    const compactPhotos: Array<[string, string | null]> = [
      ['1  FRONTAL', signer.selfieCenterImage],
      ['2  PERFIL ESQUERDO', signer.selfieLeftImage],
      ['3  PERFIL DIREITO', signer.selfieRightImage],
    ];
    const compactPhotoW = 140;
    const compactPhotoH = 132;
    const compactPhotoGap = 27;
    let compactPhotoX = CX + (CW - (compactPhotoW * 3 + compactPhotoGap * 2)) / 2;
    for (const [label, imageData] of compactPhotos) {
      const embedded = await embedBase64Image(pdfDoc, imageData, { width: 560, height: 528 });
      certificatePage.drawRectangle({ x: compactPhotoX - 2, y: 309, width: compactPhotoW + 4, height: compactPhotoH + 4, color: navy });
      certificatePage.drawRectangle({ x: compactPhotoX - 2, y: 441, width: compactPhotoW + 4, height: 4, color: gold });

      const imgFrameH = compactPhotoH - 26;
      certificatePage.drawRectangle({ x: compactPhotoX, y: 335, width: compactPhotoW, height: imgFrameH, color: rgb(0.88, 0.92, 0.97) });

      if (embedded) {
        const imgW = embedded.width;
        const imgH = embedded.height;
        const scale = Math.min(compactPhotoW / imgW, imgFrameH / imgH);
        const drawW = Math.round(imgW * scale);
        const drawH = Math.round(imgH * scale);
        const offsetX = compactPhotoX + (compactPhotoW - drawW) / 2;
        const offsetY = 335 + (imgFrameH - drawH) / 2;

        certificatePage.drawImage(embedded, { x: offsetX, y: offsetY, width: drawW, height: drawH });
      }

      certificatePage.drawRectangle({ x: compactPhotoX, y: 309, width: compactPhotoW, height: 18, color: navy });
      certificatePage.drawText(label, { x: compactPhotoX + 7, y: 315, size: 5.8, font: bold, color: rgb(1, 1, 1) });
      certificatePage.drawText('VALIDADA', { x: compactPhotoX + compactPhotoW - 41, y: 315, size: 4.8, font: bold, color: gold });
      compactPhotoX += compactPhotoW + compactPhotoGap;
    }

    const integrityX = CX;
    const integrityY = 162;
    const integrityW = 250;
    const evidenceH = 132;
    certificatePage.drawRectangle({ x: integrityX, y: integrityY, width: integrityW, height: evidenceH, color: navy });
    certificatePage.drawRectangle({ x: integrityX, y: integrityY + evidenceH - 4, width: integrityW, height: 4, color: gold });
    certificatePage.drawText('3. INTEGRIDADE CRIPTOGRÁFICA', { x: integrityX + 13, y: integrityY + evidenceH - 18, size: 7.1, font: bold, color: rgb(1, 1, 1) });
    certificatePage.drawText('HASH SHA-256 DO DOCUMENTO ORIGINAL', { x: integrityX + 13, y: integrityY + 93, size: 5.7, font: bold, color: rgb(0.68, 0.76, 0.88) });
    const compactHash = doc.originalHash || '';
    certificatePage.drawText(compactHash.substring(0, 32), { x: integrityX + 13, y: integrityY + 78, size: 7.2, font: mono, color: rgb(1, 1, 1) });
    certificatePage.drawText(compactHash.substring(32, 64), { x: integrityX + 13, y: integrityY + 66, size: 7.2, font: mono, color: rgb(1, 1, 1) });
    certificatePage.drawText('PROVAS VINCULADAS', { x: integrityX + 13, y: integrityY + 46, size: 5.7, font: bold, color: rgb(0.68, 0.76, 0.88) });
    certificatePage.drawText('CPF confirmado | 3 selfies | IP | geolocalização', { x: integrityX + 13, y: integrityY + 33, size: 6.4, font: regular, color: rgb(0.9, 0.93, 0.98) });
    certificatePage.drawText(`${publicEvents.length} eventos preservados na trilha pública`, { x: integrityX + 13, y: integrityY + 19, size: 6.4, font: bold, color: gold });

    const validationX = 304;
    const validationW = CR - validationX;
    certificatePage.drawRectangle({ x: validationX, y: integrityY, width: validationW, height: evidenceH, color: rgb(1, 1, 1), borderWidth: 0.8, borderColor: panelBorder });
    certificatePage.drawRectangle({ x: validationX, y: integrityY + evidenceH - 24, width: validationW, height: 24, color: navy });
    certificatePage.drawRectangle({ x: validationX, y: integrityY + evidenceH - 3, width: validationW, height: 3, color: gold });
    certificatePage.drawText('VALIDAÇÃO PÚBLICA INDEPENDENTE', { x: validationX + 12, y: integrityY + evidenceH - 16, size: 6.7, font: bold, color: rgb(1, 1, 1) });
    certificatePage.drawImage(qrImage, { x: validationX + 12, y: integrityY + 15, width: 73, height: 73 });
    const validationTextX = validationX + 96;
    certificatePage.drawText('ESCANEIE PARA VERIFICAR', { x: validationTextX, y: integrityY + 84, size: 5.8, font: bold, color: muted });
    certificatePage.drawText(verificationCode, { x: validationTextX, y: integrityY + 68, size: 8, font: mono, color: navy });
    certificatePage.drawText('assinajur.com.br/verificar', { x: validationTextX, y: integrityY + 52, size: 6.5, font: bold, color: linkBlue });
    certificatePage.drawText('Trilha completa, dados técnicos', { x: validationTextX, y: integrityY + 35, size: 6.2, font: regular, color: text });
    certificatePage.drawText('e autenticidade disponíveis online.', { x: validationTextX, y: integrityY + 25, size: 6.2, font: regular, color: text });
    certificatePage.drawText('MP 2.200-2/2001 | Lei 14.063/2020', { x: validationTextX, y: integrityY + 11, size: 5.5, font: bold, color: muted });

    const auditY = 57;
    const auditH = 92;
    certificatePage.drawRectangle({ x: CX, y: auditY, width: CW, height: auditH, color: rgb(1, 1, 1), borderWidth: 0.8, borderColor: panelBorder });
    certificatePage.drawRectangle({ x: CX, y: auditY + auditH - 23, width: CW, height: 23, color: navy });
    certificatePage.drawText('4. RESUMO DA TRILHA DE AUDITORIA', { x: CX + 14, y: auditY + auditH - 15, size: 7.1, font: bold, color: rgb(1, 1, 1) });
    certificatePage.drawText(`${publicEvents.length} EVENTOS | DETALHAMENTO COMPLETO PELO QR CODE`, { x: CR - 196, y: auditY + auditH - 15, size: 5.2, font: bold, color: rgb(0.72, 0.79, 0.9) });
    const milestones = [
      'CPF CONFIRMADO',
      'PRESENÇA - 3 SELFIES',
      'ASSINATURA REGISTRADA',
      'CERTIFICADO EMITIDO',
    ];
    milestones.forEach((milestone, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const itemX = CX + 16 + col * 250;
      const itemY = auditY + 48 - row * 21;
      certificatePage.drawRectangle({ x: itemX, y: itemY, width: 8, height: 8, color: gold });
      certificatePage.drawText(milestone, { x: itemX + 15, y: itemY + 1, size: 6.4, font: bold, color: navy });
    });
    certificatePage.drawText(safeText(`Concluído em ${formatBrasiliaDateTime(doc.completedAt || new Date())}`, 220), { x: CX + 16, y: auditY + 7, size: 5.7, font: italic, color: muted });

    // ── PÁGINA 2 DO CERTIFICADO: TRILHA PÚBLICA DE EVENTOS (DETALHAMENTO CRONOLÓGICO) ──
    if (publicEvents.length > 0) {
      const timelinePage = pdfDoc.addPage([PAGE_W, PAGE_H]);
      drawFrame(timelinePage, '6. TRILHA PÚBLICA DE EVENTOS - DETALHAMENTO CRONOLÓGICO');

      const timelineTitleLines = wrapTextToWidth(doc.title, bold, 11, CW);
      timelineTitleLines.forEach((line, index) => {
        timelinePage.drawText(line, { x: CX, y: 736 - index * 12, size: 11, font: bold, color: navy });
      });
      timelinePage.drawText(`Código de Autenticidade: ${verificationCode}`, { x: CX, y: 718, size: 8, font: mono, color: muted });

      const dateColX = CX + 6;
      const dateColWidth = 106;
      const eventColX = dateColX + dateColWidth + 8;
      const eventColWidth = 126;
      const descColX = eventColX + eventColWidth + 8;
      const descColWidth = CR - descColX - 6;
      const headerHeight = 18;

      const headerY = 690;
      timelinePage.drawRectangle({ x: CX, y: headerY - 4, width: CW, height: headerHeight, color: navy });
      timelinePage.drawText('DATA E HORA (BRT)', { x: dateColX, y: headerY, size: 7, font: bold, color: rgb(1, 1, 1) });
      timelinePage.drawText('EVENTO', { x: eventColX, y: headerY, size: 7, font: bold, color: rgb(1, 1, 1) });
      timelinePage.drawText('DESCRIÇÃO', { x: descColX, y: headerY, size: 7, font: bold, color: rgb(1, 1, 1) });

      let rowY = headerY - 4;
      const rows = publicEvents.map((ev) => {
        const dateText = formatBrasiliaDateTime(ev.createdAt, true).replace(' (Horário de Brasília — UTC−3)', '');
        const eventLabel = PUBLIC_EVENT_LABELS[ev.eventType] || ev.eventType;
        const dateLines = wrapTextToWidth(dateText, mono, 7, dateColWidth - 8);
        const eventLines = wrapTextToWidth(eventLabel, bold, 7.2, eventColWidth - 8);
        const descLines = wrapTextToWidth(ev.description, regular, 7, descColWidth - 6);
        const lineCount = Math.max(1, dateLines.length, eventLines.length, descLines.length);
        const height = Math.max(26, 15 + lineCount * 9.5);
        return { dateLines, eventLines, descLines, height };
      });

      rows.forEach((row, index) => {
        rowY -= row.height;
        if (index % 2 === 1) {
          timelinePage.drawRectangle({ x: CX, y: rowY, width: CW, height: row.height, color: panelBg });
        }
        let dateY = rowY + row.height - 13;
        for (const line of row.dateLines) {
          timelinePage.drawText(line, { x: dateColX, y: dateY, size: 7, font: mono, color: text });
          dateY -= 9.5;
        }

        let eventY = rowY + row.height - 13;
        for (const line of row.eventLines) {
          timelinePage.drawText(line, { x: eventColX, y: eventY, size: 7.2, font: bold, color: navy });
          eventY -= 9.5;
        }

        let descY = rowY + row.height - 13;
        for (const line of row.descLines) {
          timelinePage.drawText(line, { x: descColX, y: descY, size: 7, font: regular, color: text });
          descY -= 9.5;
        }

        timelinePage.drawLine({ start: { x: eventColX - 4, y: rowY }, end: { x: eventColX - 4, y: rowY + row.height }, thickness: 0.35, color: panelBorder });
        timelinePage.drawLine({ start: { x: descColX - 4, y: rowY }, end: { x: descColX - 4, y: rowY + row.height }, thickness: 0.35, color: panelBorder });
        timelinePage.drawLine({ start: { x: CX, y: rowY }, end: { x: CR, y: rowY }, thickness: 0.5, color: panelBorder });
      });

      timelinePage.drawRectangle({ x: 20, y: 20, width: 555.28, height: 34, color: rgb(0.96, 0.97, 0.99) });
      timelinePage.drawText(`Trilha de auditoria concluída com ${publicEvents.length} evento(s) registrado(s). MP 2.200-2/2001 | Lei 14.063/2020.`, { x: CX, y: 34, size: 6.6, font: italic, color: muted });
    }

    pdfDoc.setTitle(`${doc.title} - Assinado Eletronicamente`);
    pdfDoc.setAuthor(doc.office.name);
    pdfDoc.setSubject(`Certificado de Evidências - Código ${verificationCode}`);
    pdfDoc.setKeywords(['Assinatura Eletrônica', 'MP 2200-2/2001', 'Lei 14063/2020', 'AssinaJur', 'Horário de Brasília']);

    const finalPdfBytes = await pdfDoc.save();
    const finalBuffer = Buffer.from(finalPdfBytes);
    const signedHash = calculateHash(finalBuffer);

    const signedStorageFile = await saveFile({
      officeId: doc.officeId,
      fileBuffer: finalBuffer,
      originalName: `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}_ASSINADO.pdf`,
      mimeType: 'application/pdf',
    });

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        signedFileId: signedStorageFile.id,
        signedHash,
      },
    });

    return {
      signedStorageFile,
      signedHash,
      verificationCode,
    };
  }

  if (!compactCertificate) {
  // ── 2. PÁGINA(S) DO CERTIFICADO DE EVIDÊNCIAS JURÍDICAS ──
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let manifestPageCount = 1;



  // SEÇÃO 1: CABEÇALHO DO CERTIFICADO
  drawFrame(page, 'CERTIFICADO DE EVIDENCIAS JURIDICAS - REGISTRO IMUTAVEL');
  const certificateTitleLines = wrapTextToWidth(doc.title, bold, 11.5, 330);
  certificateTitleLines.forEach((line, index) => {
    page.drawText(line, { x: CX, y: 736 - index * 13, size: 11.5, font: bold, color: navy });
  });
  page.drawText(`Código de Autenticidade: ${verificationCode}`, {
    x: CX, y: 696, size: 7.5, font: mono, color: muted,
  });
  page.drawText(`ID completo: ${safeText(doc.id, 200)}`, {
    x: CX, y: 685, size: 7.5, font: mono, color: muted,
  });

  // Identificador funcional de autenticidade, vinculado ao código e ao QR público.
  const badgeW = 185;
  const badgeH = 34;
  const badgeX = CR - badgeW;
  const badgeY = 708;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: navy,
    borderWidth: 1.1,
    borderColor: navy,
  });
  page.drawRectangle({ x: badgeX, y: badgeY + badgeH - 4, width: badgeW, height: 4, color: gold });
  page.drawText('AUTENTICIDADE VERIFICÁVEL', { x: badgeX + 11, y: badgeY + 18, size: 7.1, font: bold, color: rgb(1, 1, 1) });
  page.drawText(verificationCode, { x: badgeX + 11, y: badgeY + 7, size: 7, font: mono, color: gold });
  page.drawText('QR NA SEÇÃO 5', { x: badgeX + 119, y: badgeY + 7, size: 5.2, font: bold, color: rgb(0.72, 0.79, 0.9) });

  page.drawLine({ start: { x: CX, y: 676 }, end: { x: CR, y: 676 }, thickness: 0.8, color: panelBorder });

  const trustCardY = 632;
  const trustCardW = 160;
  const drawTrustCard = (x: number, label: string, value: string, accent: any) => {
    page.drawRectangle({ x, y: trustCardY, width: trustCardW, height: 36, color: rgb(1, 1, 1), borderWidth: 0.8, borderColor: panelBorder });
    page.drawRectangle({ x, y: trustCardY, width: 4, height: 36, color: accent });
    page.drawText(label.toUpperCase(), { x: x + 12, y: trustCardY + 23, size: 5.7, font: bold, color: muted });
    page.drawText(value, { x: x + 12, y: trustCardY + 10, size: 7.7, font: bold, color: navy });
  };
  drawTrustCard(CX, 'Código de autenticidade', verificationCode, gold);
  drawTrustCard(CX + 177, 'Conclusão', formatBrasiliaDateTime(doc.completedAt || new Date(), false).replace(/\s*\(.+$/, ''), green);
  drawTrustCard(CX + 354, 'Proteção', 'Integridade SHA-256', navy);

  let y = 616;
  const padX = CX + 14;

  const ensureSpace = (minRemaining: number) => {
    if (y - minRemaining < 70) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      manifestPageCount += 1;
      drawFrame(page, `CERTIFICADO DE EVIDÊNCIAS JURÍDICAS (Continuação ${manifestPageCount})`);
      y = 710;
    }
  };

  const fieldLabel = (x: number, yPos: number, label: string) => {
    page.drawText(safeText(label, 60).toUpperCase(), { x, y: yPos, size: 6.5, font: bold, color: muted });
  };
  const fieldValue = (x: number, yPos: number, value: any, options: any = {}) => {
    page.drawText(safeText(value, options.max || 5000), {
      x,
      y: yPos,
      size: options.size || 9.5,
      font: options.font || regular,
      color: options.color || text,
    });
  };

  const fieldLines = (value: any, width: number, options: any = {}) =>
    wrapTextToWidth(value, options.font || regular, options.size || 8, width);

  const drawFieldBlock = (
    x: number,
    top: number,
    width: number,
    label: string,
    value: any,
    options: any = {}
  ) => {
    const size = options.size || 8;
    const lineHeight = options.lineHeight || size + 2;
    const lines = fieldLines(value, width, options);
    fieldLabel(x, top, label);
    lines.forEach((line: string, index: number) => {
      fieldValue(x, top - 12 - index * lineHeight, line, { ...options, max: 5000 });
    });
    return 12 + lines.length * lineHeight + 5;
  };

  // SEÇÃO 2: DADOS DO DOCUMENTO
  const documentHalfWidth = 220;
  const documentGap = 54;
  const officeText = `${doc.office.name} (${doc.office.cpfCnpj})`;
  const officeLines = fieldLines(officeText, documentHalfWidth, { font: bold, size: 8.5 });
  const createdLines = fieldLines(formatBrasiliaDateTime(doc.createdAt), documentHalfWidth, { size: 7.2 });
  const typeLines = fieldLines(doc.documentType || 'Não informado', documentHalfWidth, { font: bold, size: 8.2 });
  const completedLines = fieldLines(formatBrasiliaDateTime(doc.completedAt || new Date()), documentHalfWidth, { font: bold, size: 7.2 });
  const documentRowHeight = (leftLines: number, rightLines: number, size: number) =>
    12 + Math.max(leftLines, rightLines) * (size + 2) + 6;
  const documentFirstRowH = documentRowHeight(officeLines.length, createdLines.length, 8.5);
  const documentSecondRowH = documentRowHeight(typeLines.length, completedLines.length, 8.2);
  const docPanelH = 25 + documentFirstRowH + documentSecondRowH + 8;
  ensureSpace(docPanelH + 14);
  const docPanelTop = y;
  const docPanelY = docPanelTop - docPanelH;
  page.drawRectangle({ x: CX, y: docPanelY, width: CW, height: docPanelH, color: panelBg, borderWidth: 0.9, borderColor: panelBorder });
  page.drawRectangle({ x: CX, y: docPanelTop - 24, width: CW, height: 24, color: navy });
  page.drawRectangle({ x: CX, y: docPanelTop - 3, width: CW, height: 3, color: gold });
  page.drawText('1. IDENTIFICAÇÃO DO DOCUMENTO', { x: padX, y: docPanelTop - 16, size: 7.5, font: bold, color: rgb(1, 1, 1) });

  const documentCol2X = padX + documentHalfWidth + documentGap;
  let documentCursor = docPanelTop - 32;
  drawFieldBlock(padX, documentCursor, documentHalfWidth, 'Escritório responsável', officeText, { font: bold, size: 8.5 });
  drawFieldBlock(documentCol2X, documentCursor, documentHalfWidth, 'Data de criação', formatBrasiliaDateTime(doc.createdAt), { size: 7.2, lineHeight: 9.2 });
  documentCursor -= documentFirstRowH;
  drawFieldBlock(padX, documentCursor, documentHalfWidth, 'Tipo de documento', doc.documentType || 'Não informado', { font: bold, size: 8.2 });
  drawFieldBlock(documentCol2X, documentCursor, documentHalfWidth, 'Data de conclusão', formatBrasiliaDateTime(doc.completedAt || new Date()), { font: bold, size: 7.2, lineHeight: 9.2, color: green });

  y = docPanelY - 14;

  // SEÇÃO 3 & 4: DADOS DO SIGNATÁRIO E EVIDÊNCIAS COLETADAS
  for (const signer of doc.signers) {
    const hasPhotos = Boolean(signer.selfieCenterImage || signer.selfieLeftImage || signer.selfieRightImage);
    const hasLocation = signer.geoLat != null && signer.geoLng != null;
    const mapsUrlStr = hasLocation ? `https://maps.google.com/?q=${Number(signer.geoLat)},${Number(signer.geoLng)}` : '';
    const locationText = hasLocation
      ? `${signer.geoCity ? `${safeText(signer.geoCity, 200)}${signer.geoState ? '/' + signer.geoState : ''} — ` : ''}${Number(
          signer.geoLat
        ).toFixed(6)}, ${Number(signer.geoLng).toFixed(6)} [Abrir Mapa: ${mapsUrlStr}]${
          signer.geoAccuracy != null ? ` (precisão: ${Math.round(signer.geoAccuracy)}m)` : ''
        }`
      : 'Não coletada (permissão não concedida)';
    const authenticationText = 'CPF + Prova de presença ao vivo (3 fotos) + Geolocalização do dispositivo';
    const innerWidth = CW - 28;
    const halfWidth = 226;
    const gapWidth = 34;
    const rowHeight = (leftLines: number, rightLines: number, size = 9) =>
      12 + Math.max(leftLines, rightLines) * (size + 2) + 5;
    const nameLines = fieldLines(signer.name, halfWidth, { font: bold, size: 9.5 });
    const cpfLines = fieldLines(formatFullCpf(signer.cpf), halfWidth, { font: bold, size: 9.5 });
    const phoneLines = fieldLines(formatFullPhone(signer.phone), halfWidth, { size: 9 });
    const dateLines = fieldLines(formatBrasiliaDateTime(signer.signedAt), halfWidth, { font: bold, size: 8.5 });
    const ipLines = fieldLines(signer.ipAddress || 'Não informado', halfWidth, { font: mono, size: 8 });
    const roleLines = fieldLines(signerRoleLabel(signer.role), halfWidth, { size: 8.5 });
    const userAgentLines = fieldLines(signer.userAgent || 'Não informado', innerWidth, { size: 7.2 });
    const locationLines = fieldLines(locationText, innerWidth, { size: 7.8 });
    const authenticationLines = fieldLines(authenticationText, innerWidth, { size: 7.8 });
    const dataHeight =
      rowHeight(nameLines.length, cpfLines.length, 9.5) +
      rowHeight(phoneLines.length, dateLines.length, 9) +
      rowHeight(ipLines.length, roleLines.length, 8.5) +
      (12 + userAgentLines.length * 9.2 + 5) +
      (12 + locationLines.length * 9.8 + 5) +
      (12 + authenticationLines.length * 9.8 + 5) +
      (signer.signatureImage ? 65 : 0);
    const photosHeight = hasPhotos ? 225 : 0;
    const panelH = 28 + dataHeight + photosHeight + 10;
    ensureSpace(panelH + 10);

    const pTop = y;
    const pY = pTop - panelH;
    page.drawRectangle({ x: CX, y: pY, width: CW, height: panelH, color: panelBg, borderWidth: 0.9, borderColor: panelBorder });
    page.drawRectangle({ x: CX, y: pTop - 24, width: CW, height: 24, color: navy });
    page.drawRectangle({ x: CX, y: pTop - 3, width: CW, height: 3, color: gold });
    
    page.drawText('2. DADOS COMPLETOS DO SIGNATÁRIO', {
      x: padX,
      y: pTop - 15,
      size: 7.5,
      font: bold,
      color: rgb(1, 1, 1),
    });

    const col2X = padX + halfWidth + gapWidth;
    let cursor = pTop - 32;

    const drawTwoColumns = (
      left: { label: string; value: any; options?: any },
      right: { label: string; value: any; options?: any },
      height: number
    ) => {
      drawFieldBlock(padX, cursor, halfWidth, left.label, left.value, left.options);
      drawFieldBlock(col2X, cursor, halfWidth, right.label, right.value, right.options);
      cursor -= height;
    };

    drawTwoColumns(
      { label: 'Nome completo', value: signer.name, options: { font: bold, size: 9.5 } },
      { label: 'CPF completo', value: formatFullCpf(signer.cpf), options: { font: bold, size: 9.5 } },
      rowHeight(nameLines.length, cpfLines.length, 9.5)
    );
    drawTwoColumns(
      { label: 'Telefone completo', value: formatFullPhone(signer.phone), options: { size: 9 } },
      { label: 'Data e hora da assinatura', value: formatBrasiliaDateTime(signer.signedAt), options: { font: bold, size: 8.5 } },
      rowHeight(phoneLines.length, dateLines.length, 9)
    );
    drawTwoColumns(
      { label: 'Endereço IP', value: signer.ipAddress || 'Não informado', options: { font: mono, size: 8 } },
      { label: 'Qualificação', value: signerRoleLabel(signer.role), options: { size: 8.5 } },
      rowHeight(ipLines.length, roleLines.length, 8.5)
    );

    cursor -= drawFieldBlock(padX, cursor, innerWidth, 'Dispositivo e navegador completos', parseUserAgentFriendly(signer.userAgent), { size: 8, lineHeight: 9.8, font: bold, color: navy });
    const locationTop = cursor;
    cursor -= drawFieldBlock(padX, cursor, innerWidth, 'Geolocalização completa do dispositivo', locationText, { size: 7.8, lineHeight: 9.8, color: hasLocation ? linkBlue : muted });

    if (hasLocation) {
      const mapsUrl = `https://www.google.com/maps?q=${Number(signer.geoLat)},${Number(signer.geoLng)}`;
      const locationBlockHeight = 12 + locationLines.length * 9.8;
      addLinkAnnotation(pdfDoc, page, {
        x: padX,
        y: locationTop - locationBlockHeight,
        width: innerWidth,
        height: locationBlockHeight,
        url: mapsUrl,
      });
    }

    cursor -= drawFieldBlock(padX, cursor, innerWidth, 'Método de autenticação completo', authenticationText, { size: 7.8, lineHeight: 9.8 });

    // Assinatura gráfica
    if (signer.signatureImage && signer.signatureImage.startsWith('data:image/png;base64,')) {
      try {
        const base64Data = signer.signatureImage.replace(/^data:image\/png;base64,/, '');
        const sigPng = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
        page.drawText('ASSINATURA GRÁFICA', { x: padX, y: cursor, size: 6.5, font: bold, color: muted });
        const sigScale = Math.min(160 / sigPng.width, 48 / sigPng.height);
        page.drawImage(sigPng, { x: padX, y: cursor - 52, width: sigPng.width * sigScale, height: sigPng.height * sigScale });
        cursor -= 65;
      } catch (sigErr) {
        console.error('Erro ao renderizar assinatura gráfica no PDF:', sigErr);
      }
    }

    // SEÇÃO 4: EVIDÊNCIAS COLETADAS — 3 SELFIES (CENTRO / PERFIL ESQUERDO / PERFIL DIREITO)
    if (hasPhotos) {
      page.drawText('3. PROVA DE PRESENÇA AO VIVO', {
        x: padX,
        y: cursor,
        size: 7.5,
        font: bold,
        color: navy,
      });

      const photoLabels: Array<[string, string | null]> = [
        ['1. Frontal (Centro)', signer.selfieCenterImage],
        ['2. Perfil Esquerdo', signer.selfieLeftImage],
        ['3. Perfil Direito', signer.selfieRightImage],
      ];

      // Cartões verticais para acompanhar melhor o enquadramento natural de selfie.
      const boxW = 135;
      const boxH = 155;
      const cardH = 187;
      const gap = 27;
      const photosTotalWidth = boxW * 3 + gap * 2;
      let photoX = padX + Math.max(0, (innerWidth - photosTotalWidth) / 2);

      for (const [label, img] of photoLabels) {
        const embedded = await embedBase64Image(pdfDoc, img, { width: 540, height: 620 });
        const cardY = cursor - cardH - 16;

        page.drawRectangle({
          x: photoX - 2,
          y: cardY - 2,
          width: boxW + 4,
          height: cardH + 4,
          borderWidth: 0,
          color: navy,
        });
        page.drawRectangle({ x: photoX - 2, y: cardY + cardH - 2, width: boxW + 4, height: 4, color: gold });
        const imgFrameH = boxH - 30;
        page.drawRectangle({ x: photoX, y: cardY + 55, width: boxW, height: imgFrameH, color: rgb(0.88, 0.92, 0.97) });

        if (embedded) {
          const imgW = embedded.width;
          const imgH = embedded.height;
          const scale = Math.min(boxW / imgW, imgFrameH / imgH);
          const drawW = Math.round(imgW * scale);
          const drawH = Math.round(imgH * scale);

          const offsetX = photoX + (boxW - drawW) / 2;
          const offsetY = cardY + 55 + (imgFrameH - drawH) / 2;

          page.drawImage(embedded, {
            x: offsetX,
            y: offsetY,
            width: drawW,
            height: drawH,
          });
        }

        page.drawText(safeText(label, 40).toUpperCase(), {
          x: photoX + 7,
          y: cardY + 11,
          size: 6.4,
          font: bold,
          color: rgb(1, 1, 1),
        });
        page.drawRectangle({ x: photoX + boxW - 46, y: cardY + 7, width: 39, height: 13, color: paleGreen });
        page.drawText('VALIDADA', { x: photoX + boxW - 41, y: cardY + 11, size: 5.2, font: bold, color: green });
        photoX += boxW + gap;
      }
    }

    y = pY - 14;
  }

  // SEÇÃO 5: INTEGRIDADE SHA-256 COMPLETA (SEM CORTE E SEM RETICÊNCIAS)
  ensureSpace(110);
  const integTop = y;
  const integH = 92;
  const integY = integTop - integH;
  page.drawRectangle({ x: CX, y: integY, width: CW, height: integH, color: navy, borderWidth: 0.9, borderColor: navy });
  page.drawRectangle({ x: CX, y: integTop - 3, width: CW, height: 3, color: gold });
  page.drawText('4. REGISTRO DE INTEGRIDADE E HASH SHA-256 COMPLETO', { x: padX, y: integTop - 15, size: 7.5, font: bold, color: rgb(1, 1, 1) });

  page.drawText('HASH SHA-256 DO DOCUMENTO ORIGINAL (64 CARACTERES)', { x: padX, y: integTop - 32, size: 6.5, font: bold, color: rgb(0.68, 0.76, 0.88) });
  // Dividir o hash de 64 caracteres em duas linhas monoespaçadas exatas de 32 chars cada
  const origHash = doc.originalHash || '';
  const hashPart1 = origHash.substring(0, 32);
  const hashPart2 = origHash.substring(32, 64);

  page.drawText(hashPart1, { x: padX, y: integTop - 45, size: 8, font: mono, color: rgb(1, 1, 1) });
  page.drawText(hashPart2, { x: padX, y: integTop - 56, size: 8, font: mono, color: rgb(1, 1, 1) });

  page.drawText('GARANTIA DE INTEGRIDADE', { x: padX, y: integTop - 70, size: 6.5, font: bold, color: rgb(0.68, 0.76, 0.88) });
  page.drawText(
    'Este hash identifica univocamente este documento. Qualquer alteração de um único caractere modificará este código.',
    { x: padX, y: integTop - 81, size: 7, font: italic, color: rgb(0.82, 0.87, 0.94) }
  );

  y = integY - 14;

  // SEÇÃO 5: VALIDAÇÃO PÚBLICA & QR CODE
  ensureSpace(150);
  const validationTop = y;
  const validationH = 140;
  const validationY = validationTop - validationH;
  const validationHeaderH = 25;
  const qrSize = 88;
  const qrY = validationY + 13;
  page.drawRectangle({ x: CX, y: validationY, width: CW, height: validationH, color: rgb(1, 1, 1), borderWidth: 0.9, borderColor: panelBorder });
  page.drawRectangle({ x: CX, y: validationTop - validationHeaderH, width: CW, height: validationHeaderH, color: navy });
  page.drawRectangle({ x: CX, y: validationTop - 3, width: CW, height: 3, color: gold });
  page.drawText('5. VALIDAÇÃO PÚBLICA E CONFORMIDADE LEGAL', { x: padX, y: validationTop - 17, size: 7.7, font: bold, color: rgb(1, 1, 1) });
  page.drawText('VERIFICAÇÃO INDEPENDENTE', { x: CR - 112, y: validationTop - 17, size: 6.1, font: bold, color: rgb(0.72, 0.79, 0.9) });
  page.drawImage(qrImage, { x: padX, y: qrY, width: qrSize, height: qrSize });

  const qrTextX = padX + qrSize + 16;
  page.drawText('AUTENTICIDADE CONSULTÁVEL A QUALQUER MOMENTO', { x: qrTextX, y: validationTop - 43, size: 6.4, font: bold, color: muted });
  page.drawText('Escaneie o QR Code ou acesse o portal público:', { x: qrTextX, y: validationTop - 57, size: 8, font: regular, color: text });
  page.drawText(verificationUrl, { x: qrTextX, y: validationTop - 72, size: 8.6, font: bold, color: linkBlue });
  page.drawText(`Código digitável: ${verificationCode}`, { x: qrTextX, y: validationTop - 88, size: 8.2, font: mono, color: navy });

  const legalValidationLines = wrapTextToWidth(
    'Validade jurídica respaldada pelo Art. 10, § 2º da MP nº 2.200-2/2001 e pela Lei nº 14.063/2020.',
    regular,
    7,
    CR - qrTextX - 8
  );
  legalValidationLines.slice(0, 2).forEach((line, index) => {
    page.drawText(line, { x: qrTextX, y: validationTop - 103 - index * 9, size: 7, font: regular, color: muted });
  });
  page.drawText(
    'Certificado emitido pela plataforma AssinaJur — Especializada para Advocacia.',
    { x: qrTextX, y: validationTop - 124, size: 7.1, font: bold, color: navy }
  );

  y = validationY - 14;

  // SEÇÃO DE TRILHA PÚBLICA DE EVENTOS (SEM OTP)
  if (publicEvents.length > 0) {
    const dateColX = CX + 6;
    const dateColWidth = 106;
    const eventColX = dateColX + dateColWidth + 8;
    const eventColWidth = 126;
    const descColX = eventColX + eventColWidth + 8;
    const descColWidth = CR - descColX - 6;
    const headerHeight = 18;
    const tableBottom = 68;

    let timelinePage: PDFPage | null = null;
    let rowY = 0;
    let timelinePageCount = 0;

    const startTimelinePage = () => {
      timelinePageCount += 1;
      const reuseIntegrityPage = timelinePageCount === 1 && y > 250;
      const p = reuseIntegrityPage ? page : pdfDoc.addPage([PAGE_W, PAGE_H]);
      let introY: number;
      if (reuseIntegrityPage) {
        p.drawText('6. TRILHA CRONOLÓGICA DE EVIDÊNCIAS', { x: CX, y: y - 10, size: 8, font: bold, color: navy });
        p.drawLine({ start: { x: CX, y: y - 17 }, end: { x: CR, y: y - 17 }, thickness: 0.8, color: panelBorder });
        introY = y - 34;
      } else {
        drawFrame(p, `6. TRILHA PÚBLICA DE EVENTOS${timelinePageCount > 1 ? ' - CONTINUAÇÃO' : ''}`);
        const timelineTitleLines = wrapTextToWidth(doc!.title, bold, 11, CW);
        timelineTitleLines.forEach((line, index) => {
          p.drawText(line, { x: CX, y: 736 - index * 12, size: 11, font: bold, color: navy });
        });
        p.drawText(`Código: ${verificationCode}${timelinePageCount > 1 ? ' - continuação' : ''}`, {
          x: CX,
          y: 718,
          size: 8,
          font: mono,
          color: muted,
        });
        introY = 700;
      }
      if (timelinePageCount === 1 && !reuseIntegrityPage) {
        const introLines = wrapText(
          'Registro cronológico dos eventos relevantes desta contratação. Todos os horários estão exibidos no Horário de Brasília (UTC−3).',
          118
        );
        for (const line of introLines) {
          p.drawText(line, { x: CX, y: introY, size: 7.2, font: italic, color: muted });
          introY -= 9.5;
        }
      }
      introY -= 6;

      const headerY = introY - 6;
      p.drawRectangle({ x: CX, y: headerY - 4, width: CW, height: headerHeight, color: navy });
      p.drawText('DATA E HORA (BRT)', { x: dateColX, y: headerY, size: 7, font: bold, color: rgb(1, 1, 1) });
      p.drawText('EVENTO', { x: eventColX, y: headerY, size: 7, font: bold, color: rgb(1, 1, 1) });
      p.drawText('DESCRIÇÃO', { x: descColX, y: headerY, size: 7, font: bold, color: rgb(1, 1, 1) });

      timelinePage = p;
      rowY = headerY - 4;
    };

    const closeTimelinePage = (note: string) => {
      if (!timelinePage) return;
      timelinePage.drawRectangle({ x: 20, y: 20, width: 555.28, height: 34, color: rgb(0.96, 0.97, 0.99) });
      timelinePage.drawText(note, { x: CX, y: 34, size: 6.6, font: italic, color: muted });
    };

    startTimelinePage();

    const rows = publicEvents.map((ev) => {
      const dateText = formatBrasiliaDateTime(ev.createdAt, true).replace(' (Horário de Brasília — UTC−3)', '');
      const eventLabel = PUBLIC_EVENT_LABELS[ev.eventType] || ev.eventType;
      const dateLines = wrapTextToWidth(dateText, mono, 7, dateColWidth - 8);
      const eventLines = wrapTextToWidth(eventLabel, bold, 7.2, eventColWidth - 8);
      const descLines = wrapTextToWidth(ev.description, regular, 7, descColWidth - 6);
      const lineCount = Math.max(1, dateLines.length, eventLines.length, descLines.length);
      const height = Math.max(26, 15 + lineCount * 9.5);
      return { dateLines, eventLines, descLines, height };
    });

    rows.forEach((row, index) => {
      if (!timelinePage) return;
      if (rowY - row.height < tableBottom) {
        closeTimelinePage('Continua na próxima página.');
        startTimelinePage();
      }
      rowY -= row.height;
      if (index % 2 === 1) {
        timelinePage.drawRectangle({ x: CX, y: rowY, width: CW, height: row.height, color: panelBg });
      }
      let dateY = rowY + row.height - 13;
      for (const line of row.dateLines) {
        timelinePage.drawText(line, { x: dateColX, y: dateY, size: 7, font: mono, color: text });
        dateY -= 9.5;
      }

      let eventY = rowY + row.height - 13;
      for (const line of row.eventLines) {
        timelinePage.drawText(line, { x: eventColX, y: eventY, size: 7.2, font: bold, color: navy });
        eventY -= 9.5;
      }

      let descY = rowY + row.height - 13;
      for (const line of row.descLines) {
        timelinePage.drawText(line, { x: descColX, y: descY, size: 7, font: regular, color: text });
        descY -= 9.5;
      }

      timelinePage.drawLine({ start: { x: eventColX - 4, y: rowY }, end: { x: eventColX - 4, y: rowY + row.height }, thickness: 0.35, color: panelBorder });
      timelinePage.drawLine({ start: { x: descColX - 4, y: rowY }, end: { x: descColX - 4, y: rowY + row.height }, thickness: 0.35, color: panelBorder });

      timelinePage.drawLine({ start: { x: CX, y: rowY }, end: { x: CR, y: rowY }, thickness: 0.5, color: panelBorder });
    });

    closeTimelinePage(`Trilha de auditoria concluída com ${publicEvents.length} evento(s) registrado(s).`);
  }

  }

  // Metadados imutáveis do PDF
  pdfDoc.setTitle(`${doc.title} - Assinado Eletronicamente`);
  pdfDoc.setAuthor(doc.office.name);
  pdfDoc.setSubject(`Certificado de Evidências - Código ${verificationCode}`);
  pdfDoc.setKeywords(['Assinatura Eletrônica', 'MP 2200-2/2001', 'Lei 14063/2020', 'AssinaJur', 'Horário de Brasília']);

  const finalPdfBytes = await pdfDoc.save();
  const finalBuffer = Buffer.from(finalPdfBytes);
  const signedHash = calculateHash(finalBuffer);

  const signedStorageFile = await saveFile({
    officeId: doc.officeId,
    fileBuffer: finalBuffer,
    originalName: `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}_ASSINADO.pdf`,
    mimeType: 'application/pdf',
  });

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      signedFileId: signedStorageFile.id,
      signedHash,
    },
  });

  return {
    signedStorageFile,
    signedHash,
    verificationCode,
  };
}
