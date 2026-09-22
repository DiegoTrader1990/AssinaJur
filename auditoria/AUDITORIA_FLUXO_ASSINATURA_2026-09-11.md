# Auditoria do fluxo de assinatura multipartes — 11/09/2026

Escopo: assinatura com mais de uma parte, selos individuais, folha de assinaturas, certificado de evidências e qualificação de signatários adicionais. Complementa `AUDITORIA_ASSINAJUR_2026-09-08.md` e fecha o bloco iniciado em `CONTINUACAO_SELOS_MULTIPARTE.md`.

Método: leitura integral do código das rotas `/api/sign/[token]/*`, `/api/documents*`, `/api/kits/*`, `/api/verify/[code]`, de `pdfCertificate.ts`, `templateCompiler.ts`, `signer-stamps.ts`, `kitTemplateNormalization.ts`, `document-review.ts`, `participant-groups.ts`, das telas `assinar/[token]`, `documentos/novo`, `kits/enviar` e do `schema.prisma`. **Nada foi executado**: sem banco, sem build, sem `tsc`, sem render de PDF — o shell da máquina não subiu nesta sessão. Todos os achados vêm de leitura de código e precisam de confirmação empírica antes de fechar cada correção.

---

## 1. Estado do repositório

- `HEAD` local = `origin/main` = **`9ee9b73`** — "Inclui QR das testemunhas e ajuste de selo pelo canto" (10/09, 17:48 -03), com push feito.
- O commit anterior, `fdd3163` ("Adiciona selos por participante e folha de assinaturas"), tem deploy Ready confirmado. **O deploy do `9ee9b73` não está registrado em nenhum documento da auditoria** — confirmar na Overview do Vercel.
- Há **alterações não commitadas** de 11/09 entre 01:16 e 01:32 (-03) em 15 arquivos de `src/`, incluindo `pdfCertificate.ts`, `signer-stamps.ts`, `participant-groups.ts`, `ParticipantOptions.tsx`, `api/sign/[token]/{submit,event,confirm-identity}`, `api/kits/generate-package` e as duas telas de envio. Esta auditoria leu **o estado em disco**, ou seja, já inclui essas alterações.

---

## 2. Veredito

O fluxo multipartes **funciona** — a cadeia de handoff no mesmo aparelho, a retomada após queda entre foto e assinatura, a idempotência do reenvio e a propagação de kit estão bem construídas e foram verificadas item a item. O que impede avançar para venda não é o desenho; são doze defeitos concentrados em três frentes:

1. **O documento sai errado.** Contrato bilateral qualifica só uma parte; texto editado na revisão perde todas as normalizações de redação; selo pode sair deslocado, ilegível ou simplesmente não sair.
2. **A prova não se sustenta.** O servidor aceita qualquer string como foto, o CPF que confirma identidade é entregue pela própria tela, e a página pública devolve CPF e telefone completos sem autenticação.
3. **O produto ainda é do seu escritório.** Nomes, OAB, e-mail e telefone seus estão fixos no código do gerador de documentos, com `if (nome.includes('diego'))`. Nenhum outro escritório pode usar isso como está.

Nada disso é retrabalho do que já foi feito. São lacunas sobre uma base que está de pé.

---

## 3. Bloqueadores de liberação (P0)

### Bloco A — Redação do documento com mais de uma parte

**QUA-01 · Não existe token de minuta para a segunda parte nem para testemunha**
`src/lib/templateCompiler.ts:5-22`; `src/app/api/kits/generate-package/route.ts:349-400`

O mapa de variáveis só conhece `cliente_*`, `representante_*`, `assinante_rogo_*`, `patronos_*`, `escritorio_*`. Não existe `parte2_nome`, `contratado_qualificacao`, `testemunha1_*`. O modelo `Signer` (`schema.prisma:422-472`) tem só nome, CPF, e-mail, telefone, papel, ordem e modo — **nenhuma coluna de qualificação**.

Consequência: contrato entre duas partes sai qualificando uma. A segunda parte só aparece no selo e na folha de assinaturas. É o item que você pediu nominalmente, e é o mais estrutural de todos.

