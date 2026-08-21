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

# 1) Selfies (prova de presença): reduz a faixa azul do rodapé do cartão para
# dar mais espaço a foto em si, sem mudar o tamanho geral do cartão.
ancora1 = """        const imgFrameH = boxH - 22;
        page.drawRectangle({ x: photoX, y: cardY + 40, width: boxW, height: imgFrameH, color: rgb(0.88, 0.92, 0.97) });"""
exigir(ancora1 in src, "ancora1 nao encontrada (selfie imgFrameH)")
src = src.replace(
    ancora1,
    """        const imgFrameH = boxH - 8;
        page.drawRectangle({ x: photoX, y: cardY + 22, width: boxW, height: imgFrameH, color: rgb(0.88, 0.92, 0.97) });""",
    1,
)

ancora1b = "          const offsetY = cardY + 40 + (imgFrameH - drawH) / 2;"
exigir(ancora1b in src, "ancora1b nao encontrada (selfie offsetY)")
src = src.replace(ancora1b, "          const offsetY = cardY + 22 + (imgFrameH - drawH) / 2;", 1)

# 2) Documento (frente/verso): mesma logica - menos faixa azul, mais foto.
ancora2 = """        const docImgFrameH = docBoxH - 22;
        page.drawRectangle({ x: docPhotoX, y: cardY + 44, width: docBoxW, height: docImgFrameH, color: rgb(0.88, 0.92, 0.97) });"""
exigir(ancora2 in src, "ancora2 nao encontrada (doc docImgFrameH)")
src = src.replace(
    ancora2,
    """        const docImgFrameH = docBoxH - 8;
        page.drawRectangle({ x: docPhotoX, y: cardY + 26, width: docBoxW, height: docImgFrameH, color: rgb(0.88, 0.92, 0.97) });""",
    1,
)

ancora2b = "          const offsetY = cardY + 44 + (docImgFrameH - drawH) / 2;"
exigir(ancora2b in src, "ancora2b nao encontrada (doc offsetY)")
src = src.replace(ancora2b, "          const offsetY = cardY + 26 + (docImgFrameH - drawH) / 2;", 1)

# 3) A cor do fundo do quadro de imagem (visivel quando a proporcao da foto
# nao preenche o quadro) era um azul claro - trocada por um cinza neutro quase
# branco, para nunca parecer uma "faixa azul" cobrindo a foto.
ocorrencias_placeholder = src.count("color: rgb(0.88, 0.92, 0.97) });")
exigir(ocorrencias_placeholder >= 2, f"esperava pelo menos 2 ocorrencias do fundo do quadro de foto, encontrou {ocorrencias_placeholder}")
src = src.replace("color: rgb(0.88, 0.92, 0.97) });", "color: rgb(0.96, 0.96, 0.97) });")

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch40 aplicado (tamanho {orig_len} -> {len(src)})")
