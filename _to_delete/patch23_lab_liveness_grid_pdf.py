import sys

path = "src/app/lab/documento/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Grade de imagens: troca o bloco único "PERFIL" pelas 3 fotos da prova de vida.
ancora_grid_perfil = """              <div className="space-y-1">
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
exigir(ancora_grid_perfil in src, "ancora_grid_perfil nao encontrada")
novo_grid_perfil = """              {(
                [
                  { src: liveness?.center || null, label: 'FRONTAL' },
                  { src: liveness?.left || null, label: 'PERFIL ESQ.' },
                  { src: liveness?.right || null, label: 'PERFIL DIR.' },
                ]
              ).map(({ src: shotSrc, label }) => (
                <div key={label} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {label}
                  </span>
                  {shotSrc ? (
                    <button
                      type="button"
                      onClick={() => setZoomImage({ src: shotSrc, label })}
                      className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={shotSrc}
                        alt={`Prova de vida - ${label.toLowerCase()}`}
                        className="block h-auto w-full object-contain"
                      />
                    </button>
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                      não capturada
                    </div>
                  )}
                </div>
              ))}
            </div>"""
src = src.replace(ancora_grid_perfil, novo_grid_perfil, 1)

# 2) Relatório em PDF: inclui também as 3 fotos da prova de vida, junto com o
# documento - assim o PDF baixado já simula o "pacote de evidências" completo.
ancora_pdf = """        imagens: [...paraRelatorio(front, 'FRENTE'), ...paraRelatorio(back, 'VERSO')],"""
exigir(ancora_pdf in src, "ancora_pdf nao encontrada")
novo_pdf = """        imagens: [
          ...paraRelatorio(front, 'DOCUMENTO - FRENTE'),
          ...paraRelatorio(back, 'DOCUMENTO - VERSO'),
          ...(liveness
            ? [
                {
                  label: 'PROVA DE VIDA - FRONTAL',
                  dataUrl: liveness.center,
                  width: 0,
                  height: 0,
                  bytes: 0,
                  capturedAt: formatBrasiliaDateTime(liveness.capturedAt),
                  meanLuminance: 0,
                  sharpness: 0,
                  issues: [],
                },
                {
                  label: 'PROVA DE VIDA - PERFIL ESQUERDO',
                  dataUrl: liveness.left,
                  width: 0,
                  height: 0,
                  bytes: 0,
                  capturedAt: formatBrasiliaDateTime(liveness.capturedAt),
                  meanLuminance: 0,
                  sharpness: 0,
                  issues: [],
                },
                {
                  label: 'PROVA DE VIDA - PERFIL DIREITO',
                  dataUrl: liveness.right,
                  width: 0,
                  height: 0,
                  bytes: 0,
                  capturedAt: formatBrasiliaDateTime(liveness.capturedAt),
                  meanLuminance: 0,
                  sharpness: 0,
                  issues: [],
                },
              ]
            : []),
        ],"""
src = src.replace(ancora_pdf, novo_pdf, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch23 aplicado (tamanho {orig_len} -> {len(src)})")