Correção: criar `SignerQualification` (ou colunas em `Signer`: `rg`, `issuingOrgan`, `birthDate`, `nationality`, `gender`, `maritalStatus`, `profession`, `cep`, `address`, `city`, `state`) e expor `{{parte2_nome}}`, `{{parte2_qualificacao}}`, `{{testemunha1_nome}}`, `{{testemunha1_cpf}}`, montados pela mesma função que hoje monta `representante_qualificacao`. **Exige migração de schema** — planejar com backup, separada do build (OPE-01).

**QUA-03 · Editar na revisão do kit desliga todas as normalizações de redação**
`src/app/(dashboard)/kits/enviar/page.tsx:1166` (contradiz o comentário em `:332-341`)

O comentário afirma que `customContents` guarda o texto cru com `{{...}}`. Não guarda: o editor é alimentado com `renderEditableReview(...)`, texto **já substituído**, e o `onChange` grava esse HTML. No servidor, `removeEmptyRgFromQualification`, `applyClientGenderToQualification` e `removeDuplicateClientAddressWhenShared` procuram tokens que já não existem — e não fazem nada.

Consequência: basta você corrigir uma vírgula na revisão para o PDF voltar a sair com "portadora do RG nº —", "Solteiro(a)" e o endereço repetido. **É a causa provável dos defeitos de redação que você vinha corrigindo um a um.**

Correção: manter dois estados — `customContents` cru (com tokens, é o que vai ao servidor) e a visualização renderizada. Mínimo imediato: usar o texto cru como `value` do editor.

**QUA-02 · Token com valor vazio vira uma linha de sublinhados no PDF**
`src/lib/templateCompiler.ts:40` — `compiled.replace(regex, val || '________________')`

String vazia cai no fallback. Cliente sem data de nascimento produz: *"...inscrita no CPF sob o nº 123.456.789-00\_\_\_\_\_\_\_\_\_\_\_\_, residente e domiciliada em..."*, porque `ensureClientQualificationTokens` sempre injeta `{{cliente_nascimento_qualificacao}}`. Mesmo efeito em `{{cliente_representacao}}` e `{{assinante_rogo_qualificacao}}`.

Correção: manter um `Set` de chaves conhecidas — token conhecido com valor vazio é removido (com limpeza de vírgula dupla); só token desconhecido vira sublinhado.

### Bloco B — Selo individual

**SEL-07 · `MULTI:[]` apaga o carimbo de todas as páginas do contrato**
`src/lib/pdfCertificate.ts:452-461`; `src/app/(dashboard)/documentos/novo/page.tsx:133,497-499`; `api/kits/generate-package/route.ts:494`

O default do formulário é `signaturePosition = 'CUSTOM'` e o envio faz `encodeStamps(settings.signerStamps || [])` → **`MULTI:[]`**. No gerador, para documento não-a-rogo, `customStamp` é sempre `null`, então o `return` da linha 461 corta o desenho em **todas** as páginas: sem faixa de rodapé, sem "Código: AJ-…", sem "Página X/Y".

Consequência: quem não abrir o editor de selos — ou abrir e não posicionar nada — envia um contrato cujas páginas **não têm nenhuma marca de assinatura eletrônica**. Só a folha e o certificado anexados. Isso pode já estar acontecendo em produção.

Correção: tratar `MULTI:[]` como `BOTTOM` em `normalizeSignaturePosition`, ou cair no carimbo de rodapé quando nenhum selo foi desenhado na página (o `stampText` já está montado em `:463`).

**SEL-01 · Editor posiciona em CropBox/rotação, o gerador aplica em MediaBox**
`src/components/SignerStampEditor.tsx:37-41`; `src/lib/pdfCertificate.ts:423-426,472-479`

O editor normaliza contra `page.getViewport()` do pdf.js, que usa a view box (CropBox ∩ MediaBox) e **aplica `/Rotate`**. O servidor usa `page.getSize()` do pdf-lib: MediaBox, sem origem, sem rotação. E não há clamp em `drawSignerStamp` — `x = box.x * width` é usado cru.

Consequência: PDF escaneado ou gerado pelo Word com CropBox menor que a MediaBox (offsets de 18 a 70pt são comuns) ou com `/Rotate 90` → o selo que você posicionou no rodapé em branco aparece deslocado ou transposto, **sobre o clausulado**.

