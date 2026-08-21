from pathlib import Path
import pdfplumber
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(r"C:\Users\diego\OneDrive\Área de Trabalho\Rodrigues  $ Soares - Advocacia\AssinaJur")
SOURCE = Path(r"C:\Users\diego\OneDrive\Área de Trabalho\Contrato de Honorários Advocatícios - Prev. (Kit Prev. INSS)_ASSINADO.pdf")
OUT = ROOT / "output" / "pdf" / "PREVIA_CONTRATO_FRANCISCO_NOVO_CERTIFICADO.pdf"
WORK = ROOT / "tmp" / "pdfs"
CERT = WORK / "certificado-francisco-preview.pdf"
SELFIE = WORK / "francisco-selfie.png"
DOC_FRONT = WORK / "francisco-doc-frente.png"
DOC_BACK = WORK / "francisco-doc-verso.png"
LETTERHEAD = ROOT / "papel_timbrado_certificado.png"

with pdfplumber.open(SOURCE) as source:
    # Os recortes são extraídos do certificado original somente para esta prévia.
    source.pages[2].crop((142, 585, 235, 726)).to_image(resolution=240).save(SELFIE, "PNG")
    source.pages[4].crop((128, 164, 468, 387)).to_image(resolution=180).save(DOC_FRONT, "PNG")
    source.pages[4].crop((128, 404, 468, 627)).to_image(resolution=180).save(DOC_BACK, "PNG")

W, H = A4
navy, gold, muted, green, line = HexColor("#071B3A"), HexColor("#D4AF37"), HexColor("#64748B"), HexColor("#059669"), HexColor("#CBD5E1")
left, right = 62, W - 62

def background(c, subtitle):
    c.drawImage(ImageReader(str(LETTERHEAD)), 0, 0, width=W, height=H)
    c.setFont("Helvetica-Bold", 7.2)
    c.setFillColor(navy)
    c.drawRightString(right, H - 37, subtitle)

def text(c, value, x, y, font="Helvetica", size=8, color=navy):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, y, value)

c = canvas.Canvas(str(CERT), pagesize=A4)
background(c, "CERTIFICADO DE EVIDÊNCIAS JURÍDICAS - PRÉVIA")
c.setFont("Helvetica-Bold", 13.5)
c.setFillColor(navy)
c.drawCentredString(W / 2, H - 112, "Contrato de Honorários Advocatícios - Previdenciário")
text(c, "Código de Autenticidade: AJ-KBWR-G5GA", left, H - 145, "Courier", 7.5, muted)
text(c, "Documento: prévia de reorganização do certificado", left, H - 157, "Courier", 7, muted)
c.setStrokeColor(line); c.setLineWidth(.8); c.line(left, H - 174, right, H - 174)

text(c, "1. IDENTIFICAÇÃO DO DOCUMENTO", left, H - 198, "Helvetica-Bold", 8)
text(c, "ESCRITÓRIO RESPONSÁVEL", left, H - 219, "Helvetica-Bold", 6.1, muted)
text(c, "Rodrigues & Soares - Advogados", left, H - 233, "Helvetica-Bold", 8.5)
text(c, "TIPO", 350, H - 219, "Helvetica-Bold", 6.1, muted)
text(c, "Contrato", 350, H - 233, "Helvetica-Bold", 8.5)

c.setStrokeColor(gold); c.setLineWidth(1.35); c.line(left, H - 254, right, H - 254)
text(c, "2. DADOS DO SIGNATÁRIO - CLIENTE / OUTORGANTE", left, H - 272, "Helvetica-Bold", 8)
text(c, "NOME COMPLETO", left, H - 294, "Helvetica-Bold", 6.1, muted)
text(c, "Francisco Edicarlos da Silva", left, H - 308, "Helvetica-Bold", 9)
text(c, "CPF COMPLETO", 350, H - 294, "Helvetica-Bold", 6.1, muted)
text(c, "715.776.194-71", 350, H - 308, "Helvetica-Bold", 9)
text(c, "DATA E HORA DA ASSINATURA", left, H - 330, "Helvetica-Bold", 6.1, muted)
text(c, "19/08/2026 às 15:45:02 (BRT)", left, H - 344, "Helvetica", 8)
text(c, "DISPOSITIVO", 350, H - 330, "Helvetica-Bold", 6.1, muted)
text(c, "Google Chrome (Android)", 350, H - 344, "Helvetica", 8)
text(c, "MÉTODO DE AUTENTICAÇÃO", left, H - 366, "Helvetica-Bold", 6.1, muted)
text(c, "CPF confirmado + documento fotografado + selfie com documento + dados técnicos", left, H - 380, "Helvetica", 7.5)

c.setStrokeColor(gold); c.setLineWidth(1.35); c.line(left, H - 401, right, H - 401)
text(c, "3. PROVA DE PRESENÇA (SELFIE COM DOCUMENTO DE IDENTIFICAÇÃO)", left, H - 419, "Helvetica-Bold", 8)

