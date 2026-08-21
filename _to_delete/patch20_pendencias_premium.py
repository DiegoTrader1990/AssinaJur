import sys

path = "src/app/(dashboard)/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Helper: texto e cor de urgência a partir de quando a pendência foi criada.
# Quanto mais tempo aberta, mais "quente" a cor - dá pra escritório priorizar
# visualmente sem precisar ler todo o texto.
ancora_helper = """  // Todas as pendências manuais abertas (não só a mais recente) - o card "Sua
  // Prioridade Agora" precisa listar todas, senão criar uma nova esconde a anterior.
  const openPendencies = useMemo(() => pendencies.filter((p) => !p.resolvedAt), [pendencies]);"""
exigir(ancora_helper in src, "ancora_helper nao encontrada")
novo_helper = """  // Todas as pendências manuais abertas (não só a mais recente) - o card "Sua
  // Prioridade Agora" precisa listar todas, senão criar uma nova esconde a anterior.
  const openPendencies = useMemo(() => pendencies.filter((p) => !p.resolvedAt), [pendencies]);

  // Quanto mais tempo uma pendência está aberta, mais "quente" a cor - dá pra ver de
  // relance o que está esperando há mais tempo, sem precisar ler tudo.
  const urgenciaPendencia = (createdAt: string) => {
    const dias = (Date.now() - new Date(createdAt).getTime()) / 864e5;
    if (dias >= 7) return { texto: `há ${Math.floor(dias)} dias`, cor: 'border-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (dias >= 2) return { texto: `há ${Math.floor(dias)} dias`, cor: 'border-orange-400', chip: 'bg-orange-50 text-orange-700 border-orange-200' };
    if (dias >= 1) return { texto: 'há 1 dia', cor: 'border-[#D4AF37]', chip: 'bg-[#D4AF37]/10 text-[#8a6a14] border-[#D4AF37]/30' };
    return { texto: 'hoje', cor: 'border-emerald-400', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };"""
src = src.replace(ancora_helper, novo_helper, 1)

# 2) Card em modo lista: em vez de deixar a lista "flutuando" no topo e sobrar vão em
# branco embaixo (o card estica pra acompanhar a altura dos vizinhos no grid), o
# conteúdo agora ocupa a altura toda do card (h-full), com um rodapé fixo no fim -
# assim o espaço sobressalente vira parte do design, não um vazio sem explicação.
ancora_abre = """          {openPendencies.length > 0 ? (
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">"""
exigir(ancora_abre in src, "ancora_abre nao encontrada")
novo_abre = """          {openPendencies.length > 0 ? (
            <div className="flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between">"""
src = src.replace(ancora_abre, novo_abre, 1)

ancora_form_fecha = """                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-[176px] overflow-y-auto pr-1 -mr-1">
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
          ) : topPriorityCase ? ("""
exigir(ancora_form_fecha in src, "ancora_form_fecha nao encontrada")
novo_form_fecha = """                  </div>
                </div>
              )}

              <div className="mt-3 space-y-2 overflow-y-auto pr-1 -mr-1" style={{ maxHeight: 176 }}>
                {openPendencies.map((p, idx) => {
                  const urgencia = urgenciaPendencia(p.createdAt);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-2.5 rounded-xl border-l-[3px] ${urgencia.cor} border border-slate-200/80 bg-white pl-2.5 pr-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[12.5px] font-extrabold text-[#0B192C] truncate">
                              {p.client?.name || 'Cliente'}
                            </p>
                            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${urgencia.chip}`}>
                              {urgencia.texto}
                            </span>
                          </div>
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
                  );
                })}
              </div>

              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">
                  {openPendencies.length} pendência{openPendencies.length > 1 ? 's' : ''} aberta{openPendencies.length > 1 ? 's' : ''}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Visível para todo o escritório</span>
              </div>
            </div>
          ) : topPriorityCase ? ("""
src = src.replace(ancora_form_fecha, novo_form_fecha, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch20 aplicado (tamanho {orig_len} -> {len(src)})")
