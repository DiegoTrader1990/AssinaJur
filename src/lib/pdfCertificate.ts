import { PDFDocument, PDFPage, rgb, StandardFonts, LineCapStyle, PDFName, PDFString } from 'pdf-lib';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getFileBuffer, saveFile } from './storage';
import { calculateHash } from './pdfHash';
import { formatBrasiliaDateTime } from './dateUtils';

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

function truncate(value: any, max: number): string {
  const clean = safeText(value, 500);
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
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

function addLinkAnnotation(
  pdfDoc: PDFDocument,
  page: PDFPage,
  { x, y, width, height, url }: { x: number; y: number; width: number; height: number; url: string }
) {
  const linkAnnotation = pdfDoc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x, y, x + width, y + height],
    Border: [0, 0, 0],
    A: {
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(url),
    },
  });
  const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);
  const node = (page as any).node;
  const existingAnnots = node.Annots();
  if (existingAnnots) {
    existingAnnots.push(linkAnnotationRef);
  } else {
    node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkAnnotationRef]));
  }
}

async function embedBase64Image(pdfDoc: PDFDocument, base64: string | null | undefined) {
  if (!base64) return null;
  try {
    const raw = String(base64).trim();
    const clean = raw.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/i, '').trim();
    const bytes = Buffer.from(clean, 'base64');
    if (bytes.length === 0) return null;

    // Detectar cabeçalho PNG: 0x89 0x50 0x4E 0x47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
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
  DOCUMENT_CREATED: 'Documento criado',
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
  const panelBg = rgb(0.975, 0.98, 0.99);
  const panelBorder = rgb(0.82, 0.86, 0.91);

  const PAGE_W = 595.28; // A4 width
  const PAGE_H = 841.89; // A4 height
  const CX = 40;
  const CW = 515;
  const CR = CX + CW;

  // ── 1. FAIXA INFERIOR EXCLUSIVA EM CADA PÁGINA DO DOCUMENTO ORIGINAL (SEM SOBREPOR CONTEÚDO) ──
  const originalPages = pdfDoc.getPages();
  const totalOrigPages = originalPages.length;
  const primarySignerName = doc.signers[0]?.name || 'Signatário';
  const signerSummaryText = doc.signers.length > 1
    ? `${primarySignerName} e outros (${doc.signers.length} signatários)`
    : primarySignerName;

  originalPages.forEach((p, idx) => {
    const { width: pW } = p.getSize();
    const stripH = 22;
    const stripY = 0; // Faixa desenhada na margem inferior reservada de 0 a 22pt

    // Fundo da faixa discreta
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

    const textY = stripY + 7;
    p.drawText('Documento assinado eletronicamente', {
      x: 14,
      y: textY,
      size: 6.5,
      font: bold,
      color: navy,
    });

    p.drawText(`|  Signatário: ${truncate(signerSummaryText, 40)}`, {
      x: 145,
      y: textY,
      size: 6,
      font: regular,
      color: text,
    });

    p.drawText(`|  Código: ${verificationCode}`, {
      x: pW - 190,
      y: textY,
      size: 6,
      font: mono,
      color: navy,
    });

    p.drawText(`|  Pág ${idx + 1}/${totalOrigPages}  |  AssinaJur`, {
      x: pW - 105,
      y: textY,
      size: 6,
      font: bold,
      color: muted,
    });
  });

  // ── 2. PÁGINA(S) DO CERTIFICADO DE EVIDÊNCIAS JURÍDICAS (6 SEÇÕES ORGANIZADAS) ──
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let manifestPageCount = 1;

  const drawFrame = (p: PDFPage, subtitle: string) => {
    const cleanSubtitle = safeText(subtitle, 120);
    p.drawRectangle({ x: 20, y: 20, width: 555.28, height: 801.89, borderWidth: 1.2, borderColor: panelBorder });
    p.drawRectangle({ x: 20, y: 760, width: 555.28, height: 61.89, color: navy });
    p.drawRectangle({ x: 20, y: 757, width: 555.28, height: 3, color: gold });
    p.drawText('ASSINAJUR', { x: CX, y: 794, size: 14, font: bold, color: rgb(1, 1, 1) });
    p.drawText(cleanSubtitle, { x: CX, y: 774, size: 9, font: bold, color: rgb(0.88, 0.93, 1) });
  };

  // SEÇÃO 1: CABEÇALHO DO CERTIFICADO
  drawFrame(page, 'CERTIFICADO DE EVIDENCIAS JURIDICAS - REGISTRO IMUTAVEL');
  page.drawText(truncate(doc.title, 55), { x: CX, y: 733, size: 14, font: bold, color: navy });
  page.drawText(`Código de Autenticidade: ${verificationCode}  |  ID: ${doc.id}`, {
    x: CX,
    y: 716,
    size: 8,
    font: mono,
    color: muted,
  });

  // Selo "ASSINADO E AUTÊNTICO"
  const badgeW = 190;
  const badgeH = 32;
  const badgeX = CR - badgeW;
  const badgeY = 715;
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: rgb(0.9, 0.97, 0.93),
    borderWidth: 1.1,
    borderColor: green,
  });
  const circleR = 10;
  const circleCx = badgeX + 18;
  const circleCy = badgeY + badgeH / 2;
  page.drawEllipse({ x: circleCx, y: circleCy, xScale: circleR, yScale: circleR, color: green });
  page.drawLine({
    start: { x: circleCx - 4.5, y: circleCy - 0.5 },
    end: { x: circleCx - 1.2, y: circleCy - 4.2 },
    thickness: 2.2,
    color: rgb(1, 1, 1),
    lineCap: LineCapStyle.Round,
  });
  page.drawLine({
    start: { x: circleCx - 1.2, y: circleCy - 4.2 },
    end: { x: circleCx + 5.8, y: circleCy + 4.8 },
    thickness: 2.2,
    color: rgb(1, 1, 1),
    lineCap: LineCapStyle.Round,
  });
  page.drawText('ASSINADO E AUTÊNTICO', { x: circleCx + 16, y: circleCy + 2.5, size: 8.5, font: bold, color: green });
  page.drawText('Conforme MP 2.200-2 & Lei 14.063', {
    x: circleCx + 16,
    y: circleCy - 8.5,
    size: 6,
    font: regular,
    color: muted,
  });

  page.drawLine({ start: { x: CX, y: 705 }, end: { x: CR, y: 705 }, thickness: 0.8, color: panelBorder });

  let y = 695;
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
    page.drawText(safeText(value, options.max || 80), {
      x,
      y: yPos,
      size: options.size || 9.5,
      font: options.font || regular,
      color: options.color || text,
    });
  };

  // SEÇÃO 2: DADOS DO DOCUMENTO
  ensureSpace(95);
  const docPanelTop = y;
  const docPanelH = 82;
  const docPanelY = docPanelTop - docPanelH;
  page.drawRectangle({ x: CX, y: docPanelY, width: CW, height: docPanelH, color: panelBg, borderWidth: 0.9, borderColor: panelBorder });
  page.drawText('1. DADOS DO DOCUMENTO E ESCRITÓRIO RESPONSÁVEL', { x: padX, y: docPanelTop - 15, size: 7.5, font: bold, color: navy });

  fieldLabel(padX, docPanelTop - 32, 'Escritório responsável');
  fieldValue(padX, docPanelTop - 43, `${doc.office.name} (${doc.office.cpfCnpj})`, { font: bold, size: 9.5 });

  fieldLabel(padX, docPanelTop - 59, 'Tipo de documento');
  fieldValue(padX, docPanelTop - 70, doc.documentType || 'Não informado', { font: bold, size: 9 });

  fieldLabel(padX + 260, docPanelTop - 32, 'Data de criação');
  fieldValue(padX + 260, docPanelTop - 43, formatBrasiliaDateTime(doc.createdAt), { size: 8.5 });

  fieldLabel(padX + 260, docPanelTop - 59, 'Data de conclusão');
  fieldValue(padX + 260, docPanelTop - 70, formatBrasiliaDateTime(doc.completedAt || new Date()), { font: bold, size: 8.5, color: green });

  y = docPanelY - 14;

  // SEÇÃO 3 & 4: DADOS DO SIGNATÁRIO E EVIDÊNCIAS COLETADAS
  for (const signer of doc.signers) {
    const hasPhotos = Boolean(signer.selfieCenterImage || signer.selfieLeftImage || signer.selfieRightImage);
    const panelH = 155 + (hasPhotos ? 105 : 0);
    ensureSpace(panelH + 10);

    const pTop = y;
    const pY = pTop - panelH;
    page.drawRectangle({ x: CX, y: pY, width: CW, height: panelH, color: panelBg, borderWidth: 0.9, borderColor: panelBorder });
    
    page.drawText(`2. DADOS DO SIGNATÁRIO — ${safeText(signer.role, 30).toUpperCase()}`, {
      x: padX,
      y: pTop - 15,
      size: 7.5,
      font: bold,
      color: navy,
    });

    const col2X = CX + 260;
    
    // Nome e CPF COMPLETOS (SEM MASCARAMENTO)
    fieldLabel(padX, pTop - 32, 'Nome completo');
    fieldValue(padX, pTop - 43, signer.name, { font: bold, size: 10.5 });

    fieldLabel(col2X, pTop - 32, 'CPF do signatário (Completo)');
    fieldValue(col2X, pTop - 43, formatFullCpf(signer.cpf), { font: bold, size: 10 });

    // Telefone COMPLETO (SEM MASCARAMENTO)
    fieldLabel(padX, pTop - 59, 'Telefone');
    fieldValue(padX, pTop - 70, formatFullPhone(signer.phone), { size: 9 });

    // Data/hora no Horário de Brasília
    fieldLabel(col2X, pTop - 59, 'Data e hora da assinatura');
    fieldValue(col2X, pTop - 70, formatBrasiliaDateTime(signer.signedAt), { font: bold, size: 8.5 });

    fieldLabel(padX, pTop - 86, 'Endereço IP');
    fieldValue(padX, pTop - 97, signer.ipAddress || '127.0.0.1', { font: mono, size: 8.5 });

    fieldLabel(col2X, pTop - 86, 'Dispositivo e navegador');
    fieldValue(col2X, pTop - 97, signer.userAgent || 'Mobile Browser', { size: 7.5, max: 48 });

    const hasLocation = signer.geoLat != null && signer.geoLng != null;
    const locationText = hasLocation
      ? `${signer.geoCity ? `${safeText(signer.geoCity, 25)}${signer.geoState ? '/' + signer.geoState : ''} — ` : ''}${Number(
          signer.geoLat
        ).toFixed(6)}, ${Number(signer.geoLng).toFixed(6)}${
          signer.geoAccuracy != null ? ` (±${Math.round(signer.geoAccuracy)} m)` : ''
        }`
      : 'Não coletada (permissão não concedida)';

    fieldLabel(padX, pTop - 114, 'Geolocalização do dispositivo');
    fieldValue(padX, pTop - 125, locationText, { size: 8, color: hasLocation ? linkBlue : muted, max: 70 });

    if (hasLocation) {
      const mapsUrl = `https://www.google.com/maps?q=${Number(signer.geoLat)},${Number(signer.geoLng)}`;
      const locWidth = regular.widthOfTextAtSize(truncate(locationText, 70), 8);
      page.drawLine({
        start: { x: padX, y: pTop - 127 },
        end: { x: padX + locWidth, y: pTop - 127 },
        thickness: 0.6,
        color: linkBlue,
      });
      addLinkAnnotation(pdfDoc, page, { x: padX, y: pTop - 128, width: locWidth, height: 10, url: mapsUrl });
    }

    fieldLabel(col2X, pTop - 114, 'Método de autenticação');
    fieldValue(col2X, pTop - 125, 'CPF + Prova de presença ao vivo (3 selfies 4:3) + Geolocalização', { size: 7.2, max: 48 });

    // Assinatura gráfica
    if (signer.signatureImage && signer.signatureImage.startsWith('data:image/png;base64,')) {
      try {
        const base64Data = signer.signatureImage.replace(/^data:image\/png;base64,/, '');
        const sigPng = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
        page.drawText('ASSINATURA GRÁFICA', { x: padX + 375, y: pTop - 32, size: 6.5, font: bold, color: muted });
        page.drawImage(sigPng, { x: padX + 375, y: pTop - 85, width: 100, height: 48 });
      } catch (sigErr) {
        console.error('Erro ao renderizar assinatura gráfica no PDF:', sigErr);
      }
    }

    // SEÇÃO 4: EVIDÊNCIAS COLETADAS — 3 SELFIES 4:3 (CENTRO / PERFIL ESQUERDO / PERFIL DIREITO)
    if (hasPhotos) {
      page.drawText('3. PROVA DE PRESENÇA AO VIVO (PROPORÇÃO 4:3)', {
        x: padX,
        y: pTop - 146,
        size: 7.2,
        font: bold,
        color: navy,
      });

      const photoLabels: Array<[string, string | null]> = [
        ['1. Frontal (Centro)', signer.selfieCenterImage],
        ['2. Perfil Esquerdo', signer.selfieLeftImage],
        ['3. Perfil Direito', signer.selfieRightImage],
      ];

      // Tamanho com proporção 4:3 exata (100px x 75px)
      const photoW = 100;
      const photoH = 75;
      const gap = 14;
      let photoX = padX;

      for (const [label, img] of photoLabels) {
        const embedded = await embedBase64Image(pdfDoc, img);
        page.drawRectangle({
          x: photoX - 2,
          y: pTop - 235,
          width: photoW + 4,
          height: photoH + 4,
          borderWidth: 0.8,
          borderColor: green,
          color: rgb(0.98, 1, 0.98),
        });

        if (embedded) {
          page.drawImage(embedded, { x: photoX, y: pTop - 233, width: photoW, height: photoH });
        }

        page.drawText(`[OK] ${safeText(label, 40)}`, { x: photoX, y: pTop - 245, size: 6.5, font: bold, color: green });
        photoX += photoW + gap;
      }
    }

    y = pY - 14;
  }

  // SEÇÃO 5: INTEGRIDADE SHA-256 COMPLETA (SEM CORTE E SEM RETICÊNCIAS)
  ensureSpace(110);
  const integTop = y;
  const integH = 92;
  const integY = integTop - integH;
  page.drawRectangle({ x: CX, y: integY, width: CW, height: integH, color: panelBg, borderWidth: 0.9, borderColor: panelBorder });
  page.drawText('4. REGISTRO DE INTEGRIDADE E HASH SHA-256 COMPLETO', { x: padX, y: integTop - 15, size: 7.5, font: bold, color: navy });

  fieldLabel(padX, integTop - 32, 'Hash SHA-256 do Documento Original (64 caracteres)');
  // Dividir o hash de 64 caracteres em duas linhas monoespaçadas exatas de 32 chars cada
  const origHash = doc.originalHash || '';
  const hashPart1 = origHash.substring(0, 32);
  const hashPart2 = origHash.substring(32, 64);

  page.drawText(hashPart1, { x: padX, y: integTop - 45, size: 8, font: mono, color: navy });
  page.drawText(hashPart2, { x: padX, y: integTop - 56, size: 8, font: mono, color: navy });

  fieldLabel(padX, integTop - 70, 'Garantia de Integridade');
  page.drawText(
    'Este hash identifica univocamente este documento. Qualquer alteração de um único caractere modificará este código.',
    { x: padX, y: integTop - 81, size: 7, font: italic, color: muted }
  );

  y = integY - 14;

  // SEÇÃO 6: VALIDAÇÃO PÚBLICA & QR CODE
  ensureSpace(120);
  const qrSize = 92;
  const qrY = y - qrSize - 10;
  page.drawText('5. VALIDAÇÃO PÚBLICA E CONFORMIDADE LEGL', { x: CX, y: y - 10, size: 8, font: bold, color: navy });
  page.drawImage(qrImage, { x: CX, y: qrY, width: qrSize, height: qrSize });

  const qrTextX = CX + qrSize + 16;
  page.drawText('Escaneie o QR Code ao lado ou acesse o portal público:', { x: qrTextX, y: y - 26, size: 8, font: regular, color: text });
  page.drawText(verificationUrl, { x: qrTextX, y: y - 40, size: 9, font: bold, color: linkBlue });
  page.drawText(`Código Digitável: ${verificationCode}`, { x: qrTextX, y: y - 54, size: 8.5, font: mono, color: navy });

  page.drawText(
    'Este documento possui validade jurídica respaldada pelo Art. 10, § 2º da MP nº 2.200-2/2001 e pela Lei nº 14.063/2020.',
    { x: qrTextX, y: y - 72, size: 7.2, font: regular, color: muted }
  );
  page.drawText(
    'Certificado emitido pela plataforma AssinaJur — Especializada para Advocacia.',
    { x: qrTextX, y: y - 84, size: 7.2, font: bold, color: navy }
  );

  // SEÇÃO DE TRILHA PÚBLICA DE EVENTOS (SEM OTP)
  if (doc.events.length > 0) {
    const dateColX = CX + 6;
    const eventColX = CX + 120;
    const descColX = CX + 230;
    const headerHeight = 18;
    const tableBottom = 68;

    let timelinePage: PDFPage | null = null;
    let rowY = 0;
    let timelinePageCount = 0;

    const startTimelinePage = () => {
      timelinePageCount += 1;
      const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
      drawFrame(p, '6. TRILHA PUBLICA DE EVENTOS DO DOCUMENTO');
      p.drawText(truncate(doc!.title, 65), { x: CX, y: 733, size: 12.5, font: bold, color: navy });
      p.drawText(`Codigo: ${verificationCode}${timelinePageCount > 1 ? ' - continuacao' : ''}`, {
        x: CX,
        y: 718,
        size: 8,
        font: mono,
        color: muted,
      });

      let introY = 700;
      if (timelinePageCount === 1) {
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

    const rows = doc.events.map((ev) => {
      const dateText = formatBrasiliaDateTime(ev.createdAt, true).replace(' (Horário de Brasília — UTC−3)', '');
      const eventLabel = PUBLIC_EVENT_LABELS[ev.eventType] || ev.eventType;
      const eventLines = wrapText(eventLabel, 22).slice(0, 3);
      const descLines = wrapText(ev.description, 55).slice(0, 4);
      const lineCount = Math.max(1, eventLines.length, descLines.length);
      const height = Math.max(26, 15 + lineCount * 9.5);
      return { dateText, eventLines, descLines, height };
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
      timelinePage.drawText(row.dateText, { x: dateColX, y: rowY + row.height - 13, size: 7, font: mono, color: text });

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

      timelinePage.drawLine({ start: { x: CX, y: rowY }, end: { x: CR, y: rowY }, thickness: 0.5, color: panelBorder });
    });

    closeTimelinePage(`Trilha de auditoria concluída com ${doc.events.length} evento(s) registrado(s).`);
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
