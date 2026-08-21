import sys

path = "src/components/lab/DocumentCapture.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# A foto do documento não deve mais disparar sozinha depois de alguns segundos de
# imagem boa - o usuário decide quando tirar, sempre pelo botão "Tirar foto".
# Mantemos a análise de qualidade (o aviso "ajuste antes de fotografar" continua
# útil), só removemos o disparo automático da captura.
ancora = """      stableFramesRef.current += 1;
      const remaining = Math.max(0, 10 - stableFramesRef.current);
      setLiveReadiness('READY');
      setLiveCountdown(remaining > 0 ? Math.ceil(remaining / 3) : 0);
      setLiveHint(remaining > 0 ? 'Imagem legível. Mantenha o celular parado.' : 'Imagem aprovada. Capturando automaticamente...');
      if (stableFramesRef.current >= 10) {
        autoCaptureRef.current = true;
        window.setTimeout(() => takePhoto(), 250);
      }
    };"""
exigir(ancora in src, "ancora nao encontrada")
novo = """      stableFramesRef.current += 1;
      setLiveReadiness('READY');
      setLiveCountdown(null);
      setLiveHint('Imagem legível. Toque em "Tirar foto" quando quiser.');
    };"""
src = src.replace(ancora, novo, 1)

# Texto de status agora não fala mais em captura automática.
ancora_status = """                <p className="font-extrabold">
                  {liveReadiness === 'READY'
                    ? liveCountdown && liveCountdown > 0
                      ? `Qualidade aprovada — foto em ${liveCountdown}`
                      : 'Qualidade aprovada — capturando...'
                    : liveReadiness === 'ADJUST'
                      ? 'Ajuste antes de fotografar'
                      : 'Analisando a imagem'}
                </p>"""
exigir(ancora_status in src, "ancora_status nao encontrada")
novo_status = """                <p className="font-extrabold">
                  {liveReadiness === 'READY'
                    ? 'Qualidade aprovada — toque em "Tirar foto"'
                    : liveReadiness === 'ADJUST'
                      ? 'Ajuste antes de fotografar'
                      : 'Analisando a imagem'}
                </p>"""
src = src.replace(ancora_status, novo_status, 1)

# Texto auxiliar (bloco oculto) também não fala mais em captura sozinha.
ancora_hint = '''              <p className="mt-0.5 text-[11px] text-slate-300">A foto será tirada sozinha quando estiver boa.</p>'''
exigir(ancora_hint in src, "ancora_hint nao encontrada")
novo_hint = '''              <p className="mt-0.5 text-[11px] text-slate-300">Toque em "Tirar foto" quando o documento estiver nítido e bem posicionado.</p>'''
src = src.replace(ancora_hint, novo_hint, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch24 aplicado (tamanho {orig_len} -> {len(src)})")
