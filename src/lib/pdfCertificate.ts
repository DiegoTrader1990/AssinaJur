import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { getFileBuffer, saveFile } from './storage';
import { calculateHash } from './pdfHash';

export function maskCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
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

export async function generateFinalPdfCertificate(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      office: true,
      originalFile: true,
      signers: true,
      events: true,
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

  // Gerar QR Code PNG em Data URL
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 200,
    color: { dark: '#0B1D3D', light: '#FFFFFF' },
  });

  const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'));

  // Embed Fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Adicionar Página Final de Certificado de Evidências Jurídicas
  const certPage = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = certPage.getSize();

  // Cores da Marca corporativa
  const navyColor = rgb(11 / 255, 29 / 255, 61 / 255);
  const goldColor = rgb(212 / 255, 175 / 255, 55 / 255);
  const grayColor = rgb(107 / 255, 114 / 255, 128 / 255);
  const lightBg = rgb(247 / 255, 248 / 255, 250 / 255);
  const emeraldColor = rgb(16 / 255, 185 / 255, 129 / 255);

  // Fundo sutil e borda decorativa da folha de evidências
  certPage.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: goldColor,
    borderWidth: 1.5,
    color: lightBg,
  });

  // Cabeçalho Corporativo
  certPage.drawRectangle({
    x: 35,
    y: height - 90,
    width: width - 70,
    height: 55,
    color: navyColor,
  });

  certPage.drawText('ASSINAJUR - CERTIFICADO DE EVIDENCIAS JURIDICAS', {
    x: 50,
    y: height - 58,
    size: 13,
    font: fontHelveticaBold,
    color: rgb(1, 1, 1),
  });

  certPage.drawText(`Documento no: ${doc.id} | Codigo de Autenticidade: ${verificationCode}`, {
    x: 50,
    y: height - 75,
    size: 9,
    font: fontHelvetica,
    color: goldColor,
  });

  // Informações do Documento e Escritório
  let currentY = height - 120;

  certPage.drawText('DADOS DO DOCUMENTO E EMISSOR', {
    x: 50,
    y: currentY,
    size: 10,
    font: fontHelveticaBold,
    color: navyColor,
  });

  currentY -= 15;
  certPage.drawText(`Titulo do Documento: ${doc.title}`, { x: 50, y: currentY, size: 9, font: fontHelvetica });
  currentY -= 12;
  certPage.drawText(`Escritorio Responsavel: ${doc.office.name} (CPF/CNPJ: ${doc.office.cpfCnpj})`, { x: 50, y: currentY, size: 9, font: fontHelvetica });
  currentY -= 12;
  certPage.drawText(`Data de Conclusao: ${doc.completedAt ? new Date(doc.completedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')} (UTC)`, { x: 50, y: currentY, size: 9, font: fontHelvetica });
  currentY -= 12;
  certPage.drawText(`Hash SHA-256 Original: ${doc.originalHash}`, { x: 50, y: currentY, size: 8, font: fontHelvetica, color: grayColor });

  // Linha Separadora
  currentY -= 20;
  certPage.drawLine({
    start: { x: 50, y: currentY },
    end: { x: width - 50, y: currentY },
    color: goldColor,
    thickness: 1,
  });

  // Seção de Signatários
  currentY -= 25;
  certPage.drawText('SIGNATARIOS E REGISTROS DE ASSINATURA', {
    x: 50,
    y: currentY,
    size: 10,
    font: fontHelveticaBold,
    color: navyColor,
  });

  for (const signer of doc.signers) {
    currentY -= 75;

    // Quadro do Signatário
    certPage.drawRectangle({
      x: 50,
      y: currentY,
      width: width - 100,
      height: 65,
      borderColor: rgb(229, 231, 235),
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    certPage.drawText(`Nome: ${signer.name} (${signer.role})`, {
      x: 60,
      y: currentY + 48,
      size: 10,
      font: fontHelveticaBold,
      color: navyColor,
    });

    certPage.drawText(`CPF: ${maskCpf(signer.cpf)} | IP: ${signer.ipAddress || 'Registrado'}`, {
      x: 60,
      y: currentY + 34,
      size: 8.5,
      font: fontHelvetica,
      color: grayColor,
    });

    certPage.drawText(`Status: ASSINADO ELETRONICAMENTE em ${signer.signedAt ? new Date(signer.signedAt).toLocaleString('pt-BR') : 'UTC'}`, {
      x: 60,
      y: currentY + 20,
      size: 8.5,
      font: fontHelveticaBold,
      color: emeraldColor,
    });

    // Embed da imagem da assinatura gráfica
    if (signer.signatureImage && signer.signatureImage.startsWith('data:image/png;base64,')) {
      try {
        const base64Data = signer.signatureImage.replace(/^data:image\/png;base64,/, '');
        const sigPng = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
        certPage.drawImage(sigPng, {
          x: width - 170,
          y: currentY + 10,
          width: 100,
          height: 45,
        });
      } catch (sigErr) {
        console.error('Erro ao renderizar assinatura gráfica no PDF:', sigErr);
      }
    }
  }

  // QR Code e Rodapé de Validação
  certPage.drawImage(qrImage, {
    x: width - 140,
    y: 45,
    width: 85,
    height: 85,
  });

  certPage.drawText('VERIFICACAO PUBLICA DE AUTENTICIDADE', {
    x: 50,
    y: 110,
    size: 9,
    font: fontHelveticaBold,
    color: navyColor,
  });

  certPage.drawText(`Escaneie o QR Code ao lado ou acesse:`, { x: 50, y: 96, size: 8, font: fontHelvetica });
  certPage.drawText(verificationUrl, { x: 50, y: 84, size: 8, font: fontHelveticaBold, color: navyColor });
  certPage.drawText('Conformidade com a Medida Provisoria no 2.200-2/2001 e a Lei no 14.063/2020.', {
    x: 50,
    y: 50,
    size: 7.5,
    font: fontHelvetica,
    color: grayColor,
  });

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

  // Atualizar registro do Documento com o PDF final assinado
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
