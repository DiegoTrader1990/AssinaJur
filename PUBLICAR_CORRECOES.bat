@echo off
setlocal
cd /d "%~dp0"
set "LOG=%~dp0PUBLICAR_CORRECOES.log"

set "GIT="
if exist "C:\Users\diego\AppData\Local\GitHubDesktop\app-3.5.5\resources\app\git\cmd\git.exe" set "GIT=C:\Users\diego\AppData\Local\GitHubDesktop\app-3.5.5\resources\app\git\cmd\git.exe"
if "%GIT%"=="" (
  where git >nul 2>nul
  if not errorlevel 1 set "GIT=git"
)
if "%GIT%"=="" (
  echo Git nao foi encontrado neste computador. > "%LOG%"
  echo Instale o Git for Windows em https://git-scm.com/download/win e depois rode este arquivo de novo. >> "%LOG%"
  echo Git nao foi encontrado. Instale o Git for Windows em https://git-scm.com/download/win e rode este arquivo de novo.
  pause
  exit /b 1
)

if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === BUILD (npm run build) === > "%LOG%"
call npm run build >> "%LOG%" 2>&1
set "BUILD_EXIT=%ERRORLEVEL%"
echo BUILD_EXIT=%BUILD_EXIT% >> "%LOG%"
echo. >> "%LOG%"

if not "%BUILD_EXIT%"=="0" (
  echo BUILD FALHOU - nada foi publicado. Abra PUBLICAR_CORRECOES.log e veja o erro. >> "%LOG%"
  echo BUILD FALHOU. Veja PUBLICAR_CORRECOES.log para o erro.
  pause
  exit /b 1
)

echo === ADD === >> "%LOG%"
"%GIT%" add "prisma/schema.prisma" "src/app/api/pendencias/route.ts" "src/app/api/pendencias/[id]/route.ts" "src/app/(dashboard)/dashboard/page.tsx" "src/app/(dashboard)/clientes/page.tsx" "src/app/lab/documento/page.tsx" "src/components/lab/SelfieCaptureLab.tsx" "src/components/lab/LivenessSelfieLab.tsx" "src/components/lab/DocumentCapture.tsx" "src/lib/assinatura/documentQuality.ts" "src/app/api/sign/documento/validar/route.ts" "src/components/assinatura/DocumentCapture.tsx" "src/app/assinar/[token]/page.tsx" "src/app/api/sign/[token]/submit/route.ts" "src/lib/pdfCertificate.ts" "public/certificado/papel-timbrado.jpg" "src/app/(dashboard)/kits/enviar/page.tsx" "src/app/api/kits/generate-package/route.ts" "src/app/(dashboard)/documentos/novo/page.tsx" "src/lib/templateCompiler.ts" "src/lib/publicAuditTrail.ts" "src/app/api/sign/[token]/event/route.ts" "src/components/DocumentRichEditor.tsx" "src/app/(dashboard)/modelos/page.tsx" "prisma/schema.prisma" "src/lib/documentLetterhead.ts" "src/app/api/office/letterhead/route.ts" "src/app/(dashboard)/configuracoes/page.tsx" "src/app/api/kits/preview/route.ts" "public/certificado/papel-timbrado-documentos.pdf" "src/lib/kitTemplateNormalization.ts" "src/app/api/templates/ai-edit/route.ts" "src/app/api/clients/route.ts" "src/app/api/clients/[id]/route.ts" "src/app/(dashboard)/kits/page.tsx" "src/app/api/documents/[id]/route.ts" "src/app/(dashboard)/documentos/page.tsx" >> "%LOG%" 2>&1

