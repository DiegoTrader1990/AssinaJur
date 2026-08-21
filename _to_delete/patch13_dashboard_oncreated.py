import sys

path = "src/app/(dashboard)/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

ancora = """      <FluxoRapido
        clientes={clients}
        kits={kits}
        processos={processes}
        documentos={documents}
        kitPreferidoId={painelKitPreferido}
        tempoMedioMinutos={painelIndicadores.tempoMedioMinutos}
      />"""
exigir(ancora in src, "ancora (uso de FluxoRapido) nao encontrada")
novo = """      <FluxoRapido
        clientes={clients}
        kits={kits}
        processos={processes}
        documentos={documents}
        kitPreferidoId={painelKitPreferido}
        tempoMedioMinutos={painelIndicadores.tempoMedioMinutos}
        onClientCreated={(client) => {
          // Cadastro feito pela caixa rapida do Fluxo Rapido - atualiza a lista
          // aqui na Home sem precisar recarregar a pagina.
          setClients((prev) => [client, ...prev.filter((c) => c.id !== client.id)]);
        }}
      />"""
src = src.replace(ancora, novo, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch13 aplicado (tamanho {orig_len} -> {len(src)})")