Correção completa: ler a CropBox real no servidor e compor `x = cropX + box.x*cropW`, `top = cropY + (1-box.y)*cropH`; tratar `page.getRotation().angle !== 0`. Correção mínima para liberar venda: recusar MULTI quando alguma página tiver `Rotate ≠ 0` ou CropBox ≠ MediaBox, forçando `BOTTOM` + folha.

**SEL-02 · O selo conjunto (a rogo) ignora a posição escolhida — desvio de até ~80pt**
`src/lib/pdfCertificate.ts:466-479`

No caminho MULTI a caixa do cliente em documento `isIlliterate` não vai para `drawSignerStamp`; vai para o selo legado, que reescreve a posição: `stampH = Math.min(92, Math.max(pH*h, 82))` e `stampY = Math.max(88, Math.min(pH-stampH-120, rawY))`. Em A4 isso força a faixa [88, 629,9].

Consequência: contrato a rogo de uma página, selo posicionado no terço superior → desce ~77pt (cinco linhas) e cobre a cláusula. Aumentar a altura acima de ~0,11 não tem efeito nenhum.

Correção: no caminho MULTI, não passar pelo clamp legado — desenhar o selo conjunto com a geometria de `drawSignerStamp`, apenas incluindo as linhas "A ROGO:". Manter o clamp só para `legacyCustomStamp`.

### Bloco C — Fluxo visto pelo signatário

**FLX-01 · Signatário preso num modal sem saída quando o servidor recusa por regra**
`src/app/assinar/[token]/page.tsx:383-427,1408-1415`; `src/app/api/sign/[token]/event/route.ts:79-97`

O modal `progressRetry` é `fixed inset-0 z-[100]` com **um único botão**: "Tentar salvar novamente". Ele abre para qualquer falha não-transitória, e `/event` devolve 409 sem `retryable` em três recusas por regra (documento cancelado/expirado, documento aprovado, correção não solicitada).

Cenário: o cliente está fotografando o verso quando o escritório cancela o documento. Ele recebe o modal com o texto fixo *"Sua foto ainda não foi confirmada — mantenha a página aberta e tente enviá-la novamente quando a conexão voltar"*, que é factualmente errado, e o `beforeunload` passa a bloquear a saída da aba. O botão vai falhar para sempre.

Correção: em `saveProgress`, separar recusa de regra (409 sem `retryable`, 400, 403 → `fetchSignatureData()` e deixar a tela de estado terminal renderizar) de falha de rede. No modal, segundo botão "Recarregar a página" e título/corpo em função do tipo de falha.

**FLX-02 · Geração dos PDFs do kit dentro do POST /submit; timeout vira erro técnico depois da assinatura salva**
`src/app/api/sign/[token]/submit/route.ts:10,499,510-516`; `page.tsx:1357-1375`

Após o commit, o handler roda serialmente `generateFinalPdfCertificate` + `queueSignatureCompletionMessages` para **cada** documento do kit, com `maxDuration = 60`. No estouro, o runtime devolve 504 em HTML e o front faz `await res.json()` sem guarda → o signatário lê literalmente *"Unexpected token '<', "<!DOCTYPE "... is not valid JSON"* **com todas as assinaturas já gravadas**.

Correção: (a) responder logo após o commit e finalizar por rota interna/fila, ou no mínimo gerar só o documento principal no request; (b) `await res.json().catch(() => ({}))` e usar `res.ok`/`res.status` para a mensagem, nunca `err.message` cru.

### Bloco D — Integridade da prova

**EVD-01 · O servidor aceita qualquer string como foto**
`submit/route.ts:107-112,115,162-166`; `event/route.ts:100-101`

A validação real (recorte, `MAX_LONG_SIDE`, nitidez, luminância) é toda client-side em `DocumentCapture.tsx:285-318` e some com um `curl`. O servidor só testa `typeof === 'string' && trim()`.

Exploração: três `POST /event` com `"imageData":"x"`, depois `POST /submit` com o CPF que a própria tela mostrou → documento vai a `CONCLUIDO`, evento `LIVENESS_CAPTURED` ("Prova de presença ao vivo concluída") é gravado, e a página pública declara `livenessVerified: true` porque `Boolean(s.selfieCenterImage)` é verdadeiro. **O certificado passa a afirmar uma prova de presença que não existe** — é exatamente o lastro que o produto vende. Sem limite de tamanho também: um `imageData` de 50 MB entra na coluna e depois no PDF.

