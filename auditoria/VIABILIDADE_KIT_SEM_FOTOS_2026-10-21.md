# Viabilidade: kit com coleta opcional de fotos

Data: 21/10/2026. Base local: 1c14530.
Escopo: inspeção de código; não houve acesso ao banco, alteração de produção ou teste de assinatura real.

## Conclusão
É viável adicionar a escolha por envio de kit: COM_FOTOS (padrão) ou SEM_FOTOS. Não basta ocultar as telas. A configuração deve ser definida pelo usuário autenticado do escritório e respeitada pelo servidor, pelo fluxo público e pelo certificado.

## Pontos encontrados
- src/app/(dashboard)/kits/enviar/page.tsx e src/app/api/kits/generate-package/route.ts: formulário e criação de participantes/documentos; precisam transportar e validar a opção.
- src/app/assinar/[token]/page.tsx: retomada após CPF e conclusão bloqueiam sem frente, verso e selfie; há caminhos próprios para a rogo e sequência de participantes.
- src/app/api/sign/[token]/submit/route.ts: exige imagens salvas e recebidas; valida fotos de acompanhantes; criação de testemunhas legadas depende de selfie. Registra LIVENESS_CAPTURED quando não há IDENTITY_REUSED. Deve distinguir dispensa de captura e reaproveitamento.
- src/app/api/sign/[token]/confirm-identity/route.ts: descrição pressupõe próxima etapa de prova de presença; ajustar por modalidade.
- src/lib/pdfCertificate.ts: textos fixos mencionam selfie/prova de presença; precisam refletir as evidências reais, inclusive no selo e na autenticação. Não gerar quadros vazios ou alegar captura inexistente.
- prisma/schema.prisma: campos de fotos já são opcionais. O comentário sobre documento não obrigatório está desatualizado em relação à API.
- src/lib/document-review.ts e photo-review.ts: revisar correções por etapa, reinício e solicitações de fotos conforme a modalidade.
- src/app/api/verify/[code]/route.ts: já deriva livenessVerified da presença da selfie; manter consistência e indicar a modalidade escolhida.

## Desenho proposto
1. Na criação do envio, apresentar “Com fotos de identificação” e “Sem fotos de identificação”, mantendo a primeira como padrão.
2. Guardar a política no servidor para todos os documentos do kit, com usuário e data. Configuração ausente em envios antigos significa COM_FOTOS. Uma alternativa sem migração é um evento de configuração versionado, padrão já usado nos grupos de participantes; revisar criação atômica e leitura consistente antes de escolher definitivamente.
3. Aplicar a escolha a todos os participantes do envio, inclusive testemunhas e a rogo; manter a rogo no mesmo aparelho. Confirmar esse escopo no desenho da interface.
4. Sem fotos: identificação por CPF, acesso aos documentos, aceite e assinatura. Sem solicitação de câmera. Geolocalização somente conforme disponibilidade/permissão, sem afirmar coleta inexistente.
5. Validar consentimento e modalidade de assinatura no servidor, não apenas na interface. Não confiar em sinalizador enviado pelo navegador público para dispensar fotos.
6. Registro explícito de que a coleta foi dispensada pelo escritório. Não registrar prova de presença nem reutilizar silenciosamente fotos anteriores nesse modo.
7. Preservar escolhas em retomadas e correções; mudanças de modalidade devem ocorrer em novo envio, sem alterar aprovados ou afrouxar um link já iniciado.
8. Mostrar modalidade na revisão e desabilitar pedidos de refazer fotos que não foram exigidas/coletadas.

## Verificações antes da publicação
- COM_FOTOS continua bloqueando ausência/imagens inválidas; links antigos mantêm a regra.
- SEM_FOTOS conclui sem câmera, com consentimento; recusa tentativa de alterar política pelo link público.
- CPF incorreto, ausência de consentimento, assinatura inválida, cancelamento, expiração e ordem de participantes seguem bloqueados.
- Kit completo, parte adicional, testemunhas, a rogo, representação legal, mesmo/outro aparelho, retomada, correção e reenvio.
- PDFs, consulta pública e trilha sem afirmações de fotos ou presença inexistentes.
- Isolamento entre escritórios, imutabilidade de aprovados e concorrência entre revisão/assinatura.
- Testes em ambiente isolado; build sem db push; backup recuperável se houver migração.

A dispensa reduz as evidências de identificação. Não introduz ICP-Brasil/GOV.BR nem compatibilidade com ITI. Este relatório é técnico, não afirma aceitação judicial.
