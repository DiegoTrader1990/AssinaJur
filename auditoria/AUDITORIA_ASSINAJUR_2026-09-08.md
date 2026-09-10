# Auditoria do AssinaJur — preparação para testes e vendas

**Data:** 8 de setembro de 2026. **Base local:** commit `9783c2d`. **Site observado:** https://www.assinajur.com.br. **Natureza:** auditoria de código, fluxos, superfície pública e preparação operacional/comercial.

**Inventário:** 57 pontos de ação — **15 P0**, **37 P1** e **5 P2**. O inventário combina defeitos confirmados, lacunas e verificações externas, identificados individualmente.

## Parecer de liberação

**Ainda não recomendo abrir vendas nem liberar o ambiente atual para colegas utilizarem documentos reais.** Há uma base funcional considerável e a compilação passa, mas existem falhas que comprometem isolamento entre escritórios, identidade dos participantes, preservação das evidências e previsibilidade dos fluxos.

É possível preparar um **piloto fechado com dados fictícios**, depois de corrigir os bloqueios indicados abaixo e separar o ambiente de testes. Uma demonstração visual acompanhada, sem cadastro ou documentos reais, pode servir para colher opiniões sobre a proposta do produto. Isso não equivale à aprovação para uso operacional.

O caminho mais curto para vender é estabilizar um escopo pequeno: **cadastro de escritório e cliente → modelos revisados → envio individual ou kit → assinatura → certificado → conferência e download**. WhatsApp com IA, edição Word local e Central de Entrada devem entrar no piloto apenas quando estiverem isolados, previsíveis e verificáveis; podem ficar temporariamente fora da oferta inicial.

**Restrição confirmada pelo usuário após a auditoria:** o sistema já está em uso, existem clientes cadastrados e dois kits com assinaturas concluídas que o usuário conferiu como corretas. Esses registros devem ser preservados. Os dois kits não foram inspecionados individualmente nesta auditoria; os achados não são uma declaração de defeito nesses exemplares.

**Condição antes de alterações em produção:** fazer backup do banco e dos arquivos originais/assinados, conferir a recuperação em ambiente isolado e registrar o inventário de clientes, documentos, participantes, evidências, códigos de verificação e hashes. As correções devem manter compatibilidade com os registros existentes e preservar os bytes e identificadores das versões já emitidas. Não regenerar ou reabrir automaticamente os certificados históricos como efeito colateral de uma atualização. Comparar o inventário antes/depois; não alterar a estrutura do banco de produção sem backup verificado e plano de recuperação.

## O que foi efetivamente verificado

| Frente | Resultado e alcance |
|---|---|
| Código | Revisão dos fluxos centrais, APIs, autenticação, relações entre escritórios, schema, armazenamento, PDF, integrações, planos e interfaces. Achados vinculados aos arquivos abaixo. |
| Navegador, produção | Home, navegação para login/cadastro, link de recuperação, DOM dos links e campos; home/cadastro em largura de 390 px; link de assinatura e código de verificação inexistentes exibiram mensagens de erro apropriadas. Nenhuma conta criada, assinatura realizada ou mensagem enviada. |
| Tipagem | `tsc --noEmit --incremental false` passou. |
| Testes existentes | Os **12 testes de WhatsApp/trilha pública** passaram. Cobertura restrita a essas funções, sem aprovação implícita dos demais fluxos. |
| Assinatura em isolamento | **9 verificações** de rotas reais, transpiladas em memória, com banco, arquivos e notificações simulados, reproduziram comportamentos problemáticos. |
| Segurança em isolamento | **4 verificações** confirmaram condições de falha em permissões, referências entre escritórios e preservação de HTML executável. Banco e sessão simulados. |
| Compilação completa | `next build` passou e gerou as páginas. Executado diretamente, **sem o `db push` do script de build**, com conexões Postgres substituídas por endereço local sem serviço. A primeira tentativa falhou por bloqueio de download de fontes; a repetição com rede autorizada passou. |
| Dependências | `npm audit --omit=dev` apontou **4 dependências de nível alto**, zero críticas no resultado: `next`, `sharp`, `postcss` transitivo e `nanoid`. São alertas sobre pacotes, não quatro explorações demonstradas no site. |
| Banco/infraestrutura real | Não foram auditados conteúdo dos bancos, restauração, configuração do painel da Vercel/Neon, volumes/custos, credenciais, licenças ativas ou entrega real dos provedores. |

**Limites da conclusão:** testes isolados validam decisões das rotas, não substituem testes completos com PostgreSQL, Blob, câmera e provedores reais. Não foi demonstrado incidente ou invasão em produção. O commit publicado não foi confrontado com o painel da Vercel; observações no navegador e achados do código local são identificados separadamente. Não é possível garantir ausência de outros defeitos a partir desta auditoria.

**Legenda de evidência:** **C** = confirmado no código; **I** = reproduzido em ensaio isolado; **V** = observado no navegador publicado; **E** = depende de configuração externa; **L** = lacuna de produto/operação identificada no material disponível.

**Prioridades:** **P0** = bloquear liberação externa com dados reais; **P1** = corrigir antes da venda ou antes de liberar a funcionalidade afetada no piloto; **P2** = melhoria programável, que pode ficar fora de um piloto de escopo reduzido. Prioridade de lançamento não é pontuação CVSS.

## 1. Segurança, privacidade e separação entre escritórios

### SEG-01 — P0 — Credencial de banco embutida no código

**Evidência C:** `src/lib/prisma.ts:3–8` contém conexão alternativa com usuário e senha literais. Os valores não são reproduzidos neste relatório e sua validade não foi testada.

**Impacto:** quem obtiver esse código/histórico poderá tentar acessar o banco correspondente. Também existe risco de usar um banco inesperado quando uma variável estiver ausente.

**Fazer/aceite:** remover a conexão literal; exigir variáveis válidas; identificar e rotacionar a credencial no serviço correto; revisar histórico, scripts e artefatos com detecção de segredos. Confirmar que a credencial anterior deixou de funcionar, sem assumir que esse seja o banco de produção.

### SEG-02 — P0 — Segredo alternativo previsível para sessão

**Evidência C/E:** `src/lib/auth.ts:7`, `src/app/api/integrations/google-drive/route.ts:8` e callback usam segredos fixos se `JWT_SECRET` estiver ausente. As APIs de administração aceitam JWT com `officeId` de superadministrador.

