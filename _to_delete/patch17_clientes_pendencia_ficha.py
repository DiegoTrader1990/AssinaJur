import sys

path = "src/app/(dashboard)/clientes/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Estado: pendências abertas do cliente da ficha + formulário de cadastro rápido.
ancora_estado = """  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');"""
exigir(ancora_estado in src, "ancora_estado nao encontrada")
novo_estado = """  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');

  // Pendências manuais (ex: "Cobrar atualização de senha do INSS") do cliente aberto na ficha.
  const [clientPendencies, setClientPendencies] = useState<any[]>([]);
  const [pendenciaFichaDescricao, setPendenciaFichaDescricao] = useState('');
  const [savingPendenciaFicha, setSavingPendenciaFicha] = useState(false);
  const [resolvingPendenciaFichaId, setResolvingPendenciaFichaId] = useState('');"""
src = src.replace(ancora_estado, novo_estado, 1)

# 2) Busca as pendências (abertas e resolvidas, para histórico) sempre que a ficha abre outro cliente.
ancora_effect = """  const openClientDossier = async (client: Client) => {
    setSelectedClient(client);
    setActiveTab('resumo');
    try {
      const response = await fetch(`/api/clients/${client.id}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.client) setSelectedClient(data.client);
    } catch {
      // A ficha básica continua disponível mesmo que os dados complementares falhem.
    }
  };"""
exigir(ancora_effect in src, "ancora_effect (openClientDossier) nao encontrada")
novo_effect = """  const carregarPendenciasCliente = async (clientId: string) => {
    try {
      const r = await fetch(`/api/pendencias?clientId=${clientId}&includeResolved=true`);
      if (r.ok) {
        const data = await r.json();
        setClientPendencies(data.pendencies || []);
      }
    } catch {
      // Mantém a lista anterior em caso de falha de rede.
    }
  };

  const openClientDossier = async (client: Client) => {
    setSelectedClient(client);
    setActiveTab('resumo');
    setPendenciaFichaDescricao('');
    carregarPendenciasCliente(client.id);
    try {
      const response = await fetch(`/api/clients/${client.id}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.client) setSelectedClient(data.client);
    } catch {
      // A ficha básica continua disponível mesmo que os dados complementares falhem.
    }
  };

  const criarPendenciaFicha = async () => {
    if (!selectedClient || !pendenciaFichaDescricao.trim()) return;
    setSavingPendenciaFicha(true);
    try {
      const r = await fetch('/api/pendencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id, description: pendenciaFichaDescricao.trim() }),
      });
      if (r.ok) {
        setPendenciaFichaDescricao('');
        await carregarPendenciasCliente(selectedClient.id);
      }
    } finally {
      setSavingPendenciaFicha(false);
    }
  };

  const resolverPendenciaFicha = async (pendenciaId: string) => {
    if (!selectedClient || !pendenciaId) return;
    setResolvingPendenciaFichaId(pendenciaId);
    try {
      const r = await fetch(`/api/pendencias/${pendenciaId}`, { method: 'PATCH' });
      if (r.ok) await carregarPendenciasCliente(selectedClient.id);
    } finally {
      setResolvingPendenciaFichaId('');
    }
  };"""
src = src.replace(ancora_effect, novo_effect, 1)

# 3) UI: bloco de Pendências no topo da aba "Resumo do Cliente".
ancora_resumo = """              {activeTab === 'resumo' && (
                <div className="grid md:grid-cols-2 gap-4">"""
exigir(ancora_resumo in src, "ancora_resumo nao encontrada")
novo_resumo = """              {activeTab === 'resumo' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 space-y-2.5">
                    <h4 className="font-heading font-extrabold text-amber-900 text-[11px] uppercase tracking-wider">
                      Pendências deste cliente
                    </h4>

                    {clientPendencies.filter((p) => !p.resolvedAt).length === 0 && (
                      <p className="text-slate-500 text-[11px]">Nenhuma pendência aberta.</p>
                    )}

                    {clientPendencies
                      .filter((p) => !p.resolvedAt)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 bg-white rounded-xl border border-amber-200/60 px-3 py-2"
                        >
                          <span className="text-[11px] font-semibold text-slate-700">{p.description}</span>
                          <button
                            type="button"
                            disabled={resolvingPendenciaFichaId === p.id}
                            onClick={() => resolverPendenciaFicha(p.id)}
                            className="shrink-0 text-[10.5px] font-extrabold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                          >
                            {resolvingPendenciaFichaId === p.id ? 'Marcando...' : 'Marcar como resolvida'}
                          </button>
                        </div>
                      ))}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        value={pendenciaFichaDescricao}
                        onChange={(e) => setPendenciaFichaDescricao(e.target.value)}
                        placeholder="Ex: Atualizar cadastro único"
                        className="flex-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
                      />
                      <button
                        type="button"
                        disabled={!pendenciaFichaDescricao.trim() || savingPendenciaFicha}
                        onClick={criarPendenciaFicha}
                        className="shrink-0 px-3 py-1.5 text-[10.5px] font-extrabold text-white bg-[#071B3A] hover:bg-[#122c52] rounded-lg disabled:opacity-40"
                      >
                        {savingPendenciaFicha ? 'Salvando...' : 'Adicionar pendência'}
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">"""
src = src.replace(ancora_resumo, novo_resumo, 1)

# 4) Fecha a div extra (space-y-4) aberta no passo 3, logo antes do fim da aba "Resumo".
ancora_fim_resumo = """                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pessoais' && ("""
exigir(ancora_fim_resumo in src, "ancora_fim_resumo nao encontrada")
novo_fim_resumo = """                    )}
                  </div>
                  </div>
                </div>
              )}

              {activeTab === 'pessoais' && ("""
src = src.replace(ancora_fim_resumo, novo_fim_resumo, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch17 aplicado (tamanho {orig_len} -> {len(src)})")
