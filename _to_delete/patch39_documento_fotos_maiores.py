# -*- coding: utf-8 -*-
import sys

path = "src/lib/pdfCertificate.ts"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Reservar altura suficiente no painel para fotos de documento maiores,
# com folga extra para o separador visual entre os dois topicos de evidencia.
ancora1 = "    const docPhotosHeight = hasDocPhotos ? 155 : 0;"
exigir(ancora1 in src, "ancora1 nao encontrada (docPhotosHeight)")
src = src.replace(ancora1, "    const docPhotosHeight = hasDocPhotos ? 236 : 0;", 1)

# 2) Secao 4 (documento): fotos maiores e mais legiveis, com separador claro
# em relacao a secao 3 (selfies), e rotulos curtos para nao colidir com o
# selo "EVIDENCIA".
ancora2 = """    // SEÇÃO 4: EVIDÊNCIA COMPLEMENTAR — DOCUMENTO DE IDENTIFICAÇÃO (FRENTE/VERSO)
    if (hasDocPhotos) {
      if (hasPhotos) cursor -= 155 + 12;
      page.drawText('4. DOCUMENTO DE IDENTIFICAÇÃO (EVIDÊNCIA COMPLEMENTAR)', {
        x: padX,
        y: cursor,
        size: 7.2,
        font: bold,
        color: navy,
      });

      const docPhotoLabels: Array<[string, string | null]> = [
        ['Frente do documento', signer.documentFrontImage],
        ['Verso do documento', signer.documentBackImage],
      ].filter(([, img]) => Boolean(img)) as Array<[string, string | null]>;

      const docBoxW = 150;
      const docBoxH = 118;
      const docCardH = 138;
      const docGap = 24;
      const docPhotosTotalWidth = docBoxW * docPhotoLabels.length + docGap * Math.max(0, docPhotoLabels.length - 1);
      let docPhotoX = padX + Math.max(0, (innerWidth - docPhotosTotalWidth) / 2);

      for (const [label, img] of docPhotoLabels) {
        const embedded = await embedBase64Image(pdfDoc, img, { width: 900, height: 620 });
        const cardY = cursor - docCardH - 12;

        page.drawRectangle({
          x: docPhotoX - 2,
          y: cardY - 2,
          width: docBoxW + 4,
          height: docCardH + 4,
          borderWidth: 0,
          color: navy,
        });
        page.drawRectangle({ x: docPhotoX - 2, y: cardY + docCardH - 2, width: docBoxW + 4, height: 3, color: gold });
        const docImgFrameH = docBoxH - 22;
        page.drawRectangle({ x: docPhotoX, y: cardY + 40, width: docBoxW, height: docImgFrameH, color: rgb(0.88, 0.92, 0.97) });

        if (embedded) {
          const imgW = embedded.width;
          const imgH = embedded.height;
          const scale = Math.min(docBoxW / imgW, docImgFrameH / imgH);
          const drawW = Math.round(imgW * scale);
          const drawH = Math.round(imgH * scale);

          const offsetX = docPhotoX + (docBoxW - drawW) / 2;
          const offsetY = cardY + 40 + (docImgFrameH - drawH) / 2;

          page.drawImage(embedded, {
            x: offsetX,
            y: offsetY,
            width: drawW,
            height: drawH,
          });
        }

        page.drawText(safeText(label, 40).toUpperCase(), {
          x: docPhotoX + 5,
          y: cardY + 9,
          size: 5.8,
          font: bold,
          color: rgb(1, 1, 1),
        });
        page.drawRectangle({ x: docPhotoX + docBoxW - 76, y: cardY + 5, width: 70, height: 12, color: paleGreen });
        page.drawText('EVIDÊNCIA', { x: docPhotoX + docBoxW - 72, y: cardY + 8, size: 4.8, font: bold, color: green });
        docPhotoX += docBoxW + docGap;
      }
    }"""
exigir(ancora2 in src, "ancora2 nao encontrada (secao documento completa)")

novo2 = """    // SEÇÃO 4: EVIDÊNCIA COMPLEMENTAR — DOCUMENTO DE IDENTIFICAÇÃO (FRENTE/VERSO)
    if (hasDocPhotos) {
      if (hasPhotos) {
        // Separador visual claro entre o topico "prova de presença" (selfies)
        // e o topico "documento de identificação" - nunca misturados.
        cursor -= 155 + 14;
        page.drawLine({ start: { x: padX, y: cursor + 8 }, end: { x: padX + innerWidth, y: cursor + 8 }, thickness: 0.6, color: panelBorder });
        cursor -= 8;
      }
      page.drawText('4. DOCUMENTO DE IDENTIFICAÇÃO (EVIDÊNCIA COMPLEMENTAR)', {
        x: padX,
        y: cursor,
        size: 7.2,
        font: bold,
        color: navy,
      });

      const docPhotoLabels: Array<[string, string | null]> = [
        ['Frente', signer.documentFrontImage],
        ['Verso', signer.documentBackImage],
      ].filter(([, img]) => Boolean(img)) as Array<[string, string | null]>;

      // Fotos bem maiores e mais legíveis que as selfies, já que o documento
      // precisa ser conferível a olho nu pelo escritório.
      const docBoxW = 210;
      const docBoxH = 170;
      const docCardH = 192;
      const docGap = 24;
      const docPhotosTotalWidth = docBoxW * docPhotoLabels.length + docGap * Math.max(0, docPhotoLabels.length - 1);
      let docPhotoX = padX + Math.max(0, (innerWidth - docPhotosTotalWidth) / 2);

      for (const [label, img] of docPhotoLabels) {
        const embedded = await embedBase64Image(pdfDoc, img, { width: 1400, height: 900 });
        const cardY = cursor - docCardH - 14;

        page.drawRectangle({
          x: docPhotoX - 2,
          y: cardY - 2,
          width: docBoxW + 4,
          height: docCardH + 4,
          borderWidth: 0,
          color: navy,
        });
        page.drawRectangle({ x: docPhotoX - 2, y: cardY + docCardH - 2, width: docBoxW + 4, height: 3, color: gold });
        const docImgFrameH = docBoxH - 22;
        page.drawRectangle({ x: docPhotoX, y: cardY + 44, width: docBoxW, height: docImgFrameH, color: rgb(0.88, 0.92, 0.97) });

        if (embedded) {
          const imgW = embedded.width;
          const imgH = embedded.height;
          const scale = Math.min(docBoxW / imgW, docImgFrameH / imgH);
          const drawW = Math.round(imgW * scale);
          const drawH = Math.round(imgH * scale);

          const offsetX = docPhotoX + (docBoxW - drawW) / 2;
          const offsetY = cardY + 44 + (docImgFrameH - drawH) / 2;

          page.drawImage(embedded, {
            x: offsetX,
            y: offsetY,
            width: drawW,
            height: drawH,
          });
        }

        page.drawText(safeText(label, 40).toUpperCase(), {
          x: docPhotoX + 8,
          y: cardY + 12,
          size: 7,
          font: bold,
          color: rgb(1, 1, 1),
        });
        page.drawRectangle({ x: docPhotoX + docBoxW - 82, y: cardY + 7, width: 74, height: 15, color: paleGreen });
        page.drawText('EVIDÊNCIA', { x: docPhotoX + docBoxW - 77, y: cardY + 11, size: 5.6, font: bold, color: green });
        docPhotoX += docBoxW + docGap;
      }
    }"""

src = src.replace(ancora2, novo2, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch39 aplicado (tamanho {orig_len} -> {len(src)})")
