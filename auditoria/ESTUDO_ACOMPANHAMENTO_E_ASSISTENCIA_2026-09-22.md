# Estudo — visibilidade de etapas, assistência ao vivo e modo facilitado

22/09/2026. Responde a três pedidos: (1) por que o painel parou de mostrar em que etapa o signatário está, (2) formas de ajudar a pessoa em tempo real durante a assinatura, (3) um modo facilitado sem fotos. Leitura de código no estado atual do repositório (`HEAD` = `b9ffed7`, igual ao `origin/main`); nada foi executado.

---

## 1. Por que sumiu a visibilidade da etapa

**Não sumiu por acidente — foi um efeito colateral direto de uma correção de segurança necessária, que ficou incompleta.**

Em 08–11/09 a auditoria apontou (EVD-01) que o servidor aceitava qualquer string como foto — sem checar se era mesmo uma imagem. Isso foi corrigido: `src/lib/evidence-image.ts` agora decodifica o base64, confere o cabeçalho JPEG/PNG e força a decodificação completa via `sharp` antes de aceitar a foto (`event/route.ts`, função `validateEvidenceImage`). Correta e necessária — sem ela, o certificado podia atestar uma "prova de presença" que nunca existiu.

O problema é o que acontece **quando a validação recusa uma foto real**. Olhando `src/app/api/sign/[token]/event/route.ts`:

```
if (imageField && imageData && SAVABLE_IMAGE_FIELDS.has(imageField)) {
  try { await validateEvidenceImage(imageData); }
  catch { return { status: 400, body: { error: 'A foto está inválida...' } }; }
  await tx.signer.update({ ..., status: ... 'EM_ANDAMENTO' ... });
  ...
}
```

Quando a validação falha, a função **retorna antes de qualquer gravação** — nem `signer.status` muda, nem existe `documentEvent.create` para essa tentativa. Do lado do painel, `src/app/(dashboard)/documentos/page.tsx` decide o que mostrar assim:

- Se `signer.status === 'EM_ANDAMENTO'` → badge "Em andamento" com o detalhe (`signerProgressDetail`, que olha `documentFrontImage`, `documentBackImage`, `selfieCenterImage` e o evento `LIVENESS_STARTED`).
- Se `signer.status === 'VISUALIZADO'` → badge "Link aberto", **sem detalhe nenhum**.

Como a recusa de validação nunca chega a gravar nada, um signatário que tentou tirar a foto cinco vezes e foi recusado cinco vezes continua com `status: VISUALIZADO`. O painel mostra exatamente o mesmo "Link aberto" de quem nunca abriu a câmera. Foi isso que aconteceu com sua cliente: ela estava travada tentando, e o sistema não tinha como diferenciar isso de "ainda não começou" — porque a tentativa recusada não deixa rastro nenhum, nem para o signatário (mensagem genérica "A foto está inválida ou incompleta") nem para você.

Reforça o diagnóstico: a própria função de validação não tem nenhum log — nem `console.error`, nem `DocumentEvent`. Mesmo olhando o log do servidor agora, não dá para saber quantas vezes a validação recusou uma foto, nem por quê.

### Uma suspeita técnica concreta sobre a causa raiz

`validateEvidenceImage` usa `sharp(bytes, { failOn: 'warning' })`. Esse modo é mais rígido do que parece: ele recusa a imagem em qualquer **aviso** do decodificador, não só em erro real — e é conhecido por recusar fotos legítimas de celular que tenham perfil de cor incomum, EXIF malformado ou pequenas inconsistências que várias câmeras Android/iPhone produzem e que todo visualizador de imagem normal ignora sem problema. Não tenho como confirmar isso sem reproduzir com uma foto real do aparelho da sua cliente, mas é a explicação mais provável para "foto real, sistema recusa, cliente trava" — e bate com o padrão: se fosse só uma foto ruim (embaçada, cortada), a orientação por telefone ("tire de novo, comn boa luz") resolveria; se é a validação rejeitando um formato específico do aparelho dela, nenhuma nova tentativa vai passar.

### Correção recomendada, em duas partes

**Parte 1 — nunca mais ficar cego a uma tentativa que falhou (isto é o que resolve "não vi em que etapa ela estava").**
Quando `validateEvidenceImage` recusa, gravar mesmo assim um `DocumentEvent` (ex.: `PHOTO_VALIDATION_REJECTED`, com o campo e o motivo técnico no `metadata`) e, se o signatário ainda está em `PENDENTE`/`VISUALIZADO`, mover para `EM_ANDAMENTO` — a pessoa claramente está tentando, mesmo que a foto em si não seja salva. No painel, `signerProgressDetail` passa a mostrar algo como "tentou enviar a foto de [frente/verso/selfie] N vezes, recusada pelo sistema" — que é exatamente a informação que você precisava para ajudar sua cliente por telefone.

