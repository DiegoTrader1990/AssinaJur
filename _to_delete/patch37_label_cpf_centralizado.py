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

ancora = '<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">CPF do Cliente Titular *</label>'
exigir(ancora in src, "ancora nao encontrada (label CPF)")
novo = '<label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading text-center">CPF do Cliente Titular *</label>'
src = src.replace(ancora, novo, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch37 aplicado (tamanho {orig_len} -> {len(src)})")
