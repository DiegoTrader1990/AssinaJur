import sys

path = "src/components/lab/DocumentCapture.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# O status da revisão (confirmando, recusado, aprovado...) ficava num rodapé
# separado, bem mais abaixo do que o status "Qualidade aprovada" da câmera -
# por isso o texto "saltava" de lugar ao trocar de fase. Move esse bloco para
# o mesmo lugar, logo abaixo da moldura, nas duas fases.
ancora_live_bloco = """        {phase === 'LIVE' && (
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
exigir(ancora_live_bloco in src, "ancora_live_bloco nao encontrada")
novo_live_bloco = """        {phase === 'LIVE' && (
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

        {phase === 'REVIEW' && pending && (
          <div className="w-full max-w-sm space-y-2 px-2 pt-2">
            {reviewStatus === 'CAUTION' && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-center text-xs font-bold text-amber-100">
                <p>Confira antes de continuar</p>
                <p className="mt-0.5 text-[11px] font-medium opacity-90">{captureQualityMessage(pending.quality)}</p>
              </div>
            )}
            {visionCheck === 'CHECKING' && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-3 text-center text-xs font-bold text-sky-100">
                <Loader2 className="h-4 w-4 animate-spin" /> Confirmando se é um documento...
              </div>
            )}
            {visionCheck === 'REJECTED' && (
              <div className="rounded-xl border border-rose-400/50 bg-rose-500/15 px-3 py-3 text-center text-xs font-bold text-rose-100">
                <p>Não identificamos um documento nesta foto.</p>
                {visionReason && <p className="mt-1 text-[11px] font-medium opacity-90">{visionReason}</p>}
              </div>
            )}
            {visionCheck === 'ERROR' && (
              <button
                type="button"
                onClick={() => setValidationRetry((value) => value + 1)}
                className="w-full rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-3 text-center text-xs font-bold text-amber-100"
              >
                Não foi possível validar agora. Toque para tentar novamente.
              </button>
            )}
            {visionCheck === 'VALID' && (
              <button
                type="button"
                onClick={confirm}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-500 active:scale-[0.99]"
              >
                <Check className="h-4 w-4" /> Continuar
              </button>
            )}
            <button
              type="button"
              onClick={retake}
              className={`flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold transition active:scale-[0.99] ${visionCheck === 'REJECTED' ? 'rounded-xl bg-[#D4AF37] py-3 text-[#071B3A]' : 'text-slate-300 hover:text-white'}`}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tirar outra foto
            </button>
          </div>
        )}
      </div>"""
src = src.replace(ancora_live_bloco, novo_live_bloco, 1)

# Remove o bloco de revisão do rodapé antigo (agora duplicado) - só o aviso de
# erro permanece lá embaixo.
ancora_rodape_antigo = """        {phase === 'REVIEW' && pending && (
          <>
            {reviewStatus === 'CAUTION' && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-center text-xs font-bold text-amber-100">
              <p>Confira antes de continuar</p>
              <p className="mt-0.5 text-[11px] font-medium opacity-90">{captureQualityMessage(pending.quality)}</p>
            </div>
            )}
            {visionCheck === 'CHECKING' && (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/15 px-3 py-3 text-center text-xs font-bold text-sky-100">
                <Loader2 className="h-4 w-4 animate-spin" /> Confirmando se é um documento...
              </div>
            )}
            {visionCheck === 'REJECTED' && (
              <div className="rounded-xl border border-rose-400/50 bg-rose-500/15 px-3 py-3 text-center text-xs font-bold text-rose-100">
                <p>Não identificamos um documento nesta foto.</p>
                {visionReason && <p className="mt-1 text-[11px] font-medium opacity-90">{visionReason}</p>}
              </div>
            )}
            {visionCheck === 'ERROR' && (
              <button
                type="button"
                onClick={() => setValidationRetry((value) => value + 1)}
                className="w-full rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-3 text-center text-xs font-bold text-amber-100"
              >
                Não foi possível validar agora. Toque para tentar novamente.
              </button>
            )}
            {visionCheck === 'VALID' && (
              <button
                type="button"
                onClick={confirm}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-500 active:scale-[0.99]"
              >
                <Check className="h-4 w-4" /> Continuar
              </button>
            )}
            <button
              type="button"
              onClick={retake}
              className={`flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold transition active:scale-[0.99] ${visionCheck === 'REJECTED' ? 'rounded-xl bg-[#D4AF37] py-3 text-[#071B3A]' : 'text-slate-300 hover:text-white'}`}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tirar outra foto
            </button>
          </>
        )}
      </div>
    </div>
  );
}"""
exigir(ancora_rodape_antigo in src, "ancora_rodape_antigo nao encontrada")
novo_rodape_antigo = """      </div>
    </div>
  );
}"""
src = src.replace(ancora_rodape_antigo, novo_rodape_antigo, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch28 aplicado (tamanho {orig_len} -> {len(src)})")
