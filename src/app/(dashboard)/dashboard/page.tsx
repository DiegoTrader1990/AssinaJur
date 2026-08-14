'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
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
  Edit3,
  CheckCircle,
  Zap,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════ */
/*  FORMATADORES & MÁSCARAS                                    */
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
  placeholder = 'Selecione ou busque o cliente...',
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
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 bg-white rounded-xl border transition-all duration-150 cursor-pointer select-none ${
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
/*  DASHBOARD PRINCIPAL — CENTRAL DE OPERAÇÕES JURÍDICAS       */
/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais da Central de Trabalho
  const [actionModal, setActionModal] = useState<'ATENDIMENTO' | 'ASSINATURA' | 'KIT' | 'PROCESSO' | null>(null);

  // Formulários
  const [formClientId, setFormClientId] = useState('');
  const [formKitId, setFormKitId] = useState('');
  const [formProcessTitle, setFormProcessTitle] = useState('');
  const [formProcessArea, setFormProcessArea] = useState('Previdenciário');
  const [formProcessNumber, setFormProcessNumber] = useState('');

  // Cadastro Rápido
  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientRg, setClientRg] = useState('');
  const [clientArea, setClientArea] = useState('Previdenciário');

  // Assinatura Rápida (PDF Compacto)
  const [fastDocTitle, setFastDocTitle] = useState('');
  const [fastClientId, setFastClientId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resultados
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  // Métricas
  const completedDocs = useMemo(() => documents.filter((d) => d.status === 'CONCLUIDO'), [documents]);
  const pendingDocs = useMemo(
    () => documents.filter((d) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(d.status)),
    [documents]
  );

  const automatedTasksCount = useMemo(() => {
    return completedDocs.length * 3 + processes.length * 2 + documents.length;
  }, [completedDocs, processes, documents]);

  const timeSaved = useMemo(() => {
    const mins = completedDocs.length * 45 + processes.length * 20 + pendingDocs.length * 15;
    return { h: Math.max(1, Math.floor(mins / 60)), m: mins % 60 };
  }, [completedDocs, pendingDocs, processes]);

  const pendingDetails = useMemo(() => {
    const pendingSigns = pendingDocs.length;
    const incompleteClients = clients.filter((c) => !c.cpfCnpj || !c.phone).length;
    const total = pendingSigns + incompleteClients;
    return {
      total,
      pendingSigns,
      incompleteClients,
      text: total > 0 ? `${incompleteClients} docs + ${pendingSigns} assina.` : 'Nenhuma crítica',
    };
  }, [pendingDocs, clients]);

  const signWaitDetails = useMemo(() => {
    const overdue = pendingDocs.filter((d) => {
      const diffHours = (Date.now() - new Date(d.createdAt).getTime()) / 36e5;
      return diffHours >= 24;
    }).length;
    return {
      count: pendingDocs.length,
      overdue,
      text: overdue > 0 ? `${overdue} há > 24h` : 'No prazo',
    };
  }, [pendingDocs]);

  // Pipeline Jurídico dos Fluxos em Andamento
  const clientFlows = useMemo(() => {
    const flows = clients.map((c) => {
      const clientDocs = documents.filter((d) => d.clientId === c.id);
      const clientProcesses = processes.filter((p) => p.clientId === c.id);
      const signedDocs = clientDocs.filter((d) => d.status === 'CONCLUIDO');
      const hasPendingSign = clientDocs.some((d) => !['CONCLUIDO', 'CANCELADO'].includes(d.status));

      let currentStep = 1;
      let stageName = 'Entrada';
      let statusBadge: 'URGENTE' | 'ATENÇÃO' | 'AGUARDANDO' | 'CONCLUÍDO' | 'ATIVO' = 'ATIVO';
      let nextAction = 'Conferir dados do cliente e iniciar documentação';
      let actionLabel = 'Continuar atendimento';
      let actionType: 'SIGN' | 'KIT' | 'PROCESS' | 'VIEW' = 'KIT';
      let urgencyScore = 10;

      if (clientProcesses.length > 0) {
        currentStep = 5;
        stageName = 'Processo';
        statusBadge = 'ATIVO';
        nextAction = 'Acompanhar andamento processual no Dossiê';
        actionLabel = 'Ver Dossiê';
        actionType = 'PROCESS';
        urgencyScore = 50;
      } else if (signedDocs.length > 0 && !hasPendingSign) {
        currentStep = 5;
        stageName = 'Preparação p/ Processo';
        statusBadge = 'CONCLUÍDO';
        nextAction = 'Todas as assinaturas colhidas. Pronto para protocolo.';
        actionLabel = 'Criar Processo';
        actionType = 'PROCESS';
        urgencyScore = 15;
      } else if (hasPendingSign) {
        currentStep = 4;
        stageName = 'Assinatura';
        const isOverdue = clientDocs.some((d) => (Date.now() - new Date(d.createdAt).getTime()) / 36e5 >= 24);
        statusBadge = isOverdue ? 'URGENTE' : 'AGUARDANDO';
        nextAction = isOverdue
          ? 'Assinatura parada há mais de 24 horas'
          : `Aguardando assinatura de ${signedDocs.length}/${clientDocs.length} doc(s)`;
        actionLabel = 'Enviar lembrete';
        actionType = 'SIGN';
        urgencyScore = isOverdue ? 1 : 5;
      } else if (!c.cpfCnpj || !c.phone) {
        currentStep = 2;
        stageName = 'Documentação';
        statusBadge = 'ATENÇÃO';
        nextAction = 'Falta documento de qualificação (CPF / WhatsApp)';
        actionLabel = 'Completar cadastro';
        actionType = 'KIT';
        urgencyScore = 8;
      } else {
        currentStep = 3;
        stageName = 'Preparação Jurídica';
        statusBadge = 'ATENÇÃO';
        nextAction = 'Gerar procuração e contrato de honorários do kit';
        actionLabel = 'Gerar Kit Jurídico';
        actionType = 'KIT';
        urgencyScore = 12;
      }

      return {
        id: c.id,
        name: c.name,
        legalArea: c.legalArea || 'Previdenciário · Obrigação de Fazer',
        phone: c.phone || c.whatsapp || '',
        cpf: c.cpfCnpj || '',
        currentStep,
        stageName,
        statusBadge,
        nextAction,
        actionLabel,
        actionType,
        urgencyScore,
        updatedAt: new Date(c.updatedAt || c.createdAt),
      };
    });

    return flows.sort((a, b) => a.urgencyScore - b.urgencyScore).slice(0, 5);
  }, [clients, documents, processes]);

  // Fila de Ações Humanas: "Precisa de Você"
  const humanActionsQueue = useMemo(() => {
    const queue: {
      id: string;
      clientName: string;
      actionText: string;
      btnLabel: string;
      btnType: 'KIT' | 'SIGN' | 'PROCESS' | 'CHECK';
      clientId: string;
      phone?: string;
    }[] = [];

    // Clientes sem Kit gerado
    clients.forEach((c) => {
      const cd = documents.filter((d) => d.clientId === c.id);
      const cp = processes.filter((p) => p.clientId === c.id);
      if (cd.length === 0 && cp.length === 0) {
        queue.push({
          id: `kit-${c.id}`,
          clientName: c.name,
          actionText: 'Gerar Kit Jurídico',
          btnLabel: 'Gerar',
          btnType: 'KIT',
          clientId: c.id,
        });
      }
    });

    // Assinaturas aguardando há mais de 24h
    pendingDocs.forEach((d) => {
      const diffHours = (Date.now() - new Date(d.createdAt).getTime()) / 36e5;
      if (diffHours >= 24) {
        queue.push({
          id: `sign-${d.id}`,
          clientName: d.client?.name || 'Cliente',
          actionText: `Assinatura parada há ${Math.floor(diffHours)}h`,
          btnLabel: 'Lembrar',
          btnType: 'SIGN',
          clientId: d.clientId,
          phone: d.client?.phone || d.client?.whatsapp || '',
        });
      }
    });

    // Clientes prontos para virar processo
    clients.forEach((c) => {
      const cd = documents.filter((d) => d.clientId === c.id);
      const cp = processes.filter((p) => p.clientId === c.id);
      if (cd.length > 0 && cd.every((d) => d.status === 'CONCLUIDO') && cp.length === 0) {
        queue.push({
          id: `proc-${c.id}`,
          clientName: c.name,
          actionText: 'Kit assinado. Criar processo',
          btnLabel: 'Criar',
          btnType: 'PROCESS',
          clientId: c.id,
        });
      }
    });

    return queue.slice(0, 3);
  }, [clients, documents, processes, pendingDocs]);

  // AssinaJur IA Copilot Insights
  const aiInsights = useMemo(() => {
    const insights: {
      id: string;
      level: 'RED' | 'YELLOW' | 'GREEN';
      title: string;
      message: string;
      actionText: string;
      clientName?: string;
      phone?: string;
    }[] = [];

    const overdueDocs = pendingDocs.filter((d) => {
      const diffHours = (Date.now() - new Date(d.createdAt).getTime()) / 36e5;
      return diffHours >= 24;
    });

    if (overdueDocs.length > 0) {
      const top = overdueDocs[0];
      insights.push({
        id: 'overdue',
        level: 'RED',
        title: 'Assinatura Pendente',
        message: `A assinatura de ${top.client?.name || 'cliente'} em "${top.title}" está parada há > 24h.`,
        actionText: 'Enviar lembrete WhatsApp',
        clientName: top.client?.name,
        phone: top.client?.phone || top.client?.whatsapp || '',
      });
    }

    const readyClients = clients.filter((c) => {
      const cd = documents.filter((d) => d.clientId === c.id);
      const cp = processes.filter((p) => p.clientId === c.id);
      return cd.length > 0 && cd.every((d) => d.status === 'CONCLUIDO') && cp.length === 0;
    });

    if (readyClients.length > 0) {
      insights.push({
        id: 'ready-lawsuit',
        level: 'GREEN',
        title: 'Pronto para Protocolo',
        message: `${readyClients[0].name} assinou todo o kit e está pronto para virar processo.`,
        actionText: 'Criar processo',
        clientName: readyClients[0].name,
      });
    }

    const incompleteClients = clients.filter((c) => !c.cpfCnpj || !c.phone);
    if (incompleteClients.length > 0) {
      insights.push({
        id: 'incomplete',
        level: 'YELLOW',
        title: 'Documentação Pendente',
        message: `${incompleteClients[0].name} possui pendência de qualificação para confecção das peças.`,
        actionText: 'Conferir dados',
        clientName: incompleteClients[0].name,
      });
    }

    return insights.slice(0, 2);
  }, [pendingDocs, clients, documents, processes]);

  // Timeline Recente
  const officeTimeline = useMemo(() => {
    const list: { time: string; text: string; icon: string; color: string }[] = [];

    documents.forEach((d) => {
      const dt = new Date(d.updatedAt || d.createdAt);
      const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (d.status === 'CONCLUIDO') {
        list.push({
          time: timeStr,
          text: `${d.client?.name || 'Cliente'} assinou a procuração`,
          icon: '✓',
          color: 'text-emerald-700 bg-emerald-100',
        });
      } else {
        list.push({
          time: timeStr,
          text: `Documento "${d.title}" enviado para ${d.client?.name || 'Cliente'}`,
          icon: '⏱',
          color: 'text-amber-700 bg-amber-100',
        });
      }
    });

    processes.forEach((p) => {
      const dt = new Date(p.createdAt);
      const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      list.push({
        time: timeStr,
        text: `Dossiê criado para "${p.client?.name || p.title}"`,
        icon: '📁',
        color: 'text-blue-700 bg-blue-100',
      });
    });

    return list.slice(0, 4);
  }, [documents, processes]);

  // Saudação Curta e Nome Compacto
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Upload rápido
  const handleFastFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await handleFastFileProcess(e.target.files[0]);
  };

  const handleFastFileProcess = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Por favor, selecione um arquivo em formato PDF.');
      return;
    }
    setUploadingPdf(true);
    setErrorMessage('');
    setFastDocTitle(file.name.replace(/\.pdf$/i, ''));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro no upload do PDF.');
      setUploadedPdf(d.file);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  const buildWhatsappMessage = useCallback(
    (name: string, link: string) =>
      `Olá, ${name}!\n\nSeus documentos jurídicos do escritório ${
        office?.name || 'Rodrigues & Soares Advocacia'
      } estão prontos para sua assinatura digital.\n\nAcesse o link seguro no celular para assinar:\n${link}\n\nQualquer dúvida, estamos à disposição no escritório.`,
    [office]
  );

  const handleFastDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastClientId) {
      setErrorMessage('Selecione o cliente para o envio.');
      return;
    }
    if (!uploadedPdf) {
      setErrorMessage('Selecione ou arraste um PDF.');
      return;
    }
    setSubmitting(true);
    setErrorMessage('');
    try {
      const r = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fastDocTitle || uploadedPdf.name,
          clientId: fastClientId,
          fileId: uploadedPdf.id,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao gerar documento.');

      const cl = clients.find((c) => c.id === fastClientId);
      const link = `https://www.assinajur.com.br/assinar/${d.document.token}`;
      setWhatsappMsg(buildWhatsappMessage(cl?.name || 'Cliente', link));
      setExecutionResult({
        clientName: cl?.name || 'Cliente',
        clientPhone: cl?.phone || cl?.whatsapp || '',
        docTitle: d.document.title,
        signatureLink: link,
      });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Modais de Criação
  const handleCreateClientModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setErrorMessage('Informe o nome completo do cliente.');
      return;
    }
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
    if (!formClientId || !formKitId) {
      setErrorMessage('Selecione o cliente e o Kit Jurídico.');
      return;
    }
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
      setWhatsappMsg(buildWhatsappMessage(d.result.clientName, link));
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
    if (!formClientId || !formProcessTitle.trim()) {
      setErrorMessage('Preencha o título e selecione o cliente.');
      return;
    }
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
    <main className="space-y-4">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CABEÇALHO COMPACTO & VISÃO DO DIA                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#B68B1C] bg-[#B68B1C]/10 border border-[#B68B1C]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Scale className="w-3 h-3 text-[#B68B1C]" />
              {office?.name || 'Rodrigues & Soares Advocacia'}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              ICP-Brasil
            </span>
          </div>

          <h1 className="text-xl lg:text-2xl font-extrabold text-[#0B192C] tracking-tight">
            {greeting}, Dr. Diego. ⚖️
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Veja o que precisa da sua atenção hoje.
          </p>
        </div>

        {/* VISÃO DO DIA: KPIS COMPACTOS & ELEGANTES */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/90 px-3 py-1.5 rounded-xl min-w-[120px] shadow-2xs">
            <p className="text-[9px] font-black text-amber-800 uppercase tracking-wider">⏱ Automação</p>
            <p className="text-xs font-black text-amber-700 tabular-nums">
              {timeSaved.h}h{String(timeSaved.m).padStart(2, '0')}m economizadas
            </p>
            <p className="text-[10px] text-amber-800/80 font-semibold">{automatedTasksCount} tarefas</p>
          </div>

          <div className="bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl text-left min-w-[105px] shadow-2xs">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pendências</p>
            {pendingDetails.total > 0 ? (
              <>
                <p className="text-xs font-black text-rose-600 tabular-nums flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  {pendingDetails.total} pendência(s)
                </p>
                <p className="text-[10px] text-slate-500 truncate">{pendingDetails.text}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-black text-emerald-700">✓ Nenhuma crítica</p>
                <p className="text-[10px] text-slate-400">Em dia</p>
              </>
            )}
          </div>

          <div className="bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl text-left min-w-[105px] shadow-2xs">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assinaturas</p>
            {signWaitDetails.count > 0 ? (
              <>
                <p className="text-xs font-black text-amber-600 tabular-nums">
                  {signWaitDetails.count} aguardando
                </p>
                <p className="text-[10px] text-slate-500 truncate">{signWaitDetails.text}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-black text-emerald-700">✓ Assinaturas em dia</p>
                <p className="text-[10px] text-slate-400">Sem atrasos</p>
              </>
            )}
          </div>

          <div className="bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl text-left min-w-[95px] shadow-2xs">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Clientes</p>
            <p className="text-xs font-black text-[#0B192C] tabular-nums">
              {loading ? '—' : clients.length} ativos
            </p>
            <p className="text-[10px] text-slate-500">Pipeline ativo</p>
          </div>

          <div className="bg-white border border-slate-200/90 px-3 py-1.5 rounded-xl text-left min-w-[100px] shadow-2xs">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Processos</p>
            <p className="text-xs font-black text-blue-700 tabular-nums">
              {loading ? '—' : processes.length} no Dossiê
            </p>
            <p className="text-[10px] text-slate-500">Centralizados</p>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. CENTRAL DE TRABALHO (EQUILIBRADA & DENSIDADE REFINADA)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#B68B1C]" /> Central de Trabalho
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">Ações rápidas do escritório</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-stretch">
          {/* DESTAQUE PRIORITÁRIO: NOVO ATENDIMENTO (4 COLUNAS COMPACTAS) */}
          <div className="sm:col-span-2 lg:col-span-4 bg-gradient-to-br from-[#0B192C] via-[#0F2644] to-[#071B3A] text-white p-4 rounded-2xl shadow-2xs border border-slate-800 flex flex-col justify-between relative overflow-hidden group">
            <div className="space-y-1.5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] flex items-center justify-center font-bold">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full">
                  Fluxo Completo
                </span>
              </div>
              <h3 className="text-xs font-extrabold text-white">
                Novo Atendimento
              </h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                Inicie um novo atendimento e deixe o AssinaJur conduzir todo o fluxo jurídico: <strong className="text-white font-semibold">Cliente → Docs → Assinaturas → Processo</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActionModal('ATENDIMENTO')}
              className="mt-3 w-full py-2 bg-gradient-to-r from-[#D4AF37] to-[#B68B1C] hover:from-[#e0bd48] hover:to-[#c59822] text-[#071B3A] font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 hover:-translate-y-0.5"
            >
              <UserPlus className="w-3 h-3" /> Iniciar Atendimento
            </button>
          </div>

          {/* ATALHO 1: NOVA ASSINATURA (2.66 COLUNAS) */}
          <div className="lg:col-span-3 sm:col-span-1 bg-white hover:bg-slate-50/80 border border-slate-200/90 p-3.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#B68B1C] flex items-center justify-center font-bold">
                <FileUp className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900">Nova Assinatura</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Enviar diretamente um documento para assinatura.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('fast-signature-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-2.5 w-full py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 text-[11px] font-bold rounded-lg transition-all"
            >
              Enviar PDF
            </button>
          </div>

          {/* ATALHO 2: CRIAR KIT JURÍDICO (2.66 COLUNAS) */}
          <div className="lg:col-span-2 sm:col-span-1 bg-white hover:bg-slate-50/80 border border-slate-200/90 p-3.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900">Kit Jurídico</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Gerar documentos a partir dos modelos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActionModal('KIT')}
              className="mt-2.5 w-full py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 text-[11px] font-bold rounded-lg transition-all"
            >
              Gerar Kit
            </button>
          </div>

          {/* ATALHO 3: NOVO PROCESSO (2.66 COLUNAS) */}
          <div className="lg:col-span-3 sm:col-span-1 bg-white hover:bg-slate-50/80 border border-slate-200/90 p-3.5 rounded-2xl transition-all shadow-2xs flex flex-col justify-between">
            <div className="space-y-1">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900">Novo Processo</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Vincular processo e centralizar no Dossiê.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActionModal('PROCESSO')}
              className="mt-2.5 w-full py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 text-[11px] font-bold rounded-lg transition-all"
            >
              Criar Processo
            </button>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. COLUNA DUPLA: FLUXOS (70%) x PAINEL OPERACIONAL (30%)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUNA ESQUERDA: ONDE MEUS CLIENTES ESTÃO? (8 COLUNAS ~70%) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0B192C] text-[#D4AF37] flex items-center justify-center text-[10px] font-bold">
                  <Briefcase className="w-3 h-3" />
                </div>
                <h2 className="text-xs font-black text-[#0B192C] uppercase tracking-wide">Fluxos em Andamento</h2>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Onde cada cliente está na jornada jurídica
              </p>
            </div>

            <Link
              href="/clientes"
              className="text-[11px] font-bold text-[#B68B1C] hover:underline flex items-center gap-1"
            >
              Ver todos ({clients.length}) <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {clientFlows.length > 0 ? (
              clientFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all space-y-2 shadow-2xs"
                >
                  {/* LINHA 1: NOME + ÁREA + BADGE */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-xs font-black text-slate-900 truncate">{flow.name}</h3>
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded shrink-0">
                        {flow.legalArea}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                        flow.statusBadge === 'URGENTE'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : flow.statusBadge === 'ATENÇÃO'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : flow.statusBadge === 'CONCLUÍDO'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {flow.statusBadge}
                    </span>
                  </div>

                  {/* LINHA 2: PIPELINE VISUAL STEPPER COMPACTO */}
                  <div className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-600 overflow-x-auto gap-1">
                    {[
                      { step: 1, label: 'Entrada' },
                      { step: 2, label: 'Docs' },
                      { step: 3, label: 'Preparação' },
                      { step: 4, label: 'Assinatura' },
                      { step: 5, label: 'Processo' },
                    ].map((st, i, arr) => {
                      const isCompleted = flow.currentStep > st.step;
                      const isCurrent = flow.currentStep === st.step;
                      return (
                        <div key={st.step} className="flex items-center gap-1 shrink-0">
                          <span
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : isCurrent
                                ? 'bg-[#0B192C] text-white'
                                : 'text-slate-400 bg-slate-50'
                            }`}
                          >
                            {isCompleted ? '✓' : isCurrent ? '●' : '○'} {st.label}
                          </span>
                          {i < arr.length - 1 && (
                            <span className="text-slate-300 text-[10px]">——</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* LINHA 3: PRÓXIMA AÇÃO CLARA + BOTÃO */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                    <div className="flex items-center gap-1 text-slate-700 min-w-0">
                      <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">
                        Próxima Ação:
                      </span>
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {flow.nextAction}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {flow.actionType === 'SIGN' && flow.phone && (
                        <a
                          href={`https://wa.me/55${flow.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá, ${flow.name}! Passando para lembrar sobre a assinatura digital dos seus documentos do processo no escritório ${
                              office?.name || 'Rodrigues & Soares'
                            }.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-[#25D366] hover:bg-[#1fb855] text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                        >
                          <MessageSquare className="w-3 h-3 fill-white" /> Enviar lembrete
                        </a>
                      )}

                      {flow.actionType === 'KIT' && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormClientId(flow.id);
                            setActionModal('KIT');
                          }}
                          className="px-2.5 py-1 bg-[#0B192C] hover:bg-[#152a47] text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                        >
                          <Layers className="w-3 h-3 text-[#D4AF37]" /> {flow.actionLabel}
                        </button>
                      )}

                      {flow.actionType === 'PROCESS' && (
                        <Link
                          href="/processos"
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                        >
                          <Folder className="w-3 h-3 text-blue-600" /> {flow.actionLabel}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center space-y-1.5">
                <Briefcase className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Nenhum fluxo em andamento.</p>
                <button
                  type="button"
                  onClick={() => setActionModal('ATENDIMENTO')}
                  className="px-3 py-1.5 bg-[#0B192C] text-white text-xs font-bold rounded-xl"
                >
                  Iniciar Atendimento
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: O QUE PRECISA ACONTECER AGORA? (4 COLUNAS ~30%) */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* 1. ASSINAJUR IA COPILOT */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs space-y-2.5">
            <div className="bg-[#0B192C] text-white px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black tracking-wide text-white uppercase flex items-center gap-1">
                    AssinaJur IA <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
                  </h3>
                  <p className="text-[9px] text-slate-400">Copiloto do escritório</p>
                </div>
              </div>
              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                Ativo
              </span>
            </div>

            <div className="p-3 pt-0 space-y-2">
              {aiInsights.length > 0 ? (
                <>
                  <p className="text-[11px] font-bold text-slate-800">
                    {aiInsights.length} situação(ões) identificadas:
                  </p>

                  <div className="space-y-1.5">
                    {aiInsights.map((ins) => (
                      <div
                        key={ins.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 hover:bg-white transition-all shadow-2xs"
                      >
                        <div className="flex items-start gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                              ins.level === 'RED'
                                ? 'bg-rose-500 animate-pulse'
                                : ins.level === 'YELLOW'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase text-slate-400">{ins.title}</p>
                            <p className="text-[11px] text-slate-700 leading-snug font-medium">
                              {ins.message}
                            </p>
                          </div>
                        </div>

                        {ins.phone ? (
                          <a
                            href={`https://wa.me/55${ins.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá, ${ins.clientName}! Passando para lembrar da assinatura dos seus documentos no escritório ${
                                office?.name || 'Rodrigues & Soares'
                              }.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-center py-1 bg-[#25D366] hover:bg-[#1fb855] text-white text-[10px] font-bold rounded-lg transition-all"
                          >
                            💬 {ins.actionText}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (ins.id === 'ready-lawsuit') setActionModal('PROCESSO');
                              else if (ins.id === 'incomplete') setActionModal('ATENDIMENTO');
                            }}
                            className="w-full py-1 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-lg transition-all"
                          >
                            {ins.actionText}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-0.5 text-center">
                  <p className="text-[11px] font-bold text-emerald-900">✓ Tudo sob controle</p>
                  <p className="text-[10px] text-emerald-800">
                    Nenhuma situação crítica identificada.
                  </p>
                </div>
              )}

              {/* RODAPÉ DO COPILOT */}
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span>Automatizadas hoje:</span>
                <strong className="text-slate-800 font-bold">{automatedTasksCount} tarefas</strong>
              </div>
            </div>
          </div>

          {/* 2. PRECISA DE VOCÊ (FILA DE TRABALHO HUMANO) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Zap className="w-3 h-3" />
                </div>
                <h3 className="text-[11px] font-black text-[#0B192C] uppercase tracking-wide">Precisa de Você</h3>
              </div>
              <span className="text-[9px] font-bold text-slate-400">Próximas Ações</span>
            </div>

            <div className="space-y-1.5">
              {humanActionsQueue.length > 0 ? (
                humanActionsQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 truncate leading-tight">{item.clientName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{item.actionText}</p>
                    </div>

                    {item.btnType === 'SIGN' && item.phone ? (
                      <a
                        href={`https://wa.me/55${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá, ${item.clientName}! Passando para lembrar sobre a assinatura dos seus documentos no escritório ${
                            office?.name || 'Rodrigues & Soares'
                          }.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-[#25D366] text-white text-[9px] font-bold rounded shrink-0 shadow-2xs"
                      >
                        Lembrar
                      </a>
                    ) : item.btnType === 'KIT' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFormClientId(item.clientId);
                          setActionModal('KIT');
                        }}
                        className="px-2 py-1 bg-[#0B192C] text-white text-[9px] font-bold rounded shrink-0"
                      >
                        Gerar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFormClientId(item.clientId);
                          setActionModal('PROCESSO');
                        }}
                        className="px-2 py-1 bg-blue-700 text-white text-[9px] font-bold rounded shrink-0"
                      >
                        Criar
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-2.5 text-center space-y-0.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                  <p className="text-[10px] font-bold text-slate-800">Nada aguardando sua intervenção.</p>
                  <p className="text-[9px] text-slate-400">O AssinaJur está cuidando do restante.</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. ATIVIDADE RECENTE (AGORA NO ESCRITÓRIO) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Activity className="w-3 h-3" />
                </div>
                <h3 className="text-[11px] font-black text-[#0B192C] uppercase tracking-wide">Atividade Recente</h3>
              </div>
              <Link href="/relatorios" className="text-[10px] font-bold text-[#B68B1C] hover:underline">
                Ver tudo
              </Link>
            </div>

            <div className="space-y-1.5">
              {officeTimeline.length > 0 ? (
                officeTimeline.map((ev, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[10px] py-1 border-b border-slate-50 last:border-0">
                    <span className="font-mono text-slate-400 w-8 shrink-0">{ev.time}</span>
                    <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${ev.color}`}>
                      {ev.icon}
                    </span>
                    <p className="text-slate-700 font-medium truncate flex-1 leading-tight">{ev.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400 py-2 text-center">Nenhum evento recente registrado.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. DOSSIÊ JURÍDICO & ASSINATURA RÁPIDA (QUADRANTE INFERIOR)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* DOSSIÊ JURÍDICO (8 COLUNAS) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <Folder className="w-3.5 h-3.5 fill-amber-400/30" />
              </div>
              <h3 className="text-xs font-black text-[#0B192C] uppercase tracking-wide">Dossiê Jurídico & Processos</h3>
            </div>
            <Link href="/processos" className="text-[11px] font-bold text-[#B68B1C] hover:underline flex items-center gap-1">
              Ver todos os processos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {processes.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-white transition-all space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate">{p.title}</p>
                  <span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-1 py-0.2 rounded">
                    {p.legalArea || 'Previdenciário'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Cliente: <strong className="text-slate-700">{p.client?.name || 'Cliente'}</strong>
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-slate-300" /> Dossiê ativo e sincronizado
                </p>
              </div>
            ))}

            {!processes.length && (
              <div className="col-span-2 py-6 text-center space-y-1">
                <Folder className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Nenhum processo ativo no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* ASSINATURA RÁPIDA (4 COLUNAS COMPACTAS) */}
        <div id="fast-signature-card" className="lg:col-span-4 bg-white border-2 border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
              <FileUp className="w-3.5 h-3.5 text-[#B68B1C]" /> Assinatura Rápida
            </h3>
            <p className="text-[10px] text-slate-500">Precisa apenas enviar um PDF avulso?</p>
          </div>

          {executionResult ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
              <p className="font-bold text-emerald-900">✓ Link de Assinatura Pronto!</p>
              <p className="text-emerald-800 text-[10px]">Destinatário: {executionResult.clientName}</p>
              <div className="flex gap-2 pt-1">
                {executionResult.clientPhone && (
                  <a
                    href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-[#25D366] text-white font-bold rounded-lg text-[10px]"
                  >
                    WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(executionResult.signatureLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
                >
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExecutionResult(null);
                    setUploadedPdf(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 ml-auto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFastDispatch} className="space-y-2">
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
                  if (e.dataTransfer.files?.[0]) await handleFastFileProcess(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-2.5 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#B68B1C] bg-amber-50'
                    : uploadedPdf
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-300 bg-slate-50/50 hover:border-[#B68B1C]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFastFileSelect}
                  className="hidden"
                />

                {uploadingPdf ? (
                  <Loader2 className="w-4 h-4 text-[#B68B1C] animate-spin mx-auto my-0.5" />
                ) : uploadedPdf ? (
                  <div className="flex items-center justify-between text-left">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{uploadedPdf.name}</p>
                      <p className="text-[9px] text-emerald-700 font-semibold">✓ PDF pronto</p>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold underline">Trocar</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <FileUp className="w-4 h-4 text-[#B68B1C] mx-auto" />
                    <p className="text-[10px] font-bold text-slate-800">Solte um PDF aqui</p>
                    <p className="text-[9px] text-slate-400">ou clique para buscar</p>
                  </div>
                )}
              </div>

              <ClientSelector
                clients={clients}
                value={fastClientId}
                onChange={setFastClientId}
                placeholder="Selecione o cliente..."
                onNew={() => setActionModal('ATENDIMENTO')}
              />

              <button
                type="submit"
                disabled={submitting || !fastClientId || !uploadedPdf}
                className="w-full py-2 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-35 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-[#D4AF37]" />}
                Disparar Assinatura
              </button>
            </form>
          )}

          {errorMessage && (
            <p className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 p-1.5 rounded-lg">
              {errorMessage}
            </p>
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
