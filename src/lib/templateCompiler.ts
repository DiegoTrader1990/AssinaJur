import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveFile } from './storage';
import { calculateHash } from './pdfHash';

export interface VariableValues {
  cliente_nome?: string;
  cliente_cpf?: string;
  cliente_rg?: string;
  cliente_nacionalidade?: string;
  cliente_telefone?: string;
  cliente_endereco?: string;
  cliente_estado_civil?: string;
  cliente_profissao?: string;
  advogado_nome?: string;
  advogado_oab?: string;
  escritorio_nome?: string;
  valor_honorarios?: string;
  percentual_exito?: string;
  cidade?: string;
  data_atual?: string;
  [key: string]: string | undefined;
}

export function replaceTemplateVariables(contentHtml: string, variables: VariableValues): string {
  let compiled = contentHtml;
  const defaultDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const allVars: VariableValues = {
    cidade: 'São Paulo',
    data_atual: defaultDate,
    valor_honorarios: 'R$ 3.000,00',
    percentual_exito: '30%',
    ...variables,
  };
  for (const [key, val] of Object.entries(allVars)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    compiled = compiled.replace(regex, val || '________________');
  }
  return compiled.replace(/{{\s*[a-zA-Z0-9_]+\s*}}/g, '________________');
}

type ParagraphKind = 'BODY' | 'H1' | 'H2' | 'LIST';
type TextRun = { text: string; bold: boolean };
type RichParagraph = { kind: ParagraphKind; runs: TextRun[] };

function decodeHtmlText(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ');
}

function emphasizeDocumentNames(html: string, variables: VariableValues): string {
  const names = [variables.cliente_nome, variables.advogado_nome, variables.escritorio_nome]
    .map((item) => String(item || '').trim())
    .filter((item) => item.length >= 3)
    .sort((left, right) => right.length - left.length);
  return names.reduce((result, name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(new RegExp(escaped, 'gi'), (match) => `<strong>${match}</strong>`);
  }, html);
}

function parseRichParagraphs(html: string): RichParagraph[] {
  const normalized = html
    .replace(/\r/g, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*h1[^>]*>/gi, '\n[[H1]]')
    .replace(/<\s*h2[^>]*>/gi, '\n[[H2]]')
    .replace(/<\s*li[^>]*>/gi, '\n[[LIST]]')
    .replace(/<\/(?:p|div|h1|h2|h3|li|ol|ul)>/gi, '\n');

  return normalized
    .split('\n')
    .map((raw): RichParagraph | null => {
      let line = raw.trim();
      if (!line) return null;
      let kind: ParagraphKind = 'BODY';
      if (line.startsWith('[[H1]]')) { kind = 'H1'; line = line.slice(6); }
      if (line.startsWith('[[H2]]')) { kind = 'H2'; line = line.slice(6); }
      if (line.startsWith('[[LIST]]')) { kind = 'LIST'; line = line.slice(8); }

      const runs: TextRun[] = [];
      let boldDepth = 0;
      for (const token of line.match(/<[^>]+>|[^<]+/g) || []) {
        if (/^<\s*(?:strong|b)\b/i.test(token)) { boldDepth += 1; continue; }
        if (/^<\s*\/(?:strong|b)\s*>/i.test(token)) { boldDepth = Math.max(0, boldDepth - 1); continue; }
        if (/^<[^>]+>$/.test(token)) continue;
        const text = decodeHtmlText(token);
        if (text.trim()) runs.push({ text, bold: boldDepth > 0 });
      }
      return runs.length ? { kind, runs } : null;
    })
    .filter((item): item is RichParagraph => Boolean(item));
}

