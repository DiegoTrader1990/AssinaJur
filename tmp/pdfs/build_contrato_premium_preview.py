from pathlib import Path
import pdfplumber
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

ROOT = Path(r"C:\Users\diego\OneDrive\Área de Trabalho\Rodrigues  $ Soares - Advocacia\AssinaJur")
SRC = Path(r"C:\Users\diego\OneDrive\Área de Trabalho\Contrato de Honorários Advocatícios - Prev. (Kit Prev. INSS)_ASSINADO.pdf")
OUT = ROOT / "output" / "pdf" / "PREVIA_PREMIUM_CONTRATO_FRANCISCO.pdf"
TMP = ROOT / "tmp" / "pdfs"
CERT = TMP / "certificado-francisco-premium.pdf"
SELFIE, FRONT, BACK = TMP / "premium-selfie.png", TMP / "premium-front.png", TMP / "premium-back.png"
PAPER = ROOT / "public" / "certificado" / "papel-timbrado.png"

with pdfplumber.open(SRC) as pdf:
    pdf.pages[2].crop((142, 585, 235, 726)).to_image(resolution=240).save(SELFIE, "PNG")
    pdf.pages[4].crop((128, 164, 468, 387)).to_image(resolution=180).save(FRONT, "PNG")
    pdf.pages[4].crop((128, 404, 468, 627)).to_image(resolution=180).save(BACK, "PNG")

W, H = A4
NAVY, GOLD, INK, MUTED, GREEN, LINE, PALE = (HexColor(x) for x in ["#071B3A", "#C7A13A", "#172033", "#6B7280", "#07875F", "#D9DEE7", "#F6F8FB"])
L, R = 55, W - 55

