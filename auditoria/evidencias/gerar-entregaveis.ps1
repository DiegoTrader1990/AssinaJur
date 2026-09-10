$auditRoot = Split-Path -Parent $PSScriptRoot
$auditSource = Join-Path $auditRoot 'AUDITORIA_ASSINAJUR_2026-09-08.md'
$auditText = Get-Content -Raw -LiteralPath $auditSource
$auditItems = [regex]::Matches($auditText, '(?m)^### ((?:SEG|ASS|PRO|OPE|COM)-\d+) — (P[012]) — (.+)$')
$auditLines = [System.Collections.Generic.List[string]]::new()
$auditLines.Add('# Plano de execução — AssinaJur')
$auditLines.Add('')
$auditLines.Add('Base: auditoria de 08/09/2026, commit 9783c2d. Todos os itens começam pendentes. Marcar concluído somente após implementar e cumprir o critério de aceite do relatório. P0 bloqueia liberação com dados reais; P1 bloqueia venda ou liberação da função; P2 pode ficar fora do escopo inicial.')
$auditLines.Add('')
$auditLines.Add('## Preservação obrigatória dos dados existentes')
$auditLines.Add('')
$auditLines.Add('O usuário já utiliza a produção e informou dois kits assinados e conferidos como corretos. Preservar todos os clientes, documentos, participantes, evidências e vínculos. Antes de alterar a produção: backup de banco e arquivos, recuperação testada em ambiente isolado e inventário de IDs, códigos de verificação e hashes. Manter compatibilidade com dados antigos; não reabrir assinaturas nem regenerar certificados históricos automaticamente. Conferir o inventário antes/depois de cada atualização. Nenhuma alteração estrutural em produção sem backup verificado.')
$auditLines.Add('')
$auditLines.Add('## Marcos de liberação')
$auditLines.Add('')
$auditLines.Add('- [ ] Base segura: segredos, isolamento entre escritórios, permissões, conteúdo seguro e build sem alteração destrutiva do banco.')
$auditLines.Add('- [ ] Assinatura confiável: participantes corretos, aceite verificável, versões preservadas, falhas recuperáveis e certificado íntegro.')
$auditLines.Add('- [ ] Piloto fechado: ambiente separado, dados fictícios, roteiro aprovado e módulos incompletos desabilitados.')
$auditLines.Add('- [ ] Uso real supervisionado: controles e documentação de privacidade/evidências, backup restaurado e suporte operacional.')
$auditLines.Add('- [ ] Venda assistida: oferta, cotas, preço, cobrança, cancelamento, licenças e hospedagem coerentes.')
$auditLines.Add('')
foreach ($priority in @('P0', 'P1', 'P2')) {
    $auditLines.Add("## $priority")
    $auditLines.Add('')
    foreach ($item in $auditItems) {
        if ($item.Groups[2].Value -eq $priority) {
            $auditLines.Add(('- [ ] **{0}** — {1}' -f $item.Groups[1].Value, $item.Groups[3].Value))
        }
    }
    $auditLines.Add('')
}
$auditLines.Add('## Registro de cada correção')
$auditLines.Add('')
$auditLines.Add('Para cada ID, registrar responsável, mudança/commit, ambiente, teste de aceite, resultado e risco residual. Se alterar schema, planejar sincronização/migração em produção separada do build, com backup e recuperação. Revalidar o fluxo completo do escopo antes de publicar.')
$auditLines.Add('')
$auditLines.Add('## Recursos que podem aguardar')
$auditLines.Add('')
$auditLines.Add('Word, Central de Entrada/Drive, caixa de atendimento WhatsApp e relatórios avançados podem ficar fora da primeira oferta, desde que isso esteja claro e o acesso às funções não homologadas esteja bloqueado. Checkout automático pode vir depois de uma cobrança manual rastreável. Segurança, integridade de assinatura e separação de escritórios não são adiáveis.')
Set-Content -LiteralPath (Join-Path $auditRoot 'PLANO_DE_EXECUCAO.md') -Value ($auditLines -join "`n") -Encoding utf8
$auditBody = (ConvertFrom-Markdown -LiteralPath $auditSource).Html
$auditCss = @'
:root{color-scheme:light;--navy:#0b1d3d;--blue:#245edb;--ink:#26354a;--muted:#637083;--line:#dde3ec}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f2f5fa;color:var(--ink);font:16px/1.72 system-ui,-apple-system,Segoe UI,sans-serif}.cover{background:var(--navy);color:white;padding:50px max(28px,calc((100% - 1050px)/2)) 38px}.eyebrow{text-transform:uppercase;font-size:12px;letter-spacing:.16em;color:#aabfdc}.cover h1{font-size:40px;line-height:1.14;max-width:800px;margin:12px 0 18px}.cover p{max-width:800px;color:#d2dced}.stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:25px}.stats div{border:1px solid #314460;border-radius:12px;padding:12px 20px;min-width:130px}.stats strong{font-size:28px;display:block}.stats span{font-size:12px;color:#c3d0e3}main{max-width:1120px;margin:30px auto 70px;padding:40px 48px;background:white;border:1px solid var(--line);border-radius:18px}main>h1{font-size:30px;color:var(--navy)}h2{font-size:25px;line-height:1.3;margin:44px 0 18px;color:var(--navy);padding-top:20px;border-top:2px solid var(--line)}h3{font-size:19px;line-height:1.4;color:var(--navy);margin:35px 0 12px;padding:16px 20px;background:#f3f6fb;border-left:4px solid var(--blue);border-radius:0 8px 8px 0}p{margin:12px 0}a{color:var(--blue);overflow-wrap:anywhere}code{font-family:ui-monospace,Consolas,monospace;font-size:.86em;background:#f1f4f8;padding:2px 4px;border-radius:4px;overflow-wrap:anywhere}table{border-collapse:collapse;font-size:13px;width:100%;display:block;overflow:auto;margin:20px 0}th,td{padding:12px 14px;border:1px solid var(--line);vertical-align:top;min-width:150px}th{background:var(--navy);color:white;text-align:left}tr:nth-child(even){background:#f7f9fc}li{margin:7px 0}footer{text-align:center;color:var(--muted);font-size:12px;padding:20px}@media(max-width:700px){main{margin:12px;padding:22px 20px}.cover{padding:30px 24px}.cover h1{font-size:30px}h2{font-size:22px}h3{font-size:17px}.stats div{min-width:100px;padding:10px 12px}}@media print{body{background:white;font-size:10pt}.cover{padding:24px;color:#0b1d3d;background:#edf2f8}.cover p,.eyebrow,.stats span{color:#34455c}.stats div{border-color:#becadb}main{max-width:none;border:0;margin:0;padding:12px}h2,h3{break-after:avoid}p,li{orphans:3;widows:3}table{display:table;font-size:8pt}th,td{min-width:0;padding:7px}h3{break-inside:avoid}a{color:#17469e;text-decoration:none}footer{display:none}}
'@
$auditHtml = @"
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Auditoria AssinaJur — 08/09/2026</title><style>$auditCss</style></head><body><header class="cover"><div class="eyebrow">AssinaJur • Preparação para lançamento • 08/09/2026</div><h1>O que falta para testar e vender com confiança</h1><p>Auditoria de produto, segurança, assinatura e operação. Parecer atual: corrigir bloqueios antes de liberar outros escritórios com dados reais.</p><div class="stats"><div><strong>57</strong><span>pontos de ação</span></div><div><strong>15</strong><span>P0 • bloqueios</span></div><div><strong>37</strong><span>P1 • antes da liberação</span></div><div><strong>5</strong><span>P2 • melhorias</span></div></div></header><main>$auditBody</main><footer>Documento interno de preparação • Evidências e limitações descritas no relatório • Nenhuma correção ou publicação realizada</footer></body></html>
"@
Set-Content -LiteralPath (Join-Path $auditRoot 'AUDITORIA_ASSINAJUR_2026-09-08.html') -Value $auditHtml -Encoding utf8
Write-Output "Entregáveis gerados: relatório HTML e plano com $($auditItems.Count) itens."
