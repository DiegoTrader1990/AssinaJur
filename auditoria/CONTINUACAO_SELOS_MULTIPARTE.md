# Continuação — Selos independentes por signatário

Documento de passagem entre sessões. Escrito em 10/09/2026, no fim de uma sessão
longa em que o terminal da máquina caiu e impediu rodar type-check e commit.

**Leia este arquivo inteiro antes de mexer no código.** Ele existe para você não
precisar redescobrir o que já foi investigado.

---

## 1. Como este projeto funciona

- **Projeto:** AssinaJur — SaaS jurídico de assinatura eletrônica (Next.js + Prisma + Postgres/Supabase).
- **Produção:** https://www.assinajur.com.br — Vercel, projeto `diegos-projects-5d58e965/assinajur`.
- **Publicação:** o Diego commita e dá push pelo **GitHub Desktop**; o Vercel constrói sozinho a partir da branch `main`. Leva ~2 minutos.
- **Conferir o deploy:** página Overview do projeto no Vercel mostra o commit em produção e o status. A lista "Deployments" costuma travar carregando com filtros antigos aplicados — use a Overview.
- **`_to_delete/`** está no `.gitignore` desde 10/09. É a pasta de rascunho de manutenção. Não commite nada de lá.
- Ao rodar `npx tsc --noEmit`, erros vindos de `_to_delete/` são de cópias antigas e **não** contam.

### Sobre o Diego (importante para calibrar o trabalho)

Ele é o advogado e testa em produção, com clientes reais, logo depois de cada
push. Isso significa:

- Erro visível para o signatário é inaceitável — não é questão de estética, é o cliente dele no meio de uma assinatura.
- Ele valoriza avaliação honesta acima de confiança afirmada. Se algo não foi verificado, diga que não foi.
- Ele percebe detalhes de redação jurídica (concordância de gênero, pontuação, endereço repetido) e cobra correção.

---

## 2. O que foi feito nesta sessão (tudo já em produção, salvo o item 3)

Commits publicados em 10/09:

| Assunto | O que mudou |
|---|---|
| RG opcional (CIN) | RG do assinante a rogo deixou de ser obrigatório; quando não há RG, o trecho "portador(a) do RG nº ..." é removido do documento em vez de sair em branco. Nova função `removeEmptyRgFromQualification` em `src/lib/kitTemplateNormalization.ts`, aplicada em `kits/generate-package`, `kits/preview` e `whatsapp/agent`. |
| Qualificação | Endereço deixa de aparecer duas vezes quando representante/rogo mora com a parte (`removeDuplicateClientAddressWhenShared`); ponto final sobrando em "CONTRATANTE., neste ato"; concordância de gênero no trecho da própria cliente (`applyClientGenderToQualification`). |
| Gênero e pontuação | Estado civil "Solteiro(a)" vira "Solteira"/"Solteiro" (`genderizeNeutralWord`); campo **Gênero** adicionado na tela Equipe (a API já aceitava, faltava onde preencher); `trimTrailingPeriod` no fim da qualificação dos patronos (saía "CEP 45810-000.."). |
| Travamentos do fluxo | Testemunha presa em "Aguarde sua vez" (a tela só sabia entrar no estado, nunca sair); pedido de refazer foto engolido quando o signatário reabria o link na mesma sessão do navegador. |
| Foto e marca | Foto do documento passou a ser obrigatória (removido "Pular esta etapa"); o signatário passa a ver a marca do escritório em vez de "AssinaJur"; textos das "três fotos" e "RG ou CNH" atualizados (CIN). |
| Certificado e testemunha | Aviso de conclusão deixou de depender do certificado (estavam no mesmo `try`); papel da 1ª testemunha corrigido de `TESTEMUNHA` para `TESTEMUNHA_1`. |
| Selfie | **Erro "Não foi possível salvar"** na captura da selfie. Ver seção 5 — vale entender o padrão, porque pode reaparecer em outro lugar. |

### Pendências pequenas, já mapeadas

- **Gênero da Dra. Dominick:** o campo agora existe em Equipe, mas precisa ser preenchido uma vez para o contrato sair "advogada, inscrita" em vez de "advogado(a), inscrito(a)".
- **Sete códigos de evidência descartados:** `FRONT_APPROVED`, `BACK_APPROVED`, `FRONT_RETAKE`, `BACK_RETAKE`, `FRONT_REJECTED`, `BACK_REJECTED`, `CAMERA_DENIED` são emitidos pelo `DocumentCapture` mas não constam de `EVENT_DESCRIPTIONS` em `src/app/api/sign/[token]/event/route.ts`, então tomam 400 e nunca chegam à trilha. **Recomendação registrada: não incluir.** São redundantes com os códigos que já existem e, pior, ao serem aceitos passariam a abrir a transação Serializable no mesmo instante em que a foto do documento é salva — recriando a disputa descrita na seção 5. Hoje são rejeitados *antes* da transação, e é por isso que a foto do documento nunca deu erro.

---

## 3. ATENÇÃO — alteração pronta e NÃO commitada