echo === COMMIT === >> "%LOG%"
"%GIT%" commit -m "Remove o copiloto de texto livre da edicao de minuta do kit e adiciona botao Detectar e aplicar dados (IA), que reconhece dados fixos de cliente, representante, assinante a rogo, advogados e cidade/estado colados ou digitados por engano e ja substitui pelos dados corretos desta cliente; edicao no kit continua isolada, sem afetar o modelo original. Tambem adiciona o mesmo botao Detectar e aplicar variaveis (IA) na edicao de minuta de modelo dentro da tela de Kits (aba Modelos), que estava sem esse recurso apesar de ser a mesma edicao de modelo. Corrige o editor de modelo da tela de Kits: a variavel de nascimento nao tinha valor de amostra e ficava aparecendo como codigo solto na previa, e o negrito automatico de nomes na previa podia fazer o texto de amostra ficar gravado fixo ao salvar em vez de voltar a ser variavel; agora usa o mesmo esquema seguro de marcacao ja usado em Modelos, com aviso antes de salvar se sobrar algum dado de amostra fixo. Corrige erro de build (variavel clienteEnderecoText usada antes de ser declarada) em generate-package/route.ts que estava impedindo a publicacao. Faz o texto nascido(a) na qualificacao da cliente usar o genero cadastrado (nascida/nascido) em vez do generico (a), tanto na geracao final quanto na previa e no editor. Aplica o mesmo tratamento de genero em portador(a) e residente e domiciliado(a) da qualificacao da cliente, tambem na geracao final, previa e editor. Corrige bug real encontrado ao revisar: ao abrir Editar Conteudo na revisao de minuta do kit, o editor mostrava o texto cru do modelo com as tags {{...}} literais em vez do texto ja preenchido com os dados da cliente (nomes em negrito, qualificacao substituida etc), porque o sistema pre-carregava o texto cru antes da pessoa abrir o editor. REVERTE essa ultima mudanca: fazer o editor mostrar o texto ja processado (com nomes em negrito e bloco de assinatura recentralizado) causou geracao de PDF quebrada ao editar (paginas em branco, texto sumindo, espacamento errado), porque o servidor tenta normalizar de novo um texto que ja nao tem mais os tokens {{...}} esperados; volta a mostrar o texto cru no editor, que e a forma segura, ja que a substituicao pelos dados reais da cliente acontece no servidor tanto na previa quanto na geracao final. Corrige a selecao de assinante a rogo (nos fluxos de Enviar Kit e Novo Documento): ao marcar o representante legal cadastrado como assinante a rogo, a data de nascimento e o endereco dele nao estavam sendo preenchidos automaticamente mesmo quando ja cadastrados na ficha da cliente - ficou faltando atualizar esses dois fluxos depois que esses campos foram adicionados ao cadastro do representante; agora eles vem preenchidos automaticamente, podendo ser ajustados antes de gerar. Adiciona o botao Refazer na Central de Documentos: um documento ja concluido (ou o pacote inteiro) pode ser reaberto para uma nova tentativa de assinatura, reaproveitando o mesmo link ja enviado e todo o conteudo do documento ja revisado/editado - util quando a prova de presenca (selfie, selo, posicao) saiu ruim e a pessoa precisa refazer so a parte de assinar, sem o escritorio ter que reeditar nada nem gerar link novo. So o administrador do escritorio ve e pode usar esse botao, nunca o cliente. A assinatura anterior nao e apagada silenciosamente: fica registrada na trilha de auditoria do documento como reaberta, preservando a exigencia de rastreabilidade da MP 2.200-2/Lei 14.063. Adiciona um setor de aprovacao: assim que um documento e concluido ele fica Aguardando revisao, com os botoes Aprovar e Refazer lado a lado (por documento ou pelo pacote inteiro); ao clicar em Aprovar o documento fica marcado como Aprovado e o botao Refazer some para ele, evitando clique acidental em algo que ja foi revisado e esta correto. Documentos concluidos antes desse recurso existir entram automaticamente como ja aprovados." >> "%LOG%" 2>&1
echo COMMIT_EXIT=%ERRORLEVEL% >> "%LOG%"

echo === PULL --rebase === >> "%LOG%"
"%GIT%" pull origin main --rebase >> "%LOG%" 2>&1
echo PULL_EXIT=%ERRORLEVEL% >> "%LOG%"

echo === PUSH === >> "%LOG%"
"%GIT%" push origin main >> "%LOG%" 2>&1
echo PUSH_EXIT=%ERRORLEVEL% >> "%LOG%"

echo. >> "%LOG%"
echo Pronto. Confira as linhas BUILD_EXIT / COMMIT_EXIT / PUSH_EXIT acima - devem estar todas =0. >> "%LOG%"
echo.
echo Concluido! Abra o arquivo PUBLICAR_CORRECOES.log nesta mesma pasta para conferir.
pause
