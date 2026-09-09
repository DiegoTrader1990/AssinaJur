# AssinaJur — primeira etapa de correções

Data: 08/09/2026. Estado: mudanças locais; publicação pendente.

Verificação dos serviços realizada posteriormente: [VERIFICACAO_PRE_PUBLICACAO.md](VERIFICACAO_PRE_PUBLICACAO.md). O banco atual foi confirmado no Supabase. Backup criptografado e restauração local foram concluídos, incluindo 20 clientes, 8 documentos concluídos em 2 kits e os arquivos. A homologação com PostgreSQL e dois escritórios fictícios passou em 28 verificações.

Este registro complementa a auditoria original, que continua sendo uma fotografia do código anterior. Não constitui confirmação de segurança da produção ou conclusão dos 57 itens.

## Mudanças preparadas

| Referência | Antes | Agora, no código local | Ainda necessário |
|---|---|---|---|
| OPE-01 | Todo build executava sincronização do banco com aceite de perda de dados. | Build gera o cliente Prisma e compila. Testes de segurança executam antes do build e impedem regressão desse comando. | Publicar após as verificações de preservação. Mudanças futuras no schema precisam de procedimento próprio. |
| SEG-01 | Ausência de variável podia direcionar o sistema a uma conexão com senha embutida. | Conexão vem exclusivamente do ambiente; ausência interrompe inicialização. Mantidos os três nomes de variáveis já suportados, na mesma prioridade. | Identificar e rotacionar a credencial exposta no serviço correto; verificar histórico e demais artefatos. Retirar do arquivo não revoga a credencial nem apaga o histórico. |
| SEG-02 | Autenticação e estado OAuth do Drive tinham chaves alternativas previsíveis. | Alternativas removidas; autenticação exige chave já na inicialização. Tokens de sessão exigem os campos esperados e HS256. Sessão não aceita usuário associado a escritório diferente. | Conferir presença e qualidade da chave de produção sem expor seu valor; concluir separação de finalidade de tokens administrativos/OAuth e revogação de sessões. |
| SEG-03 | Criação e edição de kits aceitavam referências a modelos externos. | Validação de todos os IDs e da titularidade/atividade dos modelos antes das escritas, na transação. Listagem omite kits com relações externas; geração recusa modelos externos/inativos e kits inativos. | Teste integrado com dois escritórios fictícios no ambiente isolado; verificar possíveis vínculos legados sem alterá-los automaticamente. |
| SEG-04 | Edição de pendência aceitava cliente externo; atribuição aceitava responsável externo/inativo. | Cliente e responsável são conferidos por escritório; responsável deve estar ativo. Referências malformadas e datas inválidas são recusadas. | Teste integrado, revisão dos vínculos legados e das demais rotas que escrevem relacionamentos. |
| SEG-05, parcial | Visualizador podia modificar kits, pendências e dados institucionais. | Escrita em kits e pendências bloqueada ao visualizador. Dados institucionais só podem ser alterados pelo administrador. | Aplicar matriz completa às demais rotas e adaptar a interface às permissões. Este item permanece aberto. |
| OPE-05, parcial | Não havia barreira de regressão para essas falhas. | `npm run build` executa previamente a suíte isolada de segurança. | Cobertura integrada e demais controles de publicação continuam pendentes. |

## Verificação

- 73 testes isolados de segurança, cobrindo permissões, referências externas, modelos inativos, entrada inválida, rejeição de tokens e compatibilidade de sessões HS256 emitidas com a mesma chave configurada.
- 12 testes existentes de WhatsApp aprovados.
- Verificação TypeScript sem emissão aprovada.
- Compilação completa com o script de build corrigido, usando URLs Postgres fictícias em `127.0.0.1:1` e chave JWT fictícia; resultado final registrado em `evidencias/atualizacoes-build.txt`.
- Banco, cookies e serviços são simulados nos testes de segurança. Eles não comprovam funcionamento integrado com PostgreSQL, Blob, Google, câmeras ou WhatsApp reais.

## Preservação e condições antes da publicação

Nenhuma migração, sincronização ou limpeza de banco foi executada. Nenhuma assinatura histórica, arquivo, cadastro de cliente, senha ou configuração de serviço externo foi alterada. Não houve push nem deploy nesta etapa. Backup de produção e recuperação local foram validados em 09/09/2026; detalhes no relatório de pré-publicação.

Antes de publicar:

1. Confirmar qual banco e qual armazenamento atendem a produção; registrar os identificadores, sem copiar senhas para este relatório.
2. Obter cópia recuperável do banco completo e dos arquivos relacionados: originais, assinados, selfies/evidências e demais anexos. Um backup do banco com URLs não substitui a cópia dos arquivos. Guardar o material em local privado, com acesso restrito, fora do repositório; não versionar dados pessoais.
3. Registrar um inventário protegido de clientes, relações, documentos, participantes, códigos de verificação, tokens e hashes, incluindo os dois kits concluídos. No relatório compartilhável, usar apenas resultado da conferência, sem dados pessoais ou links de assinatura.
4. Restaurar a cópia em ambiente isolado, com envio de mensagens e integrações de produção desativados. Conferir relações e comparar os bytes/hashes dos arquivos; não regenerar certificados para fazer essa comparação.
5. Confirmar as variáveis usadas na produção e no preview. A nova versão falhará ao iniciar sem conexão de banco ou sem `JWT_SECRET`. Sessões antigas permanecem compatíveis somente se assinadas com a mesma chave configurada; troca de chave exige novo login. Se o Drive usa JWT_SECRET para criptografar tokens armazenados, planejar a preservação/reconexão da integração antes de rotacionar essa chave.
6. Planejar a rotação da credencial encontrada no código com o serviço correspondente. A alteração de senha/configuração externa exige a participação/autorização prevista no AGENTS.md; não realizar uma rotação às cegas.
7. Homologar os fluxos com dados fictícios, incluindo acesso do administrador, restrição de visualizador, kits ativos, atribuição de pendências e ausência de leitura entre escritórios.
8. Publicar a mudança sem alteração de schema, aguardar deploy Ready e conferir novamente o inventário dos dados e arquivos existentes. Rollback de aplicação não restaura banco nem arquivos; conservar o backup verificado separadamente.

## Continuidade

Depois desta base, priorizar a integridade do fluxo de assinatura e das evidências, preservando versões históricas. As demais correções e os marcos de piloto/venda continuam no plano de execução. Esta etapa não libera divulgação ou venda por si só.