Correção: validar no servidor `^data:image\/(jpeg|png);base64,`, decodificar, conferir magic bytes (`FF D8 FF` / `89 50 4E 47`), dimensões mínimas e byte-length entre ~20 KB e ~4 MB, antes de qualquer `update`. Em `submit` **e** em `event`.

**EVD-02 · A rota pública de verificação entrega CPF e telefone completos e a trilha interna**
`api/verify/[code]/route.ts:41-44,52-71`; `verificar/[code]/page.tsx:282-283,362`

`formatFullCpf` devolve o CPF inteiro e `formatFullPhone` o número inteiro. A página mascara na tela; o JSON em `/api/verify/<code>` não — basta abrir a URL. Pior: o `where` da trilha só exclui `OTP_SENT`, então saem eventos internos com `description` cru, renderizado literalmente: *"Nova foto (selfieCenterImage) solicitada por {nome do funcionário}. Motivo: {texto livre do escritório}"*, `SIGNATURE_RESET`, `DOCUMENT_RESTARTED`.

Consequência: quem tiver um código de verificação vê nome completo, CPF, telefone, cidade/UF, o nome do advogado que pediu a correção e a justificativa interna. Isso é exposição de dado pessoal sem autenticação, com o agravante de o código estar impresso em todas as páginas do PDF.

Correção: mascarar CPF e telefone na rota pública; restringir a trilha a uma allowlist de `eventType` (reusar `certificateEventTypes`) e devolver **rótulo**, nunca `description` livre; dados completos só em rota autenticada por `officeId`.

**ASS-02 · O CPF que confirma a identidade é entregue pela própria tela**
`sign/[token]/route.ts:110,177`; `confirm-identity/route.ts:47`; `submit/route.ts:99`; `page.tsx:557`

O GET devolve `cpf: signer.cpf` completo antes de qualquer prova, e a tela **pré-preenche o campo de confirmação** com esse valor. A "confirmação de identidade" é repetir um dado que o servidor acabou de mandar.

Isso não invalida a assinatura — o lastro é o conjunto de evidências — mas invalida a descrição de "fator de autenticação" no certificado e na página pública. Não dá para vender assim.

Correção: parar de devolver o CPF no GET; tratar a confirmação como registro de ato, não como autenticação; introduzir um desafio independente do link (OTP por canal do escritório, ou dado não exibido) antes de liberar a captura.

### Bloco E — Multi-escritório

**ASS-11 · Seus dados estão fixos no código do gerador de documentos**
`api/kits/generate-package/route.ts:253,267,279,285,289-290`

Nomes e OAB literais, e-mail e telefone literais como fallback, `if (nome.includes('diego'))` / `('dominick')`, UF default `'BA'`. Isso entra no **texto do documento assinado** de qualquer escritório que usar o sistema.

Correção: mover tudo para o cadastro do escritório (`Office`) e para o cadastro de advogados; nenhum literal de pessoa no código. É pré-requisito absoluto do primeiro cliente pagante.

---

## 4. Bloqueadores de venda (P1)

