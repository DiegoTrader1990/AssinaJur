import sys, re

path = "src/app/(dashboard)/clientes/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# Remove todo o bloco entre "const openCreateClient" e "const handleDeleteClient",
# que inclui openCreateClient, openEditClient (formulario completo), openClientDossier,
# processOcrFile, handlers de zoom/pan/drag e handleSaveClient - tudo isso agora
# vive dentro de NovoClienteModal.tsx. Mantemos so uma versao enxuta.
inicio_marker = "  const openCreateClient = () => {"
fim_marker = "  const handleDeleteClient = async () => {"

i_inicio = src.find(inicio_marker)
i_fim = src.find(fim_marker)
exigir(i_inicio != -1, "inicio_marker (openCreateClient) nao encontrado")
exigir(i_fim != -1, "fim_marker (handleDeleteClient) nao encontrado")
exigir(i_fim > i_inicio, "ordem inesperada dos marcadores")

bloco_removido = src[i_inicio:i_fim]
# validacoes de sanidade: confirma que o bloco removido de fato contem o que esperamos
exigir("const openEditClient = (client: Client) => {" in bloco_removido, "openEditClient nao estava no bloco removido")
exigir("const openClientDossier = async (client: Client) => {" in bloco_removido, "openClientDossier nao estava no bloco removido")
exigir("const processOcrFile = async (file: File) => {" in bloco_removido, "processOcrFile nao estava no bloco removido")
exigir("const handleSaveClient = async (e: React.FormEvent) => {" in bloco_removido, "handleSaveClient nao estava no bloco removido")

novo_bloco = """  const openCreateClient = () => {
    setEditingClient(null);
    setModalInitialName('');
    setModalInitialArea('');
    setFormError('');
    setShowModal(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setFormError('');
    setShowModal(true);
  };

  const openClientDossier = async (client: Client) => {
    setSelectedClient(client);
    setActiveTab('resumo');
    try {
      const response = await fetch(`/api/clients/${client.id}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.client) setSelectedClient(data.client);
    } catch {
      // A ficha básica continua disponível mesmo que os dados complementares falhem.
    }
  };

  // Chamado pelo NovoClienteModal apos salvar com sucesso (criar ou editar).
  const handleClientSaved = async (savedClient: Client) => {
    if (editingClient && savedClient) {
      setSelectedClient(savedClient);
    }
    await fetchClients();
  };

"""

src = src[:i_inicio] + novo_bloco + src[i_fim:]

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch10 aplicado (tamanho {orig_len} -> {len(src)})")
