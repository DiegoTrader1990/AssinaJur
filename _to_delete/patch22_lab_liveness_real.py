import sys

path = "src/app/lab/documento/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Troca a selfie simples pela réplica isolada da prova de vida real (3 fotos,
# detecção de movimento do rosto) usada hoje em produção.
ancora_import = "import SelfieCaptureLab, { type SelfieCaptureResult } from '@/components/lab/SelfieCaptureLab';"
exigir(ancora_import in src, "ancora_import nao encontrada")
src = src.replace(
    ancora_import,
    "import LivenessSelfieLab, { type LivenessResult } from '@/components/lab/LivenessSelfieLab';",
    1,
)

# 2) Versão do laboratório.
ancora_versao = "const LAB_VERSION = 'v6 — sequência documento → foto de perfil, pra validar antes do fluxo real';"
exigir(ancora_versao in src, "ancora_versao nao encontrada")
src = src.replace(
    ancora_versao,
    "const LAB_VERSION = 'v7 — documento + prova de vida real (3 fotos, igual à de produção)';",
    1,
)

# 3) Estado: agora guarda as 3 fotos da prova de vida, não uma selfie única.
ancora_estado = "  const [selfie, setSelfie] = useState<SelfieCaptureResult | null>(null);"
exigir(ancora_estado in src, "ancora_estado nao encontrada")
src = src.replace(ancora_estado, "  const [liveness, setLiveness] = useState<LivenessResult | null>(null);", 1)

# 4) handleSelfieConfirmed recebe as 3 fotos.
ancora_handle = """  const handleSelfieConfirmed = useCallback(
    (result: SelfieCaptureResult) => {
      setSelfie(result);
      pushEvent('TEST_COMPLETED', 'Sequência documento + perfil concluída');
      setStep('RESULT');
    },
    [pushEvent]
  );"""
exigir(ancora_handle in src, "ancora_handle nao encontrada")
novo_handle = """  const handleLivenessConfirmed = useCallback(
    (result: LivenessResult) => {
      setLiveness(result);
      pushEvent('TEST_COMPLETED', 'Sequência documento + prova de vida concluída');
      setStep('RESULT');
    },
    [pushEvent]
  );"""
src = src.replace(ancora_handle, novo_handle, 1)

# 5) resetTest limpa a prova de vida.
ancora_reset = "    setSelfie(null);\n    setZoomImage(null);"
exigir(ancora_reset in src, "ancora_reset nao encontrada")
src = src.replace(ancora_reset, "    setLiveness(null);\n    setZoomImage(null);", 1)

# 6) Texto de apresentação.
ancora_intro_texto = """            <p className="text-sm leading-6 text-slate-500">
              Você vai fotografar um documento de identificação com foto — RG ou CNH (frente e
              verso) — e depois uma foto do seu rosto. É essa sequência, documento e depois
              perfil, que dá mais força de prova à assinatura. Leva menos de um minuto.
            </p>"""
exigir(ancora_intro_texto in src, "ancora_intro_texto nao encontrada")
novo_intro_texto = """            <p className="text-sm leading-6 text-slate-500">
              Você vai fotografar um documento de identificação com foto — RG ou CNH (frente e
              verso) — e depois fazer a mesma prova de vida (3 fotos) já usada hoje no fluxo real
              de assinatura. É essa sequência, documento e depois prova de vida, que dá mais
              força de prova à assinatura.
            </p>"""
src = src.replace(ancora_intro_texto, novo_intro_texto, 1)

# 7) Renderiza a prova de vida real no lugar da selfie simples.
ancora_selfie_step = "      {step === 'SELFIE' && <SelfieCaptureLab onConfirm={handleSelfieConfirmed} onEvent={pushEvent} />}"
exigir(ancora_selfie_step in src, "ancora_selfie_step nao encontrada")
src = src.replace(
    ancora_selfie_step,
    "      {step === 'SELFIE' && <LivenessSelfieLab onConfirm={handleLivenessConfirmed} onEvent={pushEvent} />}",
    1,
)

# 8) Painel de diagnóstico: mostra as 3 fotos da prova de vida em vez de uma só.
ancora_row_selfie = '''              <Row label="Foto de perfil" value={selfie ? '✓ capturada' : '— não capturada'} />'''
exigir(ancora_row_selfie in src, "ancora_row_selfie nao encontrada")
novo_row_selfie = '''              <Row label="Prova de vida (3 fotos)" value={liveness ? '✓ concluída' : '— não concluída'} />'''
src = src.replace(ancora_row_selfie, novo_row_selfie, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch22 parte 1 aplicado (tamanho {orig_len} -> {len(src)})")