| ID | Achado | Arquivo |
|---|---|---|
| **SEL-03** | Nada impede dois selos sobrepostos: `validateStamps` não compara as caixas entre si; o editor só faz clamp nas bordas. Três selos no mesmo ponto = texto 7pt ilegível e três QRs sobrepostos. | `signer-stamps.ts:25-35`; `SignerStampEditor.tsx:49-53` |
| **SEL-04** | Selo some em silêncio: a fonte encolhe até 4,5pt e, se ainda não couber, `return` sem log e sem aviso. Parte com a rogo e nome longo (9 linhas) não cabe na altura mínima de 0,07. O PDF sai diferente da prévia. | `pdfCertificate.ts:436-441` |
| **SEL-05** | A posição sugerida cobre a legenda impressa abaixo da linha de assinatura, e `suggestStamps` força altura 0,1 (≈84pt em A4 ≈ 5,6 linhas). Aplicada **automaticamente no servidor** sempre que há mais de um participante. | `templateCompiler.ts:541-551`; `signer-stamps.ts:58`; `generate-package:495` |
| **SEL-06** | Casamento nome↔linha por substring sem fronteira de palavra: "ANA PAULA" casa com a legenda de "ANA PAULA REGINA DOS SANTOS". O selo vai para a linha da outra parte. | `signer-stamps.ts:53-56` |
| **CER-01** | A folha de assinaturas — que é parte do contrato — sai com o papel timbrado do AssinaJur, não o do escritório. O comentário do código afirma o contrário. | `pdfCertificate.ts:362-365,693-697` |
| **QUA-04/05** | A revisão na tela, a prévia em PDF e a geração final usam **três mapas de variáveis diferentes**. A revisão mostra "RG nº —" e "Solteiro(a)" onde o PDF acerta; a prévia não roda a genderização. Você aprova uma coisa e envia outra. | `kits/enviar/page.tsx:388-412`; `api/kits/preview/route.ts:110-133` |
| **QUA-06** | `applyDynamicSignatureFooter` pega o último bloco "CONTRATANTE" e substitui o nome anterior por `{{cliente_nome}}`. Com dois blocos de assinatura, a linha da 2ª parte exibe o nome do cliente principal. | `templateCompiler.ts:339-388` |
| **QUA-07** | O gênero do cliente é aplicado ao parágrafo inteiro. "MARIA…, e JOÃO SILVA, brasileiro(a), solteiro(a)" no mesmo parágrafo → João sai "brasileira, solteira". | `templateCompiler.ts:102-127` |
| **QUA-08** | Na tela de kit, escolher "Testemunha" no seletor faz o cartão sumir (o filtro exclui esse papel, o select oferece), e o envio trava com "todos os signatários precisam ter nome e CPF" sem campo visível para corrigir. Bloqueio total. | `kits/enviar/page.tsx:852,883,913-965` |
| **QUA-09** | Fora do fluxo a rogo as testemunhas não são renumeradas: ambas ficam `TESTEMUNHA` e o certificado rotula as duas como "1ª Testemunha Instrumentária". | `documentos/novo/page.tsx:991`; `api/documents/route.ts:222-227` |
| **QUA-10** | E-mail, telefone e CEP sem validação alguma no servidor. E-mail errado em signatário com `EMAIL_OTP_CPF` = link que nunca chega, sem erro visível. | `api/documents/route.ts:186-188`; `generate-package:150-153` |
| **FLX-03** | Qualquer 502/cold start no carregamento vira a tela vermelha **"Link de Assinatura Inválido"** com a mensagem técnica embaixo, sem botão de tentar de novo. O cliente conclui que o link morreu. | `page.tsx:532-534,610-612` |
| **FLX-04** | `/submit` trava a linha do **Office**, não a do documento: duas assinaturas simultâneas no mesmo escritório são enfileiradas, e um admin aprovando um pacote pode bloquear por 20s. Diferente de `/event`, `/submit` não tem retry de conflito. | `submit/route.ts:42,505,519`; `document-review.ts:25,111` |
| **FLX-05** | Falha do PDF e do aviso é engolida — o segundo `catch` está literalmente vazio, sem log. `certificatePending` não leva a nada: o front nunca lê, e o retry não regenera. O documento fica `CONCLUIDO` sem `signedFileId` e `reviewDocument` recusa a aprovação para sempre. | `submit/route.ts:509-516,63-68` |
| **FLX-06** | `configuredGroups` lança exceção antes dos checks de estado e derruba o link de **todos** os participantes com 500 genérico. Os dois `signer.create` de testemunha em `/submit` não passam `signatureOrder` e caem no default 1, que é um caminho para essa divergência. | `participant-groups.ts:10-18`; `sign/[token]/route.ts:63` |
| **EVD-03** | `verificationCode` gerado com `Math.random()` (PRNG previsível), sem rate limit em lugar nenhum do `src/`. Códigos são impressos em todas as páginas do PDF. Permite derivar e consultar códigos de documentos de outros escritórios — que, por EVD-02, devolvem CPF e telefone. | `pdfCertificate.ts:33-42` |
| **EVD-04 / ASS-15** | `/api/sign/[token]/document` serve o original de documento **cancelado, expirado ou já aprovado**, sem checar estado nem ordem, com `Access-Control-Allow-Origin: *` e `frame-ancestors *`. Qualquer site pode embutir o PDF do cliente com o token vazado. Tokens antigos continuam válidos depois do `restart-document`. | `sign/[token]/document/route.ts:12-44,59-60` |
| **EVD-05** | A trilha pública mantém só a **primeira** ocorrência de cada tipo de evento. Depois de "refazer foto", a foto é a nova mas o certificado exibe a data e o IP da captura antiga, e a substituição fica invisível (`PHOTO_REDO_*` não está na allowlist). O PDF é regerado com novo hash sob o **mesmo** código de verificação. | `publicAuditTrail.ts:12-18`; `pdfCertificate.ts:322-331` |
| **ASS-09** | Criação do kit ainda não é atômica: loop com `document.create` + `signer.create` sem `$transaction`. | `generate-package/route.ts:431,500,528` |
| **ASS-12** | A consulta por código não verifica o arquivo apresentado — só exibe os hashes armazenados, e devolve `valid: true` até para documento `CANCELADO`. | `api/verify/[code]/route.ts:74` |
| **SEG-11** | Nenhum controle de abuso: `grep -rn "rateLimit\|throttle\|429" src/` = zero. | — |

