import sys

path = "src/app/lab/documento/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Import do novo passo de selfie (isolado, só para o laboratório).
ancora_import = "import DocumentCapture, { type CaptureResult } from '@/components/lab/DocumentCapture';"
exigir(ancora_import in src, "ancora_import nao encontrada")
src = src.replace(
    ancora_import,
    ancora_import + "\nimport SelfieCaptureLab, { type SelfieCaptureResult } from '@/components/lab/SelfieCaptureLab';",
    1,
)

# 2) Novo passo SELFIE entre BACK e RESULT.
ancora_step_type = "type Step = 'INTRO' | 'FRONT' | 'BACK' | 'RESULT';"
exigir(ancora_step_type in src, "ancora_step_type nao encontrada")
src = src.replace(ancora_step_type, "type Step = 'INTRO' | 'FRONT' | 'BACK' | 'SELFIE' | 'RESULT';", 1)

# 3) Versão do laboratório.
ancora_versao = "const LAB_VERSION = 'v5 — recorte na moldura + câmera em tela cheia';"
exigir(ancora_versao in src, "ancora_versao nao encontrada")
src = src.replace(
    ancora_versao,
    "const LAB_VERSION = 'v6 — sequência documento → foto de perfil, pra validar antes do fluxo real';",
    1,
)

# 4) Estado da selfie de teste.
ancora_estado = "  const [front, setFront] = useState<CaptureResult | null>(null);\n  const [back, setBack] = useState<CaptureResult | null>(null);"
exigir(ancora_estado in src, "ancora_estado nao encontrada")
src = src.replace(
    ancora_estado,
    ancora_estado + "\n  const [selfie, setSelfie] = useState<SelfieCaptureResult | null>(null);",
    1,
)

# 5) handleBackConfirmed agora leva para SELFIE, não direto para RESULT.
ancora_back = """  const handleBackConfirmed = useCallback(
    (result: CaptureResult) => {
      setBack(result);
      pushEvent('TEST_COMPLETED', 'Captura concluída');
      setStep('RESULT');
    },
    [pushEvent]
  );"""
exigir(ancora_back in src, "ancora_back nao encontrada")
novo_back = """  const handleBackConfirmed = useCallback(
    (result: CaptureResult) => {
      setBack(result);
      pushEvent('DOCUMENT_CAPTURED', 'Documento capturado - avançando para foto de perfil');
      setStep('SELFIE');
    },
    [pushEvent]
  );

  const handleSelfieConfirmed = useCallback(
    (result: SelfieCaptureResult) => {
      setSelfie(result);
      pushEvent('TEST_COMPLETED', 'Sequência documento + perfil concluída');
      setStep('RESULT');
    },
    [pushEvent]
  );"""
src = src.replace(ancora_back, novo_back, 1)

# 6) resetTest também limpa a selfie.
ancora_reset = """  const resetTest = useCallback(() => {
    setStep('INTRO');
    setFront(null);
    setBack(null);
    setZoomImage(null);"""
exigir(ancora_reset in src, "ancora_reset nao encontrada")
src = src.replace(
    ancora_reset,
    """  const resetTest = useCallback(() => {
    setStep('INTRO');
    setFront(null);
    setBack(null);
    setSelfie(null);
    setZoomImage(null);""",
    1,
)

# 7) Texto de apresentação já avisa que depois do documento vem a foto de perfil.
ancora_intro_texto = """            <p className="text-sm leading-6 text-slate-500">
              Você vai fotografar um documento de identificação com foto — RG ou CNH. São duas
              fotos: primeiro a frente, depois o verso. Leva menos de um minuto.
            </p>"""
exigir(ancora_intro_texto in src, "ancora_intro_texto nao encontrada")
novo_intro_texto = """            <p className="text-sm leading-6 text-slate-500">
              Você vai fotografar um documento de identificação com foto — RG ou CNH (frente e
              verso) — e depois uma foto do seu rosto. É essa sequência, documento e depois
              perfil, que dá mais força de prova à assinatura. Leva menos de um minuto.
            </p>"""
src = src.replace(ancora_intro_texto, novo_intro_texto, 1)

