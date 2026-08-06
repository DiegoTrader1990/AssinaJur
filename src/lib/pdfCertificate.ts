import { PDFDocument, PDFPage, rgb, StandardFonts, LineCapStyle, PDFName, PDFString } from 'pdf-lib';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getFileBuffer, saveFile } from './storage';
import { calculateHash } from './pdfHash';

export function maskCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
}

export function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return '****';
  return `(**) *****-${clean.slice(-4)}`;
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

// ─────────────────────────────────────────────────────────────
// Helpers de texto e desenho, no mesmo padrão usado no certificado
// de evidências do sistema-assinatura (fonte de referência de design).
// ─────────────────────────────────────────────────────────────

function safeText(value: any, maximum = 180): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function truncate(value: any, max: number): string {
  const clean = safeText(value, 500);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
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

// O pdf-lib não tem API de alto nível para links clicáveis — o objeto de
// anotação PDF é montado manualmente e registrado no array /Annots da página.
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
    const clean = String(base64).replace(/^data:image\/(jpeg|jpg|png);base64,/i, '').trim();
    const bytes = Buffer.from(clean, 'base64');
    try {
      return await pdfDoc.embedJpg(bytes);
    } catch {
      return await pdfDoc.embedPng(bytes);
    }
  } catch (err) {
    console.error('Erro ao incorporar imagem no certificado PDF:', err);
    return null;
  }
}

const EVENT_LABELS: Record<string, string> = {
  DOCUMENT_CREATED: 'Documento criado e enviado para assinatura',
  LINK_SENT: 'Link de assinatura enviado',
  LINK_OPENED: 'Link de assinatura acessado pelo signatário',
  IDENTITY_CONFIRMED: 'CPF confirmado pelo signatário',
  LIVENESS_CAPTURED: 'Prova de presença ao vivo capturada (3 selfies)',
  SIGNATURE_SUBMITTED: 'Assinatura eletrônica concluída',
  DOCUMENT_COMPLETED: 'Todas as assinaturas concluídas — documento finalizado',
  DOCUMENT_CANCELLED: 'Documento cancelado',
};

