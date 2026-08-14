'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrazilOperationsMap from '@/components/BrazilOperationsMap';
import {
  FileUp,
  Layers,
  UserPlus,
  Send,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  Copy,
  Check,
  Loader2,
  X,
  MessageSquare,
  Folder,
  User,
  ShieldCheck,
  Sparkles,
  Bell,
  Scale,
  ChevronRight,
  Briefcase,
  Bot,
  Activity,
  AlertTriangle,
  FolderPlus,
  CheckCircle,
  Zap,
  ArrowRight,
  Filter,
  Workflow,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════ */
/*  FORMATADORES                                               */
/* ═══════════════════════════════════════════════════════════ */
const formatCpf = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const formatPhone = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

const formatRg = (v: string) =>
  v.replace(/\D/g, '').slice(0, 9)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

/* ═══════════════════════════════════════════════════════════ */
/*  SELETOR DE CLIENTE COM AUTOCOMPLETE                        */
/* ═══════════════════════════════════════════════════════════ */
function ClientSelector({
  clients,
  value,
  onChange,
  onNew,
  placeholder = 'Selecione o cliente...',
}: {
  clients: any[];
  value: string;
  onChange: (id: string) => void;
  onNew?: () => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.cpfCnpj?.includes(q) ||
        c.phone?.includes(q)
    );
  }, [clients, query]);

  const selectedClient = clients.find((c) => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border transition-all duration-150 cursor-pointer select-none ${
          open
            ? 'border-[#0B192C] ring-2 ring-[#0B192C]/10 shadow-2xs'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
        }`}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#0B192C] text-[#D4AF37] flex items-center justify-center font-bold text-[11px] shrink-0">
              {selectedClient.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {selectedClient.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {selectedClient.cpfCnpj ? `CPF ${selectedClient.cpfCnpj}` : 'Sem CPF'}{' '}
                {selectedClient.phone ? `• ${selectedClient.phone}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-medium">{placeholder}</span>
          </div>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0 ${
            open ? 'rotate-180 text-slate-800' : ''
          }`}
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-hidden animate-in fade-in duration-100">
          <div className="p-1.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B192C]"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-36 py-1 divide-y divide-slate-50">
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                    value === c.id ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">{c.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {c.cpfCnpj || 'Sem CPF'} {c.phone ? `• ${c.phone}` : ''}
                    </p>
                  </div>
                  {value === c.id && <Check className="w-3.5 h-3.5 text-[#B68B1C] shrink-0" />}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-center text-xs text-slate-400 font-medium">
                Nenhum cliente encontrado.
              </p>
            )}
          </div>

          {onNew && (
            <div className="border-t border-slate-100 p-1.5 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  onNew();
                  setOpen(false);
                }}
                className="w-full py-1 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3 h-3 text-[#D4AF37]" /> Cadastrar Novo Cliente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MESA INTELIGENTE DO ADVOGADO (RECONSTRUÇÃO DA HOME)         */
/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de Etapa Selecionada no Mapa Operacional
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);

  // Dropdown de Ações "+ Criar"
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Modais de Ação
  const [actionModal, setActionModal] = useState<'ATENDIMENTO' | 'ASSINATURA' | 'KIT' | 'PROCESSO' | null>(null);

  // Formulários
  const [formClientId, setFormClientId] = useState('');
  const [formKitId, setFormKitId] = useState('');
  // Seleção rápida de cliente no bloco "Criar Kit Jurídico" do Fluxo Rápido
  const [quickKitClientId, setQuickKitClientId] = useState('');
  const [formProcessTitle, setFormProcessTitle] = useState('');
  const [formProcessArea, setFormProcessArea] = useState('Previdenciário');
  const [formProcessNumber, setFormProcessNumber] = useState('');

  // Cadastro Rápido
  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientRg, setClientRg] = useState('');
  const [clientArea, setClientArea] = useState('Previdenciário');

  // Assinatura Rápida (Upload Multi-Documento)
  const [fastDocTitle, setFastDocTitle] = useState('');
  const [fastClientId, setFastClientId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdfs, setUploadedPdfs] = useState<Array<{ id: string; name: string; sizeBytes?: number }>>([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resultados
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fechar dropdown de criar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Carregamento de dados
  const loadData = useCallback(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
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
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [formKitId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Métricas de Documentos
  const completedDocs = useMemo(() => documents.filter((d) => d.status === 'CONCLUIDO'), [documents]);
  const pendingDocs = useMemo(
    () => documents.filter((d) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(d.status)),
    [documents]
  );

  // Mapeamento Dinâmico de Etapas dos Clientes (Mapa Operacional)
  const mappedClients = useMemo(() => {
    return clients.map((c) => {
      const clientDocs = documents.filter((d) => d.clientId === c.id);
      const clientProcesses = processes.filter((p) => p.clientId === c.id);
      const signedDocs = clientDocs.filter((d) => d.status === 'CONCLUIDO');
      const hasPendingSign = clientDocs.some((d) => !['CONCLUIDO', 'CANCELADO'].includes(d.status));

      let stage: 'ENTRADA' | 'DOCUMENTACAO' | 'PREPARACAO' | 'ASSINATURA' | 'PROCESSO' = 'ENTRADA';
      let stageName = 'Entrada';
      let statusText = 'Novo cliente cadastrado no sistema';
      let nextActionText = 'Conferir dados e solicitar documentos iniciais';
      let actionLabel = 'Iniciar documentação';
      // Cada etapa aponta para UMA ação coerente: nunca "Gerar Kit" numa etapa de documentação, por exemplo.
      let actionType: 'SIGN' | 'KIT' | 'DOCS' | 'VIEW_PROCESS' | 'CREATE_PROCESS' = 'DOCS';
      let priorityScore = 10;

      if (clientProcesses.length > 0) {
        stage = 'PROCESSO';
        stageName = 'Processo';
        statusText = 'Processo judicial ativo e acompanhado no Dossiê';
        nextActionText = 'Acompanhar andamento e movimentações do caso';
        actionLabel = 'Analisar movimentação';
        actionType = 'VIEW_PROCESS';
        priorityScore = 50;
      } else if (signedDocs.length > 0 && !hasPendingSign) {
        stage = 'PROCESSO';
        stageName = 'Preparação p/ Ajuizamento';
        statusText = 'Kit de documentos 100% assinado pelo cliente';
        nextActionText = 'Ajuizar ou vincular processo judicial ao Dossiê';
        actionLabel = 'Criar Processo';
        actionType = 'CREATE_PROCESS';
        priorityScore = 15;
      } else if (hasPendingSign) {
        stage = 'ASSINATURA';
        stageName = 'Assinatura';
        const isOverdue = clientDocs.some((d) => (Date.now() - new Date(d.createdAt).getTime()) / 36e5 >= 24);
        statusText = isOverdue
          ? 'Assinatura digital parada há mais de 24 horas'
          : `Aguardando assinatura de ${signedDocs.length}/${clientDocs.length} documento(s)`;
        nextActionText = isOverdue
          ? 'Enviar lembrete amigável no WhatsApp do cliente'
          : 'Aguardar ou reenviar link de assinatura';
        actionLabel = isOverdue ? 'Enviar lembrete' : 'Reenviar link';
        actionType = 'SIGN';
        priorityScore = isOverdue ? 1 : 5;
      } else if (!c.cpfCnpj || !c.phone) {
        stage = 'DOCUMENTACAO';
        stageName = 'Documentação';
        statusText = 'Cadastro com pendência de CPF ou telefone';
        nextActionText = 'Completar qualificação do cliente para confecção de peças';
        actionLabel = 'Completar cadastro';
        actionType = 'DOCS';
        priorityScore = 8;
      } else if (clientDocs.length === 0) {
        stage = 'ENTRADA';
        stageName = 'Entrada';
        statusText = 'Novo cliente cadastrado no sistema';
        nextActionText = 'Conferir dados e solicitar documentos iniciais';
        actionLabel = 'Iniciar documentação';
        actionType = 'DOCS';
        priorityScore = 10;
      } else {
        stage = 'PREPARACAO';
        stageName = 'Preparação Jurídica';
        statusText = 'Qualificação completa. Pronto para elaboração do Kit';
        nextActionText = 'Gerar procuração, contrato e declaração a partir do Kit';
        actionLabel = 'Gerar Kit Jurídico';
        actionType = 'KIT';
        priorityScore = 12;
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
      };
    });
  }, [clients, documents, processes]);

  // Contagem por Etapa da Operação do Escritório (Mapa Operacional)
  const stageCounts = useMemo(() => {
    return {
      ENTRADA: mappedClients.filter((c) => c.stage === 'ENTRADA').length,
      DOCUMENTACAO: mappedClients.filter((c) => c.stage === 'DOCUMENTACAO').length,
      PREPARACAO: mappedClients.filter((c) => c.stage === 'PREPARACAO').length,
      ASSINATURA: mappedClients.filter((c) => c.stage === 'ASSINATURA').length,
      PROCESSO: mappedClients.filter((c) => c.stage === 'PROCESSO').length,
      overdueSignatures: pendingDocs.filter((d) => (Date.now() - new Date(d.createdAt).getTime()) / 36e5 >= 24).length,
    };
  }, [mappedClients, pendingDocs]);

  // COMPONENTE 1: SUA PRIORIDADE AGORA (A Situação #1 do Escritório)
  const topPriorityCase = useMemo(() => {
    if (mappedClients.length === 0) return null;
    const sorted = [...mappedClients].sort((a, b) => a.priorityScore - b.priorityScore);
    return sorted[0];
  }, [mappedClients]);

  // COMPONENTE 2: PRÓXIMOS DA FILA (Fila Filtrável de Próximas Ações)
  const nextInQueue = useMemo(() => {
    let list = mappedClients;
    if (selectedStageFilter) {
      list = list.filter((c) => c.stage === selectedStageFilter);
    } else {
      list = [...list].sort((a, b) => a.priorityScore - b.priorityScore);
    }
    return list.slice(0, 5);
  }, [mappedClients, selectedStageFilter]);

  // COMPONENTE 3: RESUMO DA ASSINAJUR IA (Síntese Operacional)
  const aiSummary = useMemo(() => {
    const items: { text: string; urgent?: boolean }[] = [];

    const overdueCount = stageCounts.overdueSignatures;
    if (overdueCount > 0) {
      items.push({
        text: `${overdueCount} assinatura(s) aguardando há mais de 24h.`,
        urgent: true,
      });
    }

    const readyForKit = mappedClients.filter((c) => c.stage === 'PREPARACAO').length;
    if (readyForKit > 0) {
      items.push({
        text: `${readyForKit} cliente(s) com documentação pronta para gerar Kit Jurídico.`,
      });
    }

    const readyForLawsuit = mappedClients.filter((c) => c.stage === 'PROCESSO' && c.signedDocsCount > 0).length;
    if (readyForLawsuit > 0) {
      items.push({
        text: `${readyForLawsuit} atendimento(s) com Kit assinado aptos para ajuizamento.`,
      });
    }

    return items;
  }, [stageCounts, mappedClients]);

  // PROVA DE AUTOMAÇÃO (HOJE O ASSINAJUR TRABALHOU POR VOCÊ)
  const automationMetrics = useMemo(() => {
    const docsOrganized = completedDocs.length * 2 + documents.length;
    const validationsDone = completedDocs.length;
    const signaturesProcessed = completedDocs.length;
    const dossiersUpdated = processes.length;
    return {
      docsOrganized,
      validationsDone,
      signaturesProcessed,
      dossiersUpdated,
    };
  }, [completedDocs, documents, processes]);

  // ÚLTIMAS ATIVIDADES — agrupadas por cliente/minuto para nunca repetir o mesmo evento
  const recentActivities = useMemo(() => {
    type Ev = { ts: number; time: string; text: string };

    const groups = new Map<
      string,
      { ts: number; clientName: string; count: number; kind: 'signed' | 'sent'; sample: string }
    >();

    documents.forEach((d) => {
      const dt = new Date(d.updatedAt || d.createdAt);
      const kind: 'signed' | 'sent' = d.status === 'CONCLUIDO' ? 'signed' : 'sent';
      const key = `${d.clientId}-${kind}-${Math.floor(dt.getTime() / 60000)}`;
      const clientName = d.client?.name || 'Cliente';
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        if (dt.getTime() > existing.ts) existing.ts = dt.getTime();
      } else {
        groups.set(key, { ts: dt.getTime(), clientName, count: 1, kind, sample: d.title || 'documento' });
      }
    });

    const docEvents: Ev[] = Array.from(groups.values()).map((g) => {
      const dt = new Date(g.ts);
      const time = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const text =
        g.kind === 'signed'
          ? g.count > 1
            ? `${g.clientName} assinou ${g.count} documentos`
            : `${g.clientName} assinou "${g.sample}"`
          : g.count > 1
          ? `${g.count} documentos enviados para ${g.clientName}`
          : `"${g.sample}" enviado para ${g.clientName}`;
      return { ts: g.ts, time, text };
    });

    const processEvents: Ev[] = processes.map((p) => {
      const dt = new Date(p.createdAt);
      return {
        ts: dt.getTime(),
        time: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        text: `Dossiê criado para "${p.client?.name || p.title}"`,
      };
    });

    const all = [...docEvents, ...processEvents].sort((a, b) => b.ts - a.ts);

    // Segurança extra: nunca mostrar a mesma linha duas vezes seguidas
    const deduped: Ev[] = [];
    for (const ev of all) {
      if (deduped.length === 0 || deduped[deduped.length - 1].text !== ev.text) {
        deduped.push(ev);
      }
    }

    return deduped.slice(0, 4);
  }, [documents, processes]);

  // Saudação Curta
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const userFirstName = useMemo(() => {
    if (!currentUser?.name) return 'Dr. Diego';
    const parts = currentUser.name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.replace(/\./g, '') || '';
    if (/^dra?$/i.test(first)) {
      return parts[1] ? `${/^dra$/i.test(first) ? 'Dra.' : 'Dr.'} ${parts[1]}` : 'Dr. Diego';
    }
    return `Dr. ${parts[0] || 'Diego'}`;
  }, [currentUser]);

  // Total de situações pendentes
  const totalAttentionCount = useMemo(() => {
    return stageCounts.overdueSignatures + stageCounts.PREPARACAO + stageCounts.DOCUMENTACAO;
  }, [stageCounts]);

  // Upload rápido (Suporte a múltiplos PDFs simultâneos)
  const handleFastFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      await handleFastFileProcess(filesArray);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFastFileProcess = async (files: File | File[]) => {
    const fileList = Array.isArray(files) ? files : [files];
    const pdfFiles = fileList.filter((f) => f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      setErrorMessage('Por favor, selecione arquivo(s) no formato PDF.');
      return;
    }

    setUploadingPdf(true);
    setErrorMessage('');

    try {
      const uploadPromises = pdfFiles.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/documents/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `Erro no upload do arquivo ${file.name}.`);
        return {
          id: d.file.id,
          name: file.name,
          sizeBytes: file.size,
        };
      });

      const newUploadedFiles = await Promise.all(uploadPromises);
      setUploadedPdfs((prev) => [...prev, ...newUploadedFiles]);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleRemoveUploadedFile = (indexToRemove: number) => {
    setUploadedPdfs((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const buildWhatsappMessage = useCallback(
    (name: string, docs: Array<{ title: string; link: string }>) => {
      if (docs.length === 1) {
        return `Olá, ${name}!\n\nSeu documento ("${docs[0].title}") do escritório ${
          office?.name || 'Rodrigues & Soares Advocacia'
        } está pronto para sua assinatura digital.\n\nAcesse o link seguro no celular para assinar:\n${
          docs[0].link
        }\n\nQualquer dúvida, estamos à disposição no escritório.`;
      }

      const listStr = docs.map((d, idx) => `📄 ${idx + 1}. ${d.title}:\n${d.link}`).join('\n\n');
      return `Olá, ${name}!\n\nSeus ${docs.length} documentos jurídicos do escritório ${
        office?.name || 'Rodrigues & Soares Advocacia'
      } estão prontos para sua assinatura digital:\n\n${listStr}\n\nAcesse os links acima no celular para assinar cada documento.\n\nQualquer dúvida, estamos à disposição no escritório.`;
    },
    [office]
  );

  const handleFastDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastClientId || uploadedPdfs.length === 0) return;
    setErrorMessage('');
    const params = new URLSearchParams({
      files: uploadedPdfs.map((pdfFile) => pdfFile.id).join(','),
      clientId: fastClientId,
      source: 'dashboard',
    });
    router.push(`/documentos/novo?${params.toString()}`);
  };

  // Modais de Criação
  const handleCreateClientModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const r = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName,
          cpfCnpj: clientCpf.replace(/\D/g, ''),
          phone: clientPhone.replace(/\D/g, ''),
          whatsapp: clientPhone.replace(/\D/g, ''),
          rg: clientRg,
          legalArea: clientArea,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao criar cliente.');

      await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Dossiê — ${d.client.name}`,
          clientId: d.client.id,
          legalArea: clientArea,
        }),
      });

      setActionModal(null);
      setClientName('');
      setClientCpf('');
      setClientPhone('');
      setClientRg('');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateKitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formKitId) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const r = await fetch('/api/kits/generate-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formClientId,
          kitId: formKitId,
          variables: {
            valor_honorarios: 'R$ 3.000,00',
            percentual_exito: '30%',
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao gerar Kit.');

      const cl = clients.find((c) => c.id === formClientId);
      const link = d.result.signatureLink;
      setWhatsappMsg(buildWhatsappMessage(d.result.clientName, [{ title: d.result.kitName, link }]));
      setExecutionResult({
        clientName: d.result.clientName,
        clientPhone: cl?.phone || cl?.whatsapp || '',
        docTitle: d.result.kitName,
        signatureLink: link,
      });
      setActionModal(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formProcessTitle.trim()) return;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const r = await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formProcessTitle,
          clientId: formClientId,
          legalArea: formProcessArea,
          processNumber: formProcessNumber,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao criar processo.');

      setActionModal(null);
      setFormProcessTitle('');
      setFormProcessNumber('');
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="space-y-4 max-w-[1600px] mx-auto pb-16">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CABEÇALHO OPERACIONAL SIMPLES                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white px-5 py-4 lg:px-6 lg:py-4 shadow-[0_18px_55px_-42px_rgba(11,25,44,0.5)]">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#D4AF37] to-[#9E7515]" />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9E7515]">Central do escritório</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="text-[10px] font-bold text-slate-400">Operação em tempo real</span>
            </div>
            <h1 className="text-xl font-black tracking-[-0.03em] text-[#071B3A] lg:text-[26px]">
              {greeting}, {userFirstName}.
            </h1>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
              {totalAttentionCount > 0 ? (
                <span className="inline-flex items-center gap-2 text-amber-800">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                  {totalAttentionCount} situação(ões) exigem análise hoje
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Operação em dia, sem pendências críticas
                </span>
              )}
            </div>
          </div>

          <div className="hidden flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setActionModal('ATENDIMENTO')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-[#071B3A] transition hover:border-slate-300 hover:bg-slate-50"
            >
              <UserPlus className="h-4 w-4 text-[#B68B1C]" /> Novo atendimento
            </button>
            <Link
              href="/documentos/novo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071B3A] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_12px_24px_-15px_rgba(7,27,58,0.95)] transition hover:bg-[#102D55]"
            >
              <FileUp className="h-4 w-4 text-[#E0BD48]" /> Enviar documentos
            </Link>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1.5 FLUXO RÁPIDO — a porta de entrada para o trabalho          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Atalhos operacionais</h2>
          <span className="text-[10px] text-slate-400 font-medium">Ações mais usadas pelo escritório</span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.7fr_1fr_1fr] lg:items-stretch">
          {/* BLOCO 1 — ENVIAR DOCUMENTO */}
          <div
            id="quick-upload-card"
            className="min-h-[286px] bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_16px_34px_-28px_rgba(11,25,44,0.65)] flex flex-col gap-3 lg:min-h-[320px]"
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#071B3A] text-[#E0BD48] flex items-center justify-center shrink-0 shadow-sm">
                <FileUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-[#0B192C] leading-tight">Preparar documentos para assinatura</h3>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-tight">Envie um ou vários PDFs de uma só vez. Depois, revise as páginas e posicione o selo.</p>
              </div>
            </div>

            {executionResult ? (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-emerald-950 text-[11px]">
                    ✓ {executionResult.docsCount || 1} documento(s) gerado(s) para {executionResult.clientName}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionResult(null);
                      setUploadedPdfs([]);
                      setFastClientId('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {executionResult.documents?.map((doc: any, idx: number) => (
                    <div key={doc.id || idx} className="flex items-center justify-between px-2 py-1 bg-white border border-emerald-200/80 rounded-lg text-[10px]">
                      <span className="font-semibold text-slate-800 truncate">{idx + 1}. {doc.title}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(doc.link);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="text-[#0B192C] font-bold underline hover:text-amber-700 ml-2 shrink-0"
                      >
                        Copiar link
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-200/60">
                  {executionResult.clientPhone && (
                    <a
                      href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <MessageSquare className="w-3 h-3 fill-white" /> WhatsApp ({executionResult.docsCount || 1})
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(whatsappMsg);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px] shrink-0"
                  >
                    {copiedLink ? 'Copiado!' : 'Copiar Todos'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFastDispatch} className="flex flex-1 flex-col gap-2.5">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      await handleFastFileProcess(Array.from(e.dataTransfer.files));
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex min-h-[118px] flex-1 items-center justify-center border border-dashed rounded-2xl px-4 py-4 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-[#B68B1C] bg-amber-50'
                      : uploadedPdfs.length > 0
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-slate-300 bg-slate-50/50 hover:border-[#B68B1C] hover:bg-amber-50/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFastFileSelect}
                    className="hidden"
                  />

                  {uploadingPdf ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#B68B1C] font-bold py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando arquivo(s)...
                    </div>
                  ) : uploadedPdfs.length > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-800 border-b border-slate-200/60 pb-1">
                        <span>{uploadedPdfs.length} PDF(s) selecionado(s)</span>
                        <span className="text-[9px] text-[#B68B1C] font-black underline">+ Adicionar outro PDF</span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {uploadedPdfs.map((f, idx) => (
                          <div
                            key={f.id || idx}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px]"
                          >
                            <span className="font-bold text-slate-900 truncate">{idx + 1}. {f.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveUploadedFile(idx)}
                              className="text-slate-400 hover:text-rose-600 ml-1 shrink-0 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#B68B1C] shadow-sm"><FileUp className="h-4 w-4" /></span>
                      <p className="text-xs font-extrabold text-slate-800">Arraste seus PDFs aqui</p>
                      <p className="text-[10px] font-semibold text-slate-500">ou selecione arquivos do computador</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">Cliente</label>
                  <ClientSelector clients={clients} value={fastClientId} onChange={setFastClientId} placeholder="Selecionar cliente..." onNew={() => setActionModal('ATENDIMENTO')} />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !fastClientId || uploadedPdfs.length === 0}
                  className="w-full py-2.5 bg-[#071B3A] hover:bg-[#102D55] text-white font-extrabold text-[11px] rounded-xl transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100 flex items-center justify-center gap-1.5 shadow-[0_10px_20px_-14px_rgba(7,27,58,0.9)]"
                >
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-[#D4AF37]" />}
                  Continuar para revisar páginas e selo
                </button>
              </form>
            )}
          </div>

          {/* BLOCO 2 — CRIAR KIT JURÍDICO */}
          <div className="min-h-[286px] bg-white border border-slate-200/90 rounded-2xl p-5 shadow-[0_16px_34px_-28px_rgba(11,25,44,0.65)] flex flex-col gap-3 lg:min-h-[320px]">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#071B3A] flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-[#B68B1C]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-[#0B192C] leading-tight">Criar Kit Jurídico</h3>
                <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                  Gere procurações, contratos e declarações usando seus modelos.
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col justify-end gap-2.5">
              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">Cliente</label>
                <ClientSelector clients={clients} value={quickKitClientId} onChange={setQuickKitClientId} placeholder="Selecionar cliente..." onNew={() => setActionModal('ATENDIMENTO')} />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (quickKitClientId) setFormClientId(quickKitClientId);
                  setActionModal('KIT');
                }}
                className="w-full py-2.5 bg-[#071B3A] hover:bg-[#102D55] text-white font-extrabold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-[0_10px_20px_-14px_rgba(7,27,58,0.9)]"
              >
                <Layers className="w-3 h-3 text-[#D4AF37]" /> Gerar Kit
              </button>
            </div>
          </div>

          {/* BLOCO 3 — NOVO ATENDIMENTO (porta de entrada do sistema, leve destaque) */}
          <div className="min-h-[286px] border border-[#17345D] bg-[linear-gradient(145deg,#102D55_0%,#071B3A_72%,#0E2645_100%)] text-white rounded-2xl p-5 shadow-[0_16px_34px_-28px_rgba(7,27,58,0.9)] flex flex-col gap-3 relative overflow-hidden lg:min-h-[320px]">
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start gap-2.5 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-white/10 text-[#E0BD48] flex items-center justify-center shrink-0 ring-1 ring-white/10">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-black text-white leading-tight">Novo Atendimento</h3>
                <p className="mt-1 text-[11px] text-slate-300 leading-tight">
                  Cadastre um cliente e inicie o fluxo jurídico completo.
                </p>
              </div>
            </div>

            <div className="mt-auto space-y-3 relative z-10">
              <p className="text-[10px] font-bold tracking-wide text-slate-300">Cliente <span className="mx-1 text-[#D4AF37]">→</span> Documentos <span className="mx-1 text-[#D4AF37]">→</span> Assinatura <span className="mx-1 text-[#D4AF37]">→</span> Processo</p>
              <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActionModal('ATENDIMENTO')}
                className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#E0BD48] text-[#071B3A] font-extrabold text-[11px] rounded-xl shadow-[0_10px_20px_-14px_rgba(0,0,0,0.8)] transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3 h-3" /> Iniciar Atendimento
              </button>

              {/* MENU "OUTRAS AÇÕES" — absorve o antigo botão [+ Criar] */}
              <div ref={createMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateMenuOpen(!createMenuOpen)}
                  aria-label="Outras ações"
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${createMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {createMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 divide-y divide-slate-100 text-xs font-bold animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateMenuOpen(false);
                        const el = document.getElementById('quick-upload-card');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2"
                    >
                      <FileUp className="w-3.5 h-3.5 text-amber-600" /> Nova Assinatura
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateMenuOpen(false);
                        setActionModal('KIT');
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-600" /> Gerar Kit Jurídico
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateMenuOpen(false);
                        setActionModal('PROCESSO');
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-purple-600" /> Novo Processo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. OPERAÇÃO INTELIGENTE: PRIORIDADE AGORA x RESUMO IA         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-3 xl:items-stretch">
        {/* SUA PRIORIDADE AGORA */}
        <div className="min-h-[264px] bg-gradient-to-br from-white via-slate-50/50 to-amber-50/20 border border-amber-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#D4AF37]/10 rounded-full blur-xl pointer-events-none" />

          {topPriorityCase ? (
            <>
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-rose-800">
                      Sua Prioridade Agora
                    </h2>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#B68B1C] bg-[#B68B1C]/10 border border-[#B68B1C]/20 px-2 py-0.5 rounded-md">
                    {topPriorityCase.legalArea}
                  </span>
                </div>

                <div className="border-l-2 border-[#D4AF37] pl-3 py-0.5 space-y-1">
                  <h3 className="text-[15px] font-extrabold text-[#0B192C]">
                    {topPriorityCase.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                    <span className="mr-1.5 text-emerald-700 font-extrabold">✓</span>{topPriorityCase.statusText}
                  </p>
                  <p className="text-[11px] font-bold text-slate-900 leading-snug">
                    <span className="mr-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Próxima ação</span>
                    {topPriorityCase.nextActionText}
                  </p>
                </div>
              </div>

              {/* BOTÃO DE AÇÃO ÚNICO E COERENTE COM A ETAPA DO CLIENTE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-200/80">
                <div className="flex items-center gap-2">
                  {topPriorityCase.actionType === 'SIGN' && topPriorityCase.phone && (
                    <a
                      href={`https://wa.me/55${topPriorityCase.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá, ${topPriorityCase.name}! Passando para lembrar da assinatura digital dos seus documentos no escritório ${
                          office?.name || 'Rodrigues & Soares'
                        }. Podemos te ajudar a concluir?`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-[#25D366] hover:bg-[#1fb855] text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-white" /> {topPriorityCase.actionLabel}
                    </a>
                  )}

                  {topPriorityCase.actionType === 'DOCS' && (
                    <Link
                      href={`/clientes?q=${encodeURIComponent(topPriorityCase.name)}`}
                      className="px-3 py-2 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-[#D4AF37]" /> {topPriorityCase.actionLabel}
                    </Link>
                  )}

                  {topPriorityCase.actionType === 'KIT' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientId(topPriorityCase.id);
                        setActionModal('KIT');
                      }}
                      className="px-3 py-2 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> {topPriorityCase.actionLabel}
                    </button>
                  )}

                  {topPriorityCase.actionType === 'CREATE_PROCESS' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientId(topPriorityCase.id);
                        setActionModal('PROCESSO');
                      }}
                      className="px-3 py-2 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-[#D4AF37]" /> {topPriorityCase.actionLabel}
                    </button>
                  )}

                  {topPriorityCase.actionType === 'VIEW_PROCESS' && (
                    <Link
                      href={`/processos?clienteId=${topPriorityCase.id}`}
                      className="px-3 py-2 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-[#D4AF37]" /> {topPriorityCase.actionLabel}
                    </Link>
                  )}

                  {topPriorityCase.actionType !== 'VIEW_PROCESS' && (
                    <Link
                      href={`/processos?clienteId=${topPriorityCase.id}`}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold rounded-lg transition-all"
                    >
                      Ver Dossiê
                    </Link>
                  )}
                </div>

                <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  Etapa atual: <strong className="text-slate-800">{topPriorityCase.stageName}</strong>
                </span>
              </div>
            </>
          ) : (
            <div className="py-6 text-center space-y-1">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
              <h3 className="text-xs font-extrabold text-slate-800">Nenhuma Ação Crítica Pendente</h3>
              <p className="text-[11px] text-slate-500">Nenhuma pendência crítica identificada.</p>
            </div>
          )}
        </div>

        {/* RESUMO DO ASSINAJUR */}
        <div className="min-h-[264px] bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-[#0B192C] text-[#D4AF37] flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-black uppercase text-[#0B192C] tracking-wide">
                  Resumo do AssinaJur
                </h3>
              </div>
              <span className="text-[9px] font-bold text-slate-400">Atualizado agora</span>
            </div>

            {aiSummary.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-800">
                  {aiSummary.length} ações dependem da sua atenção:
                </p>

                {aiSummary.map((item, i) => (
                  <div
                    key={i}
                    className={`py-1.5 text-[11px] font-medium leading-snug flex items-start gap-1.5 ${
                      item.urgent
                        ? 'text-rose-900'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${item.urgent ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2 text-center space-y-0.5">
                <p className="text-[11px] font-bold text-emerald-900">✓ Tudo sob controle</p>
                <p className="text-[10px] text-emerald-800">Nenhuma pendência crítica identificada.</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (topPriorityCase) {
                setFormClientId(topPriorityCase.id);
                setActionModal('KIT');
              }
            }}
            className="self-start px-3 py-2 bg-slate-900 hover:bg-black text-white font-bold text-[11px] rounded-lg transition-all"
          >
            Ver pendências
          </button>
        </div>
        <div className="min-h-[264px] bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-[#0B192C] tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Próximos da Fila
            </h3>
            <Link href="/clientes" className="text-[10px] font-bold text-[#B68B1C] hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mt-1 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto pr-1">
            {nextInQueue.length > 0 ? (
              nextInQueue.slice(0, 4).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-extrabold text-slate-900 truncate">{item.name}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500 truncate">{item.statusText}</p>
                  </div>
                  <div className="shrink-0">
                    {item.actionType === 'SIGN' && item.phone ? (
                      <a href={`https://wa.me/55${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${item.name}! Passando para lembrar da assinatura dos seus documentos no escritório ${office?.name || 'Rodrigues & Soares'}.`)}`} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[10px] font-bold rounded-lg transition-all">
                        {item.actionLabel}
                      </a>
                    ) : item.actionType === 'KIT' ? (
                      <button type="button" onClick={() => { setFormClientId(item.id); setActionModal('KIT'); }} className="px-2.5 py-1.5 bg-[#0B192C] hover:bg-[#152a47] text-white text-[10px] font-bold rounded-lg transition-all">{item.actionLabel}</button>
                    ) : item.actionType === 'CREATE_PROCESS' ? (
                      <button type="button" onClick={() => { setFormClientId(item.id); setActionModal('PROCESSO'); }} className="px-2.5 py-1.5 bg-[#0B192C] hover:bg-[#152a47] text-white text-[10px] font-bold rounded-lg transition-all">{item.actionLabel}</button>
                    ) : item.actionType === 'VIEW_PROCESS' ? (
                      <Link href={`/processos?clienteId=${item.id}`} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-lg transition-all">{item.actionLabel}</Link>
                    ) : (
                      <Link href={`/clientes?q=${encodeURIComponent(item.name)}`} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold rounded-lg transition-all">{item.actionLabel}</Link>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-[11px] text-slate-400 font-medium">Nenhum fluxo prioritário no momento.</p>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CONTROLE DO ESCRITÓRIO: OPERAÇÃO DO ESCRITÓRIO (ETAPAS)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {false && <>
      <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black uppercase text-[#0B192C] tracking-wide flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5 text-[#B68B1C]" /> Operação do Escritório
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">Clique em uma etapa para filtrar a fila abaixo</span>
          </div>

          {selectedStageFilter && (
            <button
              type="button"
              onClick={() => setSelectedStageFilter(null)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1"
            >
              Limpar filtro (Ver todos) <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* FAIXA HORIZONTAL INTEGRADA DE ETAPAS */}
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-5">
          {[
            { key: 'ENTRADA', label: 'Entrada', count: stageCounts.ENTRADA },
            { key: 'DOCUMENTACAO', label: 'Documentação', count: stageCounts.DOCUMENTACAO },
            { key: 'PREPARACAO', label: 'Preparação', count: stageCounts.PREPARACAO },
            { key: 'ASSINATURA', label: 'Assinatura', count: stageCounts.ASSINATURA, badge: stageCounts.overdueSignatures > 0 ? `${stageCounts.overdueSignatures} atrasada` : null },
            { key: 'PROCESSO', label: 'Processos', count: stageCounts.PROCESSO },
          ].map((st) => {
            const isSelected = selectedStageFilter === st.key;
            return (
              <button
                key={st.key}
                type="button"
                onClick={() => setSelectedStageFilter(isSelected ? null : st.key)}
                className={`relative min-h-[66px] border-b border-r border-slate-200 px-3 py-2 text-left transition-all cursor-pointer last:border-r-0 sm:border-b-0 flex flex-col justify-center ${
                  isSelected
                    ? 'bg-[#0B192C] text-white border-[#0B192C] shadow-xs'
                    : 'bg-slate-50/50 hover:bg-white text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {st.label}
                  </span>
                  {st.badge && (
                    <span className="text-[8px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-full">
                      {st.badge}
                    </span>
                  )}
                </div>

                <span className={`text-lg font-black tabular-nums leading-none mt-1 ${isSelected ? 'text-[#D4AF37]' : 'text-slate-900'}`}>
                  {st.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3.5 CONTROLE DO ESCRITÓRIO: PRÓXIMOS DA FILA                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase text-[#0B192C] tracking-wide flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Próximos da Fila
            </h3>
            {selectedStageFilter && (
              <span className="text-[10px] font-bold text-[#B68B1C] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Filtrado por: {selectedStageFilter}
              </span>
            )}
          </div>

          <Link href="/clientes" className="text-[11px] font-bold text-[#B68B1C] hover:underline flex items-center gap-1">
            Ver todos os fluxos ({clients.length}) <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {nextInQueue.length > 0 ? (
            nextInQueue.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors px-1 rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-extrabold text-slate-900 truncate">{item.name}</p>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {item.legalArea}
                    </span>
                    <span className="text-[9px] font-bold text-[#0B192C] bg-slate-200/60 px-1.5 py-0.2 rounded">
                      {item.stageName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {item.statusText}
                  </p>
                </div>

                <div className="shrink-0">
                  {item.actionType === 'SIGN' && item.phone ? (
                    <a
                      href={`https://wa.me/55${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá, ${item.name}! Passando para lembrar da assinatura dos seus documentos no escritório ${
                          office?.name || 'Rodrigues & Soares'
                        }.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs"
                    >
                      {item.actionLabel}
                    </a>
                  ) : item.actionType === 'KIT' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientId(item.id);
                        setActionModal('KIT');
                      }}
                      className="px-3 py-1.5 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs"
                    >
                      {item.actionLabel}
                    </button>
                  ) : item.actionType === 'CREATE_PROCESS' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientId(item.id);
                        setActionModal('PROCESSO');
                      }}
                      className="px-3 py-1.5 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs"
                    >
                      {item.actionLabel}
                    </button>
                  ) : item.actionType === 'VIEW_PROCESS' ? (
                    <Link
                      href={`/processos?clienteId=${item.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-all"
                    >
                      {item.actionLabel}
                    </Link>
                  ) : (
                    <Link
                      href={`/clientes?q=${encodeURIComponent(item.name)}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-all"
                    >
                      {item.actionLabel}
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-xs text-slate-400 font-medium">
              Nenhum cliente nesta etapa no momento.
            </p>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. VISÃO E ESCALA: OPERAÇÃO NACIONAL (MAPA COM DADOS REAIS)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      </>}
      {false && <section className="relative overflow-hidden rounded-[28px] border border-[#17345D] bg-[#071B3A] px-5 py-6 text-white shadow-[0_28px_80px_-48px_rgba(7,27,58,0.95)] lg:px-7 lg:py-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#E7C85E]">
                <Workflow className="h-3 w-3" /> Operação integrada
              </span>
              <span className="text-[10px] font-bold text-slate-400">Dados reais do escritório</span>
            </div>
            <h2 className="text-xl font-black tracking-[-0.025em] text-white lg:text-2xl">
              Do primeiro contato ao processo, em um único fluxo.
            </h2>
            <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-slate-300">
              O AssinaJur centraliza clientes, documentos, kits, assinaturas, evidências e dossiês. Cada etapa mostra onde o trabalho está e o que o sistema agiliza.
            </p>
          </div>
          <Link
            href="/relatorios"
            className="inline-flex w-fit items-center gap-1.5 text-[11px] font-extrabold text-[#E7C85E] transition hover:text-white"
          >
            Ver produtividade completa <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { key: 'ENTRADA', number: '01', title: 'Entrada', count: stageCounts.ENTRADA, icon: UserPlus, description: 'Cadastro e triagem do cliente' },
            { key: 'DOCUMENTACAO', number: '02', title: 'Documentação', count: stageCounts.DOCUMENTACAO, icon: Folder, description: 'Leitura e organização dos arquivos' },
            { key: 'PREPARACAO', number: '03', title: 'Preparação', count: stageCounts.PREPARACAO, icon: Layers, description: 'Kits e modelos jurídicos' },
            { key: 'ASSINATURA', number: '04', title: 'Assinatura', count: stageCounts.ASSINATURA, icon: ShieldCheck, description: 'Links, evidências e lembretes' },
            { key: 'PROCESSO', number: '05', title: 'Processos', count: stageCounts.PROCESSO, icon: Briefcase, description: 'Dossiê, arquivos e acompanhamento' },
          ].map((step) => {
            const StepIcon = step.icon;
            const isActive = selectedStageFilter === step.key;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => setSelectedStageFilter(isActive ? null : step.key)}
                className={`group relative min-h-[150px] overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-[#E0BD48] bg-[#D4AF37] text-[#071B3A] shadow-[0_16px_34px_-20px_rgba(212,175,55,0.9)]'
                    : 'border-white/10 bg-white/[0.055] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.085]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-[10px] font-black tracking-[0.18em] ${isActive ? 'text-[#071B3A]/60' : 'text-slate-500'}`}>
                    ETAPA {step.number}
                  </span>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? 'bg-[#071B3A] text-[#E7C85E]' : 'bg-white/10 text-[#E7C85E]'}`}>
                    <StepIcon className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={`text-sm font-black ${isActive ? 'text-[#071B3A]' : 'text-white'}`}>{step.title}</h3>
                    <p className={`mt-1 text-[10px] font-semibold leading-snug ${isActive ? 'text-[#071B3A]/70' : 'text-slate-400'}`}>
                      {step.description}
                    </p>
                  </div>
                  <span className={`text-3xl font-black tabular-nums ${isActive ? 'text-[#071B3A]' : 'text-white'}`}>{step.count}</span>
                </div>
                {isActive && <span className="absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-[#071B3A]" />}
              </button>
            );
          })}
        </div>

        <div className="relative mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <Bot className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-black text-white">A operação continua mesmo fora do painel</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">Documentos são organizados, assinaturas registradas e dossiês atualizados no mesmo fluxo.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">WhatsApp conectado</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Drive integrado</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Evidências preservadas</span>
          </div>
        </div>
      </section>}

      <BrazilOperationsMap />

      {/* HOJE O ASSINAJUR TRABALHOU POR VOCÊ — acabamento premium, sem faixa escura pesada */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#B68B1C]" /> Hoje o AssinaJur trabalhou por você
          </h2>
          <span className="text-[10px] font-bold text-slate-400">Automação contínua</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-[#0B192C]">{automationMetrics.docsOrganized}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-tight">documentos organizados</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-emerald-600">{automationMetrics.validationsDone}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-tight">validações concluídas</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-[#B68B1C]">{automationMetrics.signaturesProcessed}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-tight">assinaturas processadas</p>
          </div>
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-blue-600">{automationMetrics.dossiersUpdated}</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-tight">Dossiês atualizados</p>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. APOIO: ÚLTIMAS ATIVIDADES                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <h3 className="text-[11px] font-black uppercase text-[#0B192C] tracking-wide flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-slate-500" /> Últimas Atividades
          </h3>
          <Link href="/relatorios" className="text-[10px] font-bold text-[#B68B1C] hover:underline">
            Histórico
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {recentActivities.length > 0 ? (
            recentActivities.map((ev, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[10px] py-0.5">
                <span className="font-mono text-slate-400 w-8 shrink-0">{ev.time}</span>
                <p className="text-slate-700 font-medium truncate flex-1 leading-tight">{ev.text}</p>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-slate-400 py-2 text-center sm:col-span-2">Nenhum evento recente.</p>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAIS DA CENTRAL DE TRABALHO                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: NOVO ATENDIMENTO */}
      {actionModal === 'ATENDIMENTO' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#0B192C] text-[#D4AF37] flex items-center justify-center">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0B192C]">Iniciar Novo Atendimento</h3>
                  <p className="text-[10px] text-slate-500">Cadastre o cliente para iniciar o pipeline jurídico completo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClientModal} className="space-y-2.5">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-600">Nome Completo</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Maria das Graças Silva"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-600">CPF</label>
                  <input
                    type="text"
                    value={clientCpf}
                    onChange={(e) => setClientCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-600">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                    placeholder="(71) 99999-9999"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-600">RG (Opcional)</label>
                  <input
                    type="text"
                    value={clientRg}
                    onChange={(e) => setClientRg(formatRg(e.target.value))}
                    placeholder="00.000.000-00"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-600">Área Jurídica</label>
                  <select
                    value={clientArea}
                    onChange={(e) => setClientArea(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  >
                    <option value="Previdenciário">Previdenciário</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Cível / Consumidor">Cível / Consumidor</option>
                    <option value="Família">Família</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !clientName.trim()}
                className="w-full py-2.5 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderPlus className="w-3.5 h-3.5 text-[#D4AF37]" />}
                Cadastrar Cliente & Iniciar Dossiê
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISPARAR KIT JURÍDICO */}
      {actionModal === 'KIT' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0B192C]">Gerar Kit Jurídico</h3>
                  <p className="text-[10px] text-slate-500">Gere procuração, contrato e declaração a partir dos modelos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKitDispatch} className="space-y-2.5">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-600 mb-0.5 block">Kit Jurídico</label>
                <select
                  value={formKitId}
                  onChange={(e) => setFormKitId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                >
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.items?.length || 3} documentos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-600 mb-0.5 block">Cliente Destinatário</label>
                <ClientSelector
                  clients={clients}
                  value={formClientId}
                  onChange={setFormClientId}
                  onNew={() => {
                    setActionModal('ATENDIMENTO');
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !formClientId || !formKitId}
                className="w-full py-2.5 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#D4AF37]" />}
                Gerar Kit & Abrir Envio WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NOVO PROCESSO */}
      {actionModal === 'PROCESSO' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[#0B192C]">Novo Processo Judicial</h3>
                  <p className="text-[10px] text-slate-500">Centralize documentos, clientes e movimentações no Dossiê</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProcess} className="space-y-2.5">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-600">Título / Ação</label>
                <input
                  type="text"
                  value={formProcessTitle}
                  onChange={(e) => setFormProcessTitle(e.target.value)}
                  placeholder="Ex: Ação de Concessão de BPC/LOAS"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-600">Cliente</label>
                <ClientSelector
                  clients={clients}
                  value={formClientId}
                  onChange={setFormClientId}
                  onNew={() => setActionModal('ATENDIMENTO')}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-600">Nº do Processo (Se houver)</label>
                  <input
                    type="text"
                    value={formProcessNumber}
                    onChange={(e) => setFormProcessNumber(e.target.value)}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-600">Área Jurídica</label>
                  <select
                    value={formProcessArea}
                    onChange={(e) => setFormProcessArea(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  >
                    <option value="Previdenciário">Previdenciário</option>
                    <option value="Trabalhista">Trabalhista</option>
                    <option value="Cível / Consumidor">Cível / Consumidor</option>
                    <option value="Família">Família</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !formClientId || !formProcessTitle.trim()}
                className="w-full py-2.5 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Folder className="w-3.5 h-3.5 text-[#D4AF37]" />}
                Criar Processo & Centralizar no Dossiê
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