async function renderTemplatePdf({
  title,
  contentHtml,
  variables,
  officeName,
  watermark,
  letterheadBuffer,
}: {
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
  watermark?: string;
  letterheadBuffer?: Buffer;
}) {
  const compiledText = replaceTemplateVariables(contentHtml, variables);
  const presentationHtml = emphasizeDocumentNames(compiledText, variables);
  const pdfDoc = await PDFDocument.create();

  let embeddedLetterhead: Awaited<ReturnType<typeof pdfDoc.embedPdf>>[number] | undefined;
  if (letterheadBuffer) {
    const letterheadDoc = await PDFDocument.load(letterheadBuffer);
    [embeddedLetterhead] = await pdfDoc.embedPdf(letterheadDoc, [0]);
  }
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const navyColor = rgb(11 / 255, 29 / 255, 61 / 255);
  const goldColor = rgb(212 / 255, 175 / 255, 55 / 255);
  const textColor = rgb(30 / 255, 41 / 255, 59 / 255);

  const addPage = (withHeader: boolean) => {
    const page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();

    if (embeddedLetterhead) {
      page.drawPage(embeddedLetterhead, {
        x: 0,
        y: 0,
        width: pageSize[0],
        height: pageSize[1],
      });
    }

    if (withHeader && !embeddedLetterhead) {
      page.drawRectangle({ x: 40, y: height - 60, width: width - 80, height: 3, color: goldColor });
      page.drawText(officeName.toUpperCase(), { x: 40, y: height - 45, size: 11, font: boldFont, color: navyColor });
      page.drawText(title.toUpperCase(), { x: 40, y: height - 85, size: 14, font: boldFont, color: navyColor });
    }
    return page;
  };

  let page = addPage(true);
  const { width, height } = page.getSize();
  let currentY = height - 110;
  const marginX = 40;
  const maxWidth = width - 80;
  const paragraphs = parseRichParagraphs(presentationHtml);
  let signaturePlacement: { page: number; x: number; y: number; width: number; height: number } | null = null;
  let explicitSignatureLineFound = false;
  const ensureLineSpace = (lineHeight: number) => {
    if (currentY - lineHeight < 58) {
      page = addPage(false);
      currentY = height - 60;
    }
  };

  for (const paragraph of paragraphs) {
    const paragraphText = paragraph.runs.map((run) => run.text).join(' ').trim();
    const isExplicitSignatureLine = /^_{5,}/.test(paragraphText);
    const isClientSignatureLabel = /^(?:CONTRATANTE|OUTORGANTE|DECLARANTE|ASSINATURA\s+DO\s+CLIENTE)\s*:/i.test(paragraphText);
    const heading = paragraph.kind === 'H1' || paragraph.kind === 'H2';
    const fontSize = paragraph.kind === 'H1' ? 12 : paragraph.kind === 'H2' ? 10.8 : 10;
    const lineHeight = paragraph.kind === 'H1' ? 17 : paragraph.kind === 'H2' ? 16 : 15;
    const tokens = paragraph.runs.flatMap((run) =>
      run.text.trim().split(/\s+/).filter(Boolean).map((word) => ({ text: word, bold: heading || run.bold }))
    );
    if (paragraph.kind === 'LIST') tokens.unshift({ text: '\u2022', bold: true });

    let line: Array<{ text: string; bold: boolean }> = [];
    let lineWidth = 0;
    const drawLine = () => {
      if (!line.length) return;
      ensureLineSpace(lineHeight);
      if (isExplicitSignatureLine || (isClientSignatureLabel && !explicitSignatureLineFound)) {
        const topY = Math.min(0.82, Math.max(0.08, (height - currentY - 5) / height));
        signaturePlacement = { page: pdfDoc.getPageCount(), x: 0.31, y: topY, width: 0.38, height: 0.085 };
        if (isExplicitSignatureLine) explicitSignatureLineFound = true;
      }
      const startX = heading ? marginX + Math.max(0, (maxWidth - lineWidth) / 2) : marginX;
      let cursorX = startX;
      line.forEach((token, index) => {
        const font = token.bold ? boldFont : regularFont;
        const value = `${index > 0 && !/^[,.;:!?)]/.test(token.text) ? ' ' : ''}${token.text}`;
        page.drawText(value, { x: cursorX, y: currentY, size: fontSize, font, color: heading ? navyColor : textColor });
        cursorX += font.widthOfTextAtSize(value, fontSize);
      });
      currentY -= lineHeight;
      line = [];
      lineWidth = 0;
    };

    for (const token of tokens) {
      const font = token.bold ? boldFont : regularFont;
      const value = `${line.length && !/^[,.;:!?)]/.test(token.text) ? ' ' : ''}${token.text}`;
      const width = font.widthOfTextAtSize(value, fontSize);
      if (line.length && lineWidth + width > maxWidth) drawLine();
      const nextValue = `${line.length && !/^[,.;:!?)]/.test(token.text) ? ' ' : ''}${token.text}`;
      line.push(token);
      lineWidth += font.widthOfTextAtSize(nextValue, fontSize);
    }
    drawLine();
    currentY -= heading ? 8 : 6;
  }

  if (watermark) {
    for (const pdfPage of pdfDoc.getPages()) {
      const size = pdfPage.getSize();
      const fontSize = 34;
      const textWidth = boldFont.widthOfTextAtSize(watermark, fontSize);
      pdfPage.drawText(watermark, {
        x: Math.max(35, (size.width - textWidth * 0.7) / 2),
        y: size.height / 2,
        size: fontSize,
        font: boldFont,
        color: rgb(0.55, 0.12, 0.12),
        rotate: degrees(35),
        opacity: 0.16,
      });
    }
  }

  const pageCount = pdfDoc.getPageCount();
  const pdfBuffer = Buffer.from(await pdfDoc.save());
  return { pdfBuffer, hash: calculateHash(pdfBuffer), compiledText, pageCount, signaturePlacement };
}

