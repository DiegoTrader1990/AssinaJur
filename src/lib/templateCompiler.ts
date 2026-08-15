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
  compiled = compiled.replace(/{{\s*[a-zA-Z0-9_]+\s*}}/g, '________________');

  // Proteção final para modelos antigos que foram salvos com o nome/cidade de
  // uma cliente anterior no rodapé. Esta etapa é propositalmente feita após a
  // troca das variáveis, no último ponto antes da diagramação do PDF.
  const clientName = String(allVars.cliente_nome || '').trim();
  const city = String(allVars.cidade || '').trim();
  const date = String(allVars.data_atual || defaultDate).trim();
  if (city && date) {
    compiled = compiled.replace(/>[^<]{2,120},\s*\d{1,2}\s+de\s+[^\s<]+\s+de\s+\d{4}\.?\s*(?=<\/(?:p|div)>)/gi, `>${city}, ${date}.`);
  }
  // O rodapé de assinatura é ajustado depois da conversão para parágrafos,
  // em applyDynamicSignatureFooter. A antiga substituição ampla neste ponto
  // também alcançava a área logo abaixo do título da procuração e criava um
  // nome isolado antes de "OUTORGANTE".
  return compiled;
}

type ParagraphKind = 'BODY' | 'H1' | 'H2' | 'LIST';
type TextAlignment = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFY';
type PdfFontFamily = 'HELVETICA' | 'TIMES' | 'COURIER';
type TextRun = { text: string; bold: boolean; fontFamily?: PdfFontFamily; fontSize?: number };
type RichParagraph = { kind: ParagraphKind; alignment: TextAlignment; runs: TextRun[]; spacer?: number; defaultFontFamily?: PdfFontFamily; defaultFontSize?: number };

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

function mapPdfFontFamily(value: string): PdfFontFamily {
  const family = value.toLowerCase();
  if (/(times|georgia|garamond)/.test(family)) return 'TIMES';
  if (/(courier|mono)/.test(family)) return 'COURIER';
  return 'HELVETICA';
}

function mapPdfFontSize(value: string): number {
  const size = Number.parseInt(value, 10);
  // document.execCommand('fontSize') produz a escala 1–7 do HTML legado.
  return ({ 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 32 } as Record<number, number>)[size] || 10;
}

function emphasizeDocumentNames(html: string, variables: VariableValues): string {
  const patronos = String(variables.patronos_nomes || '').split('|');
  const names = [variables.cliente_nome, variables.representante_legal, variables.advogado_nome, variables.escritorio_nome, ...patronos]
    .map((item) => String(item || '').trim())
    .filter((item) => item.length >= 3)
    .sort((left, right) => right.length - left.length);
  return names.reduce((result, name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(new RegExp(escaped, 'gi'), (match) => `<strong>${match}</strong>`);
  }, html);
}

function applyClientGenderToQualification(html: string, variables: VariableValues): string {
  const gender = String(variables.cliente_genero || '').toUpperCase();
  if (gender !== 'MASCULINO' && gender !== 'FEMININO') return html;
  const feminine = gender === 'FEMININO';
  const replacements: Array<[RegExp, string]> = [
    [/brasileiro\(a\)/gi, feminine ? 'brasileira' : 'brasileiro'],
    [/solteiro\(a\)/gi, feminine ? 'solteira' : 'solteiro'],
    [/casado\(a\)/gi, feminine ? 'casada' : 'casado'],
    [/divorciado\(a\)/gi, feminine ? 'divorciada' : 'divorciado'],
    [/viúvo\(a\)/gi, feminine ? 'viúva' : 'viúvo'],
    [/portador\(a\)/gi, feminine ? 'portadora' : 'portador'],
    [/inscrito\(a\)/gi, feminine ? 'inscrita' : 'inscrito'],
    [/residente e domiciliado\(a\)/gi, feminine ? 'residente e domiciliada' : 'residente e domiciliado'],
    [/denominado\(a\)/gi, feminine ? 'denominada' : 'denominado'],
    [/representado\(a\)/gi, feminine ? 'representada' : 'representado'],
  ];
  const clientName = String(variables.cliente_nome || '').trim();
  const escapedClientName = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const clientNamePattern = clientName.length >= 3 ? new RegExp(escapedClientName, 'i') : null;
  // A declaração não necessariamente inicia por "DECLARANTE"; identificamos também
  // o parágrafo que traz o nome do cliente, sem alterar os patronos.
  return html.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/(?:p|div)>/gi, (block, _tag, _attributes, innerHtml) => {
    const textOnly = String(innerHtml).replace(/<[^>]+>/g, ' ');
    if (!/(?:OUTORGANTE|CONTRATANTE|DECLARANTE)\s*:/i.test(textOnly) && !(clientNamePattern && clientNamePattern.test(textOnly))) return block;
    return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), block);
  });
}

