# Plano de execução — AssinaJur

Base: auditoria de 08/09/2026, commit 9783c2d. Todos os itens começam pendentes. Marcar concluído somente após implementar e cumprir o critério de aceite do relatório. P0 bloqueia liberação com dados reais; P1 bloqueia venda ou liberação da função; P2 pode ficar fora do escopo inicial.

**Atualização de 09/09/2026:** primeira etapa publicada no commit `aafcbfc`, deploy Ready confirmado e sessão existente validada. Backup criptografado e recuperação local aprovados: 20 clientes, 12 documentos (8 concluídos em 2 kits), 209 arquivos. Banco e inventário do armazenamento conferidos após a publicação. Passaram 73 testes isolados de segurança, 12 de WhatsApp e 28 verificações com PostgreSQL local e escritórios fictícios. Detalhes em [VERIFICACAO_PRE_PUBLICACAO.md](VERIFICACAO_PRE_PUBLICACAO.md).

**Prioridade definida pelo usuário:** continuar as atualizações funcionais e de integridade; adiar a troca de credenciais para uma etapa coordenada posterior. A rotação permanece pendente e não deve ser confundida com a remoção das credenciais do código. O foco seguinte é concluir a segurança das operações e o fluxo de assinatura, preservando os documentos históricos. A liberação comercial continua dependendo dos critérios abaixo.

**Atualização de 10/09/2026:** regras de aprovação definitiva e novo envio publicadas em `1aadd3f`. Retomada de assinatura e gravação transacional de kits concluídas e enviadas em `831fb99`, Ready confirmado; as 25 tabelas foram conferidas sem diferenças após a publicação, e o painel autenticado abriu normalmente. Validação: 73 testes isolados de segurança, compilação completa e 28 + 70 verificações com PostgreSQL local fictício. Decisões de aparelho, dados exibidos e conferência manual em [DECISOES_FLUXO_2026-09-09.md](DECISOES_FLUXO_2026-09-09.md). Detalhes e limites de recuperação em [RETOMADA_ASSINATURA_2026-09-10.md](RETOMADA_ASSINATURA_2026-09-10.md). Próximos blocos: homologação de câmera/conexão em aparelhos físicos, segurança das demais operações e preparação comercial. Não marcar toda a auditoria como concluída.

## Preservação obrigatória dos dados existentes

O usuário já utiliza a produção e informou dois kits assinados e conferidos como corretos. Preservar todos os clientes, documentos, participantes, evidências e vínculos. Antes de alterar a produção: backup de banco e arquivos, recuperação testada em ambiente isolado e inventário de IDs, códigos de verificação e hashes. Manter compatibilidade com dados antigos; não reabrir assinaturas nem regenerar certificados históricos automaticamente. Conferir o inventário antes/depois de cada atualização. Nenhuma alteração estrutural em produção sem backup verificado.

## Marcos de liberação

- [ ] Base segura: segredos, isolamento entre escritórios, permissões, conteúdo seguro e build sem alteração destrutiva do banco.
- [ ] Assinatura confiável: participantes corretos, aceite verificável, versões preservadas, falhas recuperáveis e certificado íntegro.
- [ ] Piloto fechado: ambiente separado, dados fictícios, roteiro aprovado e módulos incompletos desabilitados.
- [ ] Uso real supervisionado: controles e documentação de privacidade/evidências, backup restaurado e suporte operacional.
- [ ] Venda assistida: oferta, cotas, preço, cobrança, cancelamento, licenças e hospedagem coerentes.

## P0

- [ ] **SEG-01** — Credencial de banco embutida no código
- [ ] **SEG-02** — Segredo alternativo previsível para sessão
- [x] **SEG-03** — Kit aceita modelo de outro escritório — corrigido, testes isolados/integrados aprovados e publicado; vínculos existentes conferidos.
- [x] **SEG-04** — Pendência aceita cliente/responsável de outro escritório — corrigido, testes isolados/integrados aprovados e publicado; vínculos existentes conferidos.
- [ ] **SEG-05** — Cargo “visualizador” não limita diversas alterações
- [ ] **SEG-06** — HTML de modelos pode executar conteúdo no editor
- [ ] **SEG-07** — Aviso de assinatura inclui destinatário global
- [ ] **SEG-08** — Cadastro de advogado com senha fixa
- [ ] **ASS-01** — Servidor aceita assinatura sem evidência válida
- [ ] **ASS-02** — CPF exposto é utilizado como confirmação de identidade
- [ ] **ASS-03** — Token de uma pessoa pode sobrescrever testemunha
- [ ] **ASS-04** — Salvamento de evidências ignora estado do documento
- [ ] **ASS-05** — Evidências e certificado concluído são substituíveis
- [ ] **ASS-11** — Dados do escritório fundador entram em outros escritórios
- [ ] **OPE-01** — Build sincroniza schema aceitando perda de dados

