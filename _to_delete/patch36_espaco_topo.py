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

ancora = '<main className="max-w-md mx-auto w-full my-auto p-4 sm:p-6 space-y-4">'
exigir(ancora in src, "ancora nao encontrada (main container)")
novo = '<main className="max-w-md mx-auto w-full mt-4 mb-auto p-4 sm:p-6 space-y-4">'
src = src.replace(ancora, novo, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch36 aplicado (tamanho {orig_len} -> {len(src)})")
