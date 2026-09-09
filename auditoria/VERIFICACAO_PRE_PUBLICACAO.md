# Verificação antes da publicação — AssinaJur

Atualizado em 09/09/2026. **Publicação pendente: backup e recuperação local validados; primeira etapa pronta para publicação.**

## Banco e arquivos atuais

A produção atual foi identificada no Supabase, projeto `ngprverpvbztptshbnsp`. O `.env` local acessa esse banco; não deve ser usado para testes com escrita. O Neon conectado guarda dados anteriores a setembro e não representa a produção atual.

O painel Supabase informa que o plano Free não inclui backups do projeto. Com autorização expressa do Diego, foi criado um backup local em `C:\Users\diego\AssinaJur-Backups\snapshot-2026-09-09T19-23-26Z`, fora do repositório e do OneDrive, com acesso restrito ao usuário e SYSTEM.

| Cópia | Resultado confirmado |
|---|---|
| Banco completo | Exportação PostgreSQL em formato custom, criptografada e relida para verificar integridade. |
| Dados da aplicação | Exportação separada das 25 tabelas públicas; 20 clientes, 12 documentos (8 concluídos), 2 lotes concluídos e 25 referências de arquivos. |
| Armazenamento Blob | 209 arquivos, 244.314.348 bytes; inventário estável antes/depois, conteúdo criptografado e relido. Inclui arquivos antigos ainda no armazenamento. |
| Proteção | AES-256-GCM; chave protegida por Windows DPAPI CurrentUser. Testes de cifragem, decifragem e rejeição de conteúdo adulterado aprovados. |
| Banco original | Comparação posterior confirmou as 25 tabelas sem alterações desde a captura. |
| Recuperação local | PostgreSQL isolado em 127.0.0.1: as 25 tabelas e seus registros conferem. Os 209 arquivos, 25 referências e 20 hashes dos PDFs originais/assinados foram verificados. |

Os detalhes com dados pessoais e inventários por registro estão criptografados. Nenhum documento, CPF, senha ou token consta deste relatório.

## Limites e pendências

1. Recuperação concluída. A divergência inicial era apenas a representação decimal (extra_float_digits 0 no servidor e 1 local); os valores binários das coordenadas eram iguais. Padronizar a representação resolveu a comparação. O teste usa o schema público da aplicação; não é uma reconstrução de toda a infraestrutura gerenciada do Supabase.
2. A chave DPAPI depende do usuário Windows e deste computador. Esta cópia ainda não oferece recuperação independente em caso de perda do computador; falta uma segunda cópia com chave recuperável fora dele.
3. Homologação concluída: 28 verificações com PostgreSQL local vazio e dois escritórios fictícios, usando os handlers reais e serviços externos bloqueados. Também passaram 73 testes isolados de segurança, 12 de WhatsApp, TypeScript e compilação local.
4. Credenciais obrigatórias constam na Vercel. Preservar seus valores na publicação. Planejar separadamente a rotação da credencial anteriormente exposta no código, pois removê-la do arquivo não a revoga.
5. Publicar somente após liberar essas verificações, aguardar Ready e comparar novamente os dados preservados. A versão publicada continua no commit `9783c2df0e4dc70a28c59b9c22f4ad6fbdd30cac`.

Não houve push, deploy, alteração de schema, restauração em produção, troca de senha de serviço, criação de conta ou pagamento. A primeira tentativa de inspeção ampla da API foi recusada pela revisão automática; a cópia completa só começou após a autorização expressa posterior do usuário.

O primeiro snapshot, das 13:35 UTC, foi conservado. Novos documentos criados durante o uso motivaram uma segunda cópia às 19:23 UTC, validada às 19:26 UTC. Os 20 clientes e os dois kits concluídos permanecem; a cópia mais recente inclui também quatro documentos adicionais. Compatibilidade: zero vínculos externos entre escritórios nas relações corrigidas e dois administradores ativos.
