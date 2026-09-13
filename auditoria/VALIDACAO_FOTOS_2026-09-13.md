# Validação de arquivos de evidência

Salvar etapa e concluir participação agora validam as imagens obrigatórias: JPEG/PNG com base64 canônico, formato real compatível, limite de 4 MiB para a string recebida, dimensões mínimas de 128 por 128 pixels, limite de 16 milhões de pixels e decodificação completa. Não é verificação biométrica, de presença ou autenticidade documental; a conferência continua manual.

Uma imagem inválida recebe erro 400 antes da escrita. Aprovações e repetições de participações já concluídas mantêm as proteções e a resposta idempotente existentes. No salvamento por etapa, o resultado da validação é reaproveitado entre tentativas da mesma transação, evitando decodificação repetida em conflito de banco.

Validação executada: três testes específicos (JPEG/PNG válidos; texto, conteúdo falso e truncamento; tamanho insuficiente e payload excessivo). Banco local vazio restaurado somente com estrutura, dois escritórios fictícios: 28 verificações gerais e 126 verificações de assinatura/revisão aprovadas, nenhum provedor chamado. Fixtures agora são imagens JPEG reais criadas exclusivamente para o teste. Rejeição de imagem inválida confirmou preservação do valor anterior no banco local.

Compilação registrada em evidencias/fotos-build.txt. Nenhuma migração ou teste de escrita no banco de produção. Testes físicos de câmera e rede móvel continuam pendentes; os fluxos de retomada existentes foram cobertos pela regressão local, sem alegar simulação real de perda de rede em celulares.
