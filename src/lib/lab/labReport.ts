/**
 * LABORATÓRIO ASSINAJUR — Geração do relatório de diagnóstico em PDF.
 *
 * Roda inteiramente no navegador do usuário: o PDF é montado no aparelho e
 * baixado localmente. Nada é enviado ou gravado no servidor, mantendo a regra
 * do laboratório de não persistir imagens nem dados do documento.
 *
 * O `pdf-lib` é carregado sob demanda (import dinâmico) para não pesar a
 * página de captura, que precisa abrir rápido no celular.
 */

export interface LabReportImage {
  label: string;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
  capturedAt: string;
  meanLuminance: number;
  sharpness: number;
  issues: string[];
}

export interface LabReportData {
  geradoEm: string;
  sessao: {
    dispositivo: string;
    navegador: string;
    iniciadoEm: string;
    telaLargura: number;
    telaAltura: number;
  };
  tipoInformado: string;
  leitura: {
    tipoIdentificado: string;
    nome: string;
    cpf: string;
    nascimento: string;
    numeroDocumento: string;
    orgaoEmissor: string;
    nomeMae: string;
    nomePai: string;
  };
  ocr: {
    modelo: string;
    tempoMs: number;
    imagensEnviadas: number;
    observacao: string;
    erro: string;
  };
  cpf: {
    informado: string;
    lido: string;
    resultado: string;
  };
  imagens: LabReportImage[];
  eventos: { hora: string; descricao: string }[];
}

/**
 * O PDF usa fontes padrão com codificação WinAnsi, que não aceita símbolos
 * fora do Latin-1. Acentos do português passam normalmente; ícones e traços
 * longos são convertidos para equivalentes seguros.
 */