## P1

- [ ] **SEG-09** — Saída da equipe e revogação de sessão incompletas
- [ ] **SEG-10** — Excesso de dados na consulta pública
- [ ] **SEG-11** — Controles de abuso não demonstrados
- [ ] **SEG-12** — Uploads precisam validação mais profunda
- [ ] **SEG-13** — Integrações e administração precisam trilha e validação
- [ ] **ASS-06** — Abrir link pode transformar concluído em expirado
- [ ] **ASS-07** — Falha parcial deixa assinatura sem conclusão recuperável
- [ ] **ASS-08** — Aviso ainda depende da geração do PDF
- [ ] **ASS-09** — Criação do kit não é atômica
- [ ] **ASS-10** — Modelo Word pode virar documento com texto provisório
- [ ] **ASS-12** — Consulta por código não verifica o arquivo apresentado
- [ ] **ASS-13** — Limite anunciado de arquivo conflita com a hospedagem
- [ ] **ASS-14** — Consentimento do kit precisa vincular os documentos exatos
- [ ] **ASS-15** — Cancelamento/expiração não revogam leitura do original
- [ ] **PRO-01** — Teste gratuito anunciado não corresponde ao cadastro
- [ ] **PRO-02** — Cotas e planos aplicados de forma diferente
- [ ] **PRO-03** — “Pacote”, “documento” e créditos precisam regra única
- [ ] **PRO-04** — Venda assistida existe; ciclo comercial precisa fechamento
- [ ] **PRO-05** — “Esqueceu a senha?” não funciona
- [ ] **PRO-06** — E-mail de membro não normalizado no cadastro
- [ ] **PRO-07** — Último administrador pode perder o próprio cargo
- [ ] **PRO-09** — Quatorze destinos de navegação da home não existem
- [ ] **PRO-10** — Editor Word depende de programa no computador
- [ ] **PRO-14** — Acessibilidade do cadastro e login precisa correção
- [ ] **PRO-15** — Jornada móvel real ainda precisa homologação
- [ ] **OPE-02** — Atualizar dependências e runtimes sem suporte
- [ ] **OPE-03** — Hospedagem comercial e licenças precisam conferência
- [ ] **OPE-04** — Backup só é confiável depois de restaurado
- [ ] **OPE-05** — Testes e publicação precisam uma barreira automática
- [ ] **OPE-06** — Falhas precisam ser visíveis e recuperáveis
- [ ] **OPE-07** — Listagens completas e processamento em pedido limitam escala
- [ ] **OPE-08** — WhatsApp ainda depende de decisões de operação por escritório
- [ ] **OPE-09** — Armazenamento e empacotamento falham de forma insegura
- [ ] **COM-01** — Promessas públicas excedem o que foi demonstrado
- [ ] **COM-02** — Definir política de assinatura e de evidências por caso de uso
- [ ] **COM-03** — Privacidade precisa corresponder à operação real
- [ ] **COM-04** — Precificar o serviço completo e limitar a oferta inicial

## P2

- [ ] **PRO-08** — Entrada no produto precisa orientação de primeira utilização
- [ ] **PRO-11** — Central de Entrada ainda não fecha a triagem
- [ ] **PRO-12** — Tela WhatsApp sugere conversa com cliente, mas usa assistente
- [ ] **PRO-13** — Métricas usam conceitos diferentes
- [ ] **COM-05** — Divulgação precisa medição e conteúdo verificável

## Registro de cada correção

Para cada ID, registrar responsável, mudança/commit, ambiente, teste de aceite, resultado e risco residual. Se alterar schema, planejar sincronização/migração em produção separada do build, com backup e recuperação. Revalidar o fluxo completo do escopo antes de publicar.

## Recursos que podem aguardar

Word, Central de Entrada/Drive, caixa de atendimento WhatsApp e relatórios avançados podem ficar fora da primeira oferta, desde que isso esteja claro e o acesso às funções não homologadas esteja bloqueado. Checkout automático pode vir depois de uma cobrança manual rastreável. Segurança, integridade de assinatura e separação de escritórios não são adiáveis.
