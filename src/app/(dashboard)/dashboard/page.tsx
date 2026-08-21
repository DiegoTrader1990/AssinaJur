'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrazilOperationsMap from '@/components/BrazilOperationsMap';
import {
  FluxoRapido,
  IndicadoresEscritorio,
  BlocoHoje,
  BlocoAssinaturas,
  BlocoAcompanhamento,
  CardAssinaturas,
  AvisosAcompanhamentos,
} from '@/components/painel/BlocosPainel';
import { montarResumo } from '@/lib/lab/painelData';
import {
  derivarAssinaturasAndamento,
  derivarIndicadores,
  derivarKitsMaisUsados,
} from '@/lib/lab/painelExtra';
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

  // Pendências manuais (ex: "Cobrar Carlos a atualização de senha do INSS") - quando
  // um cliente tem uma pendência aberta, ela substitui o cálculo automático em
  // "Sua Prioridade Agora".
  const [pendencies, setPendencies] = useState<any[]>([]);
  const [pendenciaFormOpen, setPendenciaFormOpen] = useState(false);
  const [pendenciaClientId, setPendenciaClientId] = useState('');
  const [pendenciaDescricao, setPendenciaDescricao] = useState('');
  const [pendenciaPriority, setPendenciaPriority] = useState('NORMAL');
  const [pendenciaDueDate, setPendenciaDueDate] = useState('');
  const [savingPendencia, setSavingPendencia] = useState(false);
  const [resolvingPendenciaId, setResolvingPendenciaId] = useState('');

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

  /* ── Derivações do painel (mesmas funções puras de /painel-novo) ── */
  const painelAgora = useMemo(() => new Date(), []);

  const painelResumo = useMemo(
    () =>
      montarResumo(
        { clientes: clients as any, documentos: documents as any, processos: processes as any },
        painelAgora
      ),
    [clients, documents, processes, painelAgora]
  );

  const painelIndicadores = useMemo(
    () => derivarIndicadores(documents as any, painelAgora),
    [documents, painelAgora]
  );

  const painelAssinaturas = useMemo(
    () => derivarAssinaturasAndamento(documents as any, painelAgora, { kits: kits as any }),
    [documents, kits, painelAgora]
  );

  /** Kit sugerido no fluxo rápido: o mais enviado pelo escritório. */
  const painelKitPreferido = useMemo(
    () => derivarKitsMaisUsados(kits as any, documents as any)[0]?.id,
    [kits, documents]
  );

  /**
   * "Assinatura parada" já é a aba Assinaturas, com barra e botão de cobrar.
   * Repetir no bloco de avisos enchia a coluna com a mesma linha.
   */
  const painelAvisosSistema = useMemo(
    () => painelResumo.avisos.filter((a) => !a.id.startsWith('assin-')).slice(0, 6),
    [painelResumo]
  );

  // Carregamento de dados
  const loadData = useCallback(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
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
    // RASCUNHO e PRONTO_PARA_ENVIO (kit gerado mas nunca enviado) nao contam como
    // "assinatura atrasada" - so documento que ja foi enviado ao cliente pode estar
    // "parado" esperando ele. RECUSADO tambem e estado final, nao "pendente".
    () => documents.filter((d) => !['RASCUNHO', 'PRONTO_PARA_ENVIO', 'CONCLUIDO', 'CANCELADO', 'EXPIRADO', 'RECUSADO'].includes(d.status)),
    [documents]
  );

  // Mapeamento Dinâmico de Etapas dos Clientes (Mapa Operacional)
  const mappedClients = useMemo(() => {
    return clients.map((c) => {
      const clientDocs = documents.filter((d) => d.clientId === c.id);
      const clientProcesses = processes.filter((p) => p.clientId === c.id);
      const signedDocs = clientDocs.filter((d) => d.status === 'CONCLUIDO');
      // Só conta como "aguardando assinatura" documento que já foi de fato enviado ao
      // cliente. Um RASCUNHO pronto mas nunca enviado não pode virar "cobrar cliente".
      const hasUnsentDraft = clientDocs.some((d) => d.status === 'RASCUNHO' || d.status === 'PRONTO_PARA_ENVIO');
      const hasPendingSign = clientDocs.some(
        (d) => !['RASCUNHO', 'PRONTO_PARA_ENVIO', 'CONCLUIDO', 'CANCELADO', 'EXPIRADO', 'RECUSADO'].includes(d.status)
      );

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
      } else if (hasUnsentDraft) {
        stage = 'PREPARACAO';
        stageName = 'Pronto para Envio';
        statusText = 'Kit de documentos pronto, ainda não enviado ao cliente';
        nextActionText = 'Enviar o kit para assinatura do cliente';
        actionLabel = 'Enviar para assinatura';
        actionType = 'SIGN';
        priorityScore = 6;
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

      const pendencia = pendencies.find((p) => p.clientId === c.id && !p.resolvedAt);
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
  }, [clients, documents, processes, pendencies]);

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

  const recarregarPendencias = async () => {
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
    if (!pendenciaDescricao.trim()) return;
    setSavingPendencia(true);
    try {
      const r = await fetch('/api/pendencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: pendenciaClientId,
          description: pendenciaDescricao.trim(),
          priority: pendenciaPriority,
          dueDate: pendenciaDueDate || null,
        }),
      });
      if (r.ok) {
        setPendenciaFormOpen(false);
        setPendenciaClientId('');
        setPendenciaDescricao('');
        setPendenciaPriority('NORMAL');
        setPendenciaDueDate('');
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

  // COMPONENTE 1: SUA PRIORIDADE AGORA (A Situação #1 do Escritório)
  const topPriorityCase = useMemo(() => {
    if (mappedClients.length === 0) return null;
    const sorted = [...mappedClients].sort((a, b) => a.priorityScore - b.priorityScore);
    return sorted[0];
  }, [mappedClients]);

  // Todas as pendências manuais abertas (não só a mais recente) - o card "Sua
  // Prioridade Agora" precisa listar todas, senão criar uma nova esconde a anterior.
  const openPendencies = useMemo(() => pendencies.filter((p) => !p.resolvedAt), [pendencies]);

  // Quanto mais tempo uma pendência está aberta, mais "quente" a cor - dá pra ver de
  // relance o que está esperando há mais tempo, sem precisar ler tudo.
  const urgenciaPendencia = (pendency: any) => {
    const due = pendency.dueDate ? new Date(pendency.dueDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due) {
      due.setHours(0, 0, 0, 0);
      const days = Math.round((due.getTime() - today.getTime()) / 864e5);
      if (days < 0) return { texto: `vencida há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`, cor: 'border-rose-600', chip: 'bg-rose-50 text-rose-700 border-rose-200' };
      if (days === 0) return { texto: 'vence hoje', cor: 'border-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' };
      if (days <= 2) return { texto: `vence em ${days} dia${days === 1 ? '' : 's'}`, cor: 'border-orange-400', chip: 'bg-orange-50 text-orange-700 border-orange-200' };
    }
    const levels: Record<string, { texto: string; cor: string; chip: string }> = {
      URGENTE: { texto: 'urgente', cor: 'border-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
      ALTA: { texto: 'alta', cor: 'border-orange-400', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
      BAIXA: { texto: 'baixa', cor: 'border-sky-400', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
    };
    return levels[pendency.priority] || { texto: 'normal', cor: 'border-[#D4AF37]', chip: 'bg-[#D4AF37]/10 text-[#8a6a14] border-[#D4AF37]/30' };
  };

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

  // CENTRAL DE ACOMPANHAMENTO: casos reais que demandam uma providência do escritório.
  const followUpCases = useMemo(() => {
    return [...mappedClients]
      .sort((a, b) => a.priorityScore - b.priorityScore)
      .filter((item) => item.stage !== 'PROCESSO' || item.signedDocsCount > 0)
      .slice(0, 3);
  }, [mappedClients]);

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
      {/* 1. CABEÇALHO EXECUTIVO DE ALTA PERFORMANCE                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/90 bg-gradient-to-r from-[#071B3A] via-[#0B254C] to-[#071B3A] px-6 py-5 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-0.5 text-[9.5px] font-black uppercase tracking-widest text-[#E7C85E]">
                Mesa de Comando Operacional
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <span className="text-[10.5px] font-bold text-slate-300">
                {office?.name || 'Rodrigues & Soares Advocacia'}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white lg:text-[28px]">
              {greeting}, {userFirstName}.
            </h1>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
              {totalAttentionCount > 0 ? (
                <span className="inline-flex items-center gap-2 text-amber-300 font-bold bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full text-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  {totalAttentionCount} situação(ões) exigem atenção imediata hoje
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Operação 100% em dia e sincronizada
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => setActionModal('ATENDIMENTO')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-extrabold text-white transition-all backdrop-blur-sm"
            >
              <UserPlus className="h-4 w-4 text-[#E7C85E]" /> Novo atendimento
            </button>
            <Link
              href="/documentos/novo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B68B1C] hover:from-[#E7C85E] hover:to-[#D4AF37] px-4.5 py-2.5 text-xs font-black text-[#071B3A] shadow-md transition-all"
            >
              <FileUp className="h-4 w-4 text-[#071B3A]" /> Enviar documentos
            </Link>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1.5 FLUXO RÁPIDO — a porta de entrada para o trabalho          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <FluxoRapido
        clientes={clients}
        kits={kits}
        processos={processes}
        documentos={documents}
        kitPreferidoId={painelKitPreferido}
        tempoMedioMinutos={painelIndicadores.tempoMedioMinutos}
        onClientCreated={(client) => {
          setClients((prev) => [client, ...prev.filter((c) => c.id !== client.id)]);
        }}
      />





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