def base(c, page, label):
    # A moldura cartorial permanece como acabamento externo; o miolo branco
    # mantém a leitura sóbria e evita competir com as evidências.
    if PAPER.exists():
        c.drawImage(ImageReader(str(PAPER)), 0, 0, width=W, height=H, mask="auto")
        c.setFillColor(HexColor("#FFFFFF")); c.rect(42, 42, W - 84, H - 84, fill=1, stroke=0)
    else:
        c.setFillColor(HexColor("#FFFFFF")); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(NAVY); c.rect(0, H - 68, W, 68, fill=1, stroke=0)
    c.setFillColor(GOLD); c.rect(0, H - 72, W, 4, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Helvetica-Bold", 13); c.drawString(L, H - 39, "ASSINAJUR")
    c.setFont("Helvetica", 6.8); c.setFillColor(HexColor("#C9D4E7")); c.drawString(L, H - 52, "ASSINATURA ELETRÔNICA JURÍDICA")
    c.setFont("Helvetica-Bold", 7); c.setFillColor(HexColor("#FFFFFF")); c.drawRightString(R, H - 38, label)
    c.setFont("Helvetica", 6.5); c.setFillColor(MUTED); c.drawString(L, 28, "Prévia de layout - sem validade jurídica")
    c.drawRightString(R, 28, f"Página {page} de 3")

def t(c, s, x, y, font="Helvetica", size=8, color=INK):
    c.setFont(font, size); c.setFillColor(color); c.drawString(x, y, s)

def section(c, number, title, y):
    c.setStrokeColor(GOLD); c.setLineWidth(1.25); c.line(L, y + 11, R, y + 11)
    t(c, f"{number}. {title}", L, y, "Helvetica-Bold", 8.5, NAVY)

def card(c, x, y, w, h):
    c.setFillColor(PALE); c.setStrokeColor(LINE); c.setLineWidth(.7); c.roundRect(x, y, w, h, 8, fill=1, stroke=1)

c = canvas.Canvas(str(CERT), pagesize=A4)
# Página 1: dados + prova de presença
base(c, 1, "CERTIFICADO DE EVIDÊNCIAS JURÍDICAS")
t(c, "Contrato de Honorários Advocatícios - Previdenciário", L, H - 112, "Helvetica-Bold", 15, NAVY)
t(c, "Código de autenticidade  AJ-KBWR-G5GA", L, H - 132, "Courier", 7.3, MUTED)
t(c, "Registro imutável da sessão de assinatura", L, H - 145, "Helvetica", 7.3, MUTED)
section(c, "1", "DADOS DO SIGNATÁRIO", H - 180)
card(c, L, H - 305, R - L, 100)
fields = [("NOME COMPLETO", "Francisco Edicarlos da Silva", L + 16, H - 232), ("CPF", "715.776.194-71", L + 280, H - 232), ("ASSINADO EM", "19/08/2026 às 15:45:02 (BRT)", L + 16, H - 276), ("DISPOSITIVO", "Google Chrome · Android", L + 280, H - 276)]
for label, value, x, y in fields:
    t(c, label, x, y, "Helvetica-Bold", 5.8, MUTED); t(c, value, x, y - 15, "Helvetica-Bold", 8.5, INK)
section(c, "2", "MÉTODO DE AUTENTICAÇÃO", H - 330)
t(c, "CPF confirmado  ·  documento fotografado  ·  selfie com documento  ·  dados técnicos da sessão", L, H - 349, "Helvetica", 7.8, INK)
section(c, "3", "PROVA DE PRESENÇA", H - 382)
t(c, "Selfie com documento de identificação", L, H - 399, "Helvetica", 7.2, MUTED)
card_y = 181
card(c, 84, card_y, 427, 245)
# foto em tamanho principal, integrada ao quadro e sem moldura pesada
c.setFillColor(HexColor("#FFFFFF")); c.setStrokeColor(LINE); c.roundRect(106, card_y + 27, 184, 190, 6, fill=1, stroke=1)
c.drawImage(ImageReader(str(SELFIE)), 112, card_y + 33, width=172, height=178, preserveAspectRatio=True, anchor="c", mask="auto")
t(c, "EVIDÊNCIA FOTOGRÁFICA", 316, card_y + 191, "Helvetica-Bold", 7, NAVY)
t(c, "SELFIE COM DOCUMENTO", 316, card_y + 175, "Helvetica-Bold", 6, MUTED)
c.setStrokeColor(LINE); c.line(316, card_y + 163, 485, card_y + 163)
t(c, "Identidade e presença", 316, card_y + 138, "Helvetica-Bold", 6, MUTED)
t(c, "confirmadas na sessão", 316, card_y + 122, "Helvetica-Bold", 10, INK)
t(c, "Imagem original preservada", 316, card_y + 91, "Helvetica", 7.5, INK)
t(c, "junto aos registros técnicos.", 316, card_y + 79, "Helvetica", 7.5, INK)
c.setFillColor(HexColor("#EAF9F2")); c.setStrokeColor(GREEN); c.roundRect(316, card_y + 38, 156, 28, 5, fill=1, stroke=1)
t(c, "EVIDÊNCIA VINCULADA", 328, card_y + 48, "Helvetica-Bold", 6.5, GREEN)

# Fechamento técnico curto: dá continuidade visual sem transformar a página
# em uma grade pesada e explica como a prova se conecta ao certificado.
t(c, "VÍNCULO DA EVIDÊNCIA", L, 139, "Helvetica-Bold", 7.1, NAVY)
t(c, "A imagem original foi preservada e vinculada ao CPF, data, horário e dados técnicos desta sessão.", L, 125, "Helvetica", 7.2, INK)
t(c, "As imagens do documento de identificação e a trilha cronológica constam nas páginas seguintes.", L, 113, "Helvetica", 7.2, INK)
t(c, "Verificação pública: AJ-KBWR-G5GA", L, 96, "Helvetica-Bold", 7.1, GREEN)
c.showPage()

# Página 2: documento capturado
base(c, 2, "DOCUMENTO DE IDENTIFICAÇÃO")
t(c, "Documento de identificação", L, H - 112, "Helvetica-Bold", 15, NAVY)
t(c, "Imagens capturadas na sessão e vinculadas ao certificado", L, H - 130, "Helvetica", 7.5, MUTED)
def image_card(title, image, y):
    card(c, 85, y, 425, 258)
    c.setFillColor(NAVY); c.roundRect(85, y + 220, 425, 38, 8, fill=1, stroke=0); c.rect(85, y + 220, 425, 20, fill=1, stroke=0)
    t(c, title.upper(), 105, y + 234, "Helvetica-Bold", 7.4, HexColor("#FFFFFF"))
    c.setFillColor(HexColor("#FFFFFF")); c.roundRect(105, y + 20, 385, 180, 5, fill=1, stroke=0)
    c.drawImage(ImageReader(str(image)), 105, y + 20, width=385, height=180, preserveAspectRatio=True, anchor="c", mask="auto")
image_card("Frente do documento de identificação", FRONT, 410)
image_card("Verso do documento de identificação", BACK, 120)
c.showPage()

# Página 3: trilha - cronologia em linha, não tabela
base(c, 3, "TRILHA CRONOLÓGICA DE EVIDÊNCIAS")
t(c, "Trilha cronológica de evidências", L, H - 112, "Helvetica-Bold", 15, NAVY)
t(c, "Eventos relevantes da sessão de Francisco Edicarlos da Silva", L, H - 130, "Helvetica", 7.5, MUTED)
events = [
    ("15:34:32", "Link de assinatura acessado", "Documento disponibilizado para leitura e assinatura."),
    ("15:34:40", "CPF confirmado", "CPF do signatário confirmado na sessão."),
    ("15:34:50", "Câmera autorizada", "Permissão de câmera concedida pelo signatário."),
    ("15:35:31", "Frente do documento capturada", "Registro da frente do documento de identificação."),
    ("15:35:43", "Verso do documento capturado", "Registro do verso do documento de identificação."),
    ("15:35:54", "Prova de presença iniciada", "Início da coleta de evidência facial."),
    ("15:45:02", "Declaração de ciência aceita", "Concordância expressa registrada pelo signatário."),
    ("15:45:02", "Assinatura eletrônica registrada", "Documento concluído e certificado emitido."),
]
line_x, y = 100, H - 180
c.setStrokeColor(LINE); c.setLineWidth(1.2); c.line(line_x, 115, line_x, y + 9)
for time, title, desc in events:
    c.setFillColor(GREEN); c.circle(line_x, y + 2, 4, fill=1, stroke=0)
    t(c, f"19/08/2026 · {time}", 122, y + 4, "Helvetica-Bold", 6.5, MUTED)
    t(c, title, 122, y - 11, "Helvetica-Bold", 8.5, NAVY)
    t(c, desc, 122, y - 25, "Helvetica", 7.4, INK)
    y -= 62
c.setFillColor(PALE); c.setStrokeColor(LINE); c.roundRect(L, 72, R - L, 28, 6, fill=1, stroke=1)
t(c, "Código público de verificação: AJ-KBWR-G5GA", L + 14, 83, "Helvetica-Bold", 7.2, NAVY)
c.save()

writer = PdfWriter()
for page in PdfReader(str(SRC)).pages[:2]: writer.add_page(page)
for page in PdfReader(str(CERT)).pages: writer.add_page(page)
with open(OUT, "wb") as f: writer.write(f)
print(OUT)
