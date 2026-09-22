# Estudo de assinatura sem fotos e sem código

## Situação

Primeira rodada de testes exploratórios concluída em 22/09/2026. A modalidade proposta ainda não está implementada nem liberada. Nenhum cadastro, link, assinatura, banco ou serviço externo foi alterado. Não houve publicação.

## Verificação executada

Comando: `node --test scripts/signature-accessibility-exploration.test.cjs`.

10 testes aprovados contra o endpoint real de submissão, com dependências externas bloqueadas e registros fictícios em memória. Eles confirmam o comportamento ATUAL; não representam aprovação de uma modalidade nova.

- Confirmação de CPF, aceite e coordenadas, sem fotos: recusados pelo servidor.
- Pedido do navegador para ignorar fotos: recusado.
- Imagens falsas: recusadas.
- Link desconhecido, cancelado ou expirado: recusado.
- CPF divergente e ordem de participação pendente: recusados.
- Documento concluído e aprovado: protegido contra alteração.
- Reabertura de link já assinado: resposta idempotente, sem sobrescrita.

## Pontos a implementar antes de teste com cliente

1. Modalidade definida pelo escritório no servidor, por participante; nunca confiada a parâmetro livre enviado pelo navegador. Alteração autenticada com isolamento por escritório e histórico, restrita a participações ainda pendentes.
2. Preservação do token existente; revisão da modalidade ao carregar e ao concluir. Se o escritório mudar a modalidade durante a sessão, exigir recarregamento coerente antes do aceite final.
3. Aceite expresso vinculado ao conteúdo e hash de cada documento. Hoje o endpoint possui texto de consentimento de fallback: não basta retirar as validações de fotos.
4. Identificação correta do participante e de sua qualidade (ex.: curadora). Não atribuir assinatura da representante ao CPF do representado.
5. Registro de horário pelo servidor e evidências técnicas disponíveis. Coordenadas precisam de validação e registro de precisão. Localização indisponível/negada deve constar como tal, sem inventar dados ou apresentar cidade aproximada por IP como GPS.
6. Ajuste de certificado, selo e eventos: há textos fixos de selfie/prova de presença em `pdfCertificate.ts` e no fechamento de kits. O comprovante pode omitir o rótulo comercial da modalidade, mas deve descrever somente as evidências reais, sem alegar biometria, código ou certificação ICP-Brasil inexistentes.
7. Testes integrados de mudança por participante no mesmo kit, troca concorrente durante assinatura, recusa de localização, falha de rede/retomada, conclusão duplicada e preservação de assinaturas anteriores.
8. Teste de celular e inspeção do PDF final com dados fictícios antes da liberação.

## Limites

Sem fotos e sem confirmação de posse de telefone, o link, o CPF informado e o aceite oferecem menos comprovação da identidade. IP e geolocalização não comprovam, por si, quem operou o aparelho. Aprovação técnica do fluxo não garante aceitação judicial ou administrativa.

A orientação do STJ consultada admite procuração eletrônica sem ICP-Brasil como regra, ressalvadas dúvidas sobre autenticidade. Isso não equipara todos os métodos nem garante aceitação de um fluxo específico.

Fonte: https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/31032026-Para-Terceira-Turma--procuracao-eletronica-sem-ICP-Brasil-e-valida-desde-que-nao-haja-duvida-sobre-autenticidade.aspx
