# Legibilidade dos selos — entrega incremental

O gerador MULTI deixa de reduzir o texto abaixo de 6 pontos. Se a identificação completa não couber, mantém um QR no local e, havendo espaço, a indicação do número do signatário e da folha de assinaturas. Os dados completos permanecem na folha e no certificado. O selo não é ampliado para fora da posição escolhida.

O editor mostra orientação para aumentar largura/altura quando as dimensões físicas da caixa indicam espaço reduzido. Esse aviso é uma estimativa conservadora, não uma reprodução exata da composição final. Em caixas fisicamente minúsculas, nem o QR pode ter leitura garantida; deve-se aumentar o selo.

Validação: nove PDFs fictícios gerados, cenário com caixas de 22% por 7% inspecionado visualmente, conferindo identificação extensa e testemunhas em formato compacto. 35 verificações de selos existentes passaram. Compilação e testes de segurança em evidencias/legibilidade-build.txt.

Sem migração, escrita de teste no banco real ou regeneração de documentos aprovados.
