# AGENTS.md — Instruções para agentes de IA (Claude, Codex, etc.)

Este arquivo existe para que qualquer assistente de IA (Claude/Anthropic, Codex/OpenAI, ou outro)
que for editar este projeto entenda rapidamente como o sistema funciona, como é feito o deploy,
e quais cuidados tomar. Leia este arquivo inteiro antes de propor ou aplicar qualquer mudança.

## O que é o AssinaJur

Plataforma SaaS multiempresa (multi-tenant) de contratação e assinatura eletrônica de documentos
jurídicos, feita sob medida para escritórios de advocacia. Cada escritório ("Office") tem seus
próprios usuários, clientes, modelos de documento e documentos enviados para assinatura.

## Stack técnica

- **Framework**: Next.js 14 (App Router) + TypeScript
- **ORM / Banco**: Prisma ORM sobre PostgreSQL (Neon, serverless, plano gratuito)
- **Armazenamento de arquivos**: Vercel Blob (PDFs originais e assinados)
- **Autenticação**: JWT (jsonwebtoken) + bcryptjs para senhas
- **Geração de PDF**: pdf-lib (certificado de assinatura, QR code de verificação)
- **Estilo**: Tailwind CSS
- **Hospedagem**: Vercel (produção e preview deployments)

## Repositório e pipeline de deploy

- **GitHub**: `DiegoTrader1990/AssinaJur` (branch `main` = produção)
- **Vercel**: projeto `assinajur`, na conta pessoal do Diego (plano Hobby, sem cartão de crédito)
- **Deploy automático**: todo push para `main` no GitHub dispara automaticamente um novo build e
  deploy na Vercel. Não é preciso fazer nada manual na Vercel — só dar `git push`.
- **Sem downtime**: a versão antiga continua no ar até a nova terminar de compilar com sucesso.
- **Rollback**: no painel da Vercel (Deployments), dá pra reverter para qualquer deploy anterior
  com um clique ("Instant Rollback"), caso uma atualização quebre algo.

### Como fazer uma atualização

1. Editar o código localmente (na pasta do projeto).
2. Rodar `npm run build` localmente se possível, para pegar erros de TypeScript antes de subir
   (a Vercel usa TypeScript estrito e já pegou erros que passaram batido localmente antes).
3. `git add`, `git commit`, `git push origin main`.
4. A Vercel builda e publica sozinha (leva ~30-60s). Acompanhar em
   https://vercel.com/diegos-projects-5d58e965/assinajur/deployments

### Se a mudança alterar o schema do banco (prisma/schema.prisma)

Não existe pipeline de migrations automatizado ainda (o projeto usa `prisma db push`, não
`prisma migrate`). Depois de mudar o schema:

- **Localmente**: rodar `npm run db:push` (usa o `.env` local, que aponta pro banco de
  desenvolvimento no Supabase).
- **Em produção** (banco Neon): não há acesso direto à connection string (é uma env var
  "Sensitive" na Vercel, não pode ser lida de volta pelo painel). A forma que funcionou: editar
  temporariamente o script `build` no `package.json` para
  `"prisma generate && prisma db push --accept-data-loss --skip-generate && next build"`,
  dar push, esperar o deploy rodar (o db push acontece durante o build, com acesso às env vars
  reais da Vercel), confirmar nos Build Logs a mensagem "Your database is now in sync with your
  Prisma schema", e então **reverter o script `build` de volta ao normal**
  (`"prisma generate && next build"`) e dar push de novo. Não deixar o `db push` permanente no
  build — ele roda em todo deploy e isso é arriscado (pode causar perda de dados em mudanças de
  schema que removem colunas).
- Alternativa mais segura para o futuro: migrar para `prisma migrate dev` / `prisma migrate
  deploy` com uma pasta `prisma/migrations` versionada, em vez de `db push`.

## Variáveis de ambiente (produção, na Vercel → Environment Variables)

Não estão listadas aqui por segurança (valores "Sensitive", ilegíveis pelo painel). Nomes usados:

- `POSTGRES_PRISMA_URL` — conexão pooled (pgbouncer), usada em runtime pelo Prisma Client
- `POSTGRES_URL_NON_POOLING` — conexão direta, usada por `prisma db push` / `migrate`
- `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`, `BLOB_WEBHOOK_PUBLIC_KEY` — Vercel Blob (auto-criadas
  ao conectar o Blob Store ao projeto)
- `JWT_SECRET` — segredo para assinar tokens de sessão
- `NEXT_PUBLIC_APP_URL` — URL pública do site (usada em links de verificação nos PDFs). Hoje
  aponta para `https://assinajur.com.br`, mesmo o domínio ainda não estando 100% propagado (ver
  seção Domínio abaixo).

O `schema.prisma` usa `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` (não `DATABASE_URL` /
`DIRECT_URL` — são os nomes específicos que a integração Vercel + Neon cria automaticamente).

O `.env` local (não versionado) usa as mesmas chaves, apontando para um banco Postgres separado
no Supabase, usado só em desenvolvimento.

## Domínio

`assinajur.com.br` registrado no Registro.br (conta do Diego, login DIROD799). Já está conectado
como domínio custom no projeto Vercel (`assinajur.com.br` e `www.assinajur.com.br`). Falta apenas
configurar os registros DNS no painel do Registro.br (Configurar zona DNS, modo avançado):

| Tipo  | Nome | Valor                                  |
|-------|------|-----------------------------------------|
| A     | @    | 216.198.79.1                            |
| CNAME | www  | f8b90e0f48b274fe.vercel-dns-017.com     |

(Esses valores podem mudar se o domínio for removido e reconectado na Vercel — sempre conferir
em Vercel → assinajur → Domains → "View DNS configuration" antes de aplicar.)

Enquanto o DNS não propaga, o sistema já está 100% funcional em https://assinajur.vercel.app

## Armadilhas já encontradas (não repetir)

- **Framework Preset da Vercel tem que ser "Next.js"**, não "Other" — senão o build "funciona"
  mas o deploy falha com `No Output Directory named "public" found`.
- `NextResponse` na Vercel não aceita `Buffer` puro do Node como corpo da resposta — usar
  `new Uint8Array(buffer)` (ver `src/app/api/documents/[id]/download/route.ts`).
- O repositório em `C:\Users\diego\OneDrive\...\AssinaJur` fica com `.git/index.lock` preso às
  vezes (sincronização do OneDrive). Se acontecer, copiar a pasta para fora do OneDrive antes de
  rodar comandos git, ou simplesmente reiniciar o OneDrive.
- Domínios registrados no mesmo dia no Registro.br ficam com o painel de DNS avançado bloqueado
  por ~2h ("domínio em transição") — é preciso esperar, não é erro de configuração.

## Regras gerais para agentes de IA neste projeto

1. Nunca commitar segredos (`.env`, tokens, senhas) — o `.gitignore` já cobre o `.env`, manter
   assim.
2. Nunca deixar `prisma db push` permanente no script de `build` (ver seção acima).
3. Antes de qualquer ação que precise de senha, criação de conta, ou pagamento, perguntar ao
   Diego — nunca assumir autorização implícita.
4. Preferir mudanças pequenas e incrementais com commits claros, já que o deploy é automático a
   cada push — evitar deixar o `main` num estado quebrado.
5. Se a mudança envolver a estrutura do banco, avisar explicitamente que um passo extra de
   sincronização (`db push`) será necessário em produção.