**Parte 2 — parar de recusar fotos boas.** Trocar `failOn: 'warning'` por `failOn: 'error'` (só recusa o que é de fato inválido/corrompido) e registrar o motivo específico da recusa (dimensão pequena demais, formato não suportado, decodificação falhou) em vez da mensagem genérica única — tanto no log quanto, de forma simplificada, para o signatário ("a foto ficou pequena demais, afaste menos a câmera" é acionável; "está inválida ou incompleta" não é).

Isso é uma correção pequena e localizada — não desfaz a validação de segurança, só para de ser cega quando ela age.

---

## 2. Formas de ajudar a pessoa em tempo real durante a assinatura

Você pediu para "pensar em todas as formas". Organizei por esforço de implementação, do que já dá para usar hoje até o que exige construir infraestrutura nova.

### Nível 0 — Usável hoje, sem nenhuma linha de código

**Chamada de vídeo do WhatsApp com "compartilhar tela".** O próprio WhatsApp (Android e iPhone) permite compartilhar a tela durante uma chamada de vídeo. Você liga para a cliente, pede para ela compartilhar a tela do celular, e vê exatamente o que ela vê enquanto fala com ela — sem built nada. É a forma mais rápida de resolver o problema imediato, e funciona hoje mesmo. Vale documentar isso como orientação padrão da equipe: "se o cliente travar, peça uma chamada de vídeo com tela compartilhada."

Isso não substitui a Parte 1 acima (você ainda precisa SABER que alguém travou antes de ligar), mas resolve "quero ver a tela dela e falar em tempo real" imediatamente.

### Nível 1 — Pequeno, incremental, dá para construir em poucos dias

**Botão "Pedir ajuda" na tela de assinatura**, que (a) dispara uma notificação para o escritório (WhatsApp/e-mail/painel) com o link do documento e a etapa exata onde a pessoa está, e (b) abre automaticamente uma chamada — mais fácil ainda se for um link `tel:` para o telefone do escritório, ou um link do WhatsApp Business pré-preenchido com o nome do documento. Não é tempo real "ver a tela", mas fecha o loop de "a pessoa está travada e não sabe como pedir ajuda" — que hoje simplesmente não existe: ela fecha a aba e desiste, ou liga sem contexto nenhum e vocês perdem tempo descobrindo em que ponto ela está.

Isso combina bem com a correção da seção 1: o painel já mostraria "tentou 4 vezes, recusada" — o botão de ajuda leva isso direto para quem vai atender.

### Nível 2 — Assistência ao vivo de verdade (ver a tela + falar), via serviço pronto

Construir WebRTC (chamada de vídeo/tela compartilhada) do zero é trabalho de semanas: sinalização, TURN/STUN para atravessar redes móveis/Wi-Fi de terceiros, gravação, compatibilidade de navegador. O projeto hoje não tem nenhuma dependência desse tipo (`package.json` não tem `ws`, `socket.io`, `pusher`, `twilio` nem similar) — seria começar do zero.

O caminho realista é embutir um serviço pronto na própria tela de assinatura, como um botão "Falar com o escritório agora":

- **Chamada de vídeo com compartilhamento de tela embutida na página** (Daily.co, LiveKit Cloud, Twilio Video): você adiciona um componente que, ao ser acionado, abre uma sala de vídeo dentro da própria tela de assinatura — a cliente nem precisa sair do navegador nem instalar nada, e pode compartilhar a tela do próprio aparelho com um clique (a API `getDisplayMedia` do navegador). Do seu lado, você atende num link do painel. Custo é por minuto/participante, na faixa de centavos — para o volume que você tem hoje, provavelmente free tier. Este é o mais alinhado ao que você descreveu: "eu ver a tela dela e abrir um áudio para explicar."
- **Co-navegação (co-browsing) de terceiros** (Surfly, Upscope): em vez de compartilhar a *tela*, esses serviços deixam você ver e (se quiser) interagir com a *própria página* que a cliente está usando, em tempo real, com um botão de voz embutido — sem pedir permissão de tela do sistema operacional, que costuma ser o ponto onde pessoas menos familiarizadas com tecnologia travam. Tecnicamente mais robusto para o seu caso de uso (assinar um documento) do que compartilhamento de tela genérico, mas é outro fornecedor externo com acesso à sessão do cliente — vale avaliar o contrato de dados deles à luz da LGPD antes de assinar.

Recomendação: comece pelo Nível 0 e Nível 1 imediatamente (custo zero, resolve o problema relatado). Trate o Nível 2 como um projeto separado, iniciado só depois que os bloqueadores de venda da auditoria de assinatura estiverem fechados — é uma feature nova de UX, não uma correção de bug, e mistura escopo com a superfície de dados sensíveis do fluxo de assinatura (mais uma coisa acessando CPF, foto de documento e selfie da cliente).

---

## 3. Modo de assinatura facilitada (sem fotos)

O Codex já fez uma primeira exploração hoje — `auditoria/ESTUDO_ASSINATURA_SEM_FOTOS_2026-09-22.md` (ainda não commitada, no estado atual do repositório). Li o documento inteiro; é um bom ponto de partida e não vou duplicá-lo. Resumo do que ele já cobriu bem, e o que eu acrescento por cima.

