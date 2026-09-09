# Recuperação local do backup AssinaJur

Backup de 09/09/2026, autorizado pelo titular. Banco completo e schema público em formato PostgreSQL custom; 209 arquivos Blob copiados. Conteúdo e manifestos estão em AES-256-GCM. A chave está em backup-key.dpapi, protegida pelo Windows para o usuário Diego neste computador. Não excluir nem compartilhar essa chave ou os arquivos do backup.

O teste recuperou as 25 tabelas da aplicação e conferiu todos os registros, os 20 clientes, os 12 documentos (8 concluídos), os 2 lotes e 25 referências de arquivos. Os 209 arquivos foram decifrados e tiveram a integridade verificada; 20 hashes dos PDFs originais/assinados conferem com o banco. Não houve regeneração de certificados.

Para repetir o teste, use o mesmo usuário Windows, Node.js instalado e execute no PowerShell:

    node 'C:\Users\diego\AssinaJur-Backups\backup-assinajur.cjs' restore-test 'C:\Users\diego\AssinaJur-Backups\snapshot-2026-09-09T19-23-26Z' 'C:\Users\diego\AssinaJur-Backups\tools\pgsql\bin'

O comando aceita somente restauração local em 127.0.0.1:55483. Requer essa porta livre e a pasta temporária work ausente. Encerra o PostgreSQL de teste e remove a cópia temporária ao terminar, conservando os arquivos criptografados e os relatórios. O teste não precisa de credenciais de produção nem de internet.

A diferença inicial de comparação das coordenadas foi investigada: extra_float_digits era 0 no Supabase e 1 no computador. Os valores binários conferiam; padronizar a representação textual da sessão resolveu a comparação sem alterar dados.

Limites: o teste restaura as tabelas públicas da aplicação, não todos os componentes gerenciados do Supabase. O dump completo também está arquivado, mas a reconstrução integral do serviço não foi testada. A proteção DPAPI depende deste computador/usuário: esta cópia não substitui uma segunda cópia fora da máquina com chave de recuperação independente. Não existe rotina agendada por este procedimento.

Nunca apontar a restauração para produção sem planejamento próprio: rollback de código não restaura dados nem arquivos, e uma restauração antiga pode sobrescrever registros posteriores. Antes de uma futura publicação, criar um snapshot novo se os dados tiverem mudado. Não executar db push usando o .env do projeto: ele aponta para o banco atual.