**Impacto:** configuração incompleta deixa de falhar de forma segura e pode permitir falsificação de autorização. A existência do fallback está confirmada; não foi verificado se ele está ativo na produção.

**Fazer/aceite:** recusar inicialização sem segredo forte; separar finalidade de tokens administrativos/OAuth; testar ambiente sem segredo e garantir falha explícita. Não emitir sessões nesse estado.

### SEG-03 — P0 — Kit aceita modelo de outro escritório

**Evidência C/I:** `src/app/api/kits/route.ts:69–94`, `src/app/api/kits/[id]/route.ts:55–62`. `templateIds` entram na relação sem validar o escritório do modelo; GET de kits inclui `contentHtml` (`route.ts:30`).

**Impacto:** um usuário que conheça um ID externo pode vincular modelo de outro escritório e receber seu conteúdo. O teste isolado confirmou aceitação do vínculo, não acesso a dados reais.

**Fazer/aceite:** validar todos os modelos por `officeId`, estado ativo e formato, inclusive em edição; reforçar integridade das relações. Testar dois escritórios: nenhuma leitura ou vínculo cruzado pode ser permitido.

### SEG-04 — P0 — Pendência aceita cliente/responsável de outro escritório

**Evidência C/I:** `src/app/api/pendencias/[id]/route.ts:99–127,146`. A pendência é filtrada por escritório, mas `clientId` e `responsibleId` recebidos não são validados da mesma forma; a resposta inclui dados do cliente.

**Impacto:** vínculo incorreto entre contas e possível exposição de nome, CPF e contato, caso seja informado ID externo válido.

**Fazer/aceite:** validar toda referência antes de alterar; manter responsáveis ativos no mesmo escritório; testes negativos de atualização, leitura posterior e exclusão em duas contas.

### SEG-05 — P0 — Cargo “visualizador” não limita diversas alterações

**Evidência C/I:** `src/app/api/office/route.ts:32–64` permite PUT a qualquer sessão; rotas de clientes, modelos e kits também verificam sessão sem aplicar política de cargo. `src/app/api/whatsapp/webhook/route.ts:109–205` permite operações de manutenção a usuários de sessão sem exigir cargo específico.

**Impacto:** VIEWER pode modificar dados institucionais; ações sensíveis ficam disponíveis além da permissão esperada. Esconder botões não resolve acesso direto à API.

**Fazer/aceite:** matriz de permissões central para ADMIN, LAWYER, STAFF e VIEWER, aplicada no servidor e na interface; testar cada verbo/ação para cada cargo. Operações administrativas do WhatsApp devem ter autorização própria.

### SEG-06 — P0 — HTML de modelos pode executar conteúdo no editor

**Evidência C/I:** `src/app/api/templates/route.ts:61–70` persiste HTML normalizado; `src/components/DocumentRichEditor.tsx:102,108` injeta via `innerHTML`. O ensaio confirmou que atributo `onerror` atravessa a normalização. Não houve exploração em navegador autenticado.

**Impacto:** conteúdo malicioso persistido pode executar ações com a sessão de quem abrir o modelo, inclusive alguém com mais permissões.

**Fazer/aceite:** sanitização por lista permitida, URLs/protocolos seguros, limpeza de conteúdo legado e política de conteúdo como defesa adicional; testar atributos de evento, SVG, links ativos e HTML produzido pela IA sem destruir a formatação legítima.

### SEG-07 — P0 — Aviso de assinatura inclui destinatário global

**Evidência C:** `src/lib/whatsapp/signatureCompletion.ts:20–23` adiciona telefone administrativo global, com fallback fixo, aos destinatários do PDF final, independentemente do escritório.

**Impacto:** documentos jurídicos de colegas podem ser encaminhados a contato da plataforma, fora da configuração daquele escritório. O encaminhamento real depende da fila/ponte; não foi disparado nesta auditoria.

**Fazer/aceite:** destinatários explícitos por escritório, validados e auditados; nenhum fallback global para conteúdo de clientes. Simular dois escritórios e conferir destinatários de todas as mensagens/anexos.

### SEG-08 — P0 — Cadastro de advogado com senha fixa

**Evidência C:** `src/app/(dashboard)/configuracoes/page.tsx:146–147` fabrica e-mail quando ausente e envia senha literal ao cadastrar advogado.

**Impacto:** contas criadas por esse caminho têm credencial previsível; o titular pode nem controlar o endereço de acesso.

**Fazer/aceite:** convite individual com validade, aceite e definição de senha pelo titular; exigir e-mail real; identificar contas afetadas e trocar credenciais com revogação das sessões anteriores. Não reproduzir a senha em documentação.

### SEG-09 — P1 — Saída da equipe e revogação de sessão incompletas

**Evidência C:** `src/app/api/office/team/route.ts:199–204` rejeita exclusão de usuário com histórico; PATCH não oferece `active`. `src/lib/auth.ts:42–110` usa JWT de sete dias, consulta usuário ativo, mas não tem versão de sessão vinculada à troca de senha.

**Impacto:** falta um caminho operacional para remover o acesso de ex-colaborador sem apagar histórico; trocar senha não invalida por si só o token anterior. A consulta de `active` já é uma boa base.

**Fazer/aceite:** inativação/restauração controladas, revogação por usuário/dispositivo e alteração de senha; teste que uma sessão antiga perde acesso imediatamente.

### SEG-10 — P1 — Excesso de dados na consulta pública

**Evidência C:** `src/app/api/verify/[code]/route.ts:55–68` entrega CPF e telefone completos, além de localização aproximada e descrições; GET de assinatura entrega CPF/contatos antes da confirmação (`src/app/api/sign/[token]/route.ts:198` e resposta de espera).

**Impacto:** quem obtiver o código/link tem acesso maior que o necessário para conferir existência/status. Links podem circular além das partes.

**Fazer/aceite:** definir exposição mínima; mascarar CPF/telefone; separar consulta pública de acesso autorizado às evidências completas; testar respostas, página, cache, compartilhamento e indexação.

### SEG-11 — P1 — Controles de abuso não demonstrados

**Evidência C/E:** não foi encontrada limitação de tentativas no código de login, registro, confirmação de CPF, OCR/IA e eventos. Não foi inspecionado eventual firewall/rate limit da Vercel.

**Impacto:** tentativas automatizadas, criação abusiva de contas, consumo de IA e crescimento de registros podem gerar custo ou indisponibilidade.