---

## 5. Melhorias (P2)

`SEL-08` `decodeStamps` lança dentro da geração sem fallback — um dado de layout inválido bloqueia a emissão da prova para sempre · `CER-02` o QR do selo individual não é individual (é o código do documento, sem rótulo) · `SEL-09` editar um acento em qualquer participante apaga silenciosamente os selos de todas as minutas do lote · `FOL-01` cabeçalho "TESTEMUNHAS" pode ficar órfão no rodapé · `CER-03` `readFileSync` do timbrado sem guarda de existência · `FLX-07` a tela de espera pisca o spinner a cada 12s · `FLX-08` `witness1`/`witness2` em `/submit` são código morto e inconsistente · `FLX-09` `return NextResponse` de dentro da `$transaction` commita · `FLX-10` mensagens de estado terminal genéricas em `/submit` · `FLX-11` kit antigo (`kitBatchId` nulo) é pacote no painel e avulso na assinatura · `QUA-11` órgão emissor do RG gravado e nunca usado · `QUA-12` papel "PARTE" impresso cru no selo · `QUA-13` campos do a rogo gravados fora do fluxo a rogo · `EVD-06` `confirm-identity` sem transação, repetível sem custo.

---

## 6. Ordem de execução sugerida

Cada bloco é um commit e um deploy, com conferência do inventário antes e depois, como nas etapas anteriores.

**Etapa 1 — Parar o sangramento (nada disso exige migração).**
`SEL-07` (MULTI vazio apaga o carimbo) · `QUA-03` (editor da revisão) · `QUA-02` (token vazio) · `FLX-01` (modal sem saída) · `FLX-05` (catch vazio + regeneração do certificado). São correções pequenas em pontos conhecidos e resolvem defeitos que provavelmente já estão saindo em documentos reais.

**Etapa 2 — Fechar a prova.**
`EVD-01` (validar imagem no servidor) · `EVD-02` (mascarar a rota pública e filtrar a trilha) · `EVD-04` (guardas em `/document` e remover CORS `*`) · `EVD-03` (código com `crypto.randomBytes` + rate limit). Sem esta etapa o certificado afirma o que não pode provar, e é o que um comprador técnico vai testar primeiro.

**Etapa 3 — Geometria do selo.**
`SEL-01` (CropBox/rotação, começando pela recusa defensiva) · `SEL-02` (selo conjunto no caminho MULTI) · `SEL-03` (sobreposição) · `SEL-04` (piso de fonte e aviso) · `SEL-05` (ancorar acima da linha) · `SEL-06` (casamento por token) · `CER-01` (timbrado do escritório na folha). Esta etapa precisa de **teste visual com PDFs reais**: um com `/Rotate 90`, um com CropBox ≠ MediaBox, um contrato a rogo com nome de 35+ caracteres e uma minuta de kit com duas linhas de assinatura.

