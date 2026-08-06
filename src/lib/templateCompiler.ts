import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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
  const compiledText = replaceTemplateVariables(contentHtml, variables);

  // Criar documento PDF com pdf-lib
  const pdfDoc = await PDFDocument.create();
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4 em pontos
  const { width, height } = page.getSize();

  const navyColor = rgb(11 / 255, 29 / 255, 61 / 255);
  const goldColor = rgb(212 / 255, 175 / 255, 55 / 255);
  const textColor = rgb(30 / 255, 41 / 255, 59 / 255);

  // Cabeçalho do Documento
  page.drawRectangle({
    x: 40,
    y: height - 60,
    width: width - 80,
    height: 3,
    color: goldColor,
  });

  page.drawText(officeName.toUpperCase(), {
    x: 40,
    y: height - 45,
    size: 11,
    font: fontHelveticaBold,
    color: navyColor,
  });

  page.drawText(title.toUpperCase(), {
    x: 40,
    y: height - 85,
    size: 14,
    font: fontHelveticaBold,
    color: navyColor,
  });

  // Dividir o texto compilado em parágrafos e linhas para caber na página A4
  const cleanParagraphs = compiledText.replace(/<[^>]*>/g, '\n').split('\n').filter((p) => p.trim() !== '');

  let currentY = height - 110;
  const marginX = 40;
  const maxWidth = width - 80;

  for (const paragraph of cleanParagraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = fontHelvetica.widthOfTextAtSize(testLine, 10);

      if (testWidth > maxWidth) {
        page.drawText(currentLine, {
          x: marginX,
          y: currentY,
          size: 10,
          font: fontHelvetica,
          color: textColor,
        });

        currentY -= 15;

        // Se atingir o fim da página A4, adiciona nova página
        if (currentY < 60) {
          page = pdfDoc.addPage([595.28, 841.89]);
          currentY = height - 60;
        }

        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      page.drawText(currentLine, {
        x: marginX,
        y: currentY,
        size: 10,
        font: fontHelvetica,
        color: textColor,
      });
      currentY -= 20;
    }
  }

  // Converter para Buffer
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const hash = calculateHash(pdfBuffer);

  // Salvar no Storage do escritório
  const storageRecord = await saveFile({
    officeId,
    uploadedBy,
    fileBuffer: pdfBuffer,
    originalName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    mimeType: 'application/pdf',
  });

  return {
    storageRecord,
    hash,
    compiledText,
  };
}