**Fazer/aceite:** limites por identidade, IP e escritório, combinados com detecção de abuso; erros que não facilitem enumeração; proteger processamento caro. Demonstrar limites em ambiente de teste sem teste de carga agressivo na produção.

### SEG-12 — P1 — Uploads precisam validação mais profunda

**Evidência C:** `src/app/api/templates/word/route.ts:20–25` valida extensão/assinatura ZIP `PK`; isso não comprova DOCX seguro. `src/app/api/clients/parse-document/route.ts:116–129` lê arquivo e encaminha ao processamento sem limite de tamanho equivalente ao PDF.

**Impacto:** arquivos inadequados, imagens gigantes ou pacotes compactados expansivos podem causar falhas e consumo excessivo.

**Fazer/aceite:** validação real de formato, páginas/dimensões/expansão, limites antes de processar, bibliotecas atualizadas e isolamento do processamento; respostas claras para arquivos rejeitados. Combinar com ASS-13.

### SEG-13 — P1 — Integrações e administração precisam trilha e validação

**Evidência C:** `src/app/api/admin/offices/[id]/route.ts:33–62` aceita plano/status/números sem domínio/faixas explícitas e não registra auditoria própria. OAuth callback verifica token assinado, mas não associa retorno à sessão atual nem consome nonce único (`src/app/api/integrations/google-drive/callback/route.ts:15–24`).

**Impacto:** configuração incorreta de limite/plano e conexão administrativa com proteção de sessão incompleta.

**Fazer/aceite:** validar enumerações/números, registrar autor/antes/depois, vincular state OAuth à sessão e uso único, testar replay e sessão diferente. Rever controles de acesso da conta administrativa e recuperação.

## 2. Assinatura, integridade e documentos

### ASS-01 — P0 — Servidor aceita assinatura sem evidência válida

**Evidência C/I:** `src/app/api/sign/[token]/submit/route.ts:73–126`. A presença de qualquer valor em `selfieCenterImage` é suficiente; foto do documento, imagem de assinatura e consentimento expresso não são obrigatórios no servidor. Texto de consentimento padrão é gravado quando omitido.

**Impacto:** ensaio concluiu documento com selfie textual, sem imagem real e sem consentimento enviado. Validações apenas na tela são contornáveis.

**Fazer/aceite:** contrato de submissão por modalidade; validar imagem, limites e evidências obrigatórias, versão e aceite do consentimento. Rejeitar payload inválido antes de gravar qualquer assinatura.

### ASS-02 — P0 — CPF exposto é utilizado como confirmação de identidade

**Evidência C:** GET de assinatura informa o CPF completo; `confirm-identity/route.ts:66–86` e `submit/route.ts:63–70` apenas comparam esse mesmo valor. Não existe desafio independente nesse fluxo.

**Impacto:** conhecer o link já fornece a informação necessária para “confirmar” o CPF. Uma selfie existente é tratada como presença verificada, sem que isso comprove identidade/liveness por si só.

**Fazer/aceite:** definir nível de identificação por uso, minimizar CPF prévio e implementar desafio/validação compatível com esse nível, com etapa atestada pelo servidor. Não anunciar garantia de identidade baseada só na existência de foto.

### ASS-03 — P0 — Token de uma pessoa pode sobrescrever testemunha

**Evidência C/I:** `submit/route.ts:181–285`. `witness1`/`witness2` recebidos permitem criar ou atualizar nome, CPF e evidências sem conferir papel do solicitante, modalidade individual/mesmo dispositivo ou assinatura anterior.

**Impacto:** ensaio com token de cliente alterou nome e CPF de testemunha INDIVIDUAL já assinada. O caminho a rogo também necessita controle explícito de participante/modalidade.

**Fazer/aceite:** participantes fixados no envio; cada submissão só atua nos participantes autorizados da sessão; preservar assinaturas anteriores. Testar tentativa de troca de identidade e de inclusão de testemunha não prevista.

### ASS-04 — P0 — Salvamento de evidências ignora estado do documento

**Evidência C/I:** `src/app/api/sign/[token]/event/route.ts:46–93`. A rota não bloqueia documento cancelado/expirado; “refazer foto” é inferido apenas por campo vazio, sem exigir pedido de revisão.

**Impacto:** ensaios permitiram salvar evidência em cancelado e acrescentar foto em concluído sem pedido autorizado. `forRogo` também precisa respeitar cargo/modalidade/ordem.

**Fazer/aceite:** máquina de estados e autorização comuns a GET, confirmação, eventos, upload e submit. Pedido de correção deve ser específico, válido e consumível uma única vez.

### ASS-05 — P0 — Evidências e certificado concluído são substituíveis

**Evidência C:** `src/app/api/documents/[id]/route.ts:247–260,305–328` reabre assinatura ou apaga foto; `event/route.ts:90–106` invalida PDF; `src/lib/pdfCertificate.ts:885–900,1589–1604` gera novo arquivo/hash para o mesmo documento/código. Eventos de revisão/reset não entram na lista de eventos do certificado (`pdfCertificate.ts:312–323`).

**Impacto:** não há versão histórica completa ligada a cada emissão. Uma trilha textual não preserva a foto anterior que foi substituída. A consulta atual pode divergir do PDF já distribuído.

Também existe exclusão permanente de documento concluído por administrador (`src/app/api/documents/[id]/route.ts:461–484`), removendo participantes/eventos em cascata e arquivos associados. Rever arquivamento, retenção e proteção dos registros emitidos para reduzir perda acidental, mantendo um procedimento explícito para exclusões legítimas.

**Fazer/aceite:** versões imutáveis de documento, evidências, hash e emissão; correção como aditamento/nova versão com ligação à anterior e motivo/autor/data. Um PDF já emitido deve continuar verificável pela sua versão exata.

### ASS-06 — P1 — Abrir link pode transformar concluído em expirado

**Evidência C/I:** `src/app/api/sign/[token]/route.ts:124–132`. O prazo é aplicado também a documentos concluídos.

**Impacto:** o ensaio confirmou alteração persistida de CONCLUIDO para EXPIRADO ao abrir um link após o prazo, prejudicando painel e verificação.

**Fazer/aceite:** separar validade do convite de validade do registro concluído; expirar apenas estados elegíveis. Reabrir o link após meses deve preservar conclusão e evidências.

### ASS-07 — P1 — Falha parcial deixa assinatura sem conclusão recuperável

**Evidência C/I:** `submit/route.ts:50–51,103,289–310`. Grava signatário antes das etapas seguintes, fora de transação; retentativa é recusada quando ele já está ASSINADO.

