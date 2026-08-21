import sys

path = "src/components/lab/DocumentCapture.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# O bug: a moldura (frameRef) só existe no DOM quando phase é LIVE/REVIEW, mas o
# useEffect que media sua largura rodava só uma vez, no mount do componente -
# quando phase ainda era IDLE e a moldura nem existia. Resultado: frameWidth
# nunca saía de 0, o vídeo ficava sempre com opacity 0 (por isso a tela toda
# escura). Corrigido usando um "callback ref" (estado, não useRef) - assim o
# efeito observa a moldura de verdade, sempre que ela aparece.
ancora_refs = """  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);"""
exigir(ancora_refs in src, "ancora_refs nao encontrada")
novo_refs = """  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);"""
src = src.replace(ancora_refs, novo_refs, 1)

ancora_efeito = """  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setFrameWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);"""
exigir(ancora_efeito in src, "ancora_efeito nao encontrada")
novo_efeito = """  useEffect(() => {
    if (!frameEl) return;
    // Medição imediata - não espera o primeiro disparo do ResizeObserver.
    setFrameWidth(frameEl.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setFrameWidth(width);
    });
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, [frameEl]);"""
src = src.replace(ancora_efeito, novo_efeito, 1)

ancora_container_ref = '''          ref={frameRef}'''
exigir(ancora_container_ref in src, "ancora_container_ref nao encontrada")
src = src.replace(ancora_container_ref, '''          ref={setFrameEl}''', 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch27 aplicado (tamanho {orig_len} -> {len(src)})")
