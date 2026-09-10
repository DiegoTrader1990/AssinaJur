# Regras de aprovação e correção — atualização de 09/09/2026

Escopo definido pelo Diego: preservar o fluxo de cliente e assinatura a rogo, manter a exibição do CPF e corrigir os controles de revisão. Documento aprovado permanece intacto; refazer completo cria novo envio. Não foi adicionada retenção obrigatória das fotos rejeitadas.

## Implementação preparada

- Aprovação definitiva no servidor; a ação antiga de desfazer aprovação passa a ser recusada.
- Novos envios de documento/kit aprovado preservam os originais, criam participantes com novos links e sem assinaturas/fotos anteriores, mantêm a modalidade a rogo e a ordem de participação. São envios separados e contam no limite de documentos do plano. Repetir a mesma solicitação não duplica o envio.
- Administrador, advogado e funcionário podem solicitar correção e criar o novo envio; visualizador continua somente para consulta. A aprovação permanece com o administrador, como antes.
- Antes de aprovar, é possível solicitar foto específica ou refazer a assinatura de um documento ou kit. Refazer um documento não aplica sua assinatura aos demais do kit. Kits com documento aprovado não são parcialmente reabertos silenciosamente.
- Aprovação exige assinaturas completas, PDF atualizado e ausência de foto solicitada ainda pendente. A correção de várias fotos funciona por etapas; o envio de uma foto não autoriza outra substituição sem novo pedido.
- Servidor bloqueia alteração de evidências em aprovado/cancelado e em convite vencido enquanto ainda não concluído. Vencimento do convite não transforma concluído em expirado.
- Links de um participante não podem substituir uma testemunha individual já assinada. Cliente e assinante a rogo no mesmo aparelho continuam suportados.
- Certificado aprovado é reutilizado, sem regeneração. Se estiver ausente, exige recuperação; não é substituído automaticamente. A geração de um PDF em revisão verifica se o documento mudou durante o processamento.
- Exclusão individual recusa documento aprovado. Exclusão de um novo envio não remove arquivo ainda utilizado pelo original ou por outro registro.

Nenhuma alteração de schema. Nenhum cadastro ou documento real foi usado nos testes de escrita. Arquivos e backups históricos existentes não foram apagados.

## Validação

- 39 verificações novas de revisão/assinatura, com handlers e PostgreSQL local real, participantes fictícios e integrações externas bloqueadas.
- 28 verificações integradas anteriores continuam aprovadas.
- 73 testes isolados de segurança, 12 testes de WhatsApp e compilação completa aprovados.
- Entre os cenários: original aprovado idêntico antes/depois; novo kit a rogo; repetição de solicitação; funcionário/advogado/visualizador/outro escritório; duas fotos corrigidas; tentativa de alterar testemunha; cliente + a rogo; vencimento antigo; proteção do PDF compartilhado; certificado aprovado e correção individual sem modificar outro documento do kit.

## Preservação e publicação

Antes desta etapa, o único acréscimo desde o snapshot anterior era um registro de auditoria. As outras 24 tabelas, inclusive clientes, documentos, participantes e arquivos, permaneciam iguais. Foi preparado o snapshot `snapshot-2026-09-10T01-16-37Z` com captura atualizada do banco e cópia dos 209 arquivos previamente verificados. As datas da captura original dos arquivos ficam registradas em `files-provenance.json`; a recuperação confere novamente todos os arquivos e seus vínculos.

Snapshot recuperado e validado às 01:20 UTC de 10/09/2026: 25 tabelas idênticas, 20 clientes, 12 documentos, 8 concluídos em 2 lotes, 209 arquivos e 20 hashes de PDFs conferidos. Publicação preparada; aguardar Ready na Vercel para confirmação em produção.

## Limites

Este bloco não conclui os demais itens da auditoria: validação profunda de imagens/consentimento, falhas parciais da assinatura, demais permissões e preparação comercial continuam no plano. Não houve teste de câmera em aparelho físico nesta etapa. Exibição de CPF e política de identificação foram mantidas conforme orientação do usuário; não foi acrescentada verificação automática de identidade.
