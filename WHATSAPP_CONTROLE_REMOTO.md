# AssinaJur — Controle remoto pelo WhatsApp

## Arquitetura econômica

O WhatsApp permanece conectado pelo computador usando Baileys. Cada mensagem autorizada chama
o endpoint do AssinaJur na Vercel. A função serverless acorda, consulta ou grava no PostgreSQL de
produção e devolve a resposta ao computador, que a entrega pelo WhatsApp.

O site não precisa ficar aberto. O computador precisa permanecer ligado, conectado à internet e
com `AssinaJur-Bot.bat` em execução.

## Configuração obrigatória antes da publicação

1. Gere um segredo aleatório longo (mínimo recomendado: 32 bytes).
2. Na Vercel, configure as variáveis:

   - `WHATSAPP_BOT_SECRET`: segredo compartilhado com o computador.
   - `WHATSAPP_OFFICE_ID`: ID do escritório atendido pelo bot.
   - `WHATSAPP_AUTHORIZED_PHONES`: números administrativos separados por vírgula, com DDI 55.
   - `GEMINI_API_KEY`: chave renovada, armazenada somente como variável sensível.

3. Copie `.env.bot.example` para `.env.bot` e preencha:

   - `WHATSAPP_BOT_SECRET`: exatamente o mesmo valor da Vercel.
   - `WHATSAPP_ADMIN_PHONE`: número administrativo com DDI 55.

4. Publique esta versão na Vercel.
5. Revogue a sessão antiga do WhatsApp que foi exposta no GitHub e faça um novo pareamento.
6. Inicie `AssinaJur-Bot.bat`.

O arquivo `.env.bot`, a sessão, o QR Code e a trava do daemon são locais e estão ignorados pelo Git.

## Comandos disponíveis

- `ajuda`
- `clientes`
- `buscar cliente Maria`
- `status`
- `cobrar Maria`
- `cadastrar cliente João da Silva, CPF ..., telefone ...`
- `gerar procuração para João da Silva`
- `gerar kit previdenciário para João da Silva`
- Foto de RG/CNH para preparar cadastro
- Áudio contendo qualquer um dos comandos acima
- `confirmar` ou `cancelar` quando houver uma ação pendente

## Regras de segurança e consistência

- Apenas números autorizados podem administrar o sistema.
- O escritório é resolvido no servidor; o computador não escolhe um tenant no corpo da mensagem.
- Cadastro e geração documental exigem confirmação.
- O robô só responde “cadastrado” ou “gerado” depois da gravação real no banco.
- Ações são registradas em `WhatsAppLog`, `AuditLog` e `DocumentEvent`.
- A confirmação expira em 15 minutos e não pode ser executada duas vezes.
- O painel considera o bot conectado somente após heartbeat recente do computador.

## Diagnóstico rápido

- `WHATSAPP DESCONECTADO` no painel: confirme que o `.bat` está aberto e sem erro.
- `Ponte não autenticada`: os valores de `WHATSAPP_BOT_SECRET` estão ausentes ou diferentes.
- `Não foi possível vincular o escritório`: configure `WHATSAPP_OFFICE_ID` na Vercel.
- Foto/áudio não processado: confirme `GEMINI_API_KEY` na Vercel e envie arquivo menor/nítido.
- Cobrança sem envio: confirme que o signatário tem telefone/WhatsApp cadastrado.

## Limitação atual

Enquanto estiver usando Baileys, a disponibilidade depende do computador e do pareamento do
WhatsApp Web. Quando houver volume comercial, a mesma central de comandos poderá ser mantida e a
ponte substituída pela API oficial da Meta ou por um servidor dedicado.