function safe(text: string | number | null | undefined): string {
  return String(text ?? '')
    .replace(/✓/g, 'OK')
    .replace(/[⚠!]/g, '!')
    .replace(/[✗✕]/g, 'X')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/·/g, '-')
    .replace(/×/g, 'x')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function base64ToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function buildLabReportPdf(data: LabReportData): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const doc = await PDFDocument.create();
  doc.setTitle('Laboratorio AssinaJur - Diagnostico de captura de documento');
  doc.setProducer('AssinaJur (ambiente de laboratorio)');

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const MARGIN = 42;
  const NAVY = rgb(0.043, 0.106, 0.227);
  const GOLD = rgb(0.71, 0.55, 0.11);
  const CINZA = rgb(0.42, 0.45, 0.5);
  const PRETO = rgb(0.1, 0.12, 0.15);

  let page = doc.addPage(A4);
  let y = A4[1] - MARGIN;

  const novaPagina = () => {
    page = doc.addPage(A4);
    y = A4[1] - MARGIN;
  };

  const garantirEspaco = (altura: number) => {
    if (y - altura < MARGIN) novaPagina();
  };

  const titulo = (texto: string) => {
    garantirEspaco(34);
    y -= 16;
    page.drawText(safe(texto).toUpperCase(), {
      x: MARGIN,
      y,
      size: 9,
      font: fontBold,
      color: GOLD,
    });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4[0] - MARGIN, y },
      thickness: 0.6,
      color: rgb(0.85, 0.87, 0.9),
    });
    y -= 12;
  };

  const linha = (rotulo: string, valor: string) => {
    garantirEspaco(15);
    page.drawText(safe(rotulo), { x: MARGIN, y, size: 9, font: fontRegular, color: CINZA });
    const valorTexto = safe(valor) || '-';
    const larguraRotulo = 165;
    // Quebra o valor em varias linhas quando necessario
    const maxLargura = A4[0] - MARGIN * 2 - larguraRotulo;
    const palavras = valorTexto.split(' ');
    let atual = '';
    const linhasValor: string[] = [];
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (fontBold.widthOfTextAtSize(teste, 9) > maxLargura && atual) {
        linhasValor.push(atual);
        atual = palavra;
      } else {
        atual = teste;
      }
    }
    if (atual) linhasValor.push(atual);

    linhasValor.forEach((texto, i) => {
      if (i > 0) {
        y -= 12;
        garantirEspaco(12);
      }
      page.drawText(texto, {
        x: MARGIN + larguraRotulo,
        y,
        size: 9,
        font: fontBold,
        color: PRETO,
      });
    });
    y -= 15;
  };

  // ---------- CABECALHO ----------
  page.drawText('LABORATORIO ASSINAJUR', {
    x: MARGIN,
    y,
    size: 8,
    font: fontBold,
    color: GOLD,
  });
  y -= 20;
  page.drawText('Diagnostico de captura de documento', {
    x: MARGIN,
    y,
    size: 17,
    font: fontBold,
    color: NAVY,
  });
  y -= 15;
  page.drawText(safe(`Gerado em ${data.geradoEm}`), {
    x: MARGIN,
    y,
    size: 9,
    font: fontRegular,
    color: CINZA,
  });
  y -= 6;

  // ---------- SESSAO ----------
  titulo('Sessao');
  linha('Dispositivo', data.sessao.dispositivo);
  linha('Navegador', data.sessao.navegador);
  linha('Tela', `${data.sessao.telaLargura} x ${data.sessao.telaAltura} px`);
  linha('Inicio do teste', data.sessao.iniciadoEm);

  // ---------- CAPTURA ----------
  titulo('Captura');
  linha('Tipo informado', data.tipoInformado);
  if (data.imagens.length === 0) {
    linha('Imagens', 'nenhuma imagem capturada');
  }
  data.imagens.forEach((img) => {
    linha(
      `${img.label} - resolucao`,
      `${img.width} x ${img.height} px  (${(img.bytes / 1024).toFixed(0)} KB)`
    );
    linha(`${img.label} - capturada em`, img.capturedAt);
    linha(
      `${img.label} - qualidade`,
      `luminancia ${img.meanLuminance} / nitidez ${img.sharpness}` +
        (img.issues.length ? ` - ${img.issues.join('; ')}` : ' - sem ressalvas')
    );
  });

  // ---------- LEITURA ----------
  titulo('Leitura do documento');
  linha('Tipo identificado', data.leitura.tipoIdentificado || 'Nao identificado');
  linha('Nome', data.leitura.nome || 'Nao identificado');
  linha('CPF', data.leitura.cpf || 'Nao identificado');
  linha('Data de nascimento', data.leitura.nascimento || 'Nao identificado');
  linha('Numero do documento', data.leitura.numeroDocumento || 'Nao identificado');
  linha('Orgao emissor', data.leitura.orgaoEmissor || 'Nao identificado');
  linha('Nome da mae', data.leitura.nomeMae || 'Nao identificado');
  linha('Nome do pai', data.leitura.nomePai || 'Nao identificado');

  titulo('Desempenho da leitura');
  linha('Modelo utilizado', data.ocr.modelo || 'nenhum respondeu');
  linha('Tempo de resposta', data.ocr.tempoMs ? `${data.ocr.tempoMs} ms` : '-');
  linha('Imagens enviadas', String(data.ocr.imagensEnviadas));
  if (data.ocr.observacao) linha('Observacao', data.ocr.observacao);
  if (data.ocr.erro) linha('Erro', data.ocr.erro);

  // ---------- CPF ----------
  titulo('Comparacao de CPF');
  linha('CPF informado', data.cpf.informado || 'nao informado');
  linha('CPF lido no documento', data.cpf.lido || 'nao identificado');
  linha('Resultado', data.cpf.resultado);

  // ---------- EVENTOS ----------
  titulo('Eventos do laboratorio');
  data.eventos.forEach((ev) => {
    garantirEspaco(13);
    page.drawText(safe(ev.hora), { x: MARGIN, y, size: 8.5, font: fontRegular, color: CINZA });
    page.drawText(safe(ev.descricao), {
      x: MARGIN + 60,
      y,
      size: 8.5,
      font: fontRegular,
      color: PRETO,
    });
    y -= 13;
  });

  // ---------- IMAGENS ----------
  for (const img of data.imagens) {
    const paginaImagem = doc.addPage(A4);
    let yi = A4[1] - MARGIN;

    paginaImagem.drawText(safe(`Documento - ${img.label.toLowerCase()}`), {
      x: MARGIN,
      y: yi,
      size: 13,
      font: fontBold,
      color: NAVY,
    });
    yi -= 14;
    paginaImagem.drawText(
      safe(`${img.width} x ${img.height} px - capturada em ${img.capturedAt}`),
      { x: MARGIN, y: yi, size: 8.5, font: fontRegular, color: CINZA }
    );
    yi -= 16;

    try {
      const embedded = await doc.embedJpg(base64ToBytes(img.dataUrl));
      const maxLargura = A4[0] - MARGIN * 2;
      const maxAltura = yi - MARGIN;
      // Escala proporcional: a imagem nunca e deformada no relatorio
      const escala = Math.min(maxLargura / embedded.width, maxAltura / embedded.height, 1);
      const largura = embedded.width * escala;
      const altura = embedded.height * escala;

      paginaImagem.drawImage(embedded, {
        x: MARGIN + (maxLargura - largura) / 2,
        y: yi - altura,
        width: largura,
        height: altura,
      });
    } catch {
      paginaImagem.drawText('Nao foi possivel embutir esta imagem no relatorio.', {
        x: MARGIN,
        y: yi - 14,
        size: 9,
        font: fontRegular,
        color: rgb(0.7, 0.2, 0.2),
      });
    }
  }

  // ---------- RODAPE EM TODAS AS PAGINAS ----------
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    p.drawText(
      safe(
        `Ambiente de laboratorio - nada foi gravado em banco, ficha de cliente ou assinatura.   Pagina ${i + 1} de ${paginas.length}`
      ),
      { x: MARGIN, y: 24, size: 7.5, font: fontRegular, color: CINZA }
    );
  });

  const bytes = await doc.save();
  // Copia para um ArrayBuffer proprio: evita problemas de tipo com SharedArrayBuffer
  const copia = new Uint8Array(bytes.length);
  copia.set(bytes);
  return new Blob([copia], { type: 'application/pdf' });
}

/** Nome de arquivo estavel e ordenavel, no horario local do aparelho. */
export function nomeArquivoRelatorio(data: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `assinajur-lab-documento-${data.getFullYear()}${p(data.getMonth() + 1)}${p(
    data.getDate()
  )}-${p(data.getHours())}${p(data.getMinutes())}${p(data.getSeconds())}.pdf`;
}
