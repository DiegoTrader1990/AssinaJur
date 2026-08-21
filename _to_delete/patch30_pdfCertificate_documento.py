import sys

path = "src/lib/pdfCertificate.ts"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Certificado compacto (layout fixo em pixels) deve ser evitado quando há
# fotos de documento, pois esse layout não tem espaço reservado para elas.
ancora1 = "  const compactCertificate = doc.signers.length === 1 && !doc.isIlliterate;"
exigir(ancora1 in src, "ancora1 nao encontrada (compactCertificate)")
novo1 = (
    "  const hasAnyDocumentPhotos = doc.signers.some((s) => s.documentFrontImage || s.documentBackImage);\n"
    "  const compactCertificate = doc.signers.length === 1 && !doc.isIlliterate && !hasAnyDocumentPhotos;"
)
src = src.replace(ancora1, novo1, 1)

# 2) Reservar altura no painel do signatário quando houver fotos de documento.
ancora2 = "    const photosHeight = hasPhotos ? 155 : 0;\n    const panelH = 32 + dataHeight + photosHeight + 8;"
exigir(ancora2 in src, "ancora2 nao encontrada (photosHeight/panelH)")
novo2 = (
    "    const hasDocPhotos = Boolean(signer.documentFrontImage || signer.documentBackImage);\n"
    "    const photosHeight = hasPhotos ? 155 : 0;\n"
    "    const docPhotosHeight = hasDocPhotos ? 155 : 0;\n"
    "    const panelH = 32 + dataHeight + photosHeight + docPhotosHeight + 8;"
)
src = src.replace(ancora2, novo2, 1)

# 3) Desenhar a seção de evidência do documento logo após a seção das 3 selfies,
# antes de fechar o painel do signatário (y = pY - 14).
ancora3 = """        photoX += boxW + gap;
      }
    }

    y = pY - 14;
  }"""
exigir(ancora3 in src, "ancora3 nao encontrada (fechamento do painel do signatario)")
novo3 = """        photoX += boxW + gap;
      }
    }

    // SEÇÃO 4: EVIDÊNCIA COMPLEMENTAR — DOCUMENTO DE IDENTIFICAÇÃO (FRENTE/VERSO)
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
    }

    y = pY - 14;
  }"""
src = src.replace(ancora3, novo3, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch30 aplicado (tamanho {orig_len} -> {len(src)})")