**O que já está coberto:** 10 testes automatizados confirmam que o comportamento *atual* (com fotos obrigatórias) segue firme — nada foi afrouxado ainda. Uma lista de 8 pontos a resolver antes de testar com cliente real: quem escolhe a modalidade (tem que ser o escritório, autenticado, nunca um parâmetro vindo do navegador do signatário), o que acontece se a modalidade mudar no meio da sessão, o texto de aceite vinculado ao hash do documento, identificação correta de representante/curador, registro de geolocalização honesto (sem fingir GPS a partir de IP), e ajuste dos textos do certificado para não alegar biometria ou prova que não existe.

**O que eu acrescento, olhando pela lente da auditoria de 11/09:**

1. **Isso reabre exatamente o item ASS-02 já identificado**: hoje o CPF que "confirma identidade" no fluxo com fotos já é o mesmo CPF que o servidor acabou de mostrar na tela — ou seja, mesmo o fluxo atual, com fotos, já tem uma autenticação fraca nesse ponto específico. Um modo sem fotos que também dependa só de confirmar CPF fica com a **mesma fragilidade, sem a fotografia e a selfie para compensar**. Se for para lançar o modo facilitado, esse é o momento de também resolver ASS-02 (não repetir o CPF na tela de confirmação), senão o modo fica mais fraco em dois pontos ao mesmo tempo.

2. **Consentimento informado do signatário sobre a própria modalidade.** O estudo já cobre o aceite vinculado ao documento; eu acrescentaria: a tela precisa deixar claro *para o signatário*, não só para o certificado, que aquele documento está sendo assinado num modo com menos verificação — para que a pessoa (ou quem for usar o documento depois — cartório, banco, INSS) não presuma o mesmo nível de prova do modo padrão. Onde isso aparece: no próprio selo/certificado (já apontado no estudo) e, adicionalmente, sugiro uma linha visível na tela de assinatura antes do aceite, não só no rodapé do PDF.

3. **Quando usar isso é uma decisão sua, caso a caso — não um recurso genérico do produto ainda.** Dado que a jurisprudência citada no próprio estudo ("desde que não haja dúvida sobre a autenticidade") condiciona a validade a não haver contestação, eu não ativaria isso como opção padrão nem para clientes desconhecidos — no máximo para casos que você já conhece pessoalmente (o que é boa parte da sua carteira, dado que você mesmo assina com clientes reais logo após cada deploy). Isso muda o desenho: não precisa ser uma modalidade que qualquer signatário possa acionar, pode nascer restrita a "somente quando o escritório marca manualmente, documento por documento" — o que é, aliás, exatamente o ponto 1 da lista do Codex.

4. **Antes de programar qualquer linha de código desse modo**, eu faria uma coisa que nem o estudo do Codex nem eu podemos fazer por você: uma consulta rápida e pontual com um segundo advogado ou a doutrina processual sobre o caso específico de documentos que vão para o INSS/cartório (que é a maior parte da sua base, pelo que você descreveu) — a decisão do STJ citada é sobre procuração; documentos previdenciários e contratos têm exigências próprias que valem uma checagem de 15 minutos antes de investir dias de desenvolvimento. É a única parte deste estudo que não é uma questão de engenharia.

**Não avancei a implementação** — nem eu, nem acredito que devesse ser feito até você decidir o ponto 3 acima (modalidade restrita por documento vs. opção geral) e o ponto 4 (checagem jurídica pontual), porque isso muda o desenho do banco de dados e da tela.

---

## 4. Ordem sugerida

1. **Hoje/amanhã**: Parte 1 da seção 1 (gravar a tentativa recusada e mover para "Em andamento" mesmo quando a foto falha) — pequena, resolve o problema relatado, sem risco.
2. **Junto**: trocar `failOn: 'warning'` por `failOn: 'error'` e logar o motivo específico — mesma área de código, mesmo commit faz sentido.
3. **Esta semana**: botão "Pedir ajuda" (Nível 1) + orientar a equipe a usar chamada de vídeo com tela compartilhada do WhatsApp (Nível 0) enquanto isso.
4. **Depois dos bloqueadores de venda da auditoria de 11/09** (fila já priorizada naquele documento): avaliar o Nível 2 (assistência ao vivo embutida) como projeto à parte, e decidir o desenho do modo facilitado com base nos pontos 3 e 4 da seção 3.

## 5. Limites deste estudo

Não executei nada — sem banco, sem `tsc`, sem reproduzir a foto real da cliente que falhou. A suspeita sobre `failOn: 'warning'` é a explicação mais provável dado o padrão do sintoma, mas só uma reprodução com o arquivo real (ou um log do que a validação recusou, depois da correção da Parte 1) confirma. Não avaliei custo nem contrato de nenhum fornecedor de vídeo/co-navegação citado na seção 2 — são exemplos de categoria, não uma recomendação de compra. A parte jurídica da seção 3 é limitada à mesma fonte que o Codex já citou; não é parecer.