`src/lib/pdfCertificate.ts` tem no disco a **Folha de Assinaturas**, escrita e
com sintaxe validada, mas **sem type-check completo e sem commit**.

O que ela faz: para documentos com mais de uma PARTE (`needsSignaturePage`),
acrescenta uma página com o timbre do escritório depois do documento e antes do
certificado, contendo um bloco por parte (papel, nome, CPF, horário, evidências)
e um bloco compacto de testemunhas, mais rodapé com QR e base legal. O selo das
páginas do contrato passa a dizer "2 PARTES + 2 TESTEMUNHAS" em vez do enganoso
"N PARTICIPANTES COM EVIDÊNCIAS INDIVIDUAIS".

Marcadores para localizar: `needsSignaturePage`, `documentParties`,
`documentWitnesses`, comentário `── 1.5. FOLHA DE ASSINATURAS`.

**Primeira coisa a fazer:** rodar `npx tsc --noEmit` e conferir esse arquivo. Ele
é a base sobre a qual o resto (seção 4) vai ser construído.

---

## 4. O trabalho a fazer: selos independentes por signatário

### O que o Diego pediu, nas palavras dele

> "tem que ter selos independentes, e no caso as testemunhas também tinha que ter
> selo independente podendo ser mais simplificado as testemunhas"

E sobre a tela de ajuste:

> "eu seleciono cada signatario ou testemunha e libera a opção selo de fulano ai
> eu ajusto o lugar que aquele selo irá ficar (...) na propria pagina onde eu
> ajusto o selo tenha o nome de todos então ao ativar cada nome eu escolho o
> selo, ou se já aparecer todos os selos de vez eu vou ajustando um por um (...)
> seria apenas para identificar o selo com mais facilidade e não ficar um
> embolado em cima do outro"

Ou seja: **um selo por participante**, posicionável individualmente, com a lista
de nomes na tela de revisão servindo para identificar/realçar qual selo é qual.

### Sobre validade (alinhamento já feito com ele)

Ele perguntou se são os selos que dão validade. **Não são** — numa assinatura
eletrônica fora da ICP-Brasil (MP 2.200-2 / Lei 14.063), o que sustenta o ato é
o lastro: certificado de evidências, hash SHA-256, trilha de eventos e página
pública de verificação. Tudo isso já funciona hoje e já cobre cada signatário
individualmente (`pdfCertificate.ts` percorre `doc.signers` em três pontos).

O valor dos selos independentes é de **aceitação prática**: quem olha o papel é
juiz, cartório, INSS, banco. Documento que mostra visualmente uma assinatura só
gera questionamento e retrabalho. Ele entendeu e concordou com essa distinção —
não precisa reabrir o assunto, mas também não repita que "o selo dá validade".

### Estado atual do código (já investigado — não precisa refazer)

**Armazenamento — o gargalo:**
`Document.signaturePosition` é `String @default("BOTTOM")` (schema linha ~310).
Um campo, uma posição. Formatos aceitos hoje: `BOTTOM`, `TOP`, `LEFT_MARGIN`,
`RIGHT_MARGIN`, `CUSTOM:page:x:y:width:height`.

**Compilador — a boa notícia:**
`src/lib/templateCompiler.ts` **já encontra todas as linhas de assinatura**:

- `explicitSignatureLineIndexes` (~linha 489) lista **todos** os parágrafos que começam com `_____` (regex `/^_{5,}/`).
- Dentro do laço de parágrafos (~linha 537), para cada linha de assinatura ele calcula `signaturePlacement = { page, x, y, width, height }` — **e sobrescreve a anterior**. Só a última sobrevive.
- `compileTemplateToPdf` retorna `signaturePlacement` (singular, ~linha 646), e `position` vira a string `CUSTOM:...` (~linha 713).

Ou seja: **a informação de onde fica a linha de cada parte já é calculada e
descartada.** Não é preciso inventar detecção nova.

**Desenho — `src/lib/pdfCertificate.ts`:**
Dentro de `originalPages.forEach`, o bloco `if (customStamp)` desenha UM selo
(nome/resumo, CPFs, "ASSINATURA ELETRÔNICA QUALIFICADA", data, código, traço
dourado e QR). É esse bloco que precisa virar função reutilizável.

**Editor — `src/app/(dashboard)/kits/enviar/page.tsx`:**
- `stampDraft` (~linha 145) = **um** selo `{ page, x, y, width, height }`.
- `stampOverrides` (~linha 143) = `Record<templateId, selo>` — um selo por minuta do kit.
- Arrastar e redimensionar sobre prévia renderizada com pdf.js (~linhas 605-632).
- Enviado como `stampOverrides` para `/api/kits/generate-package`.
- **Verificar** se `documentos/novo/page.tsx` tem editor equivalente (o documento avulso também precisa).

### Plano proposto

**Formato de armazenamento — sem migração.** Guardar N posições no mesmo campo:

```
MULTI:[{"o":1,"p":1,"x":0.31,"y":0.62,"w":0.38,"h":0.085},{"o":2,...}]
```

`o` = `signatureOrder` do signatário (estável e já conhecido na tela de revisão,
antes de os `Signer` existirem no banco). Os formatos antigos continuam sendo
lidos normalmente — documentos já emitidos não mudam de comportamento.

