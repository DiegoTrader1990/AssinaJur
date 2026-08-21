from pathlib import Path
import pdfplumber
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(r"C:\Users\diego\OneDrive\Área de Trabalho\Rodrigues  $ Soares - Advocacia\AssinaJur")
OUT = ROOT / "output" / "pdf" / "previa-novo-certificado-assinajur.pdf"
SELFIE = ROOT / "tmp" / "pdfs" / "preview-selfie.png"
SOURCE = Path(r"C:\Users\diego\OneDrive\Área de Trabalho\Contrato de Honorários Advocatícios - Prev. (Kit Prev. INSS)_ASSINADO.pdf")
LETTERHEAD = ROOT / "papel_timbrado_certificado.png"

with pdfplumber.open(SOURCE) as pdf:
    # Imagem de demonstração extraída do certificado atual, apenas para avaliar o novo layout.
    pdf.pages[2].crop((260, 590, 335, 721)).to_image(resolution=220).save(SELFIE, "PNG")

width, height = A4
navy = HexColor("#071B3A")
gold = HexColor("#D4AF37")
muted = HexColor("#64748B")
green = HexColor("#059669")
line = HexColor("#CBD5E1")
white = HexColor("#FFFFFF")

c = canvas.Canvas(str(OUT), pagesize=A4)
c.drawImage(ImageReader(str(LETTERHEAD)), 0, 0, width=width, height=height)

# Margem de segurança mais generosa, inclusive para leitores de PDF em celular.
left = 62
right = width - 62
c.setFont("Helvetica-Bold", 7.5)
c.setFillColor(navy)
c.drawRightString(right, height - 38, "PRÉVIA - CERTIFICADO DE EVIDÊNCIAS JURÍDICAS")
c.setFont("Helvetica-Bold", 14)
c.drawCentredString(width / 2, height - 118, "Contrato de Prestação de Serviços Advocatícios")
c.setFont("Courier", 7.5)
c.setFillColor(muted)
c.drawString(left, height - 154, "Código de Autenticidade: AJ-TEST-2026")
c.drawString(left, height - 166, "ID completo: prévia de composição visual")

# Faixa de identificação
c.setStrokeColor(line)
c.setLineWidth(.8)
c.line(left, height - 181, right, height - 181)
c.setFont("Helvetica-Bold", 8)
c.setFillColor(navy)
c.drawString(left, height - 203, "2. DADOS DO SIGNATÁRIO - CLIENTE / OUTORGANTE")
c.setFont("Helvetica-Bold", 6.2)
c.setFillColor(muted)
c.drawString(left, height - 226, "NOME COMPLETO")
c.drawString(320, height - 226, "CPF COMPLETO")
c.setFont("Helvetica-Bold", 9)
c.setFillColor(navy)
c.drawString(left, height - 240, "Domingos Lopes dos Santos")
c.drawString(320, height - 240, "071.890.985-26")
c.setFont("Helvetica-Bold", 6.2)
c.setFillColor(muted)
c.drawString(left, height - 265, "MÉTODO DE AUTENTICAÇÃO")
c.setFont("Helvetica", 7.7)
c.setFillColor(navy)
c.drawString(left, height - 279, "CPF + documento fotografado + selfie com documento + geolocalização")

# Nova seção de presença.
section_y = height - 319
c.setStrokeColor(gold)
c.setLineWidth(1.4)
c.line(left, section_y, right, section_y)
c.setFont("Helvetica-Bold", 8)
c.setFillColor(navy)
c.drawString(left, section_y - 17, "3. PROVA DE PRESENÇA (SELFIE COM DOCUMENTO DE IDENTIFICAÇÃO)")

card_x, card_y, card_w, card_h = 104, 150, 388, 228
c.setFillColor(Color(1, 1, 1, alpha=.80))
c.setStrokeColor(line)
c.setLineWidth(.9)
c.roundRect(card_x, card_y, card_w, card_h, 8, fill=1, stroke=1)
c.setFillColor(gold)
c.roundRect(card_x, card_y + card_h - 5, card_w, 5, 4, fill=1, stroke=0)

photo_x, photo_y, photo_w, photo_h = card_x + 18, card_y + 18, 176, 184
c.setFillColor(navy)
c.roundRect(photo_x - 2, photo_y - 2, photo_w + 4, photo_h + 4, 3, fill=1, stroke=0)
c.setFillColor(HexColor("#F1F5F9"))
c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
c.drawImage(ImageReader(str(SELFIE)), photo_x, photo_y, width=photo_w, height=photo_h, preserveAspectRatio=True, anchor="c", mask="auto")

detail_x = photo_x + photo_w + 22
c.setFont("Helvetica-Bold", 7.4)
c.setFillColor(navy)
c.drawString(detail_x, card_y + 177, "REGISTRO DE PRESENÇA")
c.setFont("Helvetica-Bold", 6.2)
c.setFillColor(muted)
c.drawString(detail_x, card_y + 162, "SELFIE COM DOCUMENTO")
c.setStrokeColor(line)
c.setLineWidth(.6)
c.line(detail_x, card_y + 151, card_x + card_w - 18, card_y + 151)
c.setFont("Helvetica-Bold", 5.9)
c.setFillColor(muted)
c.drawString(detail_x, card_y + 132, "IDENTIDADE E PRESENÇA")
c.setFont("Helvetica-Bold", 7.3)
c.setFillColor(navy)
c.drawString(detail_x, card_y + 119, "Confirmadas na sessão")
c.setFont("Helvetica-Bold", 5.9)
c.setFillColor(muted)
c.drawString(detail_x, card_y + 92, "QUALIDADE DA IMAGEM")
c.setFont("Helvetica", 7)
c.setFillColor(navy)
c.drawString(detail_x, card_y + 79, "Registro preservado")
c.setFillColor(HexColor("#ECFDF5"))
c.setStrokeColor(green)
c.roundRect(detail_x, card_y + 36, 146, 25, 5, fill=1, stroke=1)
c.setFont("Helvetica-Bold", 6.4)
c.setFillColor(green)
c.drawString(detail_x + 10, card_y + 45, "EVIDÊNCIA VINCULADA")
c.setFont("Helvetica", 5.8)
c.setFillColor(muted)
c.drawString(card_x + 18, card_y + 7, "Imagem original preservada no certificado de evidências.")

c.setFont("Helvetica-Oblique", 7)
c.setFillColor(muted)
c.drawCentredString(width / 2, 90, "Prévia visual - dados demonstrativos; não corresponde a um certificado emitido.")
c.save()
print(OUT)
