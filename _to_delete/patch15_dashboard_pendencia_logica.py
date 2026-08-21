import sys

path = "src/app/(dashboard)/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

def exigir(cond, msg):
    if not cond:
        print(f"FALHA: {msg}")
        sys.exit(1)

orig_len = len(src)

# 1) Estado: lista de pendências abertas + estado da caixinha de cadastro rápido.
ancora_estado = """  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');"""
exigir(ancora_estado in src, "ancora_estado nao encontrada")
novo_estado = """  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pendências manuais (ex: "Cobrar Carlos a atualização de senha do INSS") - quando
  // um cliente tem uma pendência aberta, ela substitui o cálculo automático em
  // "Sua Prioridade Agora".
  const [pendencies, setPendencies] = useState<any[]>([]);
  const [pendenciaFormOpen, setPendenciaFormOpen] = useState(false);
  const [pendenciaClientId, setPendenciaClientId] = useState('');
  const [pendenciaDescricao, setPendenciaDescricao] = useState('');
  const [savingPendencia, setSavingPendencia] = useState(false);
  const [resolvingPendenciaId, setResolvingPendenciaId] = useState('');"""
src = src.replace(ancora_estado, novo_estado, 1)

# 2) Carregamento: busca as pendências abertas junto com o resto.
ancora_load = """      fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, o, c, d, p, k]) => {
        if (u?.user) setCurrentUser(u.user);
        if (o?.office) setOffice(o.office);
        setClients(c?.clients || []);
        setDocuments(d?.documents || []);
        setProcesses(p?.processes || []);
        const lk = k?.kits || [];
        setKits(lk);
        if (lk.length > 0 && !formKitId) setFormKitId(lk[0].id);
      })"""
exigir(ancora_load in src, "ancora_load nao encontrada")
novo_load = """      fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/pendencias').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, o, c, d, p, k, pend]) => {
        if (u?.user) setCurrentUser(u.user);
        if (o?.office) setOffice(o.office);
        setClients(c?.clients || []);
        setDocuments(d?.documents || []);
        setProcesses(p?.processes || []);
        const lk = k?.kits || [];
        setKits(lk);
        if (lk.length > 0 && !formKitId) setFormKitId(lk[0].id);
        setPendencies(pend?.pendencies || []);
      })"""
src = src.replace(ancora_load, novo_load, 1)

# 3) mappedClients: pendência aberta substitui o cálculo automático (etapa,
#    textos e prioridade máxima), conforme escolhido pelo usuário.
ancora_map = """      return {
        id: c.id,
        name: c.name,
        legalArea: c.legalArea || 'Previdenciário',
        phone: c.phone || c.whatsapp || '',
        cpf: c.cpfCnpj || '',
        stage,
        stageName,
        statusText,
        nextActionText,
        actionLabel,
        actionType,
        priorityScore,
        docsCount: clientDocs.length,
        signedDocsCount: signedDocs.length,
      };
    });
  }, [clients, documents, processes]);"""
exigir(ancora_map in src, "ancora_map nao encontrada")
novo_map = """      const pendencia = pendencies.find((p) => p.clientId === c.id && !p.resolvedAt);
      if (pendencia) {
        stageName = 'Pendência';
        statusText = pendencia.description;
        nextActionText = 'Marcar como resolvida assim que for concluída';
        actionLabel = 'Marcar como resolvida';
        actionType = 'PENDENCIA' as any;
        priorityScore = -1000; // sempre acima de qualquer cálculo automático
      }

      return {
        id: c.id,
        name: c.name,
        legalArea: c.legalArea || 'Previdenciário',
        phone: c.phone || c.whatsapp || '',
        cpf: c.cpfCnpj || '',
        stage,
        stageName,
        statusText,
        nextActionText,
        actionLabel,
        actionType,
        priorityScore,
        docsCount: clientDocs.length,
        signedDocsCount: signedDocs.length,
        pendenciaId: pendencia?.id || null,
      };
    });
  }, [clients, documents, processes, pendencies]);"""
src = src.replace(ancora_map, novo_map, 1)

# 4) Handlers de criar/resolver pendência.
ancora_handlers = """  // COMPONENTE 1: SUA PRIORIDADE AGORA (A Situação #1 do Escritório)"""
exigir(ancora_handlers in src, "ancora_handlers nao encontrada")
novo_handlers = """  const recarregarPendencias = async () => {
    try {
      const r = await fetch('/api/pendencias');
      if (r.ok) {
        const data = await r.json();
        setPendencies(data.pendencies || []);
      }
    } catch {
      // Mantém a lista anterior em caso de falha de rede.
    }
  };

  const criarPendencia = async () => {
    if (!pendenciaClientId || !pendenciaDescricao.trim()) return;
    setSavingPendencia(true);
    try {
      const r = await fetch('/api/pendencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: pendenciaClientId, description: pendenciaDescricao.trim() }),
      });
      if (r.ok) {
        setPendenciaFormOpen(false);
        setPendenciaClientId('');
        setPendenciaDescricao('');
        await recarregarPendencias();
      }
    } finally {
      setSavingPendencia(false);
    }
  };

  const resolverPendencia = async (pendenciaId: string) => {
    if (!pendenciaId) return;
    setResolvingPendenciaId(pendenciaId);
    try {
      const r = await fetch(`/api/pendencias/${pendenciaId}`, { method: 'PATCH' });
      if (r.ok) await recarregarPendencias();
    } finally {
      setResolvingPendenciaId('');
    }
  };

  // COMPONENTE 1: SUA PRIORIDADE AGORA (A Situação #1 do Escritório)"""
src = src.replace(ancora_handlers, novo_handlers, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK patch15 aplicado (tamanho {orig_len} -> {len(src)})")
