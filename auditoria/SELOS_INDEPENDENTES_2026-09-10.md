# Selos independentes — 10/09/2026

Continuação de `CONTINUACAO_SELOS_MULTIPARTE.md`. A Folha de Assinaturas que estava no disco foi preservada, validada e estendida para cobrir participantes sem posição no contrato.

## Entrega

- Novo formato MULTI no campo existente signaturePosition, sem migração. Posições vinculadas à ordem de cada participante; páginas, limites e participantes validados no servidor. Os formatos antigos continuam aceitos.
- O compilador conserva todas as linhas encontradas, além da posição singular antiga. Sugestão somente quando a legenda identifica um participante; falta de identificação usa a folha adicional, sem adivinhar um lugar sobre cláusulas.
- Editor compartilhado em documentos avulsos e kits: lista de nomes, seleção e destaque, clique para colocar, arraste, ajuste pelas setas, largura e altura independentes, troca de página e opção de deixar somente na folha.
- Alterar participantes descarta as posições anteriores. Alterar texto de uma minuta invalida os ajustes daquele modelo para evitar posições sobre conteúdo que mudou.
- Selos das partes mostram identidade, CPF, horário e QR de verificação. Testemunhas usam selo compacto, sem QR. Cliente e assinante a rogo mantêm o selo conjunto.
- A folha adicional identifica as partes e testemunhas em blocos separados, com quebra de nomes longos e continuação em novas páginas. A folha usa a moldura já disponível no gerador do certificado; não foi criado um sistema novo de personalização de timbre.
- PDFs aprovados continuam sendo retornados do arquivo existente, sem regeneração automática.

## Verificações

- Verificação de tipos e compilação completa aprovadas; 73 testes de segurança passaram.
- 16 verificações de formato, limites, vínculo de participante, formatos antigos e sugestões passaram.
- PostgreSQL local fictício: 28 verificações anteriores e 74 de revisão/assinatura passaram, incluindo persistência de MULTI e rejeição de página/participante inválido.
- Gerador real de PDF executado com banco/arquivos simulados e sem provedores: exemplos de duas partes com duas testemunhas, doze participantes e cliente com a rogo. Confirmada também a conservação de duas linhas de assinatura pelo compilador.
- PDFs renderizados e inspecionados: selos individuais, bloco conjunto a rogo, nomes longos, testemunhas e continuação da folha.
- Editor real testado em página local com participantes fictícios: seleção, colocação de dois selos, redimensionamento e ajuste fino do segundo sem alterar o primeiro. Não foram cadastradas assinaturas reais para esse teste.

## Preservação e publicação

O banco foi atualizado pelo uso desde o snapshot anterior; documentos, participantes e arquivos continuavam iguais. Novo snapshot preparado em `snapshot-2026-09-10T20-37-06Z`, com cópia independente dos 209 arquivos criptografados previamente verificados e nova captura do banco. Recuperação local aprovada às 20:40 UTC: 25 tabelas idênticas, 20 clientes, 12 documentos, 8 concluídos em 2 lotes; 209 arquivos e 20 hashes de PDFs verificados. Publicação aguardando confirmação Ready.

## Limites

A prévia do editor identifica a área e o dono de cada selo; horário e código reais entram após a assinatura. Quem posiciona deve escolher área livre e revisar o documento. Uma caixa pequena demais para o texto não pode transbordar: a identificação integral permanece na folha. Os testes não substituem homologação em celulares físicos e não encerram os demais itens da auditoria comercial.
