from pathlib import Path
import re
from html import escape
from pypdf import PdfReader
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
source=Path(r'C:/Users/diego/OneDrive/Área de Trabalho/Procuração Ad Judicia (Kit Previdenciário Completo)_ASSINADO.pdf')
text=re.sub(r'\s+', ' ', PdfReader(source).pages[0].extract_text()).strip()
text=re.sub(r'\s+,', ',', text)
start=text.index('OUTORGANTE:')
powers=text.index('PODERES GERAIS:')
special=text.index('PODERES ESPECIAIS:')
limit=text.index('O mandato não autoriza')
date=text.index('Duque de Caxias/RJ, 08')
end=date+len('Duque de Caxias/RJ, 08 de setembro de 2026.')
parts=[text[start:powers].strip(),
'OUTORGADOS: DIEGO DOS SANTOS RODRIGUES, advogado, inscrito na OAB/BA sob o nº 51.881, e DOMINICK QUINTO SOARES, advogada, inscrita na OAB/BA sob o nº 62.443, com escritório profissional na Rua José Rodrigues, nº 219, Centro, Porto Seguro/BA, CEP 45810-000.',
text[powers:special].strip(),text[special:limit].strip(),text[limit:date].strip(),text[date:end].strip()]
out=Path('output/pdf/Procuracao_com_outorgados_MINUTA_NAO_ASSINADA.pdf')
navy=HexColor('#182c45');amber=HexColor('#975600')
body=ParagraphStyle('body',fontName='Helvetica',fontSize=10.5,leading=14.5,alignment=TA_JUSTIFY,spaceAfter=11,textColor=HexColor('#202020'))
title=ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=15,leading=19,alignment=TA_CENTER,spaceAfter=22,textColor=navy)
footer=ParagraphStyle('signature',fontName='Helvetica',fontSize=10.5,leading=15,spaceBefore=22)
def page(canvas,doc):
 w,h=A4
 canvas.saveState()
 canvas.setFillColor(HexColor('#fff4dc'));canvas.rect(42,h-69,w-84,28,fill=1,stroke=0)
 canvas.setFillColor(amber);canvas.setFont('Helvetica-Bold',10)
 canvas.drawCentredString(w/2,h-58,'MINUTA PARA CONFERÊNCIA - NÃO ASSINADA')
 canvas.setStrokeColor(HexColor('#c4cbd4'));canvas.line(52,60,w-52,60)
 canvas.setFont('Helvetica',8);canvas.setFillColor(navy)
 canvas.drawString(52,45,'Cópia de avaliação com inclusão dos outorgados. Sem certificado de assinatura.')
 canvas.drawRightString(w-52,31,f'Página {doc.page}')
 canvas.setFont('Helvetica',7.5);canvas.drawString(52,31,'Data do texto original mantida somente para comparação.')
 canvas.restoreState()
story=[Paragraph('PROCURAÇÃO',title)]
for part in parts:
 html=escape(part)
 for label in ['OUTORGANTE:','OUTORGADOS:','PODERES GERAIS:','PODERES ESPECIAIS:']:
  html=html.replace(label,'<b>'+label+'</b>')
 for name in ['MICHELE DA SILVA DOS SANTOS','ELVINA ANTONIA DA SILVA','DIEGO DOS SANTOS RODRIGUES','DOMINICK QUINTO SOARES']:
  html=html.replace(name,'<b>'+name+'</b>')
 story.append(Paragraph(html,body))
story.append(Paragraph('<b>MICHELE DA SILVA DOS SANTOS</b><br/>Outorgante<br/><font size="9" color="#975600">Versão de avaliação - sem assinatura</font>',footer))
SimpleDocTemplate(str(out),pagesize=A4,rightMargin=52,leftMargin=52,topMargin=95,bottomMargin=85,title='Procuração com outorgados - MINUTA NÃO ASSINADA',author='Minuta para conferência').build(story,onFirstPage=page,onLaterPages=page)
r=PdfReader(out);content=' '.join(p.extract_text() for p in r.pages)
assert len(r.pages)==1
for name in ['DIEGO DOS SANTOS RODRIGUES','DOMINICK QUINTO SOARES','51.881','62.443','NÃO ASSINADA']:
 assert name in content,name
assert 'AJ-QFQL-SX2Y' not in content
assert 'CERTIFICADO DE EVID' not in content
print(str(out.resolve()))
print('Verificado: 1 página; ambos os outorgados e OABs; sem selo ou certificado antigo.')
