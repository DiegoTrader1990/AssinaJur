# Retomada de assinatura — 10/09/2026

## Alterações

- Participantes, eventos, auditoria e propagação do kit são gravados em uma transação. Uma falha antes da confirmação desfaz o envio incompleto, mantendo as capturas anteriormente salvas.
- Documento e escritório são bloqueados durante a transação para coordenar assinatura, correção e aprovação. Conflitos concorrentes retornam orientação para repetir a tentativa.
- Repetir uma submissão já salva confirma seu recebimento sem substituir evidências ou duplicar eventos. PDFs e notificações continuam fora da transação; falhar nessa etapa não desfaz assinaturas.
- A captura aguarda confirmação do servidor. Se houver falha ou demora no envio, conserva a foto na página e oferece nova tentativa. A recuperação da foto ainda não salva exige manter a página aberta; não há promessa de recuperação após fechar o navegador antes do recebimento.
- Reenvio da mesma foto de uma correção já recebida confirma o recebimento; outra imagem exige novo pedido. Documentos aprovados continuam protegidos.
- Reabrir o link de quem já assinou permite passar ao próximo participante no mesmo aparelho. Participantes individuais seguem com seus próprios links. Uma marca antiga no navegador não substitui o status atual do servidor.
- Cliente e assinante a rogo concluem juntos. Testemunhas mantêm a escolha de aparelho. Não houve mudança de identificação, exibição de dados ou conferência humana.
- Download de concluído com falha de certificado informa indisponibilidade temporária e permite nova tentativa, sem entregar silenciosamente o original como se fosse o PDF assinado.

## Validação

PostgreSQL local isolado com participantes fictícios: 28 verificações anteriores e 70 de revisão/assinatura aprovadas. Inclui falha durante gravação do a rogo, falha durante propagação do kit, repetição de submissão, tentativas simultâneas, fotos corrigidas, testemunha individual e no mesmo aparelho, reabertura de link e falha/recuperação do download. Provedores externos bloqueados nos testes.

Compilação completa e testes isolados de segurança aprovados; validação final de publicação registrada abaixo. Não houve alteração de schema.

Antes da publicação, comparação somente leitura confirmou as 25 tabelas sem diferenças em relação ao backup recuperado `snapshot-2026-09-10T01-16-37Z`: 20 clientes, 12 documentos, 8 concluídos em 2 lotes e 25 registros de arquivos. Esse snapshot contém 209 arquivos verificados.

## Publicação

Pendente de confirmação Ready e comparação após publicação.

## Limites e continuidade

Não foram usadas assinaturas reais como teste. Câmera e quedas de conexão em aparelhos físicos ainda precisam de homologação. Recuperação automática recorrente de PDFs e notificações por fila durável, falhas de provedores e demais itens comerciais/operacionais continuam no plano. A recuperação de PDF desta etapa ocorre sob demanda no download do escritório.