**Impacto:** ensaio simulou falha depois da gravação: primeira chamada 500, nova chamada 400, signatário ASSINADO e documento ENVIADO.

**Fazer/aceite:** transação para estado/registro essencial, chave de idempotência e reconciliação posterior; testar duplo clique, duas requisições simultâneas e falha em cada etapa, sem duplicar ou perder assinatura.

### ASS-08 — P1 — Aviso ainda depende da geração do PDF

**Evidência C/I:** `submit/route.ts:455–469` separa chamadas, mas `src/lib/whatsapp/signatureCompletion.ts:18` retorna sem enfileirar se `signedFile` não existir. O ensaio confirmou zero operações na fila nesse caso.

**Impacto:** assinatura pode constar concluída sem aviso, apesar de comentário afirmar independência. Geração sequencial de certificados dentro do pedido também eleva risco de timeout.

**Fazer/aceite:** filas duráveis distintas para conclusão, PDF e entrega; retentativas com estado/erro e reconciliação; avisar “assinatura recebida” separadamente de “PDF disponível”. Simular falha de PDF e indisponibilidade da ponte.

### ASS-09 — P1 — Criação do kit não é atômica

**Evidência C:** `src/app/api/kits/generate-package/route.ts:408–552` executa loop de compilação, armazenamento, documentos e signatários sem transação abrangente, apesar do comentário.

**Impacto:** falha no segundo/terceiro documento pode deixar pacote incompleto; repetir pode duplicar envios e consumir cota/armazenamento.

**Fazer/aceite:** preparar pacote, persistir estado coerente e promover a enviado apenas quando completo; idempotência e limpeza/compensação para arquivos externos. Testar falha no meio de kit com três documentos.

### ASS-10 — P1 — Modelo Word pode virar documento com texto provisório

**Evidência C:** `src/app/api/templates/word/route.ts:27` grava HTML “Modelo Word preservado no arquivo original”; geração do kit compila `template.contentHtml`, sem fluxo específico DOCX (`generate-package/route.ts:415,454`).

**Impacto:** modelo Word vinculado ao kit pode gerar o texto provisório em vez do contrato. Precisa ser impedido mesmo se a interface tentar ocultar essa combinação.

**Fazer/aceite:** pipeline DOCX consistente entre editor, prévia e geração final, ou bloqueio explícito desse formato em kits até suporte real. Comparar um modelo Word real com prévia e PDF enviado.

### ASS-11 — P0 — Dados do escritório fundador entram em outros escritórios

**Evidência C:** `generate-package/route.ts:227,246,268–269,353–355` usa endereço, nomes e OABs específicos como fallback; até a escolha do advogado procura nomes particulares.

**Impacto:** outro escritório pode emitir procuração/contrato qualificando profissional ou endereço errado. Isso atinge diretamente o documento que será assinado.

**Fazer/aceite:** variáveis exclusivamente do escritório/participantes selecionados; bloquear campos essenciais ausentes. Gerar contrato e procuração de escritório fictício e assegurar ausência de qualquer dado do fundador.

### ASS-12 — P1 — Consulta por código não verifica o arquivo apresentado

**Evidência C/I:** `src/app/api/verify/[code]/route.ts:79` responde `valid: true` para todo registro encontrado, inclusive cancelado. A interface diferencia status (`src/app/verificar/[code]/page.tsx:140`), portanto não foi constatado que ela mostra cancelado como concluído. A consulta exibe hashes armazenados, sem comparar o arquivo que o terceiro tem em mãos.

**Impacto:** existência do código, conclusão e integridade do arquivo são conceitos diferentes. Copiar um QR Code não comprova que outro PDF corresponda ao hash.

**Fazer/aceite:** contrato explícito de status; comparação local do hash do arquivo com a versão registrada; rejeitar arquivo alterado mantendo a consulta de histórico/cancelamento clara.

### ASS-13 — P1 — Limite anunciado de arquivo conflita com a hospedagem

