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

# 1) Papel timbrado estilo cartorio: moldura dupla dourada/navy, marca d'agua
# discreta e cantos ornamentados em todas as paginas do certificado.
ancora1 = """  const drawFrame = (p: PDFPage, subtitle: string) => {
    const cleanSubtitle = safeText(subtitle, 120);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: paperBg });
    p.drawRectangle({ x: 20, y: 20, width: 555.28, height: 801.89, borderWidth: 1.2, borderColor: panelBorder });
    p.drawRectangle({ x: 20, y: 760, width: 555.28, height: 61.89, color: navy });"""
exigir(ancora1 in src, "ancora1 nao encontrada (drawFrame)")
novo1 = """  const drawFrame = (p: PDFPage, subtitle: string) => {
    const cleanSubtitle = safeText(subtitle, 120);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: paperBg });

    // Marca d'agua discreta, estilo papel timbrado de cartorio.
    p.drawText('ASSINAJUR', {
      x: PAGE_W / 2 - 148,
      y: PAGE_H / 2 - 36,
      size: 60,
      font: bold,
      color: navy,
      opacity: 0.035,
      rotate: degrees(38),
    });

    // Moldura dupla dourada/navy, ao estilo de certificado notarial.
    p.drawRectangle({ x: 15, y: 15, width: PAGE_W - 30, height: PAGE_H - 30, borderWidth: 1.3, borderColor: gold });
    p.drawRectangle({ x: 20, y: 20, width: 555.28, height: 801.89, borderWidth: 1.2, borderColor: panelBorder });
    p.drawRectangle({ x: 23, y: 23, width: PAGE_W - 46, height: PAGE_H - 46, borderWidth: 0.6, borderColor: gold, opacity: 0.5 });

    // Cantos ornamentados discretos.
    const cornerTick = (cx: number, cy: number, sx: number, sy: number) => {
      p.drawLine({ start: { x: cx, y: cy }, end: { x: cx + 13 * sx, y: cy }, thickness: 1.1, color: gold });
      p.drawLine({ start: { x: cx, y: cy }, end: { x: cx, y: cy + 13 * sy }, thickness: 1.1, color: gold });
    };
    cornerTick(15, 15, 1, 1);
    cornerTick(PAGE_W - 15, 15, -1, 1);
    cornerTick(15, PAGE_H - 15, 1, -1);
    cornerTick(PAGE_W - 15, PAGE_H - 15, -1, -1);

    p.drawRectangle({ x: 20, y: 760, width: 555.28, height: 61.89, color: navy });"""
src = src.replace(ancora1, novo1, 1)

# 2) Nome exibido no certificado nao deve trazer o sufixo "(Kit ...)" do
# template de origem - o nome do kit e util nas telas internas, mas polui o
# cabecalho do certificado.
ancora2 = "  const PAGE_W = 595.28; // A4 width"
exigir(ancora2 in src, "ancora2 nao encontrada (PAGE_W)")
novo2 = """  const certDisplayTitle = (String(doc.title || '').replace(/\\s*\\(kit[^)]*\\)\\s*$/i, '').trim()) || doc.title;

  const PAGE_W = 595.28; // A4 width"""
src = src.replace(ancora2, novo2, 1)

ancora2b = "  const certificateTitleLines = wrapTextToWidth(doc.title, bold, 11.5, 330);"
exigir(ancora2b in src, "ancora2b nao encontrada (certificateTitleLines)")
src = src.replace(ancora2b, "  const certificateTitleLines = wrapTextToWidth(certDisplayTitle, bold, 11.5, 330);", 1)

ancora2c = "        const timelineTitleLines = wrapTextToWidth(doc!.title, bold, 11, CW);"
exigir(ancora2c in src, "ancora2c nao encontrada (timelineTitleLines)")
src = src.replace(ancora2c, "        const timelineTitleLines = wrapTextToWidth(certDisplayTitle, bold, 11, CW);", 1)

# 3) Corrige a colisao de numeracao: a nova secao 4 (documento) tinha o mesmo
# numero da secao de hash. Renumera as secoes finais em cascata.
ancora3a = "    // SEÇÃO 4: EVIDÊNCIA COMPLEMENTAR — DOCUMENTO DE IDENTIFICAÇÃO (FRENTE/VERSO)"
exigir(ancora3a in src, "ancora3a nao encontrada")
# (mantido - ja e a secao 4, correta)

ancora3b = "  page.drawText('4. REGISTRO DE INTEGRIDADE E HASH SHA-256 COMPLETO', { x: padX, y: integTop - 15, size: 7.5, font: bold, color: rgb(1, 1, 1) });"
exigir(ancora3b in src, "ancora3b nao encontrada (hash header)")
src = src.replace(
    ancora3b,
    "  page.drawText('5. REGISTRO DE INTEGRIDADE E HASH SHA-256 COMPLETO', { x: padX, y: integTop - 15, size: 7.5, font: bold, color: rgb(1, 1, 1) });",
    1,
)

ancora3c = "  page.drawText('5. VALIDAÇÃO PÚBLICA E CONFORMIDADE LEGAL', { x: padX, y: validationTop - 17, size: 7.7, font: bold, color: rgb(1, 1, 1) });"
exigir(ancora3c in src, "ancora3c nao encontrada (validacao publica header)")
src = src.replace(
    ancora3c,
    "  page.drawText('6. VALIDAÇÃO PÚBLICA E CONFORMIDADE LEGAL', { x: padX, y: validationTop - 17, size: 7.7, font: bold, color: rgb(1, 1, 1) });",
    1,
)

ancora3d = "        p.drawText('6. TRILHA CRONOLÓGICA DE EVIDÊNCIAS', { x: CX, y: y - 10, size: 8, font: bold, color: navy });"
exigir(ancora3d in src, "ancora3d nao encontrada (trilha reuse header)")
src = src.replace(
    ancora3d,
    "        p.drawText('7. TRILHA CRONOLÓGICA DE EVIDÊNCIAS', { x: CX, y: y - 10, size: 8, font: bold, color: navy });",
    1,
)

ancora3e = "        drawFrame(p, `6. TRILHA PÚBLICA DE EVENTOS${timelinePageCount > 1 ? ' - CONTINUAÇÃO' : ''}`);"
exigir(ancora3e in src, "ancora3e nao encontrada (trilha nova pagina header)")
src = src.replace(
    ancora3e,
    "        drawFrame(p, `7. TRILHA PÚBLICA DE EVENTOS${timelinePageCount > 1 ? ' - CONTINUAÇÃO' : ''}`);",
    1,
)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch38 aplicado (tamanho {orig_len} -> {len(src)})")