function cleanHtmlForPdf(html: string): string {
  if (!html) return '';
  let cleaned = html;

  // 1. Remove style, script, comments
  cleaned = cleaned
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 2. Aggressively strip span tags, style attributes, and Word style artifacts
  cleaned = cleaned
    // Alguns navegadores representam negrito como span com CSS. Preserve-o antes
    // de remover os estilos de colagens do Word.
    .replace(/<span\b([^>]*)style\s*=\s*["']([^"']*)["']([^>]*)>([\s\S]*?)<\/span>/gi, (_match, _before, style, _after, inner) => {
      const family = cssFontFamily(style);
      const size = cssFontSizeToPoints(style);
      const bold = /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style);
      const content = bold ? `<strong>${inner}</strong>` : inner;
      if (!family && !size) return content;
      return `<font${family ? ` face="${family}"` : ''}${size ? ` data-aj-size="${size}"` : ''}>${content}</font>`;
    })
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/<?\s*span\s+style\s*=\s*"[\s\S]*?"\s*>/gi, '')
    .replace(/span\s+style\s*=\s*"[^>]*>/gi, '')
    .replace(/span\s+style\s*=\s*'[^>]*>/gi, '')
    .replace(/line-height:[^;>]*;?/gi, '')
    .replace(/\bsans-serif\b;?/gi, '');

  // 3. Line-by-line cleanup
  return cleaned
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*span\s+style=[^>]*>?/gi, '')
        .replace(/^\s*line-height:[^>]*>?/gi, '')
    )
    .filter((line) => line.trim().length > 0)
    .join('\n');
}

function isLabelParagraph(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.endsWith(':') && trimmed.split(/\s+/).length <= 5) return true;
  if (/^(?:PODERES\s+ESPECIAIS|PODERES\s+GERAIS|OUTORGANTE|OUTORGADOS|OBJETO|HONORÁRIOS|FORO|SUBSTABELECIMENTO)\s*:\s*(?:nos|dos|das|de|do|da|em|para|a|o|os|as)?$/i.test(trimmed)) return true;
  return false;
}