**Evidência C/E:** upload PDF e Word aceitam até 20 MB (`src/app/api/documents/upload/route.ts:30`, `templates/word/route.ts:23`), transportados pelas funções. Downloads também montam o arquivo inteiro na resposta. A Vercel documenta limite de payload de 4,5 MB para funções. [Limites oficiais](https://vercel.com/docs/functions/limitations).

**Impacto:** arquivo permitido pela tela pode falhar antes de chegar à validação; evidências em base64 e certificados grandes agravam o risco. O limite específico não foi forçado em produção.

**Fazer/aceite:** upload direto privado com autorização curta, processamento posterior e entrega apropriada a arquivos grandes; limites coerentes na interface. Testar 1, 4, 5 e 20 MB e certificado com várias fotos no ambiente Vercel.

### ASS-14 — P1 — Consentimento do kit precisa vincular os documentos exatos

**Evidência C:** `submit/route.ts:374–438` propaga assinaturas por igualdade de participantes a documentos do lote. Eventos de abertura/leitura podem ser propagados por sessão; não há manifesto assinado com hashes/versões dos documentos aceitos na submissão.

**Impacto:** é necessário demonstrar quais documentos foram apresentados e aceitos, distinguindo “disponível na sessão” de “efetivamente aberto”. Não se conclui invalidade jurídica automática a partir dessa lacuna.

**Fazer/aceite:** lista explícita de títulos/versões/hashes no consentimento, sessão vinculada e bloqueio de alteração depois do aceite; testar pacote parcialmente visualizado e documento substituído entre revisão e envio.

### ASS-15 — P1 — Cancelamento/expiração não revogam leitura do original

**Evidência C/I:** `src/app/api/sign/[token]/document/route.ts:25–45` exige token existente e arquivo, mas não estado, prazo ou ordem. Ensaio retornou 200 para documento cancelado e expirado.

**Impacto:** cancelar o convite não interrompe todos os acessos proporcionados por ele. A política de acesso ao original precisa ser diferente da preservação do documento já assinado.

**Fazer/aceite:** autorizar leitura conforme sessão e estado, revogar convites cancelados; manter acesso posterior a versões concluídas por regra própria. Testar URL direta do arquivo, não só a página de assinatura.

## 3. Produto, cadastro, planos e experiência

### PRO-01 — P1 — Teste gratuito anunciado não corresponde ao cadastro

**Evidência C/V:** home/cadastro prometem cinco pacotes por 30 dias; `register-office/route.ts:71–83` não define trial e `prisma/schema.prisma:48–52` cria SOLO, ACTIVE, 30 documentos, sem expiração do teste.

**Fazer/aceite:** modelar início/fim e cota do teste; usar a mesma regra no cadastro, painel, APIs e oferta. Testar início, quinto envio, sexto envio e dia 31. Mudar apenas o status para TRIAL também exige ajustar `/api/documents`, que hoje exige ACTIVE.

### PRO-02 — P1 — Cotas e planos aplicados de forma diferente

**Evidência C:** `/api/documents` checa plano/cota (`route.ts:157,182–184`); `/api/kits/generate-package` não aplica essas verificações. `office/team/route.ts:53–102` não aplica `maxUsersLimit`.

**Impacto:** pacote e equipe podem escapar dos limites comerciais. Escritório com `active=false` é bloqueado pela sessão; o problema inclui contas ativas com cota esgotada e inconsistências de `planStatus`.

**Fazer/aceite:** serviço único de autorização/cota para todos os caminhos, incluindo IA/WhatsApp; reserva atômica para concorrência e limite de membros. Testar limite atingido e pedidos simultâneos.

### PRO-03 — P1 — “Pacote”, “documento” e créditos precisam regra única

**Evidência C/V:** home mistura cinco pacotes, envios e planos por documento; kit cria um `Document` por modelo. `src/app/api/office/plan/route.ts:25–39` soma documentos do mês e créditos extras. Os créditos não têm razão individual de consumo/expiração.

**Fazer/aceite:** definir unidade cobrada, quando consome, o efeito de cancelamento/erro e validade dos extras. Exemplo obrigatório na oferta: “um kit com três documentos consome X unidades”. Conferir painel, cobrança e APIs com o mesmo cenário.

### PRO-04 — P1 — Venda assistida existe; ciclo comercial precisa fechamento

**Evidência C/V/L:** botões de contratação levam ao WhatsApp; administração altera plano manualmente. Não foram encontrados ciclo de renovação, histórico de pagamentos/ativação, procedimento de cancelamento e exportação ligado ao término.

**Fazer/aceite:** para início, cobrança manual é aceitável se houver procedimento rastreável: proposta, aceite, pagamento, ativação, vencimento, aviso, suspensão, cancelamento e exportação. Checkout automático não é requisito para o primeiro piloto; cumprir a oferta é.

### PRO-05 — P1 — “Esqueceu a senha?” não funciona

**Evidência C/V:** `src/app/(auth)/login/page.tsx` contém `href="#"`; clique publicado mantém a mesma tela. Não foi encontrada API de recuperação.

**Fazer/aceite:** recuperação com token de uso único, prazo, mensagem neutra, entrega verificável e revogação de sessão; alternativa manual documentada apenas para piloto assistido. Testar token vencido/reutilizado e endereço inexistente.

### PRO-06 — P1 — E-mail de membro não normalizado no cadastro

**Evidência C:** `office/team/route.ts:74–92` persiste e consulta e-mail recebido; `auth/login/route.ts:20–24` normaliza para minúsculas. PATCH de equipe normaliza, POST não.

**Impacto:** usuário cadastrado com maiúsculas/espaços pode não conseguir entrar.

**Fazer/aceite:** normalizar todas as entradas e tratar contas existentes/colisões. Cadastrar e entrar com variações de caixa e espaços deve resolver a mesma identidade.

### PRO-07 — P1 — Último administrador pode perder o próprio cargo

**Evidência C:** `office/team/route.ts:212–276` permite alterar `role` sem guarda do último administrador, embora DELETE tenha essa proteção.

**Fazer/aceite:** impedir ficar sem administrador ativo em qualquer operação; transferência explícita de administração; testes de autoalteração e concorrência entre administradores.

### PRO-08 — P2 — Entrada no produto precisa orientação de primeira utilização

**Evidência C/V/L:** há cadastro, biblioteca inicial e módulos; faltam critérios de “escritório pronto para enviar”. Placeholders publicados ainda usam os dados/nome do fundador. Cadastro promete configuração em dois minutos sem demonstrar preparação do primeiro documento.

**Fazer/aceite:** checklist curto com dados do escritório, advogado responsável, modelo revisado, cliente fictício e primeiro envio; dados demonstrativos claramente identificados. Um colega deve realizar o fluxo sem intervenção no banco ou no código.

### PRO-09 — P1 — Quatorze destinos de navegação da home não existem

**Evidência V/C:** DOM publicado tem links para `#assinatura`, `#pacotes`, `#clientes`, `#acompanhamento`, `#modelos`, `#certificado`, `#trilha`, `#validacao`, `#advogados`, `#escritorios`, `#departamentos`, `#imobiliarias`, `#empresas`, `#sobre`, sem IDs correspondentes. Fonte: `src/app/page.tsx`.

**Fazer/aceite:** criar destinos ou apontar para seções reais; remover oferta sem conteúdo. Testar todos os links de menu/rodapé no desktop, teclado e celular. A home não pode aparentar navegação que não entrega conteúdo.

### PRO-10 — P1 — Editor Word depende de programa no computador

**Evidência C/E:** `src/components/WordTemplateEditor.tsx:9,27–33` usa `127.0.0.1:5127` por padrão e orienta abrir arquivo `.bat`; `word-service/Program.cs:45` só escuta loopback.

**Impacto:** colega em outro computador/celular não recebe a mesma experiência sem instalação/configuração. Uma URL externa configurada poderia mudar isso; não foi conferida a configuração publicada.

**Fazer/aceite:** hospedar conversão autenticada e isolada ou retirar Word do escopo inicial, mantendo alternativas testadas. Testar numa máquina limpa, sem arquivos locais do fundador.

### PRO-11 — P2 — Central de Entrada ainda não fecha a triagem

**Evidência C/L:** `src/app/(dashboard)/entrada/page.tsx:35` promete pastas automáticas do Drive, mas a entrada implementada visível é `/api/intake/local`; não foi encontrado consumidor automático do Drive nesse fluxo. “Conferir cliente” abre `/processos?clienteId=`, que inicia processo (`processos/page.tsx:184–191`).

**Fazer/aceite:** ingestão real, confirmação do titular, associação de arquivos, conclusão/rejeição da triagem e prevenção de duplicidade; botão levar à ficha correta. Até isso existir, marcar experimental ou omitir da oferta.

### PRO-12 — P2 — Tela WhatsApp sugere conversa com cliente, mas usa assistente

**Evidência C:** `src/app/(dashboard)/whatsapp/page.tsx:112` limita contatos aos dez primeiros; envio usa `fromNumber: PAINEL_ASSINAJUR` (`:205`) e a interface não representa uma caixa de conversas completa por destinatário.

**Fazer/aceite:** decidir entre “assistente operacional” e “atendimento a clientes”; indicar claramente destinatário/ação; busca e paginação reais se houver caixa de entrada. Testar seleção de cada contato e confirmar a quem a mensagem seria destinada antes de enviar.

### PRO-13 — P2 — Métricas usam conceitos diferentes

**Evidência C:** `relatorios/page.tsx:43–48` calcula taxa geral só sobre encerrados; `:77` calcula taxa mensal sobre todos os documentos. `clients/route.ts:110–118` chama contagens de processos/documentos de atividades/eventos.

**Fazer/aceite:** dicionário de métricas com período e denominador; distinguir documentos, pessoas, envios e eventos. Conjunto fixo de exemplo deve gerar totais conciliáveis em dashboard, cliente e relatório. “Tempo real” deve corresponder à frequência real de atualização.

### PRO-14 — P1 — Acessibilidade do cadastro e login precisa correção

**Evidência C/V:** campos de texto publicados aparecem sem nome acessível na árvore; inputs do cadastro não têm `id`/associação `for` nem preenchimento automático explícito. Fontes: páginas `(auth)/register` e `(auth)/login`.

**Fazer/aceite:** rótulos associados, `autocomplete`, teclado apropriado, erros ligados ao campo, foco visível e navegação por teclado. Validar menus/modais, contraste, zoom e mensagens da captura com leitor de tela. Não foi realizada certificação WCAG completa.

### PRO-15 — P1 — Jornada móvel real ainda precisa homologação

**Evidência V/L:** home/cadastro em 390 px não mostraram transbordamento horizontal; isso não valida câmera, fotos, PDF, assinatura, permissões ou interrupção de rede em aparelho real.

**Fazer/aceite:** executar matriz Android/Chrome, iPhone/Safari e navegador interno do WhatsApp; câmera negada, rotação, voltar, fechar/reabrir, baixa memória, conexão fraca e ausência de geolocalização. Dar instrução de recuperação em cada situação. Liberar somente modalidades que passarem.

## 4. Operação, manutenção e capacidade de venda

### OPE-01 — P0 — Build sincroniza schema aceitando perda de dados

**Evidência C:** `package.json:8` contém `prisma db push --accept-data-loss` permanentemente, contrariando `AGENTS.md`.

**Impacto:** alteração de schema pode ser aplicada no banco durante qualquer publicação, com aceitação automática de mudanças destrutivas. Não foi executada essa etapa na auditoria.

**Fazer/aceite:** separar compilação de alteração de banco; remover etapa destrutiva do build; adotar mudanças versionadas, backup e procedimento reversível. Toda mudança de schema exigirá etapa própria de sincronização/migração em produção, planejada explicitamente.

### OPE-02 — P1 — Atualizar dependências e runtimes sem suporte

**Evidência C/E:** lock instalado usa Next 14.2.35 e Sharp 0.33.5; consulta npm apontou quatro pacotes com alertas altos. Next 14 está fora das versões suportadas. `Dockerfile.whatsapp:2` usa Node 18, encerrado. [Política Next.js](https://nextjs.org/support-policy), [ciclo Node.js](https://nodejs.org/en/about/previous-releases).

**Fazer/aceite:** atualizar de forma controlada para versões suportadas/corrigidas, avaliar aplicabilidade dos avisos, testar PDF/imagem/auth e repetir auditoria. Não aplicar atualização forçada sem revisão de compatibilidade. O Node local 22 não corrige a imagem Docker 18.

### OPE-03 — P1 — Hospedagem comercial e licenças precisam conferência

**Evidência E:** AGENTS informa Vercel Hobby. A Vercel restringe Hobby a uso pessoal/não comercial; é necessário conferir o plano atual antes de divulgar comercialmente. Syncfusion exige licença/eligibilidade válida; pacote instalado não comprova licença. [Termos Vercel](https://vercel.com/legal/terms), [Community License Syncfusion](https://www.syncfusion.com/products/communitylicense).

**Fazer/aceite:** documentar plano de hospedagem compatível e licenças do editor/conversor, custos e limites. Não foi verificado contrato ativo e nenhuma contratação/pagamento foi realizado.

### OPE-04 — P1 — Backup só é confiável depois de restaurado

**Evidência L/E:** não foi encontrado procedimento versionado de backup/restauração e desastre; painel Neon/Blob não foi auditado. Rollback da Vercel reverte aplicação, não reconstitui sozinho dados removidos.

**Fazer/aceite:** retenção de Postgres, objetos e chaves necessárias; cópia separada, restauração de ensaio e conferência de hashes. Definir perda máxima tolerável e prazo de recuperação, com responsável. Nenhum teste com dados reais antes de demonstrar recuperação.

### OPE-05 — P1 — Testes e publicação precisam uma barreira automática

**Evidência C/L:** há doze testes focados em WhatsApp; não foi encontrada pipeline `.github` nem suíte de ponta a ponta dos fluxos críticos. Existem scripts de investigação que não equivalem a testes seguros e repetíveis.

**Fazer/aceite:** homologação isolada com dados fictícios; testes de cargos/tenants, contrato/kit, falhas de rede, PDF e cotas; compilação e validações em cada alteração; revisão antes de produção. Tornar o comando de build seguro antes de automatizá-lo.

### OPE-06 — P1 — Falhas precisam ser visíveis e recuperáveis

**Evidência C/L:** erros de auditoria são absorvidos em `src/lib/audit.ts:14–31`; PDF, integração e notificações usam diversos `catch` com log. Não foi demonstrado alerta operacional, reconciliação periódica ou painel de entregas falhas.

**Fazer/aceite:** identificação de operação, logs sem conteúdo sensível, métricas por fase e alerta de assinatura travada/PDF ausente/ponte desconectada; retentativa segura; procedimento de suporte. Diferenciar solicitação aceita, mensagem enfileirada, enviada e entregue.

### OPE-07 — P1 — Listagens completas e processamento em pedido limitam escala

**Evidência C:** clientes (`clients/route.ts:27`), documentos (`documents/route.ts:55`), processos (`processos/route.ts:60`) e relatórios carregam conjuntos sem paginação principal, com relações. GET da integração Drive tenta sincronizar até 50 processos (`integrations/google-drive/route.ts:32–42`).

**Fazer/aceite:** paginação/busca no servidor, agregações dedicadas, fila de processamento e limites por escritório. Medir com volume representativo, conexões simultâneas e celular; definir metas antes de prometer SLA. Não foi feito ensaio de carga em produção.

### OPE-08 — P1 — WhatsApp ainda depende de decisões de operação por escritório

**Evidência C/E:** ponte local/daemon e três caminhos de provedor; `src/lib/whatsapp/meta.ts:75` fixa `office_demo` e processa só a primeira mensagem do lote; imagem recebida não é baixada ali. A ponte possui configurações globais de escritório/telefones (`whatsapp/webhook/route.ts:52–73`).

**Fazer/aceite:** escolher arquitetura suportada; mapear número/instância a escritório, não ao remetente global; deduplicar eventos e processar lotes; monitorar disponibilidade 24h. Validar custos, termos e templates do provedor antes de comercializar; não prometer serviço gratuito/sempre disponível por comentário no código.

### OPE-09 — P1 — Armazenamento e empacotamento falham de forma insegura

**Evidência C/E:** `src/lib/storage.ts:18–28` cai para disco local se Blob estiver ausente; `getFileBuffer` recebe `officeId` mas não verifica o prefixo. `Dockerfile.whatsapp:14` copia projeto completo, sem `.dockerignore` localizado.

**Impacto:** variável faltante na Vercel pode resultar em falha/disco efêmero; defesa de tenant depende só das rotas; imagem Docker pode incluir arquivos locais sensíveis se construída com esse contexto.

**Fazer/aceite:** falhar na produção sem storage correto, validar prefixo/relação de arquivo, compensar objetos órfãos e excluir segredos/dados do contexto Docker. Testar ausência de configuração e construção com arquivos fictícios proibidos.

## 5. Oferta, confiança e obrigações do serviço

### COM-01 — P1 — Promessas públicas excedem o que foi demonstrado

**Evidência C/V:** home/FAQ falam em três ângulos faciais e detecção; fluxo atual prioriza selfie segurando documento. Há promessa de cópia por e-mail, tokens temporários/criptografados, trilha imutável e “validade jurídica garantida” no login. A implementação tem convite sem prazo obrigatório e mutações de evidências descritas acima; não foi encontrado envio transacional por e-mail.

**Fazer/aceite:** matriz “promessa → implementação → teste”; atualizar texto, imagens e demonstrações para o fluxo realmente entregue. Hash comprova correspondência de conteúdo quando comparado; não é criptografia nem verificação de identidade. Não usar garantia absoluta de validade para qualquer documento.

### COM-02 — P1 — Definir política de assinatura e de evidências por caso de uso

**Evidência L/C:** fluxo contempla assinatura gráfica, selo e assinatura a rogo, mas controles técnicos ainda não sustentam igualmente todos os cenários.

**Fazer/aceite:** responsável jurídico revisar contratos, procurações, representação, assinatura a rogo, testemunhas e exigências dos destinatários; definir modalidade, consentimento, prazo e evidências mínimos. A MP 2.200-2 admite outros meios de autoria/integridade nas condições do art. 10, §2º; isso não dispensa avaliar o documento e a aceitação. A Lei 14.063 distingue categorias e âmbitos. [MP 2.200-2](https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm), [Lei 14.063](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm).

### COM-03 — P1 — Privacidade precisa corresponder à operação real

**Evidência C/L/E:** páginas `/termos` e `/privacidade` existem e se apresentam como acesso antecipado. Explicam finalidades e direitos em termos gerais; faltam procedimentos demonstrados para retenção, exportação/exclusão, incidentes, fornecedores e transferências. Há tratamentos de fotos, documentos, localização e OCR/IA.

**Fazer/aceite:** identificar fornecedor responsável/contato; mapear controlador e operador, finalidades/bases por dado, contratos com fornecedores, acesso de suporte, prazos e atendimento aos titulares; avaliar dados biométricos quando utilizados para identificação. Adotar procedimento de incidente e revisar se o aviso descreve o compartilhamento real. [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), [guia de segurança da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/anonimizado___guia_orientat-_seg_da_inf_p_atpp.pdf).

### COM-04 — P1 — Precificar o serviço completo e limitar a oferta inicial

**Evidência V/L/E:** preços públicos de R$39,90, R$69,90 e R$99,90/mês; não foram auditados custos reais, margem, impostos, atendimento, armazenamento, processamento de fotos/PDF/IA ou retenção de longo prazo.

**Fazer/aceite:** custo por escritório ativo e por pacote concluído, suporte estimado e margem por plano; termos de cobrança/cancelamento, emissão fiscal aplicável, canal e prazo de suporte. Focar primeiro em escritórios de advocacia e usos homologados; promessas de filiais, imobiliárias e atendimento dedicado exigem capacidade demonstrada.

### COM-05 — P2 — Divulgação precisa medição e conteúdo verificável

**Evidência C/V/L:** home tem apresentação visual consistente, preços e chamada de teste, mas destinos faltantes; metadados globais indicam indexação (`src/app/layout.tsx:43`) e não foram encontrados sitemap/robots dedicados para separar conteúdo público de convites e áreas internas.

**Fazer/aceite:** demo fiel, tutorial curto, exemplos fictícios, página de suporte, metadados/compartilhamento e regras de indexação adequadas; medir visita → cadastro → primeiro cliente → primeiro envio → primeira conclusão → contratação. Evitar dados pessoais em URLs/analytics. Depoimentos apenas reais e autorizados.

## 6. Ordem recomendada de execução

| Etapa | Entrega | Itens principais | Condição para avançar |
|---|---|---|---|
| 1. Contenção | Base segura e ambiente isolado | SEG-01 a 08; OPE-01, 04, 09 | Segredos tratados, nenhum vínculo entre escritórios, permissões corretas, backup restaurado e nenhuma alteração destrutiva no build. |
| 2. Assinatura confiável | Jornada central consistente | ASS-01 a 09, 11, 12, 14, 15; SEG-09 a 13 | Identidade/consentimento validados, evidências preservadas, repetição e falhas recuperáveis, convites revogados e consulta de versão correta. |
| 3. Piloto fechado | Fluxo limitado funcionando para colegas | PRO-05 a 08, 14, 15; ASS-13; OPE-02, 05, 06 | Matriz de testes aprovada, dados fictícios, participantes/escopo definidos e canal de falhas funcionando. Recursos incompletos desabilitados. |
| 4. Uso real supervisionado | Operação e documentação prontas | COM-01 a 03; OPE-03, 04, 06; SEG-10 | Política de evidências/privacidade aplicada, responsabilidades e acesso definidos, restauração e suporte verificados. |
| 5. Venda inicial assistida | Oferta que pode ser cumprida | PRO-01 a 04, 09; COM-04; OPE-07 e 08 conforme escopo | Cotas e ciclo comercial coerentes, hospedagem/licenças adequadas, margem e atendimento definidos. |
| 6. Expansão | Word, Drive, automação e crescimento | ASS-10; PRO-10 a 13; COM-05 | Cada módulo passa por homologação própria antes de entrar na oferta. |

**Não é necessário implementar tudo que existe no menu para iniciar um piloto reduzido.** É necessário corrigir todos os bloqueios de segurança e de integridade, e remover da oferta/acesso do piloto os recursos que ainda não foram concluídos. Ocultar um menu sem bloquear a API não restringe funcionalidade sensível.

Não atribuo um prazo confiável antes das etapas 1 e 2: mudanças em identidade, versões de evidências, filas e cotas podem exigir schema e testes de regressão amplos. São blocos de trabalho distintos, não uma sequência de ajustes visuais rápidos.

## 7. Critérios objetivos de liberação

### Piloto com colegas e dados fictícios

- Todos os P0 corrigidos e revalidados; ambiente separado de produção, sem credenciais/dados reais reutilizados.
- Dois escritórios fictícios isolados; quatro cargos testados; convite/saída de equipe operacionais.
- Pelo menos um fluxo completo de documento individual e um kit de três documentos, incluindo download e verificação.
- Retentativa após queda, duplo clique, expiração, cancelamento, participante fora de ordem e arquivo inválido tratados corretamente.
- Android e iPhone testados com câmera real; navegador interno de WhatsApp verificado ou encaminhado de forma clara para navegador suportado.
- Cópia de segurança restaurada; erro de PDF ou mensagem gera pendência recuperável e visível.
- Escopo publicado, instruções curtas, canal de feedback e identificação do envio/erro sem expor CPF, fotos ou documentos no relato.

Sugestão de desenho: **3–5 colegas, 7–14 dias, dados inteiramente fictícios**, com roteiro comum. A meta é detectar travamentos e entender se conseguem concluir sem ajuda. Esses números são proposta de teste, não certificação de segurança.

### Uso real e venda

- Piloto concluído, sem defeitos críticos abertos; falhas funcionais do escopo vendável resolvidas.
- Exemplares finais revisados por responsável jurídico, com consentimento e evidências adequados a cada modalidade oferecida.
- Segurança, privacidade, versão de documentos, acesso posterior e retenção implementados; contatos de suporte/privacidade claros.
- Cotas, preço, unidade cobrada, teste, renovação, suspensão, cancelamento e exportação coerentes.
- Hospedagem, licenças, fornecedores, custo e capacidade de suporte confirmados.
- Compilação/testes aprovados no commit a publicar; publicação verificada como **Ready** e teste rápido do fluxo na versão publicada.

## 8. Roteiro mínimo de testes de aceitação

| Grupo | Cenários obrigatórios | Resultado esperado |
|---|---|---|
| Acesso | Cadastro, e-mail com caixa diferente, senha errada, recuperação, token reutilizado, troca de senha, inativação | Mensagens claras, acesso correto e revogação efetiva. |
| Escritórios/cargos | A tenta ler/alterar recursos de B; VIEWER tenta mutações; último admin tenta sair | Nenhum dado externo; proibições no servidor; mantém administrador. |
| Cliente/modelo | Dados incompletos, duplicidade, representante, modelo malicioso, Word em kit | Validação consistente; dados do escritório correto; conteúdo seguro. |
| Envio | Individual, kit de três, limite atingido, duas criações simultâneas, falha no segundo documento | Cota atômica, lote consistente e retentativa sem duplicação. |
| Participantes | Cliente, testemunhas individuais, mesmo dispositivo, a rogo, CPF divergente e testemunha já assinada | Apenas participantes autorizados, sem sobrescrita indevida. |
| Captura | Permissão negada, arquivo inválido, foto ausente, fechar/reabrir, rede interrompida | Nenhuma conclusão sem requisito; progresso recuperável e explicação clara. |
| Estados | Link fora da ordem, vencido, cancelado; concluído após vencimento do convite | Estado correto em todas as rotas, incluindo PDF direto. |
| Conclusão | Duplo envio, falha de banco, PDF indisponível, ponte desconectada | Assinatura preservada, fila/reconciliação e estado de entrega visível. |
| Integridade | Baixar PDF, alterar um byte, refazer foto, reemitir certificado e verificar versão anterior | Hash detecta alteração; histórico não é apagado; versão anterior identificável. |
| Privacidade | Consulta sem login, código compartilhado, exportação, encerramento, acesso de suporte | Apenas dados mínimos e autorizados; procedimentos rastreáveis. |
| Capacidade | PDFs de diferentes tamanhos, kit com fotos, listagens extensas e carga moderada em homologação | Limites coerentes, desempenho medido e erros recuperáveis. |
| Venda | Trial, limite, ativação paga, renovação, suspensão, cancelamento | Oferta e implementação concordam, sem perda indevida de acesso aos arquivos. |

## 9. Evidências anexas e pendências externas

Arquivos locais em `auditoria/evidencias/`:

- `assinatura-rotas-isoladas.cjs` e `.json`: nove verificações isoladas; resultado `reproduzido: true` significa **defeito/condição reproduzida**, não funcionalidade aprovada.
- `seguranca-rotas-isoladas.cjs` e `.json`: quatro verificações com dependências substituídas.
- `npm-audit-producao.json`: resultado integral da consulta de dependências em 08/09/2026.
- `compilacao.txt`: compilação Next concluída, sem execução do script destrutivo de sincronização.

Ainda precisam de verificação externa: configuração atual de banco/Blob, se credenciais expostas continuam válidas e em qual ambiente, firewall/limites, envio/entrega de mensagens, política efetiva de backups, custos, licença Syncfusion, plano Vercel, consentimento/contratos dos fornecedores e correspondência entre commit local e publicado.

**O trabalho desta auditoria gerou documentação e ensaios locais. Não corrigiu o produto, não alterou schema/bancos, não realizou deploy, não criou contas e não enviou mensagens a terceiros.**
