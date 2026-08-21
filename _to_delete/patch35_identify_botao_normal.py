# -*- coding: utf-8 -*-
import sys

path = "src/app/assinar/[token]/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

ancora = """        {/* ETAPA 1: Identificação de CPF do Cliente */}
        {step === 'IDENTIFY' && (
          <>
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4 pb-28">
              <div className="text-center space-y-1.5">
                <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-200 font-heading tracking-wider ${kit ? 'hidden' : ''}`}>
                  <Scale className="w-3 h-3" /> {document?.documentType || 'DOCUMENTO JURÍDICO'}
                </span>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Olá, <strong className="text-[#071B3A]">{signer?.name}</strong>! Confirme seu CPF abaixo para acessar o documento e iniciar a prova de presença ao vivo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleOpenDocPreview()}
                className={`w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-xs font-extrabold text-[#071B3A] flex items-center justify-between transition-all font-heading shadow-xs mb-3 ${kit ? 'hidden' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>📄 Ler / Visualizar Documento Completo</span>
                </div>
                <Eye className="w-4 h-4 text-blue-600" />
              </button>

              {kit && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-2">
                  <p className="text-[10px] font-semibold text-blue-800 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Para ler uma minuta, escolha o documento abaixo e toque no ícone de olho.</p>
                  <p className="text-xs font-extrabold text-[#071B3A]">{kit.documents.length} documentos para sua assinatura</p>
                  <div className="space-y-1">
                    {kit.documents.map((item, index) => <button type="button" onClick={() => handleOpenDocPreview(item.id)} key={item.id} className="w-full flex items-center gap-3 rounded-xl bg-white border border-blue-100 px-3 py-3 text-left text-xs text-[#071B3A] hover:border-blue-300 hover:shadow-sm transition-all"><span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center">{index + 1}</span><span className="flex-1 font-bold">{clientDocumentTitle(item.title)}</span><span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700"><Eye className="w-3.5 h-3.5" /> Ler</span></button>)}
                  </div>
                  <p className="text-[10px] text-slate-500">Ao concluir, sua assinatura será registrada com segurança em todos os documentos apresentados.</p>
                </div>
              )}

              <form id="cpf-form" onSubmit={handleConfirmCpf}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">CPF do Cliente Titular *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-2xl py-3.5 px-4 text-center font-mono text-lg text-[#071B3A] placeholder-slate-400 focus:outline-none font-bold tracking-wider transition-all"
                />
              </form>
            </div>

            {/* Botão fixo no rodapé: sempre visível na tela do celular, sem precisar rolar. */}
            <div
              className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200/80 px-4 pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
            >
              <div className="max-w-md mx-auto">
                <button
                  type="submit"
                  form="cpf-form"
                  disabled={confirmingCpf}
                  className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 font-heading"
                >
                  {confirmingCpf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Autenticando...
                    </>
                  ) : (
                    <>
                      Confirmar e Acessar Documento
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}"""
exigir(ancora in src, "ancora nao encontrada (bloco IDENTIFY com botao fixo)")

novo = """        {/* ETAPA 1: Identificação de CPF do Cliente */}
        {step === 'IDENTIFY' && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
            <div className="text-center space-y-1.5">
              <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-200 font-heading tracking-wider ${kit ? 'hidden' : ''}`}>
                <Scale className="w-3 h-3" /> {document?.documentType || 'DOCUMENTO JURÍDICO'}
              </span>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Olá, <strong className="text-[#071B3A]">{signer?.name}</strong>! Confirme seu CPF abaixo para acessar o documento e iniciar a prova de presença ao vivo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleOpenDocPreview()}
              className={`w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-xs font-extrabold text-[#071B3A] flex items-center justify-between transition-all font-heading shadow-xs mb-3 ${kit ? 'hidden' : ''}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>📄 Ler / Visualizar Documento Completo</span>
              </div>
              <Eye className="w-4 h-4 text-blue-600" />
            </button>

            {kit && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-2">
                <p className="text-[10px] font-semibold text-blue-800 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Para ler uma minuta, escolha o documento abaixo e toque no ícone de olho.</p>
                <p className="text-xs font-extrabold text-[#071B3A]">{kit.documents.length} documentos para sua assinatura</p>
                <div className="space-y-1">
                  {kit.documents.map((item, index) => <button type="button" onClick={() => handleOpenDocPreview(item.id)} key={item.id} className="w-full flex items-center gap-3 rounded-xl bg-white border border-blue-100 px-3 py-3 text-left text-xs text-[#071B3A] hover:border-blue-300 hover:shadow-sm transition-all"><span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center">{index + 1}</span><span className="flex-1 font-bold">{clientDocumentTitle(item.title)}</span><span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700"><Eye className="w-3.5 h-3.5" /> Ler</span></button>)}
                </div>
                <p className="text-[10px] text-slate-500">Ao concluir, sua assinatura será registrada com segurança em todos os documentos apresentados.</p>
              </div>
            )}

            <form onSubmit={handleConfirmCpf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">CPF do Cliente Titular *</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-2xl py-3.5 px-4 text-center font-mono text-lg text-[#071B3A] placeholder-slate-400 focus:outline-none font-bold tracking-wider transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={confirmingCpf}
                className="w-full py-4 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 font-heading"
              >
                {confirmingCpf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Autenticando...
                  </>
                ) : (
                  <>
                    Confirmar e Acessar Documento
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}"""

src = src.replace(ancora, novo, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch35 aplicado (tamanho {orig_len} -> {len(src)})")
