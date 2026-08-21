import sys

path = "prisma/schema.prisma"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

ancora = """  // Prova de presença ao vivo
  selfieCenterImage String?
  selfieLeftImage   String?
  selfieRightImage  String?"""
exigir(ancora in src, "ancora nao encontrada")
novo = """  // Prova de presença ao vivo
  selfieCenterImage String?
  selfieLeftImage   String?
  selfieRightImage  String?

  // Documento de identificação fotografado antes da prova de presença -
  // evidência complementar, nunca bloqueia a assinatura se estiver ausente.
  documentFrontImage String?
  documentBackImage  String?"""
src = src.replace(ancora, novo, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch29 aplicado (tamanho {orig_len} -> {len(src)})")