# 8) Renderiza o passo SELFIE entre BACK e RESULT.
ancora_selfie_step = """      {/* ETAPA 4 — DIAGNÓSTICO */}
      {step === 'RESULT' && ("""
exigir(ancora_selfie_step in src, "ancora_selfie_step nao encontrada")
novo_selfie_step = """      {/* ETAPA 4 — FOTO DE PERFIL (depois do documento, na mesma sessão) */}
      {step === 'SELFIE' && <SelfieCaptureLab onConfirm={handleSelfieConfirmed} onEvent={pushEvent} />}

      {/* ETAPA 5 — DIAGNÓSTICO */}
      {step === 'RESULT' && ("""
src = src.replace(ancora_selfie_step, novo_selfie_step, 1)

# 9) Painel de diagnóstico: mostra também a captura da foto de perfil.
ancora_row_verso = """              <Row label="Verso do documento" value={back ? '✓ capturado' : '— não capturado'} />"""
exigir(ancora_row_verso in src, "ancora_row_verso nao encontrada")
novo_row_verso = """              <Row label="Verso do documento" value={back ? '✓ capturado' : '— não capturado'} />
              <Row label="Foto de perfil" value={selfie ? '✓ capturada' : '— não capturada'} />"""
src = src.replace(ancora_row_verso, novo_row_verso, 1)

# 10) Grade de imagens: acrescenta a selfie ao lado de frente/verso.
ancora_grid = """            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {(
                [
                  { shot: front, label: 'FRENTE' },
                  { shot: back, label: 'VERSO' },
                ]
              ).map(({ shot, label }) => (
                <div key={label} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {label}
                  </span>
                  {shot ? (
                    <button
                      type="button"
                      onClick={() => setZoomImage({ src: shot.dataUrl, label })}
                      className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
                    >
                      {/* object-contain preserva a proporção real da foto */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shot.dataUrl}
                        alt={`Documento — ${label.toLowerCase()}`}
                        className="block h-auto w-full object-contain"
                      />
                    </button>
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                      não capturado
                    </div>
                  )}
                  {shot && (
                    <p className="text-[10px] leading-tight text-slate-400">
                      {shot.width}×{shot.height}px · {(shot.bytes / 1024).toFixed(0)} KB
                      <br />
                      luminância {shot.quality.meanLuminance} · nitidez {shot.quality.sharpness}
                    </p>
                  )}
                </div>
              ))}
            </div>"""
exigir(ancora_grid in src, "ancora_grid nao encontrada")
novo_grid = """            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {(
                [
                  { shot: front, label: 'FRENTE' },
                  { shot: back, label: 'VERSO' },
                ]
              ).map(({ shot, label }) => (
                <div key={label} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {label}
                  </span>
                  {shot ? (
                    <button
                      type="button"
                      onClick={() => setZoomImage({ src: shot.dataUrl, label })}
                      className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
                    >
                      {/* object-contain preserva a proporção real da foto */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shot.dataUrl}
                        alt={`Documento — ${label.toLowerCase()}`}
                        className="block h-auto w-full object-contain"
                      />
                    </button>
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                      não capturado
                    </div>
                  )}
                  {shot && (
                    <p className="text-[10px] leading-tight text-slate-400">
                      {shot.width}×{shot.height}px · {(shot.bytes / 1024).toFixed(0)} KB
                      <br />
                      luminância {shot.quality.meanLuminance} · nitidez {shot.quality.sharpness}
                    </p>
                  )}
                </div>
              ))}

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  PERFIL
                </span>
                {selfie ? (
                  <button
                    type="button"
                    onClick={() => setZoomImage({ src: selfie.dataUrl, label: 'PERFIL' })}
                    className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selfie.dataUrl}
                      alt="Foto de perfil"
                      className="block h-auto w-full object-contain"
                    />
                  </button>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                    não capturada
                  </div>
                )}
                {selfie && (
                  <p className="text-[10px] leading-tight text-slate-400">
                    {selfie.width}×{selfie.height}px
                  </p>
                )}
              </div>
            </div>"""
src = src.replace(ancora_grid, novo_grid, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch21 aplicado (tamanho {orig_len} -> {len(src)})")
