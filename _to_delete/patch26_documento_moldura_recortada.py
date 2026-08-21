import sys

path = "src/components/lab/DocumentCapture.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Import extra: useLayoutEffect não é necessário, mas precisamos de um ref +
# ResizeObserver para saber a largura real da moldura na tela e escalar o vídeo
# até que só a área recortada apareça.
ancora_import = "import { useCallback, useEffect, useRef, useState } from 'react';"
exigir(ancora_import in src, "ancora_import nao encontrada")
# (mantém o import como está - useRef e useState já cobrem o necessário)

# 2) Novo ref e estado para medir a largura da moldura exibida na tela.
ancora_refs = "  const videoRef = useRef<HTMLVideoElement | null>(null);\n  const streamRef = useRef<MediaStream | null>(null);"
exigir(ancora_refs in src, "ancora_refs nao encontrada")
novo_refs = """  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);"""
src = src.replace(ancora_refs, novo_refs, 1)

# 3) Observa a largura real da moldura na tela (muda em rotação, tela diferente etc).
ancora_efeito_stop = """  useEffect(() => {\n    return () => stopCamera();\n  }, [stopCamera]);"""
exigir(ancora_efeito_stop in src, "ancora_efeito_stop nao encontrada")
novo_efeito_stop = """  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setFrameWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);"""
src = src.replace(ancora_efeito_stop, novo_efeito_stop, 1)

# 4) Vídeo em tela: em vez de mostrar a câmera inteira com uma máscara escura por
# cima, agora só a área da moldura é visível - o vídeo é escalado e deslocado por
# CSS para que exatamente o retângulo do recorte (o mesmo usado na captura final)
# preencha a moldura, sem sobra de câmera ao redor.
ancora_video_live = """          {phase === 'LIVE' && (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth) setVideoDims({ w: v.videoWidth, h: v.videoHeight });
                }}
                style={alturaMaximaVideo}
                className="block h-auto max-h-[calc(100vh-230px)] max-w-full"
              />

              {videoDims && crop && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${videoDims.w} ${videoDims.h}`}
                  preserveAspectRatio="none"
                >
                  <path
                    d={`M0,0 H${videoDims.w} V${videoDims.h} H0 Z M${crop.x},${crop.y} V${
                      crop.y + crop.h
                    } H${crop.x + crop.w} V${crop.y} Z`}
                    fill="rgba(0,0,0,0.55)"
                    fillRule="evenodd"
                  />
                  <rect
                    x={crop.x}
                    y={crop.y}
                    width={crop.w}
                    height={crop.h}
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth={Math.max(2, videoDims.w * 0.004)}
                    strokeDasharray={`${videoDims.w * 0.03} ${videoDims.w * 0.02}`}
                    rx={videoDims.w * 0.012}
                  />
                </svg>
              )}
            </>
          )}"""
exigir(ancora_video_live in src, "ancora_video_live nao encontrada")
novo_video_live = """          {phase === 'LIVE' && (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth) setVideoDims({ w: v.videoWidth, h: v.videoHeight });
              }}
              style={
                videoDims && crop && frameWidth
                  ? {
                      position: 'absolute' as const,
                      top: 0,
                      left: 0,
                      width: `${videoDims.w * (frameWidth / crop.w)}px`,
                      height: `${videoDims.h * (frameWidth / crop.w)}px`,
                      transform: `translate(${-crop.x * (frameWidth / crop.w)}px, ${-crop.y * (frameWidth / crop.w)}px)`,
                      maxWidth: 'none',
                    }
                  : { opacity: 0 }
              }
              className="block"
            />
          )}"""
src = src.replace(ancora_video_live, novo_video_live, 1)

# 5) O contêiner passa a ter o formato final do documento (mesma proporção do
# recorte), com a largura medida pelo ResizeObserver - só essa área aparece.
ancora_container = '''        <div className="relative w-fit overflow-hidden rounded-xl">'''
exigir(ancora_container in src, "ancora_container nao encontrada")
novo_container = '''        <div
          ref={frameRef}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border-4 border-[#D4AF37]/70 bg-slate-900"
          style={{ aspectRatio: String(CROP_ASPECT) }}
        >'''
src = src.replace(ancora_container, novo_container, 1)

# 6) A prévia (REVIEW) já é a foto recortada - só precisa preencher a moldura.
ancora_img_review = """          {phase === 'REVIEW' && pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.dataUrl}
              alt={`Pre-visualizacao d${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`}
              style={alturaMaximaVideo}
              className="block h-auto max-h-[calc(100vh-230px)] max-w-full"
            />
          )}
        </div>"""
exigir(ancora_img_review in src, "ancora_img_review nao encontrada")
novo_img_review = """          {phase === 'REVIEW' && pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.dataUrl}
              alt={`Pre-visualizacao d${side === 'FRENTE' ? 'a frente' : 'o verso'} do documento`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>"""
src = src.replace(ancora_img_review, novo_img_review, 1)

# 7) Remove a constante que só servia para limitar a altura do vídeo/imagem no
# layout antigo - a moldura de proporção fixa cuida disso agora.
ancora_altura_max = "  // Camera aberta ou revisao: ocupa a tela inteira, sem rolagem possivel.\n  // O botao fica ancorado na base, respeitando a area segura do aparelho.\n  const alturaMaximaVideo = { maxHeight: 'calc(100dvh - 230px)' } as const;\n"
exigir(ancora_altura_max in src, "ancora_altura_max nao encontrada")
src = src.replace(
    ancora_altura_max,
    "  // Camera aberta ou revisao: ocupa a tela inteira, sem rolagem possivel.\n  // O botao fica ancorado na base, respeitando a area segura do aparelho.\n",
    1,
)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch26 parte 1 aplicado (tamanho {orig_len} -> {len(src)})")