function parseRichParagraphs(html: string): RichParagraph[] {
  // Clean HTML attributes and style fragments before parsing
  const cleanedHtml = cleanHtmlForPdf(html);
  const containsHtmlBlocks = /<\s*\/?(?:p|div|h1|h2|h3|li|ol|ul)\b/i.test(cleanedHtml);
  const alignmentFromAttributes = (attributes: string, fallback: TextAlignment): TextAlignment => {
    const match = attributes.match(/text-align\s*:\s*(left|center|right|justify)/i);
    if (!match) return fallback;
    return match[1].toUpperCase() as TextAlignment;
  };
  const blockMarker = (kind: ParagraphKind, attributes: string, fallback: TextAlignment) => {
    const spacer = /data-aj-spacer\s*=\s*["']large["']/i.test(attributes) ? 26 : 0;
    const rawFamily = cssFontFamily(attributes);
    const family = rawFamily ? mapPdfFontFamily(rawFamily) : 'DEFAULT';
    const size = cssFontSizeToPoints(attributes) || 0;
    return `\n[[${kind}:${alignmentFromAttributes(attributes, fallback)}:${spacer}:${family}:${size}]]`;
  };

  let normalized = cleanedHtml.replace(/\r/g, '');

  // O editor pode inserir quebras físicas no HTML apenas para legibilidade do código.
  // Quando há tags de bloco, essas quebras não são parágrafos reais e não podem virar
  // linhas finais no PDF (isso era a origem das linhas curtas e sem justificação).
  if (containsHtmlBlocks) normalized = normalized.replace(/\n+/g, ' ');

  normalized = normalized
    // <br> vindo de colagens e do contentEditable costuma representar quebra visual
    // dentro do bloco; não pode criar áreas vazias repetidas no PDF.
    // A quebra curta (Shift+Enter) precisa permanecer dentro do mesmo parágrafo no PDF.
    .replace(/<\s*br\s*\/?>/gi, '[[AJ_BR]]')
    .replace(/<\s*h1([^>]*)>/gi, (_match, attributes) => blockMarker('H1', attributes, 'CENTER'))
    .replace(/<\s*h2([^>]*)>/gi, (_match, attributes) => blockMarker('H2', attributes, 'LEFT'))
    .replace(/<\s*(?:p|div)([^>]*)>/gi, (_match, attributes) => blockMarker('BODY', attributes, 'JUSTIFY'))
    .replace(/<\s*li([^>]*)>/gi, (_match, attributes) => blockMarker('LIST', attributes, 'LEFT'))
    .replace(/<\/(?:p|div|h1|h2|h3|li|ol|ul)>/gi, '\n');

  const parsed = normalized
    .split('\n')
    .map((raw): RichParagraph | null => {
      let line = raw.trim();
      if (!line) return null;
      let kind: ParagraphKind = 'BODY';
      let alignment: TextAlignment = 'JUSTIFY';
      let spacer = 0;
      const marker = line.match(/^\[\[(BODY|H1|H2|LIST):(LEFT|CENTER|RIGHT|JUSTIFY)(?::(\d+))?(?::(HELVETICA|TIMES|COURIER|DEFAULT))?(?::([\d.]+))?\]\]/);
      let defaultFontFamily: PdfFontFamily | undefined;
      let defaultFontSize: number | undefined;
      if (marker) {
        kind = marker[1] as ParagraphKind;
        alignment = marker[2] as TextAlignment;
        spacer = Number(marker[3] || 0);
        defaultFontFamily = marker[4] === 'DEFAULT' ? undefined : marker[4] as PdfFontFamily | undefined;
        defaultFontSize = marker[5] ? Number(marker[5]) : undefined;
        line = line.slice(marker[0].length);
      }

      const runs: TextRun[] = [];
      let boldDepth = 0;
      const fontStack: Array<PdfFontFamily | undefined> = [defaultFontFamily];
      const sizeStack: Array<number | undefined> = [defaultFontSize];
      for (const token of line.match(/<[^>]+>|[^<]+/g) || []) {
        if (/^<\s*(?:strong|b)\b/i.test(token)) { boldDepth += 1; continue; }
        if (/^<\s*\/(?:strong|b)\s*>/i.test(token)) { boldDepth = Math.max(0, boldDepth - 1); continue; }
        if (/^<\s*font\b/i.test(token)) {
          const face = token.match(/\bface\s*=\s*["']?([^"'>\s]+)/i)?.[1] || '';
          const size = token.match(/\bsize\s*=\s*["']?([^"'>\s]+)/i)?.[1] || '';
          const exactSize = token.match(/\bdata-aj-size\s*=\s*["']?([\d.]+)/i)?.[1] || '';
          fontStack.push(mapPdfFontFamily(face));
          sizeStack.push(exactSize ? Number(exactSize) : size ? mapPdfFontSize(size) : sizeStack.at(-1));
          continue;
        }
        if (/^<\s*\/font\s*>/i.test(token)) { if (fontStack.length > 1) fontStack.pop(); if (sizeStack.length > 1) sizeStack.pop(); continue; }
        if (/^<[^>]+>$/.test(token)) continue;
        const text = decodeHtmlText(token);
        if (text.trim()) runs.push({ text, bold: boldDepth > 0, fontFamily: fontStack.at(-1), fontSize: sizeStack.at(-1) });
      }
      // Em qualificações, o texto posterior a “OBJETO:” é uma oração completa e
      // deve iniciar como frase, mesmo quando o modelo antigo a tiver salvo em minúscula.
      const objectLabelRun = runs.findIndex((run) => /OBJETO\s*:/i.test(run.text));
      if (objectLabelRun >= 0) {
        const capitalizeAfterLabel = (value: string) => value.replace(/^(\s*)([a-záàâãéêíóôõúç])/u, (_match, spacing, letter) => `${spacing}${letter.toLocaleUpperCase('pt-BR')}`);
        const labelRun = runs[objectLabelRun];
        const afterLabel = labelRun.text.replace(/^(.*?OBJETO\s*:\s*)([a-záàâãéêíóôõúç])/iu, (_match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('pt-BR')}`);
        if (afterLabel !== labelRun.text) {
          labelRun.text = afterLabel;
        } else if (runs[objectLabelRun + 1]) {
          runs[objectLabelRun + 1].text = capitalizeAfterLabel(runs[objectLabelRun + 1].text);
        }
      }
      // Linhas vazias criadas no editor (Enter em um parágrafo vazio) também são
      // parte da minuta: preservamos a altura para que a emissão respeite o espaçamento.
      return { kind, alignment, runs, spacer, defaultFontFamily, defaultFontSize };
    })
    .filter((item): item is RichParagraph => Boolean(item));

  // Merge short label paragraphs (e.g., "PODERES ESPECIAIS:", "PODERES ESPECIAIS: nos") into the next paragraph
  const mergedParagraphs: RichParagraph[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const current = parsed[i];
    const currentText = current.runs.map((r) => r.text).join(' ').trim();

    if (
      i < parsed.length - 1 &&
      isLabelParagraph(currentText) &&
      current.kind === 'BODY' &&
      parsed[i + 1].kind === 'BODY'
    ) {
      const next = parsed[i + 1];
      let labelRuns = current.runs;
      // If label runs end with a stray "nos", trim it if next starts with "termos"
      const lastRun = labelRuns[labelRuns.length - 1];
      if (lastRun && /^nos$/i.test(lastRun.text.trim()) && next.runs[0] && /^termos/i.test(next.runs[0].text.trim())) {
        labelRuns = labelRuns.slice(0, -1);
      }
      next.runs = [...labelRuns, { text: ' ', bold: false }, ...next.runs];
    } else {
      mergedParagraphs.push(current);
    }
  }

  // Partes geradas automaticamente (qualificação do cliente, patronos e
  // declaração) não carregam necessariamente uma tag <font>. Elas devem usar a
  // mesma tipografia predominante do modelo, e não voltar silenciosamente a 10 pt.
  const bodyRuns = mergedParagraphs
    .filter((paragraph) => paragraph.kind === 'BODY' || paragraph.kind === 'LIST')
    .flatMap((paragraph) => paragraph.runs)
    .filter((run) => run.fontSize || run.fontFamily);
  const preferredSize = bodyRuns.reduce<Record<string, number>>((counts, run) => {
    const key = String(run.fontSize || 10);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const baseSize = Number(Object.entries(preferredSize).sort(([, left], [, right]) => right - left)[0]?.[0] || 10);
  const preferredFamily = bodyRuns.find((run) => run.fontFamily)?.fontFamily || 'HELVETICA';
  return mergedParagraphs.map((paragraph) => ({
    ...paragraph,
    runs: paragraph.runs.map((run) => ({
      ...run,
      fontFamily: run.fontFamily || preferredFamily,
      fontSize: run.fontSize || baseSize,
    })),
  }));
}

function cssFontSizeToPoints(style: string): number | undefined {
  const match = String(style || '').match(/font-size\s*:\s*([\d.]+)\s*(pt|px)?/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const points = match[2]?.toLowerCase() === 'px' ? value * 0.75 : value;
  return Math.max(8, Math.min(32, Math.round(points * 10) / 10));
}

function cssFontFamily(style: string): string | undefined {
  const match = String(style || '').match(/font-family\s*:\s*([^;]+)/i);
  return match?.[1]?.replace(/["']/g, '').split(',')[0]?.trim() || undefined;
}

// Modelos antigos podem ter chegado do Word com o rodapé já preenchido com uma
// cliente anterior. Depois que o HTML foi convertido em parágrafos, não
// dependemos mais da estrutura de tags do Word: identificamos o bloco final de
// assinatura e reconstruímos somente seus dados com a cliente desta emissão.
function applyDynamicSignatureFooter(paragraphs: RichParagraph[], variables: VariableValues): RichParagraph[] {
  const clientName = String(variables.cliente_nome || '').trim();
  const city = String(variables.cidade || '').trim();
  const date = String(variables.data_atual || '').trim();
  if (!clientName && !(city && date)) return paragraphs;

  const paragraphText = (paragraph: RichParagraph) => paragraph.runs.map((run) => run.text).join(' ').replace(/\s+/g, ' ').trim();
  const roleIndex = paragraphs
    .map((paragraph, index) => /^(?:OUTORGANTE|CONTRATANTE|DECLARANTE|ASSINATURA\s+DO\s+CLIENTE)\.?$/i.test(paragraphText(paragraph)) ? index : -1)
    .filter((index) => index >= 0)
    .at(-1);

  // Só é rodapé quando o rótulo está no fim do documento e existe uma marca
  // real de assinatura logo antes dele. Em minutas curtas, o primeiro
  // "OUTORGANTE" pode ficar numericamente perto do fim e nunca deve ser
  // tratado como assinatura final.
  if (roleIndex === undefined || roleIndex < Math.max(1, paragraphs.length - 8)) return paragraphs;
  const roleText = paragraphText(paragraphs[roleIndex]);
  const hasSignatureLine = paragraphs
    .slice(Math.max(0, roleIndex - 3), roleIndex)
    .some((paragraph) => /^_{5,}$/.test(paragraphText(paragraph)));
  if (!/^ASSINATURA\s+DO\s+CLIENTE/i.test(roleText) && !hasSignatureLine) return paragraphs;

  const result = paragraphs.map((paragraph) => ({ ...paragraph, runs: paragraph.runs.map((run) => ({ ...run })) }));
  const signatureNameIndex = roleIndex - 1;
  if (clientName && result[signatureNameIndex]) {
    const existing = result[signatureNameIndex];
    result[signatureNameIndex] = {
      ...existing,
      alignment: 'CENTER',
      runs: [{ text: clientName, bold: existing.runs.some((run) => run.bold), fontFamily: existing.runs[0]?.fontFamily, fontSize: existing.runs[0]?.fontSize }],
    };
  }

  const dateIndex = result
    .slice(0, Math.max(0, signatureNameIndex))
    .map((paragraph, index) => ({ index, text: paragraphText(paragraph) }))
    .filter(({ text }) => /\d{1,2}\s+de\s+/i.test(text) || /\d{1,2}[/.\-]\d{2,4}/.test(text))
    .map(({ index }) => index)
    .at(-1);
  if (dateIndex !== undefined && city && date) {
    const existing = result[dateIndex];
    result[dateIndex] = {
      ...existing,
      runs: [{ text: `${city}, ${date}.`, bold: existing.runs.some((run) => run.bold), fontFamily: existing.runs[0]?.fontFamily, fontSize: existing.runs[0]?.fontSize }],
    };
  }
  return result;
}

async function renderTemplatePdf({
  title,
  contentHtml,
  variables,
  officeName,
  watermark,
  letterheadBuffer,
  showSystemHeader,
}: {
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
  watermark?: string;
  letterheadBuffer?: Buffer;
  showSystemHeader?: boolean;
}) {
  const compiledText = applyClientGenderToQualification(replaceTemplateVariables(contentHtml, variables), variables);
  const presentationHtml = emphasizeDocumentNames(compiledText, variables);
  const pdfDoc = await PDFDocument.create();

  let embeddedLetterhead: Awaited<ReturnType<typeof pdfDoc.embedPdf>>[number] | undefined;
  if (letterheadBuffer) {
    const letterheadDoc = await PDFDocument.load(letterheadBuffer);
    [embeddedLetterhead] = await pdfDoc.embedPdf(letterheadDoc, [0]);
  }
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const documentFont = (family: PdfFontFamily | undefined, bold: boolean) => {
    if (family === 'TIMES') return bold ? timesBoldFont : timesFont;
    if (family === 'COURIER') return bold ? courierBoldFont : courierFont;
    return bold ? boldFont : regularFont;
  };
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

    if (withHeader && !embeddedLetterhead && showSystemHeader !== false) {
      page.drawRectangle({ x: 40, y: height - 60, width: width - 80, height: 3, color: goldColor });
      page.drawText(officeName.toUpperCase(), { x: 40, y: height - 45, size: 11, font: boldFont, color: navyColor });
      page.drawText(title.toUpperCase(), { x: 40, y: height - 85, size: 14, font: boldFont, color: navyColor });
    }
    return page;
  };

  let page = addPage(true);
  const { width, height } = page.getSize();
  // Margem superior ampliada para não colidir com papel timbrado/cabeçalho
  const startTopMargin = embeddedLetterhead ? 135 : showSystemHeader === false ? 70 : 115;
  const subsequentTopMargin = embeddedLetterhead ? 125 : showSystemHeader === false ? 60 : 100;
  const bottomMarginLimit = embeddedLetterhead ? 85 : 65;

  let currentY = height - startTopMargin;
  const marginX = 40;
  const maxWidth = width - 80;
  const paragraphs = applyDynamicSignatureFooter(parseRichParagraphs(presentationHtml), variables);
  let signaturePlacement: { page: number; x: number; y: number; width: number; height: number } | null = null;
  let explicitSignatureLineFound = false;
  const ensureLineSpace = (lineHeight: number) => {
    if (currentY - lineHeight < bottomMarginLimit) {
      page = addPage(false);
      currentY = height - subsequentTopMargin;
    }
  };

  const signatureLabelIndexes = paragraphs
    .map((paragraph, index) => ({
      index,
      text: paragraph.runs.map((run) => run.text).join(' ').trim(),
    }))
    .filter((item) => /^(?:CONTRATANTE|OUTORGANTE|DECLARANTE|ASSINATURA\s+DO\s+CLIENTE)\s*:/i.test(item.text))
    .map((item) => item.index);
  const signatureCandidate = signatureLabelIndexes.at(-1);
  // Uma área de assinatura precisa estar ao final do documento. Se OUTORGANTE aparece
  // somente na qualificação inicial, não há espaço de assinatura a reservar ali.
  const lastSignatureLabelIndex = signatureCandidate !== undefined && signatureCandidate >= Math.max(0, paragraphs.length - 3)
    ? signatureCandidate
    : undefined;
  const explicitSignatureLineIndexes = paragraphs
    .map((paragraph, index) => ({ index, text: paragraph.runs.map((run) => run.text).join(' ').trim() }))
    .filter((item) => /^_{5,}/.test(item.text))
    .map((item) => item.index);

  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
    const paragraph = paragraphs[paragraphIndex];
    const paragraphText = paragraph.runs.map((run) => run.text).join(' ').trim();
    const isExplicitSignatureLine = /^_{5,}/.test(paragraphText);
    const isSignatureCaption = explicitSignatureLineIndexes.some((lineIndex) => paragraphIndex > lineIndex && paragraphIndex <= lineIndex + 2);
    const isFollowedByExplicitSignatureLine = /^_{5,}/.test(
      paragraphs[paragraphIndex + 1]?.runs.map((run) => run.text).join(' ').trim() || ''
    );
    // A qualificação inicial do cliente também costuma iniciar com OUTORGANTE/CONTRATANTE.
    // Apenas a última ocorrência é a área real de assinatura.
    const isClientSignatureLabel = paragraphIndex === lastSignatureLabelIndex;
    const isSignatureArea = isExplicitSignatureLine || isClientSignatureLabel;
    const alignment = isExplicitSignatureLine || isSignatureCaption ? 'CENTER' : paragraph.alignment;
    const heading = paragraph.kind === 'H1' || paragraph.kind === 'H2';
    const fontSize = paragraph.kind === 'H1' ? 12 : paragraph.kind === 'H2' ? 10.8 : 10;
    const lineHeight = paragraph.kind === 'H1' ? 17 : paragraph.kind === 'H2' ? 16 : 15;
    type LayoutToken = { text: string; bold: boolean; fontFamily?: PdfFontFamily; fontSize: number; hardBreak?: boolean };
    const tokens: LayoutToken[] = paragraph.runs.flatMap((run) =>
      run.text.split('[[AJ_BR]]').flatMap((part, index, parts) => [
        ...part.trim().split(/\s+/).filter(Boolean).map((word) => ({ text: word, bold: heading || run.bold, fontFamily: run.fontFamily, fontSize: heading ? fontSize : run.fontSize || fontSize })),
        ...(index < parts.length - 1 ? [{ text: '', bold: false, fontFamily: run.fontFamily, fontSize: heading ? fontSize : run.fontSize || fontSize, hardBreak: true }] : []),
      ])
    );
    if (paragraph.kind === 'LIST') tokens.unshift({ text: '\u2022', bold: true, fontFamily: 'HELVETICA', fontSize });

    if (tokens.length === 0) {
      if (paragraph.spacer) { ensureLineSpace(paragraph.spacer); currentY -= paragraph.spacer; }
      continue;
    }

    let line: LayoutToken[] = [];
    let lineWidth = 0;
    const drawLine = (isLastLine: boolean) => {
      if (!line.length) return;
      const effectiveLineHeight = Math.max(lineHeight, ...line.map((token) => token.fontSize * 1.35));
      ensureLineSpace(isClientSignatureLabel ? effectiveLineHeight + 92 : effectiveLineHeight);
      if (isExplicitSignatureLine || (isClientSignatureLabel && !explicitSignatureLineFound)) {
        const labelY = (height - currentY - 5) / height;
        // Quando há somente o rótulo (ex.: OUTORGANTE: Nome), o selo fica logo abaixo
        // dele, e não por cima do texto. Linhas explícitas de sublinhado recebem o selo
        // diretamente sobre a linha escolhida no modelo.
        const topY = isClientSignatureLabel && !isExplicitSignatureLine
          ? Math.min(0.82, Math.max(0.08, labelY + 0.085))
          : Math.min(0.82, Math.max(0.08, labelY));
        signaturePlacement = { page: pdfDoc.getPageCount(), x: 0.31, y: topY, width: 0.38, height: 0.085 };
        if (isExplicitSignatureLine) explicitSignatureLineFound = true;
      }

      // ALINHAMENTO JUSTIFICADO MATEMÁTICO PERFEITO (Margem direita retíssima)
      const spaceCount = line.length - 1;
      const shouldJustify = alignment === 'JUSTIFY' && !isLastLine && spaceCount > 0 && paragraph.kind === 'BODY';
      const extraWordSpacing = shouldJustify ? (maxWidth - lineWidth) / spaceCount : 0;

      const startX = alignment === 'CENTER'
        ? marginX + Math.max(0, (maxWidth - lineWidth) / 2)
        : alignment === 'RIGHT'
          ? marginX + Math.max(0, maxWidth - lineWidth)
          : marginX;
      let cursorX = startX;
      line.forEach((token, index) => {
        const font = documentFont(token.fontFamily, token.bold);
        let cleanText = token.text.replace(/\s+([,.;:!?])/g, '$1');
        
        // Draw the word text cleanly at cursorX
        page.drawText(cleanText, {
          x: cursorX,
          y: currentY,
          size: token.fontSize,
          font,
          color: heading ? navyColor : textColor,
        });

        // Advance cursorX by word width + (space width + extraWordSpacing if not last word)
        let wordWidth = font.widthOfTextAtSize(cleanText, token.fontSize);
        if (index < line.length - 1) {
          const spaceWidth = font.widthOfTextAtSize(' ', token.fontSize);
          wordWidth += spaceWidth + (shouldJustify ? extraWordSpacing : 0);
        }
        cursorX += wordWidth;
      });
      currentY -= effectiveLineHeight;
      line = [];
      lineWidth = 0;
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.hardBreak) {
        // Shift+Enter em um ponto vazio (ou um parágrafo em branco criado por Enter)
        // também precisa ocupar uma linha real no PDF.
        if (line.length) {
          drawLine(true);
        } else {
          ensureLineSpace(lineHeight);
          currentY -= lineHeight;
        }
        continue;
      }
      const font = documentFont(token.fontFamily, token.bold);
      const value = `${line.length && !/^[,.;:!?)]/.test(token.text) ? ' ' : ''}${token.text}`;
      const width = font.widthOfTextAtSize(value, token.fontSize);
      if (line.length && lineWidth + width > maxWidth) drawLine(false);
      const nextValue = `${line.length && !/^[,.;:!?)]/.test(token.text) ? ' ' : ''}${token.text}`;
      line.push(token);
      lineWidth += font.widthOfTextAtSize(nextValue, token.fontSize);
    }
    drawLine(true);
    // Reserva real para o selo profissional e assinatura, mesmo quando o editor possui
    // linhas em branco que antes eram descartadas pelo compilador.
    // Títulos principais precisam de uma separação visual clara antes da qualificação inicial.
    currentY -= isClientSignatureLabel ? 84 : isExplicitSignatureLine ? 8 : isSignatureCaption ? 3 : isFollowedByExplicitSignatureLine ? 42 : paragraph.kind === 'H1' ? 12 : heading ? 6 : 5 + (paragraph.spacer || 0);
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
  showSystemHeader,
}: {
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
  version: number;
  letterheadBuffer?: Buffer;
  showSystemHeader?: boolean;
}) {
  return renderTemplatePdf({
    title: showSystemHeader === false ? title : `${title} - MINUTA V${version}`,
    contentHtml,
    variables,
    officeName,
    watermark: 'MINUTA - NAO ASSINADA',
    letterheadBuffer,
    showSystemHeader,
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
