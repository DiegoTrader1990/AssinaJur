# Selos em páginas giradas e recortadas

Implementação local: o posicionamento MULTI usa a interseção de CropBox/MediaBox e a rotação da página, correspondendo às coordenadas visuais usadas pelo editor PDF.js. A transformação se aplica somente ao desenho dos selos e é encerrada após cada página. O conteúdo original e a estrutura do banco não são alterados.

A revisão exibe aviso quando caixas de selos na mesma página se sobrepõem. A comparação desconsidera apenas contato de bordas; caixas em páginas distintas não geram aviso. O aviso não bloqueia o envio e não detecta colisão com o texto da minuta.

Validação: 35 verificações de geometria, vínculos e selos aprovadas. Oito PDFs fictícios gerados. Primeiras páginas de PDFs com rotação de 90, 180 e 270 graus e recorte com origem deslocada renderizadas e inspecionadas visualmente. Compilação final registrada em evidencias/geometria-build.txt.

Limites: esta correção atende aos selos MULTI do editor atual. Formatos antigos CUSTOM e carimbos fixos mantêm seu comportamento. Não regenera documentos aprovados. Permanecem pendentes a verificação de legibilidade de selos muito pequenos e os demais itens da auditoria de imagens, kits e operação multiempresa.

Publicação pendente de confirmação de acesso ao painel: a revisão automática bloqueou anteriormente a consulta à Vercel. Não declarar esta entrega em produção sem confirmação.
