import sys

path = "src/app/(dashboard)/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# O card usa "flex flex-col justify-between" para empurrar o botão de ação pro rodapé
# no modo de prioridade única. No modo lista (varias pendências abertas), isso fazia o
# conteúdo esticar e sobrar um vão em branco enorme no meio do card. Solução: o modo
# lista vira UM único filho flex (um wrapper), então justify-between não tem o que
# distribuir - o conteúdo fica compacto e alinhado ao topo, como um card normal.
ancora_abre = """          {openPendencies.length > 0 ? (
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
                <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5 space-y-1.5 relative z-10">"""
exigir(ancora_abre in src, "ancora_abre nao encontrada")
novo_abre = """          {openPendencies.length > 0 ? (
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
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
                <div className="rounded-lg border border-slate-200 bg-white/80 p-2.5 space-y-1.5">"""
src = src.replace(ancora_abre, novo_abre, 1)

# Fecha o wrapper com </div> em vez de </> e deixa a lista mais "premium": cartões
# soltos com sombra leve, badge numerado e mais respiro entre eles, em vez da barrinha
# lateral solta que parecia rascunho.
ancora_lista = """              <div className="space-y-1.5 relative z-10 overflow-y-auto max-h-[170px] pr-1">
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
exigir(ancora_lista in src, "ancora_lista nao encontrada")
novo_lista = """              <div className="space-y-2 max-h-[176px] overflow-y-auto pr-1 -mr-1">
                {openPendencies.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#D4AF37]/15 text-[#8a6a14] text-[10px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-extrabold text-[#0B192C] truncate">
                          {p.client?.name || 'Cliente'}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 leading-snug truncate">
                          {p.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={resolvingPendenciaId === p.id}
                      onClick={() => resolverPendencia(p.id)}
                      className="shrink-0 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-extrabold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {resolvingPendenciaId === p.id ? 'Marcando...' : 'Resolver'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : topPriorityCase ? (
            <>"""
src = src.replace(ancora_lista, novo_lista, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch19 aplicado (tamanho {orig_len} -> {len(src)})")
