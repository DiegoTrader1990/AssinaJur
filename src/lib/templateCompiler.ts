import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveFile } from './storage';
import { calculateHash } from './pdfHash';

export interface VariableValues {
  cliente_nome?: string;
  cliente_cpf?: string;
  cliente_rg?: string;
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
  return compiled;
}

async function renderTemplatePdf({
  title,
  contentHtml,
  variables,
  officeName,
  watermark,
}: {
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
  watermark?: string;
}) {
  const compiledText = replaceTemplateVariables(contentHtml, variables);
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const navyColor = rgb(11 / 255, 29 / 255, 61 / 255);
  const goldColor = rgb(212 / 255, 175 / 255, 55 / 255);
  const textColor = rgb(30 / 255, 41 / 255, 59 / 255);

  const addPage = (withHeader: boolean) => {
    const page = pdfDoc.addPage(pageSize);
    const { width, height } = page.getSize();
    if (withHeader) {
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
  const paragraphs = compiledText.replace(/<[^>]*>/g, '\n').split('\n').map((item) => item.trim()).filter(Boolean);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (regularFont.widthOfTextAtSize(testLine, 10) > maxWidth && currentLine) {
        page.drawText(currentLine, { x: marginX, y: currentY, size: 10, font: regularFont, color: textColor });
        currentY -= 15;
        if (currentY < 60) {
          page = addPage(false);
          currentY = height - 60;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x: marginX, y: currentY, size: 10, font: regularFont, color: textColor });
      currentY -= 20;
      if (currentY < 60) {
        page = addPage(false);
        currentY = height - 60;
      }
    }
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

  const pdfBuffer = Buffer.from(await pdfDoc.save());
  return { pdfBuffer, hash: calculateHash(pdfBuffer), compiledText };
}

export async function compileTemplatePreviewToPdf({
  title,
  contentHtml,
  variables,
  officeName,
  version,
}: {
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
  version: number;
}) {
  return renderTemplatePdf({
    title: `${title} - MINUTA V${version}`,
    contentHtml,
    variables,
    officeName,
    watermark: 'MINUTA - NAO ASSINADA',
  });
}

export async function compileTemplateToPdf({
  officeId,
  uploadedBy,
  title,
  contentHtml,
  variables,
  officeName,
}: {
  officeId: string;
  uploadedBy?: string;
  title: string;
  contentHtml: string;
  variables: VariableValues;
  officeName: string;
}) {
  const rendered = await renderTemplatePdf({ title, contentHtml, variables, officeName });
  const storageRecord = await saveFile({
    officeId,
    uploadedBy,
    fileBuffer: rendered.pdfBuffer,
    originalName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    mimeType: 'application/pdf',
  });
  return { storageRecord, hash: rendered.hash, compiledText: rendered.compiledText };
}