export async function compileTemplatePreviewToPdf({
  title,
  contentHtml,
  variables,
  officeName,
  version,
  letterheadBuffer,
}: {
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
  version: number;
  letterheadBuffer?: Buffer;
}) {
  return renderTemplatePdf({
    title: `${title} - MINUTA V${version}`,
    contentHtml,
    variables,
    officeName,
    watermark: 'MINUTA - NAO ASSINADA',
    letterheadBuffer,
  });
}

export async function compileTemplateToPdf({
  officeId,
  uploadedBy,
  title,
  contentHtml,
  variables,
  officeName,
  letterheadBuffer,
}: {
  officeId: string;
  uploadedBy?: string;
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
  letterheadBuffer?: Buffer;
}) {
  // Auto-limpar ou substituir instruções entre colchetes por textos padrão sem travar a geração
  contentHtml = contentHtml.replace(/\[DESCREVER COM PRECISÃO A DEMANDA[^\]]*\]/gi, 'Ajuizamento de ação e acompanhamento integral da demanda')
    .replace(/\[DESCREVER ENTRADA[^\]]*\]/gi, 'Conforme ajuste direto com o cliente')
    .replace(/\[DEFINIR A BASE DE CÁLCULO\]/gi, 'Sobre o valor do proveito econômico obtido')
    .replace(/\[PREENCHER CONDIÇÕES\]/gi, 'Conforme legislação aplicável')
    .replace(/\[DESCREVER A FINALIDADE[^\]]*\]/gi, 'Acompanhamento processual e administrativo completo')
    .replace(/\[PREENCHER, SE APLICÁVEL\]/gi, 'Acompanhamento de processos e requerimentos')
    .replace(/\[(?:INFORMAR|PREENCHER|DESCREVER|DEFINIR|REVISAR|INSERIR)[^\]]*\]/gi, '________________');
  const rendered = await renderTemplatePdf({ title, contentHtml, variables, officeName, letterheadBuffer });
  const storageRecord = await saveFile({
    officeId,
    uploadedBy,
    fileBuffer: rendered.pdfBuffer,
    originalName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    mimeType: 'application/pdf',
  });
  const detectedPlacement = rendered.signaturePlacement as { page: number; x: number; y: number; width: number; height: number } | null;
  const position = detectedPlacement
    ? `CUSTOM:${detectedPlacement.page}:${detectedPlacement.x.toFixed(4)}:${detectedPlacement.y.toFixed(4)}:${detectedPlacement.width.toFixed(4)}:${detectedPlacement.height.toFixed(4)}`
    : `CUSTOM:${rendered.pageCount}:0.3100:0.6200:0.3800:0.0850`;
  return { storageRecord, hash: rendered.hash, compiledText: rendered.compiledText, pageCount: rendered.pageCount, signaturePosition: position };
}

export async function applyLetterheadToPdfBuffer(pdfBuffer: Buffer, letterheadBuffer: Buffer): Promise<Buffer> {
  try {
    const userDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const letterheadDoc = await PDFDocument.load(letterheadBuffer, { ignoreEncryption: true });

    const resultDoc = await PDFDocument.create();
    const [embeddedLetterhead] = await resultDoc.embedPdf(letterheadDoc, [0]);
    const letterheadSize = letterheadDoc.getPage(0).getSize();
    const pageW = letterheadSize.width || 595.28;
    const pageH = letterheadSize.height || 841.89;

    // Reserva 118pt no topo para o logotipo/cabeçalho timbrado e 88pt na base para o endereço
    const topMargin = 118;
    const bottomMargin = 88;
    const sideMargin = 35;

    const usableW = pageW - sideMargin * 2;
    const usableH = pageH - topMargin - bottomMargin;

    const pageCount = userDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const origPage = userDoc.getPage(i);
      const { width: origW, height: origH } = origPage.getSize();

      const scale = Math.min(usableW / origW, usableH / origH);
      const fitW = origW * scale;
      const fitH = origH * scale;

      const posX = (pageW - fitW) / 2;
      const posY = bottomMargin + (usableH - fitH) / 2;

      const [embeddedUserPage] = await resultDoc.embedPdf(userDoc, [i]);
      const newPage = resultDoc.addPage([pageW, pageH]);

      // 1. Desenha o documento do cliente ajustado entre as margens do timbrado
      newPage.drawPage(embeddedUserPage, {
        x: posX,
        y: posY,
        width: fitW,
        height: fitH,
      });

      // 2. Desenha o Papel Timbrado por cima (com logotipo, OAB e endereço totalmente nítidos)
      newPage.drawPage(embeddedLetterhead, {
        x: 0,
        y: 0,
        width: pageW,
        height: pageH,
      });
    }

    const saved = await resultDoc.save();
    return Buffer.from(saved);
  } catch (lhErr) {
    console.error('Erro ao mesclar papel timbrado no PDF:', lhErr);
    return pdfBuffer;
  }
}