**Etapa 4 — Qualificação da segunda parte (a que você pediu).**
`QUA-01` com migração de schema: colunas de qualificação em `Signer` (ou tabela `SignerQualification`), tokens `{{parte2_*}}` e `{{testemunha*_*}}`, formulário nas duas telas. Junto: `QUA-04/05` (fonte única de variáveis para revisão, prévia e geração — é o que impede a divergência voltar), `QUA-06`, `QUA-07`, `QUA-08`, `QUA-09`, `QUA-10`. Backup verificado e recuperação testada antes da migração.

**Etapa 5 — Multi-escritório.**
`ASS-11` (tirar seus dados do código) · `ASS-09` (kit atômico) · `FLX-04` (lock por documento) · `FLX-02` (finalização fora do request) · `SEG-11` (rate limit). É a etapa que transforma "o sistema do seu escritório" em "produto".

Depois disso ainda restam, do plano geral: `SEG-01`/`SEG-02` (credenciais), `OPE-01` (build sincronizando schema), homologação em celular físico, e o bloco comercial `PRO-*`/`COM-*`.

---

## 7. O que está correto e não precisa mexer

- **Handoff "mesmo aparelho" com N participantes** fecha a cadeia: `/submit` calcula `nextSigner` pelo menor `signatureOrder` pendente e só devolve token quando `signingMode === 'SAME_DEVICE'`.
- **Retomada entre foto e assinatura** está sólida, inclusive para o assinante a rogo: `saveProgress` é aguardado antes de trocar de etapa, o GET devolve as fotos já salvas e `handleConfirmCpf` reentra na etapa exata.
- **Idempotência do reenvio final**: o early-return `alreadySigned` devolve 200 com os pendentes em vez de duplicar ou quebrar.
- **Retry de conflito Serializable em `/event`** (4 tentativas, backoff com jitter, `isRetryableConflict` cobrindo P2034/40001/40P01) resolveu de fato o erro da selfie. É o padrão que falta em `/submit`.
- **Propagação de kit é bem guardada**: `sameParticipants` compara ordem+papel+CPF antes de copiar, `isIndividualRetry` corta a propagação no refazer individual, e `signedFileId`/`signedHash` são zerados quando a foto muda.
- **Imutabilidade do documento aprovado** está implementada em camadas coerentes — geração, revisão, exclusão individual e em lote — com lock otimista por `updatedAt`.
- **Isolamento entre escritórios no caminho auditado** é consistente: toda consulta de documento carrega `officeId`, e `kit-security.ts` fechou o vínculo cruzado de modelos.
- **Validação do formato MULTI** cobre página inexistente, coordenadas fora de faixa, ordem duplicada ou inexistente, mais selos que participantes e JSON malformado. A retrocompatibilidade de `BOTTOM`/`TOP`/margens/`CUSTOM:` está intacta.
- **Participante sem posição cai mesmo na folha** — ninguém some do PDF.
- **Testemunha não consegue ser salva sem nome e CPF válido**, e o CPF é validado por dígito verificador nas duas rotas de criação.

---

## 8. Limites desta auditoria

Nada foi executado: sem `tsc`, sem testes, sem banco, sem render de PDF, sem navegador. Os cenários de geometria (SEL-01, SEL-02, SEL-04, SEL-05) são aritmética sobre o código com A4 e métricas Helvetica estimadas — precisam de confirmação visual. O comportamento exato do pdf-lib com `/Rotate` deve ser conferido antes de dimensionar a correção de SEL-01.

Ficaram fora do snapshot lido e **não** foram reavaliados: `src/lib/prisma.ts`, `auth.ts`, `storage.ts`, `pdfHash.ts`, `whatsapp/signatureCompletion.ts`, rotas de upload, `templates/word`, `admin/*`, `integrations/*`, `api/clients/*`, `api/office*`, `public/certificado/` e `prisma/migrations/`. Portanto `SEG-01`, `SEG-02`, `SEG-05` a `SEG-09`, `SEG-12`, `SEG-13`, `ASS-08`, `ASS-10` e `ASS-13` seguem como estavam no plano.

As alterações não commitadas de 11/09 01:16–01:32 foram lidas no estado em disco, mas **não foram type-checadas nem testadas** nesta sessão. Rodar `npx tsc --noEmit` e `git diff` antes de qualquer commit.
