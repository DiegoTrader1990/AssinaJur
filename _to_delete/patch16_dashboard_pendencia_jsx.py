import sys

path = "src/app/(dashboard)/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Cabeçalho do card: adiciona botão "+ Pendência" para cadastrar sem sair da Home.
ancora_header = """                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-rose-800">
                      Sua Prioridade Agora
                    </h2>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#B68B1C] bg-[#B68B1C]/10 border border-[#B68B1C]/20 px-2 py-0.5 rounded-md">
                    {topPriorityCase.legalArea}
                  </span>
                </div>"""
exigir(ancora_header in src, "ancora_header nao encontrada")
novo_header = """                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-rose-800">
                      Sua Prioridade Agora
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPendenciaFormOpen((v) => !v)}
                      className="text-[10px] font-extrabold text-[#0B192C] bg-white border border-slate-200 hover:border-[#D4AF37] px-2 py-0.5 rounded-md transition-all"
                    >
                      + Pendência
                    </button>
                    <span className="text-[10px] font-extrabold text-[#B68B1C] bg-[#B68B1C]/10 border border-[#B68B1C]/20 px-2 py-0.5 rounded-md">
                      {topPriorityCase.legalArea}
                    </span>
                  </div>
                </div>

                {pendenciaFormOpen && (
                  <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5 space-y-1.5">
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
                )}"""
src = src.replace(ancora_header, novo_header, 1)

# 2) Botão de ação: quando a prioridade é uma pendência manual, mostra "Marcar como resolvida".
ancora_botoes = """                  {topPriorityCase.actionType === 'SIGN' && topPriorityCase.phone && ("""
exigir(ancora_botoes in src, "ancora_botoes nao encontrada")
novo_botoes = """                  {(topPriorityCase.actionType as any) === 'PENDENCIA' && (
                    <button
                      type="button"
                      disabled={resolvingPendenciaId === topPriorityCase.pendenciaId}
                      onClick={() => topPriorityCase.pendenciaId && resolverPendencia(topPriorityCase.pendenciaId)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {resolvingPendenciaId === topPriorityCase.pendenciaId ? 'Marcando...' : topPriorityCase.actionLabel}
                    </button>
                  )}

                  {topPriorityCase.actionType === 'SIGN' && topPriorityCase.phone && ("""
src = src.replace(ancora_botoes, novo_botoes, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch16 aplicado (tamanho {orig_len} -> {len(src)})")
