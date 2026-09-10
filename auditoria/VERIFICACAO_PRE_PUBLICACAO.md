# Publicação e preservação dos dados — AssinaJur

Verificação concluída em 09/09/2026, aproximadamente 16h32 (America/Bahia).

**Resultado: primeira etapa publicada e confirmada como Ready na Vercel. Banco e inventário dos arquivos preservados após a publicação.**

## Publicação

- Commit: `aafcbfccb9530d93fed43bc3d3b1e9b624313b48`.
- Deploy: https://vercel.com/diegos-projects-5d58e965/assinajur/3hiv9yp12M4ZPXDMPKadqS9wvtcm
- Ambiente Production, status Ready, versão Latest confirmados no painel.
- Página de login carregou; painel autenticado abriu com a sessão existente após a atualização.
- Nenhuma migração, sincronização ou restauração foi executada em produção. As credenciais dos serviços foram mantidas.

## Backup e recuperação

O banco atual foi confirmado no Supabase, projeto `ngprverpvbztptshbnsp`. O `.env` local acessa esse banco e não deve ser usado para testes com escrita. O Neon conectado contém dados antigos. A documentação do projeto recebeu um aviso operacional sobre essa diferença.

Com autorização expressa do Diego, foram criadas cópias em `C:\Users\diego\AssinaJur-Backups`, fora do repositório e do OneDrive. O snapshot inicial das 13:35 UTC foi conservado. Novos documentos criados durante o uso motivaram um segundo snapshot, que inclui esses registros.

**Snapshot utilizado na publicação:** `snapshot-2026-09-09T19-23-26Z`.

| Verificação | Resultado |
|---|---|
| Banco completo | Exportação PostgreSQL custom criptografada e relida com verificação de integridade. |
| Recuperação da aplicação | As 25 tabelas públicas foram restauradas em PostgreSQL local isolado, com todos os registros conferidos. |
| Clientes | 20 preservados. |
| Documentos | 12 preservados, sendo 8 concluídos em 2 lotes; inclui 4 documentos novos desde a primeira cópia. |
| Arquivos | 209 arquivos, 244.314.348 bytes, incluindo arquivos antigos ainda no Blob. |
| Vínculos e PDFs | 25 referências de arquivos conferidas; 20 hashes dos PDFs originais/assinados correspondem aos registros. Certificados históricos não foram regenerados. |
| Depois da publicação | As 25 tabelas permaneciam idênticas ao snapshot. Inventário remoto dos 209 arquivos também permaneceu igual (caminho, tamanho, data e etag quando fornecido). |
| Proteção | AES-256-GCM, chave protegida por Windows DPAPI CurrentUser, pasta restrita ao usuário e SYSTEM. |
| Limpeza | Servidores de teste encerrados; cópias temporárias decifradas removidas. Ferramentas e instruções de recuperação preservadas junto ao backup. |

Uma divergência inicial de comparação foi investigada: extra_float_digits era 0 no Supabase e 1 no PostgreSQL local. Os valores binários das coordenadas conferiam; padronizar somente a representação textual da sessão resolveu a comparação, sem alterar os dados.

## Validação das correções

- 73 testes isolados de segurança e 12 testes existentes de WhatsApp aprovados.
- TypeScript e compilação completa local aprovados; build de produção finalizou com sucesso.
- 28 verificações integradas aprovadas com handlers reais, PostgreSQL local vazio e dois escritórios fictícios; integrações externas bloqueadas.
- Conferência somente de leitura na produção: zero vínculos externos entre escritórios nas relações de kits e pendências corrigidas; dois administradores ativos.

## Limites que permanecem

O teste recupera o schema público da aplicação; não simula a reconstrução de toda a infraestrutura gerenciada do Supabase. O dump completo também foi arquivado. A chave DPAPI depende deste computador e usuário Windows: falta uma segunda cópia com recuperação independente para cobrir perda da máquina. Não foi criada uma rotina agendada de backup.

A credencial anteriormente exposta no código ainda exige rotação coordenada; removê-la do arquivo não a revoga nem apaga o histórico. Esta publicação conclui somente a primeira etapa das correções. Não significa que todos os itens da auditoria ou os requisitos para venda estejam concluídos.

Nenhum dado pessoal, senha ou token foi incluído neste relatório. Inventários detalhados permanecem criptografados no backup privado.