**Compilador:** passar a retornar `signaturePlacements: []` com todas as
posições encontradas (mantendo `signaturePlacement` para compatibilidade), para
os selos já nascerem no melhor palpite.

**Certificado:** extrair o desenho do selo numa função
`drawSignerStamp(page, box, signer, variant)`; desenhar um por signatário na
posição dele; `variant: 'PARTE'` (nome, CPF, horário, QR) e
`variant: 'TESTEMUNHA'` (menor, **sem QR** — papel, nome, CPF, horário).
Manter o fluxo a rogo exatamente como está: cliente + assinante a rogo são UMA
parte assinando em conjunto, e o selo conjunto atual já foi validado pelo Diego.

**Editor:** `stampOverrides` vira
`Record<templateId, Record<signatureOrder, selo>>`; renderizar um retângulo
arrastável por participante; lista de nomes ao lado, clicar no nome realça e
traz para frente o selo daquela pessoa; posições iniciais deslocadas entre si
para nunca nascerem empilhadas.

**Quem fica sem linha na minuta:** cai na Folha de Assinaturas (seção 3), que
serve de rede de segurança. Nunca inventar posição — selo cobrindo cláusula é o
pior defeito possível num documento jurídico, e já aconteceu antes neste projeto
(há comentário no `templateCompiler.ts` sobre isso, ~linha 617).

### Ordem sugerida de entrega

1. Commitar/validar a Folha de Assinaturas (seção 3).
2. Formato `MULTI:` + compilador devolvendo todas as posições + certificado desenhando por signatário, com posicionamento automático. Já dá para gerar um acordo de duas partes e ver dois selos.
3. Editor com a lista de participantes e o arrastar por pessoa.

---

## 5. O padrão de erro da selfie (vale conhecer)

Sintoma: ao capturar a selfie, aparecia "Não foi possível salvar. Atualize a
página e tente novamente." — e ao tocar em "Tentar salvar novamente", funcionava.

Causa: a tela disparava **duas** chamadas quase simultâneas para
`/api/sign/[token]/event` (o evento da trilha, sem `await`, e o salvamento da
foto). A rota abre transação `Serializable` e ainda trava a linha do documento
com `SELECT ... FOR UPDATE`. As duas colidiam, o Postgres abortava uma com erro
de serialização, e um `catch` **vazio** convertia isso na mensagem genérica.

Pista que confirmou: a selfie do assinante a rogo **nunca** dava erro — porque
naquele caminho o evento não é emitido, então há uma requisição só.

Correção aplicada (três camadas):
1. A tela envia um de cada vez, começando pela foto (o que não pode se perder).
2. A rota repete a transação sozinha em conflito/deadlock (`isRetryableConflict`, até 4 tentativas).
3. A tela tenta em silêncio até 3× antes de exibir qualquer aviso; recusas por regra (link cancelado, documento aprovado) continuam aparecendo na hora, via marca `retryable` na resposta.

O `catch` vazio virou `console.error` com o erro real — **se voltar a falhar,
agora há log no servidor.**

**Lição para o futuro:** qualquer chamada nova a `/api/sign/[token]/event` que
possa sair junto de outra vai disputar a mesma linha. Serialize no cliente.

---

## 6. Fatos do código que custaram a descobrir

- `Signer.status` é `String` simples, sem enum — introduzir estados novos não pede migração.
- `DocumentEvent.metadata` é `String?`, usado com `JSON.stringify({ field })` nos pedidos de refazer foto.
- `Document.signedFileId` guarda o certificado em cache; `api/documents/[id]/download` só regenera quando ele é nulo. **Depois de trocar qualquer foto, zere `signedFileId`.**
- `ASSINANTE_A_ROGO` sempre tem `Signer` próprio com token individual, criado junto do documento — mesmo quando capturado no mesmo aparelho. É isso que faz o "refazer foto" funcionar para ele sem nenhuma mudança de backend.
- Kits antigos podem ter `kitId` preenchido e `kitBatchId` **nulo**. Toda lógica de pacote (aprovar/refazer/agrupar) precisa do fallback por `kitId` + cliente + janela de 2h — já implementado em `resolvePackageTargets` (backend) e `resolveLegacyPackageMembers` (frontend).
- A listagem `/api/clients` foi enriquecida com processos, documentos e pendências + `movementSummary` calculado no servidor; antes a Central de Clientes mostrava tudo zerado porque o componente lia campos que a API nunca enviava.
- O papel da testemunha é gravado como `TESTEMUNHA_1`/`TESTEMUNHA_2` na criação (`api/documents` e `api/kits/generate-package` renomeiam), não `TESTEMUNHA`.

---

## 7. Checklist para a primeira mensagem da sessão nova

1. `npx tsc --noEmit` — confirmar que o projeto compila e revisar a Folha de Assinaturas (seção 3).
2. Conferir `git log --oneline -5` e `git status` — ver o que está commitado e o que não está.
3. Confirmar com o Diego que a Folha de Assinaturas pode ir junto, ou se ele prefere validar antes.
4. Seguir a ordem da seção 4.