# Quadro de presença: grande, equilibrado e sem espaços vazios soltos.
card_x, card_y, card_w, card_h = 99, 120, 398, 252
c.setFillColor(Color(1, 1, 1, alpha=.82)); c.setStrokeColor(line); c.setLineWidth(.9)
c.roundRect(card_x, card_y, card_w, card_h, 9, fill=1, stroke=1)
c.setFillColor(gold); c.roundRect(card_x, card_y + card_h - 5, card_w, 5, 4, fill=1, stroke=0)
photo_x, photo_y, photo_w, photo_h = card_x + 18, card_y + 19, 184, 204
c.setFillColor(navy); c.roundRect(photo_x - 2, photo_y - 2, photo_w + 4, photo_h + 4, 3, fill=1, stroke=0)
c.setFillColor(HexColor("#F1F5F9")); c.rect(photo_x, photo_y, photo_w, photo_h, fill=1, stroke=0)
c.drawImage(ImageReader(str(SELFIE)), photo_x, photo_y, width=photo_w, height=photo_h, preserveAspectRatio=True, anchor="c", mask="auto")
detail_x = photo_x + photo_w + 22
text(c, "REGISTRO DE PRESENÇA", detail_x, card_y + 194, "Helvetica-Bold", 8)
text(c, "SELFIE COM DOCUMENTO", detail_x, card_y + 177, "Helvetica-Bold", 6.4, muted)
c.setStrokeColor(line); c.setLineWidth(.6); c.line(detail_x, card_y + 164, card_x + card_w - 18, card_y + 164)
text(c, "IDENTIDADE E PRESENÇA", detail_x, card_y + 142, "Helvetica-Bold", 6, muted)
text(c, "Confirmadas na sessão", detail_x, card_y + 128, "Helvetica-Bold", 7.5)
text(c, "QUALIDADE DA IMAGEM", detail_x, card_y + 100, "Helvetica-Bold", 6, muted)
text(c, "Registro fotográfico preservado", detail_x, card_y + 86, "Helvetica", 7.1)
c.setFillColor(HexColor("#ECFDF5")); c.setStrokeColor(green); c.roundRect(detail_x, card_y + 39, 150, 26, 5, fill=1, stroke=1)
text(c, "EVIDÊNCIA VINCULADA", detail_x + 12, card_y + 49, "Helvetica-Bold", 6.4, green)
text(c, "Imagem original preservada no certificado de evidências.", card_x + 18, card_y + 7, "Helvetica", 5.8, muted)
c.setFont("Helvetica-Oblique", 6.5); c.setFillColor(muted); c.drawCentredString(W/2, 80, "Prévia sem validade jurídica - estrutura visual do novo certificado.")
c.showPage()

# Segunda página: documento de identificação, em leitura clara e sem esmagar o conteúdo.
background(c, "CERTIFICADO DE EVIDÊNCIAS JURÍDICAS - DOCUMENTO")
text(c, "4. DOCUMENTO DE IDENTIFICAÇÃO - CLIENTE / OUTORGANTE", left, H - 130, "Helvetica-Bold", 9)
text(c, "Fotos originais capturadas durante a sessão de assinatura.", left, H - 146, "Helvetica", 7.4, muted)

def document_panel(y, title, image):
    c.setFillColor(Color(1, 1, 1, alpha=.80)); c.setStrokeColor(line); c.setLineWidth(.8)
    c.roundRect(112, y, 371, 230, 8, fill=1, stroke=1)
    c.setFillColor(navy); c.rect(112, y + 200, 371, 30, fill=1, stroke=0)
    text(c, title.upper(), 128, y + 211, "Helvetica-Bold", 7.2, HexColor("#FFFFFF"))
    c.setFillColor(HexColor("#F8FAFC")); c.rect(128, y + 20, 339, 165, fill=1, stroke=0)
    c.drawImage(ImageReader(str(image)), 128, y + 20, width=339, height=165, preserveAspectRatio=True, anchor="c", mask="auto")

document_panel(405, "Frente do documento de identificação", DOC_FRONT)
document_panel(130, "Verso do documento de identificação", DOC_BACK)
c.setFont("Helvetica-Oblique", 6.5); c.setFillColor(muted); c.drawCentredString(W/2, 70, "Prévia sem validade jurídica - imagens usadas apenas para avaliação do layout.")
c.save()

# Mantém as duas páginas contratuais originais e acrescenta somente a nova prévia de certificado.
writer = PdfWriter()
original = PdfReader(str(SOURCE))
for page in original.pages[:2]:
    writer.add_page(page)
new_cert = PdfReader(str(CERT))
for page in new_cert.pages:
    writer.add_page(page)
with open(OUT, "wb") as stream:
    writer.write(stream)
print(OUT)
