import sys

path = "prisma/schema.prisma"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Adiciona relação em Office.
ancora_office = "  whatsAppSession WhatsAppSession?\n  whatsAppLogs    WhatsAppLog[]\n  googleDrive     GoogleDriveConnection?\n  intakeFolders   IntakeFolder[]\n}"
exigir(ancora_office in src, "ancora_office nao encontrada")
novo_office = "  whatsAppSession WhatsAppSession?\n  whatsAppLogs    WhatsAppLog[]\n  googleDrive     GoogleDriveConnection?\n  intakeFolders   IntakeFolder[]\n  clientPendencies ClientPendency[]\n}"
src = src.replace(ancora_office, novo_office, 1)

# 2) Adiciona relações em User.
ancora_user = """  permissions UserPermission[]
  auditLogs   AuditLog[]
  clientsAssigned Client[] @relation("LawyerClients")
  createdDocuments Document[] @relation("UserCreatedDocuments")
}"""
exigir(ancora_user in src, "ancora_user nao encontrada")
novo_user = """  permissions UserPermission[]
  auditLogs   AuditLog[]
  clientsAssigned Client[] @relation("LawyerClients")
  createdDocuments Document[] @relation("UserCreatedDocuments")
  createdPendencies  ClientPendency[] @relation("PendencyCreatedBy")
  resolvedPendencies ClientPendency[] @relation("PendencyResolvedBy")
}"""
src = src.replace(ancora_user, novo_user, 1)

# 3) Adiciona relação + modelo apos Client.
ancora_client = """  documents           Document[]
  processes           LegalProcess[]
  intakeSuggestions   IntakeFolder[]

  @@unique([officeId, cpfCnpj])
}"""
exigir(ancora_client in src, "ancora_client nao encontrada")
novo_client = """  documents           Document[]
  processes           LegalProcess[]
  intakeSuggestions   IntakeFolder[]
  pendencies          ClientPendency[]

  @@unique([officeId, cpfCnpj])
}

// Pendência manual vinculada a um cliente (ex: "Cobrar atualização de senha do INSS").
// Enquanto estiver aberta (resolvedAt == null), substitui o cálculo automático de
// prioridade em "Sua Prioridade Agora" na Home - qualquer usuário do escritório vê
// exatamente o que precisa ser feito.
model ClientPendency {
  id            String    @id @default(uuid())
  officeId      String
  office        Office    @relation(fields: [officeId], references: [id], onDelete: Cascade)
  clientId      String
  client        Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  description   String

  createdById   String?
  createdBy     User?     @relation("PendencyCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  resolvedAt    DateTime?
  resolvedById  String?
  resolvedBy    User?     @relation("PendencyResolvedBy", fields: [resolvedById], references: [id], onDelete: SetNull)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}"""
src = src.replace(ancora_client, novo_client, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch14 aplicado (tamanho {orig_len} -> {len(src)})")
