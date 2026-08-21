import sys

path = "src/app/(dashboard)/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) useMemo com todas as pendências abertas (nao so a de maior prioridade) - e essa
#    lista completa que precisa aparecer no card, senao cadastrar uma nova pendencia
#    "esconde" a anterior.
ancora_top = """  const topPriorityCase = useMemo(() => {
    if (mappedClients.length === 0) return null;
    const sorted = [...mappedClients].sort((a, b) => a.priorityScore - b.priorityScore);
    return sorted[0];
  }, [mappedClients]);"""
exigir(ancora_top in src, "ancora_top nao encontrada")
novo_top = """  const topPriorityCase = useMemo(() => {
    if (mappedClients.length === 0) return null;
    const sorted = [...mappedClients].sort((a, b) => a.priorityScore - b.priorityScore);
    return sorted[0];
  }, [mappedClients]);

  // Todas as pendências manuais abertas (não só a mais recente) - o card "Sua
  // Prioridade Agora" precisa listar todas, senão criar uma nova esconde a anterior.
  const openPendencies = useMemo(() => pendencies.filter((p) => !p.resolvedAt), [pendencies]);"""
src = src.replace(ancora_top, novo_top, 1)

# 2) Envolve o card existente: se houver pendências abertas, mostra a lista completa;
#    senão, mantém o comportamento anterior (prioridade automática ou estado vazio).
ancora_abre = "          {topPriorityCase ? (\n            <>"
exigir(ancora_abre in src, "ancora_abre nao encontrada")
novo_abre = """          {openPendencies.length > 0 ? (
            <>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-rose-800">
                    Sua Prioridade Agora{openPendencies.length > 1 ? ` (${openPendencies.length})` : ''}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPendenciaFormOpen((v) => !v)}
                  className="text-[10px] font-extrabold text-[#0B192C] bg-white border border-slate-200 hover:border-[#D4AF37] px-2 py-0.5 rounded-md transition-all"
                >
                  + Pendência
                </button>
              </div>

              {pendenciaFormOpen && (
                <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5 space-y-1.5 relative z-10">
                  <select
                    value={pendenciaClientId}
                    onChange={(e) => setPendenciaClientId(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                  >
                    <option value="">Selecione o cliente...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={pendenciaDescricao}
                    onChange={(e) => setPendenciaDescricao(e.target.value)}
                    placeholder="Ex: Cobrar atualização da senha do INSS"
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPendenciaFormOpen(false)}
                      className="px-2.5 py-1 text-[10.5px] font-bold text-slate-500 hover:text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!pendenciaClientId || !pendenciaDescricao.trim() || savingPendencia}
                      onClick={criarPendencia}
                      className="px-2.5 py-1 text-[10.5px] font-extrabold text-white bg-[#0B192C] hover:bg-[#152a47] rounded-md disabled:opacity-40"
                    >
                      {savingPendencia ? 'Salvando...' : 'Salvar pendência'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 relative z-10 overflow-y-auto max-h-[170px] pr-1">
                {openPendencies.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 border-l-2 border-[#D4AF37] pl-3 py-1.5 bg-white/70 rounded-r-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-extrabold text-[#0B192C] truncate">
                        {p.client?.name || 'Cliente'}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-700 leading-snug truncate">
                        {p.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={resolvingPendenciaId === p.id}
                      onClick={() => resolverPendencia(p.id)}
                      className="shrink-0 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-extrabold rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {resolvingPendenciaId === p.id ? 'Marcando...' : 'Resolver'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : topPriorityCase ? (
            <>"""
src = src.replace(ancora_abre, novo_abre, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch18 aplicado (tamanho {orig_len} -> {len(src)})")