export async function generateFinalPdfCertificate(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      office: true,
      originalFile: true,
      signers: true,
      events: { orderBy: { createdAt: 'asc' } },
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

  // Garantir código de autenticação imutável (ex: AJ-8F92-K3D1)
  let verificationCode = doc.verificationCode;
  if (!verificationCode) {
    verificationCode = generateVerificationCode();
    await prisma.document.update({
      where: { id: doc.id },
      data: { verificationCode },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verificar/${verificationCode}`;

  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 220,
    color: { dark: '#0B1D3D', light: '#FFFFFF' },
  });
  const qrImage = await pdfDoc.embedPng(Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);

  // Paleta de marca (navy / gold), a mesma linguagem visual do certificado
  // premium desenvolvido no sistema-assinatura.
  const navy = rgb(11 / 255, 29 / 255, 61 / 255);
  const gold = rgb(212 / 255, 175 / 255, 55 / 255);
  const text = rgb(0.16, 0.19, 0.24);
  const muted = rgb(0.44, 0.49, 0.56);
  const green = rgb(0.04, 0.45, 0.23);
  const linkBlue = rgb(0.11, 0.36, 0.74);
  const panelBg = rgb(0.975, 0.98, 0.99);
  const panelBorder = rgb(0.82, 0.86, 0.91);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const CX = 40;
  const CW = 515;
  const CR = CX + CW;

  // ── 1. SELO "ASSINADO ELETRONICAMENTE" NO RODAPÉ DE CADA PÁGINA DO DOCUMENTO ORIGINAL ──
  const originalPages = pdfDoc.getPages();
  const signerNames = doc.signers.map((s) => s.name).join(', ');
  for (const p of originalPages) {
    const { width: pW } = p.getSize();
    const sealWidth = 270;
    const sealHeight = 34;
    const sealX = pW - sealWidth - 15;
    const sealY = 12;

    p.drawRectangle({
      x: sealX,
      y: sealY,
      width: sealWidth,
      height: sealHeight,
      color: rgb(0.97, 0.98, 1.0),
      borderWidth: 1,
      borderColor: navy,
    });
    p.drawText('ASSINADO ELETRONICAMENTE - LEI 14.063/2020 & MP 2.200-2', {
      x: sealX + 6,
      y: sealY + 22,
      size: 6.5,
      font: bold,
      color: navy,
    });
    p.drawText(truncate(`Signatário(s): ${signerNames}`, 62), {
      x: sealX + 6,
      y: sealY + 13,
      size: 6,
      font: regular,
      color: text,
    });
    p.drawText(truncate(`Código: ${verificationCode}`, 62), {
      x: sealX + 6,
      y: sealY + 4,
      size: 5.5,
      font: regular,
      color: muted,
    });
  }

  // ── 2. PÁGINA(S) DE CERTIFICADO DE EVIDÊNCIAS JURÍDICAS ──
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let manifestPageCount = 1;

  const drawFrame = (p: PDFPage, subtitle: string) => {
    p.drawRectangle({ x: 20, y: 20, width: 555.28, height: 801.89, borderWidth: 1.2, borderColor: panelBorder });
    p.drawRectangle({ x: 20, y: 760, width: 555.28, height: 61.89, color: navy });
    p.drawRectangle({ x: 20, y: 757, width: 555.28, height: 3, color: gold });
    p.drawText('ASSINAJUR', { x: CX, y: 794, size: 14, font: bold, color: rgb(1, 1, 1) });
    p.drawText(subtitle, { x: CX, y: 774, size: 9, font: bold, color: rgb(0.88, 0.93, 1) });
  };

  drawFrame(page, 'CERTIFICADO DE EVIDÊNCIAS JURÍDICAS E TRILHA DE AUTENTICIDADE');
  page.drawText(truncate(doc.title, 60), { x: CX, y: 733, size: 15, font: bold, color: navy });
  page.drawText(`Código de autenticidade: ${verificationCode}  |  Documento: ${doc.id}`, {
    x: CX,
    y: 716,
    size: 8.3,
    font: regular,
    color: muted,
  });

  // Selo "ASSINADO E AUTÊNTICO" (círculo verde com check vetorial, sem depender de glyph Unicode)
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
  const circleR = 11;
  const circleCx = badgeX + 19;
  const circleCy = badgeY + badgeH / 2;
  page.drawEllipse({ x: circleCx, y: circleCy, xScale: circleR, yScale: circleR, color: green });
  page.drawLine({
    start: { x: circleCx - 5, y: circleCy - 0.5 },
    end: { x: circleCx - 1.3, y: circleCy - 4.3 },
    thickness: 2.3,
    color: rgb(1, 1, 1),
    lineCap: LineCapStyle.Round,
  });
  page.drawLine({
    start: { x: circleCx - 1.3, y: circleCy - 4.3 },
    end: { x: circleCx + 6.3, y: circleCy + 5.2 },
    thickness: 2.3,
    color: rgb(1, 1, 1),
    lineCap: LineCapStyle.Round,
  });
  page.drawText('ASSINADO E AUTÊNTICO', { x: circleCx + 17, y: circleCy + 2.5, size: 8.6, font: bold, color: green });
  page.drawText('Integridade verificada nesta emissão', {
    x: circleCx + 17,
    y: circleCy - 9,
    size: 6,
    font: regular,
    color: muted,
  });

  page.drawLine({ start: { x: CX, y: 705 }, end: { x: CR, y: 705 }, thickness: 0.8, color: panelBorder });

  let y = 697;
  const padX = CX + 14;

  const ensureSpace = (minRemaining: number) => {
    if (y - minRemaining < 80) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      manifestPageCount += 1;
      drawFrame(page, `CERTIFICADO DE EVIDÊNCIAS JURÍDICAS (continuação ${manifestPageCount})`);
      y = 705;
    }
  };

  const fieldLabel = (x: number, yPos: number, label: string) => {
    page.drawText(safeText(label, 60).toUpperCase(), { x, y: yPos, size: 6.6, font: bold, color: muted });
  };
  const fieldValue = (x: number, yPos: number, value: any, options: any = {}) => {
    page.drawText(truncate(value, options.max || 68), {
      x,
      y: yPos,
      size: options.size || 9.6,
      font: options.font || regular,
      color: options.color || text,
    });
  };

  // Painel: dados do documento e emissor
  ensureSpace(90);
  const docPanelTop = y;
  const docPanelH = 78;
  const docPanelY = docPanelTop - docPanelH;
  page.drawRectangle({ x: CX, y: docPanelY, width: CW, height: docPanelH, color: panelBg, borderWidth: 0.9, borderColor: panelBorder });
  page.drawText('DADOS DO DOCUMENTO E EMISSOR', { x: padX, y: docPanelTop - 16, size: 7.6, font: bold, color: navy });

  fieldLabel(padX, docPanelTop - 34, 'Escritório responsável');
  fieldValue(padX, docPanelTop - 45, `${doc.office.name} (${doc.office.cpfCnpj})`, { font: bold, size: 9.5 });
  fieldLabel(padX, docPanelTop - 62, 'Data de conclusão (UTC)');
  fieldValue(
    padX,
    docPanelTop - 73,
    doc.completedAt ? new Date(doc.completedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')
  );
  fieldLabel(padX + 260, docPanelTop - 34, 'Hash SHA-256 do original');
  fieldValue(padX + 260, docPanelTop - 45, doc.originalHash, { font: mono, size: 7, max: 42 });
  fieldLabel(padX + 260, docPanelTop - 62, 'Tipo de documento');
  fieldValue(padX + 260, docPanelTop - 73, doc.documentType);

  y = docPanelY - 14;

  // Painel por signatário: identificação + evidências técnicas + prova de presença
  for (const signer of doc.signers) {
    const hasPhotos = Boolean(signer.selfieCenterImage || signer.selfieLeftImage || signer.selfieRightImage);
    const panelH = 150 + (hasPhotos ? 100 : 0);
    ensureSpace(panelH + 10);

    const pTop = y;
    const pY = pTop - panelH;
    page.drawRectangle({ x: CX, y: pY, width: CW, height: panelH, color: panelBg, borderWidth: 0.9, borderColor: panelBorder });
    page.drawText(`SIGNATÁRIO — ${safeText(signer.role, 30).toUpperCase()}`, {
      x: padX,
      y: pTop - 16,
      size: 7.6,
      font: bold,
      color: navy,
    });

    const col2X = CX + 270;
    fieldLabel(padX, pTop - 34, 'Nome completo');
    fieldValue(padX, pTop - 45, signer.name, { font: bold, size: 10.5 });
    fieldLabel(col2X, pTop - 34, 'CPF do signatário');
    fieldValue(col2X, pTop - 45, signer.cpf);

    fieldLabel(padX, pTop - 62, 'Telefone');
    fieldValue(padX, pTop - 73, signer.phone || 'Não informado');
    fieldLabel(col2X, pTop - 62, 'Data e hora da assinatura (UTC)');
    fieldValue(col2X, pTop - 73, signer.signedAt ? new Date(signer.signedAt).toLocaleString('pt-BR') : '—');

    fieldLabel(padX, pTop - 90, 'Endereço IP');
    fieldValue(padX, pTop - 101, signer.ipAddress || 'Não registrado', { size: 8, max: 34 });
    fieldLabel(col2X, pTop - 90, 'Dispositivo / navegador');
    fieldValue(col2X, pTop - 101, signer.userAgent || 'Não registrado', { size: 7.6, max: 46 });

    const hasLocation = signer.geoLat != null && signer.geoLng != null;
    const locationText = hasLocation
      ? `${signer.geoCity ? `${safeText(signer.geoCity, 30)}${signer.geoState ? '/' + signer.geoState : ''} — ` : ''}${Number(
          signer.geoLat
        ).toFixed(6)}, ${Number(signer.geoLng).toFixed(6)}${
          signer.geoAccuracy != null ? ` (±${Math.round(signer.geoAccuracy)} m)` : ''
        }`
      : 'Não coletada (permissão do navegador não concedida)';
    fieldLabel(padX, pTop - 118, 'Geolocalização aproximada do dispositivo');
    fieldValue(padX, pTop - 129, locationText, { size: 8.4, color: hasLocation ? linkBlue : muted, max: 80 });

    if (hasLocation) {
      const locSize = 8.4;
      const locY = pTop - 129;
      const locTrunc = truncate(locationText, 80);
      const locWidth = regular.widthOfTextAtSize(locTrunc, locSize);
      const mapsUrl = `https://www.google.com/maps?q=${Number(signer.geoLat)},${Number(signer.geoLng)}`;
      page.drawLine({
        start: { x: padX, y: locY - 1.5 },
        end: { x: padX + locWidth, y: locY - 1.5 },
        thickness: 0.6,
        color: linkBlue,
      });
      addLinkAnnotation(pdfDoc, page, { x: padX, y: locY - 2, width: locWidth, height: locSize + 3, url: mapsUrl });
    }

    fieldLabel(col2X, pTop - 118, 'Método de autenticação');
    fieldValue(col2X, pTop - 129, 'CPF + prova de presença ao vivo (3 selfies) + geolocalização', { size: 7.6, max: 46 });

    // Assinatura gráfica (se desenhada)
    if (signer.signatureImage && signer.signatureImage.startsWith('data:image/png;base64,')) {
      try {
        const base64Data = signer.signatureImage.replace(/^data:image\/png;base64,/, '');
        const sigPng = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
        page.drawText('ASSINATURA GRÁFICA', { x: padX + 380, y: pTop - 34, size: 6.6, font: bold, color: muted });
        page.drawImage(sigPng, { x: padX + 380, y: pTop - 90, width: 95, height: 45 });
      } catch (sigErr) {
        console.error('Erro ao renderizar assinatura gráfica no PDF:', sigErr);
      }
    }

    // Prova de presença ao vivo — 3 selfies (centro, lado 1, lado 2)
    if (hasPhotos) {
      page.drawText('PROVA DE PRESENÇA AO VIVO (CENTRO / LADO 1 / LADO 2)', {
        x: padX,
        y: pTop - 150,
        size: 7,
        font: bold,
        color: navy,
      });
      const photoLabels: Array<[string, string | null]> = [
        ['Centro', signer.selfieCenterImage],
        ['Lado 1', signer.selfieLeftImage],
        ['Lado 2', signer.selfieRightImage],
      ];
      const photoW = 100;
      const photoH = 75;
      const gap = 12;
      let photoX = padX;
      for (const [label, img] of photoLabels) {
        const embedded = await embedBase64Image(pdfDoc, img);
        page.drawRectangle({
          x: photoX - 2,
          y: pTop - 236,
          width: photoW + 4,
          height: photoH + 4,
          borderWidth: 0.8,
          borderColor: panelBorder,
        });
        if (embedded) {
          page.drawImage(embedded, { x: photoX, y: pTop - 234, width: photoW, height: photoH });
        }
        page.drawText(label, { x: photoX, y: pTop - 244, size: 6.5, font: regular, color: muted });
        photoX += photoW + gap;
      }
    }

    y = pY - 14;
  }

  // QR Code de validação pública
  ensureSpace(120);
  const qrSize = 90;
  const qrY = y - qrSize - 10;
  page.drawText('VALIDAR AUTENTICIDADE', { x: CX, y: y - 10, size: 8, font: bold, color: navy });
  page.drawImage(qrImage, { x: CX, y: qrY, width: qrSize, height: qrSize });
  page.drawText('Escaneie o QR Code ou acesse:', { x: CX + qrSize + 16, y: y - 26, size: 8, font: regular, color: text });
  page.drawText(verificationUrl, { x: CX + qrSize + 16, y: y - 40, size: 8.5, font: bold, color: navy });
  page.drawText('Conformidade com a Medida Provisória nº 2.200-2/2001 e a Lei nº 14.063/2020.', {
    x: CX + qrSize + 16,
    y: y - 56,
    size: 7.5,
    font: regular,
    color: muted,
  });

  // ── 3. TRILHA DE EVENTOS DO DOCUMENTO (auditoria completa) ──
  if (doc.events.length > 0) {
    const dateColX = CX + 6;
    const eventColX = CX + 100;
    const descColX = CX + 210;
    const headerHeight = 18;
    const tableBottom = 68;

    let timelinePage: PDFPage | null = null;
    let rowY = 0;
    let timelinePageCount = 0;

    const startTimelinePage = () => {
      timelinePageCount += 1;
      const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
      drawFrame(p, 'TRILHA DE EVENTOS DO DOCUMENTO');
      p.drawText(truncate(doc!.title, 70), { x: CX, y: 733, size: 12.5, font: bold, color: navy });
      p.drawText(`Código: ${verificationCode}${timelinePageCount > 1 ? '  •  continuação' : ''}`, {
        x: CX,
        y: 718,
        size: 8,
        font: regular,
        color: muted,
      });

      let introY = 700;
      if (timelinePageCount === 1) {
        const introLines = wrapText(
          'Registro cronológico de todos os eventos deste documento, do envio à conclusão da assinatura. Todos os horários abaixo estão em UTC.',
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
      p.drawText('DATA E HORA', { x: dateColX, y: headerY, size: 7, font: bold, color: rgb(1, 1, 1) });
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
      const parsedDate = new Date(ev.createdAt);
      const dateText = parsedDate.toISOString().replace('T', ' ').slice(0, 19);
      const eventLines = wrapText(EVENT_LABELS[ev.eventType] || ev.eventType, 20).slice(0, 3);
      const descLines = wrapText(ev.description, 60).slice(0, 4);
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
      timelinePage.drawText(row.dateText, { x: dateColX, y: rowY + row.height - 13, size: 7.2, font: mono, color: text });

      let eventY = rowY + row.height - 13;
      for (const line of row.eventLines) {
        timelinePage.drawText(line, { x: eventColX, y: eventY, size: 7.4, font: bold, color: navy });
        eventY -= 9.5;
      }

      let descY = rowY + row.height - 13;
      for (const line of row.descLines) {
        timelinePage.drawText(line, { x: descColX, y: descY, size: 7, font: regular, color: text });
        descY -= 9.5;
      }

      timelinePage.drawLine({ start: { x: CX, y: rowY }, end: { x: CR, y: rowY }, thickness: 0.5, color: panelBorder });
    });

    closeTimelinePage(`${doc.events.length} evento(s) registrado(s) ao todo neste documento.`);
  }

  // Metadados imutáveis do PDF
  pdfDoc.setTitle(`${doc.title} - Assinado Eletronicamente`);
  pdfDoc.setAuthor(doc.office.name);
  pdfDoc.setSubject(`Assinatura Eletrônica - Código ${verificationCode}`);
  pdfDoc.setKeywords(['Assinatura Eletrônica', 'MP 2200-2/2001', 'Lei 14063/2020', 'AssinaJur']);

  // Salvar PDF Assinado
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
