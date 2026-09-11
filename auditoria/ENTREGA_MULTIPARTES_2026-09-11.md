# Entrega incremental — múltiplas partes e qualificação

## Implementado
- Partes adicionais com qualificação completa e denominação livre no documento.
- Acompanhante a rogo vinculado individualmente a cada parte, no mesmo aparelho.
- Ordenação dos participantes no envio e certificado: partes com seus acompanhantes, testemunhas ao final.
- Links das partes em kits e proteção contra uso do acompanhante de outra parte.
- Frente, verso e selfie obrigatórios para concluir cada participação.
- Qualificações e vínculos registrados como metadados do envio, preservados no novo envio criado a partir de um aprovado. Sem alteração de estrutura do banco.
- Campos automáticos preservados na edição do modelo do kit e inserção explícita da qualificação de partes adicionais.
- Recusas definitivas ao salvar fotos deixam de oferecer repetição interminável; respostas sem JSON recebem mensagem compreensível.

## Validação realizada
- Build completo aprovado e 73 testes de segurança aprovados.
- Banco PostgreSQL local vazio, pessoas fictícias: 28 verificações gerais e 124 do fluxo de revisão/assinatura aprovadas; nenhum provedor externo chamado.
- 27 verificações de selos, vínculos, ordenação e qualificação aprovadas, incluindo nascimento impossível e campos faltantes.
- Quatro PDFs fictícios gerados, incluindo dois pares a rogo e cenário com doze participantes. Página com qualificação completa inspecionada visualmente.
- Comparação somente por leitura com backup recuperável: 25 tabelas sem diferenças, 20 clientes, 12 documentos, 8 concluídos, 2 lotes concluídos, 25 registros de arquivos.
- Backup utilizado: snapshot-2026-09-10T20-37-06Z; restauração local previamente verificada.

## Pendências da auditoria — não declarar pronto para venda
- Verificação completa do editor e certificados para PDFs rotacionados/recortados, sobreposição e selos pequenos.
- Validação de integridade real dos arquivos de imagem no servidor: presença de texto não comprova imagem válida nem identidade.
- Testes físicos das câmeras e retomada com rede instável em celulares diferentes.
- Robustez da criação do kit e finalização de PDFs sob falhas parciais/tempo excedido.
- Unificação restante da composição de modelos e revisão das configurações específicas de escritório para comercialização multiempresa.
- Revisão final dos demais itens de segurança/operação da auditoria. CPF completo e conferência manual mantidos conforme decisão do usuário; não impor OTP ou mascaramento sem nova decisão.

## Publicação
Este registro descreve o código e as verificações locais. Confirmar o estado Ready da implantação correspondente antes de anunciar que está em produção.
