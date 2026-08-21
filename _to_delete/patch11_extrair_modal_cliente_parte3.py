import sys

path = "src/app/(dashboard)/clientes/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Substitui o JSX antigo do modal de Novo/Editar Cliente pelo componente extraido.
inicio_marker = "      {/* Modal: Novo Cliente com OCR & Leitura por IA */}\n"
fim_marker = "      {/* Modal: Ficha Detalhada do Cliente */}"

i_inicio = src.find(inicio_marker)
i_fim = src.find(fim_marker)
exigir(i_inicio != -1, "inicio_marker (Modal: Novo Cliente) nao encontrado")
exigir(i_fim != -1, "fim_marker (Modal: Ficha Detalhada) nao encontrado")
exigir(i_fim > i_inicio, "ordem inesperada dos marcadores (modal novo cliente)")

bloco_removido = src[i_inicio:i_fim]
exigir("createPortal(" in bloco_removido, "createPortal nao estava no bloco removido (modal novo cliente)")
exigir("Preencher por Foto/RG (IA)" in bloco_removido, "conteudo esperado ausente no bloco removido (modal novo cliente)")

novo_jsx = """      <NovoClienteModal
        open={showModal}
        editingClient={editingClient as unknown as ClienteEditavel | null}
        initialName={modalInitialName}
        initialArea={modalInitialArea}
        onClose={closeClientForm}
        onSaved={handleClientSaved}
      />

"""

src = src[:i_inicio] + novo_jsx + src[i_fim:]

# 2) Remove o JSX do modal de Zoom / Tela Cheia (agora dentro do componente extraido).
inicio_zoom = "      {/* Modal de Zoom / Tela Cheia do Documento */}\n"
fim_zoom = "    </div>\n  );\n}\n"

i_inicio_zoom = src.find(inicio_zoom)
exigir(i_inicio_zoom != -1, "inicio_zoom (Modal de Zoom) nao encontrado")
i_fim_zoom = src.find(fim_zoom, i_inicio_zoom)
exigir(i_fim_zoom != -1, "fim_zoom (fechamento do componente) nao encontrado")

bloco_zoom = src[i_inicio_zoom:i_fim_zoom]
exigir("Inspeção de Documento em Alta Resolução" in bloco_zoom, "conteudo esperado ausente no bloco removido (modal zoom)")

src = src[:i_inicio_zoom] + src[i_fim_zoom:]

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch11 aplicado (tamanho {orig_len} -> {len(src)})")
