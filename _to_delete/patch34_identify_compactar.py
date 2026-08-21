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

ancora = """              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-200 font-heading tracking-wider ${kit ? 'hidden' : ''}`}>
                  <Scale className="w-3 h-3" /> {document?.documentType || 'DOCUMENTO JURÍDICO'}
                </span>
                <h2 className="font-heading text-xl font-extrabold text-[#071B3A]">{kit ? 'Documentos para assinatura' : document?.title}</h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Olá, <strong className="text-[#071B3A]">{signer?.name}</strong>! Confirme seu CPF abaixo para acessar o documento e iniciar a prova de presença ao vivo.
                </p>
              </div>"""
exigir(ancora in src, "ancora nao encontrada (cabecalho da etapa IDENTIFY)")

novo = """              <div className="text-center space-y-1.5">
                <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-200 font-heading tracking-wider ${kit ? 'hidden' : ''}`}>
                  <Scale className="w-3 h-3" /> {document?.documentType || 'DOCUMENTO JURÍDICO'}
                </span>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Olá, <strong className="text-[#071B3A]">{signer?.name}</strong>! Confirme seu CPF abaixo para acessar o documento e iniciar a prova de presença ao vivo.
                </p>
              </div>"""

src = src.replace(ancora, novo, 1)

# O container ficou mais enxuto: reduzir o padding/space-y para o card ocupar menos altura.
ancora2 = '<div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6 pb-28">'
exigir(ancora2 in src, "ancora2 nao encontrada (container do card IDENTIFY)")
novo2 = '<div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4 pb-28">'
src = src.replace(ancora2, novo2, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch34 aplicado (tamanho {orig_len} -> {len(src)})")
