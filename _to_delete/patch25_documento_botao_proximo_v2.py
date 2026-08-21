import sys

path = "src/components/lab/DocumentCapture.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

ancora_banner = """              <div className={`pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl border px-3 py-2.5 text-center text-xs shadow-lg backdrop-blur-sm ${
                liveReadiness === 'READY'
                  ? 'border-emerald-300/70 bg-emerald-950/80 text-emerald-50'
                  : liveReadiness === 'ADJUST'
                    ? 'border-amber-300/70 bg-amber-950/80 text-amber-50'
                    : 'border-[#D4AF37]/60 bg-slate-950/80 text-white'
              }`}>
                <p className="font-extrabold">
                  {liveReadiness === 'READY'
                    ? 'Qualidade aprovada — toque em "Tirar foto"'
                    : liveReadiness === 'ADJUST'
                      ? 'Ajuste antes de fotografar'
                      : 'Analisando a imagem'}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 opacity-95">{liveHint}</p>
              </div>
            </>
          )}"""
exigir(ancora_banner in src, "ancora_banner nao encontrada")
novo_banner = """            </>
          )}"""
src = src.replace(ancora_banner, novo_banner, 1)

ancora_video_fim = """          {phase === 'REVIEW' && pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.dataUrl}
              alt={`Pre-visualizacao d${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`}
              style={alturaMaximaVideo}
              className="block h-auto max-h-[calc(100vh-230px)] max-w-full"
            />
          )}
        </div>
      </div>"""
exigir(ancora_video_fim in src, "ancora_video_fim nao encontrada")
novo_video_fim = """          {phase === 'REVIEW' && pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.dataUrl}
              alt={`Pre-visualizacao d${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`}
              style={alturaMaximaVideo}
              className="block h-auto max-h-[calc(100vh-230px)] max-w-full"
            />
          )}
        </div>

        {phase === 'LIVE' && (
          <div className="w-full max-w-sm px-2 pt-2">
            <div
              className={`rounded-xl border px-3 py-2 text-center text-xs font-extrabold shadow-lg ${
                liveReadiness === 'READY'
                  ? 'border-emerald-300/70 bg-emerald-950/80 text-emerald-50'
                  : liveReadiness === 'ADJUST'
                    ? 'border-amber-300/70 bg-amber-950/80 text-amber-50'
                    : 'border-[#D4AF37]/60 bg-slate-950/80 text-white'
              }`}
            >
              {liveReadiness === 'READY'
                ? 'Qualidade aprovada'
                : liveReadiness === 'ADJUST'
                  ? 'Ajuste antes de fotografar'
                  : 'Analisando a imagem'}
            </div>
            <button
              type="button"
              onClick={takePhoto}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] py-3.5 text-base font-extrabold text-[#071B3A] shadow-lg transition active:scale-[0.99]"
            >
              <Camera className="h-5 w-5" /> Tirar foto
            </button>
          </div>
        )}
      </div>"""
src = src.replace(ancora_video_fim, novo_video_fim, 1)

ancora_footer_antigo = """        {phase === 'LIVE' && (
          <>
            <div className={`hidden ${
              liveReadiness === 'READY'
                ? 'border-emerald-400/60 bg-emerald-500/15'
                : liveReadiness === 'ADJUST'
                  ? 'border-amber-400/60 bg-amber-500/15'
                  : 'border-[#D4AF37]/50 bg-[#D4AF37]/10'
            }`}>
              <p className={`font-extrabold ${liveReadiness === 'READY' ? 'text-emerald-200' : liveReadiness === 'ADJUST' ? 'text-amber-200' : 'text-[#F7D96B]'}`}>
                {liveReadiness === 'READY' ? 'Qualidade aprovada' : liveReadiness === 'ADJUST' ? 'Ajuste antes de fotografar' : 'Analisando a imagem'}
              </p>
              <p className="mt-1 leading-5 text-slate-100">{liveHint}</p>
              <p className="mt-0.5 text-[11px] text-slate-300">Toque em "Tirar foto" quando o documento estiver nítido e bem posicionado.</p>
              <p className="mt-1 leading-5 text-slate-100">Deixe o documento inteiro na moldura, com texto legível e sem brilho ou sombra.</p>
            </div>
            <button
              type="button"
              onClick={takePhoto}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] py-4 text-base font-extrabold text-[#071B3A] shadow-lg transition active:scale-[0.99]"
            >
              <Camera className="h-5 w-5" /> Tirar foto
            </button>
          </>
        )}

        {phase === 'REVIEW' && pending && ("""
exigir(ancora_footer_antigo in src, "ancora_footer_antigo nao encontrada")
novo_footer_antigo = """        {phase === 'REVIEW' && pending && ("""
src = src.replace(ancora_footer_antigo, novo_footer_antigo, 1)

ancora_flex = '''      <div className="flex min-h-0 flex-1 items-center justify-center px-2">'''
exigir(ancora_flex in src, "ancora_flex nao encontrada")
src = src.replace(
    ancora_flex,
    '''      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2">''',
    1,
)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch25 aplicado (tamanho {orig_len} -> {len(src)})")
