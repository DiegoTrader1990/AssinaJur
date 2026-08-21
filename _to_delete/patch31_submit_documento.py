import sys

path = "src/app/api/sign/[token]/submit/route.ts"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Receber os dois novos campos do corpo da requisição.
ancora1 = """      selfieCenterImage,
      selfieLeftImage,
      selfieRightImage,
      geoLat,"""
exigir(ancora1 in src, "ancora1 nao encontrada (destructuring body)")
novo1 = """      selfieCenterImage,
      selfieLeftImage,
      selfieRightImage,
      documentFrontImage,
      documentBackImage,
      geoLat,"""
src = src.replace(ancora1, novo1, 1)

# 2) Persistir no signatario titular (Cliente). Evidencia complementar - nunca
# bloqueia, por isso nao ha validacao de obrigatoriedade equivalente a das selfies.
ancora2 = """        selfieCenterImage,
        selfieLeftImage,
        selfieRightImage,
        geoLat: typeof geoLat === 'number' ? geoLat : null,"""
exigir(ancora2 in src, "ancora2 nao encontrada (update signer titular)")
novo2 = """        selfieCenterImage,
        selfieLeftImage,
        selfieRightImage,
        documentFrontImage: documentFrontImage || null,
        documentBackImage: documentBackImage || null,
        geoLat: typeof geoLat === 'number' ? geoLat : null,"""
src = src.replace(ancora2, novo2, 1)

# 3) Propagar para documentos-companheiros do mesmo kit (participante titular).
ancora3 = """            selfieCenterImage, selfieLeftImage, selfieRightImage, signedAt: new Date(),"""
exigir(ancora3 in src, "ancora3 nao encontrada (propagacao kit - titular)")
novo3 = """            selfieCenterImage, selfieLeftImage, selfieRightImage,
            documentFrontImage: documentFrontImage || null, documentBackImage: documentBackImage || null,
            signedAt: new Date(),"""
src = src.replace(ancora3, novo3, 1)

# 4) Propagar para documentos-companheiros do mesmo kit (demais participantes -
# rogo/testemunhas nao capturam documento nesta primeira versao, entao apenas
# copiamos o que ja existir na fonte, se houver).
ancora4 = """              selfieCenterImage: source.selfieCenterImage, selfieLeftImage: source.selfieLeftImage, selfieRightImage: source.selfieRightImage,"""
exigir(ancora4 in src, "ancora4 nao encontrada (propagacao kit - demais participantes)")
novo4 = """              selfieCenterImage: source.selfieCenterImage, selfieLeftImage: source.selfieLeftImage, selfieRightImage: source.selfieRightImage,
              documentFrontImage: source.documentFrontImage, documentBackImage: source.documentBackImage,"""
src = src.replace(ancora4, novo4, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch31 aplicado (tamanho {orig_len} -> {len(src)})")
