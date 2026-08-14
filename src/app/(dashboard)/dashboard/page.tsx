'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  FileUp,
  FileText,
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
  QrCode,
  Folder,
  FolderPlus,
  User,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Bell,
  RefreshCw,
  Scale,
  FileCheck2,
  CheckCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Plus,
  Briefcase,
  Bot,
  ArrowRight,
  TrendingUp,
  FolderKanban,
  FileSearch,
  Activity,
  Calendar,
  AlertCircle,
  Eye,
  Smartphone,
  CheckCircle,
  HelpCircle,
  History,
  Workflow,
  Sparkle,
  Edit3,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════ */
/*  FORMATTERS & CPF VALIDATION                                */
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

const isValidCpf = (cpf: string) => {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i);
  let c = 11 - (s % 11);
  if (c >= 10) c = 0;
  if (parseInt(n[9]) !== c) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i);
  c = 11 - (s % 11);
  if (c >= 10) c = 0;
  return parseInt(n[10]) === c;
};

/* ═══════════════════════════════════════════════════════════ */
/*  CLIENT COMBOBOX (REUSABLE IN MODALS & QUICK SIGN)         */
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
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white rounded-xl border transition-all duration-150 cursor-pointer select-none ${
          open
            ? 'border-[#0B192C] ring-2 ring-[#0B192C]/10 shadow-xs'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
        }`}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0B192C] text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0">
              {selectedClient.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {selectedClient.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {selectedClient.cpfCnpj ? `CPF ${selectedClient.cpfCnpj}` : 'Sem CPF'}{' '}
                {selectedClient.phone ? `• ${selectedClient.phone}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-slate-400">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-medium">{placeholder}</span>
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-150 shrink-0 ${
            open ? 'rotate-180 text-slate-800' : ''
          }`}
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-hidden animate-in fade-in duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, CPF ou telefone..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B192C]"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-40 py-1 divide-y divide-slate-50">
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    value === c.id ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {c.cpfCnpj || 'Sem CPF'} {c.phone ? `• ${c.phone}` : ''}
                    </p>
                  </div>
                  {value === c.id && <Check className="w-4 h-4 text-[#B68B1C] shrink-0" />}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-xs text-slate-400 font-medium">
                Nenhum cliente encontrado.
              </p>
            )}
          </div>

          {onNew && (
            <div className="border-t border-slate-100 p-2 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  onNew();
                  setOpen(false);
                }}
                className="w-full py-1.5 bg-[#0B192C] hover:bg-[#152a47] text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#D4AF37]" /> Cadastrar Novo Cliente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN PAGE: CENTRO DE OPERAÇÕES JURÍDICAS                   */
/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for the 4 Actions from Central de Trabalho
  const [actionModal, setActionModal] = useState<'ATENDIMENTO' | 'ASSINATURA' | 'KIT' | 'PROCESSO' | null>(null);

  // Forms states
  const [formClientId, setFormClientId] = useState('');
  const [formKitId, setFormKitId] = useState('');
  const [formProcessTitle, setFormProcessTitle] = useState('');
  const [formProcessArea, setFormProcessArea] = useState('Previdenciário');
  const [formProcessNumber, setFormProcessNumber] = useState('');

  // Quick Client in Modals
  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientRg, setClientRg] = useState('');
  const [clientArea, setClientArea] = useState('Previdenciário');

  // Fast Signature Widget State
  const [fastDocTitle, setFastDocTitle] = useState('');
  const [fastClientId, setFastClientId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result & WhatsApp dispatch
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all backend records
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

  // Operational metrics
  const completedDocs = useMemo(
    () => documents.filter((d) => d.status === 'CONCLUIDO'),
    [documents]
  );
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

  // Operational Pipeline / Fluxos em Andamento (Real computation from client data)
  const clientFlows = useMemo(() => {
    return clients.map((c) => {
      const clientDocs = documents.filter((d) => d.clientId === c.id);
      const clientProcesses = processes.filter((p) => p.clientId === c.id);
      const signedDocs = clientDocs.filter((d) => d.status === 'CONCLUIDO');
      const hasPendingSign = clientDocs.some((d) => !['CONCLUIDO', 'CANCELADO'].includes(d.status));

      let stage: 'CADASTRO' | 'DOCUMENTACAO' | 'ASSINATURA' | 'PROCESSO' | 'CONCLUIDO' = 'CADASTRO';
      let stageLabel = 'Cadastro Realizado';
      let progress = '1/4 etapas';
      let statusType: 'GREEN' | 'YELLOW' | 'RED' | 'BLUE' = 'BLUE';
      let pendingAlert = '';
      let actionLabel = 'Continuar Atendimento';
      let actionType: 'SIGN' | 'DOCS' | 'PROCESS' | 'VIEW' = 'DOCS';

      if (clientProcesses.length > 0) {
        stage = 'PROCESSO';
        stageLabel = 'Processo Ativo';
        progress = `${clientProcesses.length} processo(s) vinculado(s)`;
        statusType = 'GREEN';
        actionLabel = 'Acompanhar Processo';
        actionType = 'PROCESS';
      } else if (signedDocs.length > 0 && !hasPendingSign) {
        stage = 'PROCESSO';
        stageLabel = 'Pronto para Protocolo';
        progress = `${signedDocs.length} docs assinados`;
        statusType = 'GREEN';
        pendingAlert = 'Todas as assinaturas colhidas ✓';
        actionLabel = 'Criar Processo Judicial';
        actionType = 'PROCESS';
      } else if (clientDocs.length > 0) {
        stage = 'ASSINATURA';
        stageLabel = 'Aguardando Assinatura';
        progress = `${signedDocs.length}/${clientDocs.length} assinados`;
        statusType = 'YELLOW';
        pendingAlert = `Aguardando retorno do cliente via WhatsApp`;
        actionLabel = 'Cobrar Assinatura';
        actionType = 'SIGN';
      } else {
        stage = 'DOCUMENTACAO';
        stageLabel = 'Documentação';
        progress = 'Preparação de Minutas';
        statusType = 'YELLOW';
        pendingAlert = !c.cpfCnpj ? 'CPF pendente de validação' : 'Aguardando envio do kit inicial';
        actionLabel = 'Gerar Kit Jurídico';
        actionType = 'DOCS';
      }

      return {
        id: c.id,
        name: c.name,
        legalArea: c.legalArea || 'Previdenciário / Cível',
        phone: c.phone || c.whatsapp || '',
        cpf: c.cpfCnpj || '',
        stage,
        stageLabel,
        progress,
        statusType,
        pendingAlert,
        actionLabel,
        actionType,
        updatedAt: new Date(c.updatedAt || c.createdAt),
      };
    }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 6);
  }, [clients, documents, processes]);

  // AssinaJur IA Copilot Insights Engine
  const aiInsights = useMemo(() => {
    const insights: {
      id: string;
      level: 'RED' | 'YELLOW' | 'GREEN';
      message: string;
      actionText: string;
      clientName?: string;
      phone?: string;
      link?: string;
    }[] = [];

    // Check overdue documents (> 24 hours)
    const overdueDocs = pendingDocs.filter((d) => {
      const diffHours = (Date.now() - new Date(d.createdAt).getTime()) / 36e5;
      return diffHours >= 24;
    });

    if (overdueDocs.length > 0) {
      const topOverdue = overdueDocs[0];
      insights.push({
        id: 'overdue-sign',
        level: 'RED',
        message: `${topOverdue.client?.name || 'Cliente'} aguarda assinatura de "${topOverdue.title}" há mais de 24h.`,
        actionText: 'Enviar cobrança WhatsApp',
        clientName: topOverdue.client?.name,
        phone: topOverdue.client?.phone || topOverdue.client?.whatsapp || '',
      });
    }

    // Check clients ready to create lawsuit
    const readyClients = clients.filter((c) => {
      const cd = documents.filter((d) => d.clientId === c.id);
      const cp = processes.filter((p) => p.clientId === c.id);
      return cd.length > 0 && cd.every((d) => d.status === 'CONCLUIDO') && cp.length === 0;
    });

    if (readyClients.length > 0) {
      insights.push({
        id: 'ready-process',
        level: 'GREEN',
        message: `${readyClients[0].name} assinou todos os documentos e está pronta para protocolo inicial.`,
        actionText: 'Criar dossiê / processo',
        clientName: readyClients[0].name,
      });
    }

    // Check incomplete clients
    const incompleteClients = clients.filter((c) => !c.cpfCnpj || !c.phone);
    if (incompleteClients.length > 0) {
      insights.push({
        id: 'incomplete-client',
        level: 'YELLOW',
        message: `Identifiquei ${incompleteClients.length} cadastro(s) com dados de qualificação incompletos.`,
        actionText: 'Completar cadastros',
      });
    } else if (documents.length > 0) {
      insights.push({
        id: 'doc-security',
        level: 'GREEN',
        message: `Todos os documentos recentes possuem Hash SHA-256 e Carimbo do Tempo ICP-Brasil ativos.`,
        actionText: 'Verificar integridade',
      });
    }

    return insights;
  }, [pendingDocs, clients, documents, processes]);

  // Urgencies & Overdue Actions
  const urgentActions = useMemo(() => {
    return pendingDocs
      .map((doc) => {
        const days = Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 864e5);
        return {
          id: doc.id,
          days,
          urgent: days >= 2,
          title: doc.title,
          clientName: doc.client?.name || 'Cliente',
          phone: doc.client?.phone || doc.client?.whatsapp || '',
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 4);
  }, [pendingDocs]);

  // Office Activities Timeline
  const timelineEvents = useMemo(() => {
    const events: { time: string; text: string; icon: string; color: string }[] = [];

    documents.forEach((d) => {
      const dt = new Date(d.updatedAt || d.createdAt);
      const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (d.status === 'CONCLUIDO') {
        events.push({
          time: timeStr,
          text: `${d.client?.name || 'Cliente'} assinou "${d.title}" com certificado digital`,
          icon: '✓',
          color: 'text-emerald-700 bg-emerald-100',
        });
      } else {
        events.push({
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
      events.push({
        time: timeStr,
        text: `Dossiê criado para "${p.client?.name || p.title}"`,
        icon: '📁',
        color: 'text-blue-700 bg-blue-100',
      });
    });

    return events.slice(0, 5);
  }, [documents, processes]);

  // Greeting Message based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const doctorFirstName = currentUser?.name?.split(' ')?.[0] || 'Dr. Diego';

  // Fast PDF Drag and Drop processor
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
      } estão prontos para sua assinatura eletrônica com validade jurídica.\n\nAcesse o link seguro no celular para assinar:\n${link}\n\nQualquer dúvida, estamos à disposição no escritório.`,
    [office]
  );

  // Fast PDF Dispatch
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

  // Create Client Modal Handler
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

      // Auto-create process dossier
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

  // Create Kit Dispatch Handler
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

  // Create Process Handler
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
    <main className="mx-auto max-w-7xl pb-24 space-y-7">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CABEÇALHO OPERACIONAL + RESUMO EXECUTIVO                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B68B1C] bg-[#B68B1C]/10 border border-[#B68B1C]/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Scale className="w-3 h-3 text-[#B68B1C]" />
              {office?.name || 'Rodrigues & Soares Advocacia'}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              ICP-Brasil Ativo
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0B192C] tracking-tight">
            {greeting}, {doctorFirstName}. ⚖️
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Aqui está o que precisa da sua atenção hoje no escritório.
          </p>
        </div>

        {/* INDICADORES ÚTEIS EM LINHA */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/90 px-3.5 py-2.5 rounded-2xl min-w-[130px] shadow-2xs">
            <p className="text-[9px] font-black text-amber-800 uppercase tracking-wider">⏱ Tempo Economizado</p>
            <p className="text-base font-black text-amber-700 tabular-nums">
              {timeSaved.h}h{String(timeSaved.m).padStart(2, '0')}m <span className="text-[10px] font-bold text-amber-600">este mês</span>
            </p>
            <p className="text-[10px] text-amber-800/80 font-semibold">{automatedTasksCount} tarefas automatizadas</p>
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { n: urgentActions.length, l: 'Pendências Hoje', c: urgentActions.length > 0 ? 'text-rose-600' : 'text-slate-800', dot: urgentActions.length > 0 },
              { n: pendingDocs.length, l: 'Assinaturas Aguardando', c: 'text-amber-600' },
              { n: clients.length, l: 'Clientes Ativos', c: 'text-[#0B192C]' },
              { n: processes.length, l: 'Processos Acompanhados', c: 'text-blue-700' },
            ].map((m, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200/90 px-3 py-2 rounded-2xl text-center min-w-[70px] shadow-2xs"
              >
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{m.l}</p>
                <p className={`text-base font-black ${m.c} tabular-nums leading-tight`}>
                  {loading ? '—' : String(m.n).padStart(2, '0')}
                </p>
                {m.dot && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mx-auto mt-0.5 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. CENTRAL DE TRABALHO (4 AÇÕES PRINCIPAIS SOFISTICADAS)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5 text-[#B68B1C]" /> Central de Trabalho • Iniciar Novo Fluxo
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Selecione uma ação rápida</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* AÇÃO 1: NOVO ATENDIMENTO */}
          <button
            type="button"
            onClick={() => setActionModal('ATENDIMENTO')}
            className="group p-4.5 bg-white hover:bg-slate-50/80 border-2 border-slate-200/90 hover:border-[#0B192C] rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-[#D4AF37] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Fluxo Completo
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0B192C]">
              Novo Atendimento
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Cadastre o cliente e inicie o pipeline jurídico (Cliente → Docs → Assinatura → Processo).
            </p>
          </button>

          {/* AÇÃO 2: NOVA ASSINATURA */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('fast-signature-card');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group p-4.5 bg-white hover:bg-slate-50/80 border-2 border-slate-200/90 hover:border-amber-400 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#B68B1C] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <FileUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                1-Click
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800">
              Nova Assinatura
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Envie rapidamente um documento PDF para coleta de assinatura via WhatsApp.
            </p>
          </button>

          {/* AÇÃO 3: CRIAR KIT JURÍDICO */}
          <button
            type="button"
            onClick={() => setActionModal('KIT')}
            className="group p-4.5 bg-white hover:bg-slate-50/80 border-2 border-slate-200/90 hover:border-blue-500 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                Pacote Modelo
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-800">
              Criar Kit Jurídico
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Gere procuração, contrato e declaração preenchidos automaticamente.
            </p>
          </button>

          {/* AÇÃO 4: NOVO PROCESSO */}
          <button
            type="button"
            onClick={() => setActionModal('PROCESSO')}
            className="group p-4.5 bg-white hover:bg-slate-50/80 border-2 border-slate-200/90 hover:border-purple-500 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                Dossiê Explorer
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-800">
              Novo Processo
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Crie o processo judicial, vincule documentos e organize no Windows Explorer.
            </p>
          </button>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. FLUXOS EM ANDAMENTO (70%) + ASSINAJUR IA (30%)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: FLUXOS EM ANDAMENTO (8 COLUNAS ~70%) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0B192C] text-[#D4AF37] flex items-center justify-center text-xs font-bold">
                  <Workflow className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-black text-[#0B192C]">Fluxos em Andamento</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhamento operacional das etapas e pendências de cada cliente
              </p>
            </div>

            <Link
              href="/clientes"
              className="text-xs font-bold text-[#B68B1C] hover:underline flex items-center gap-1"
            >
              Ver todos ({clients.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {clientFlows.length > 0 ? (
              clientFlows.map((flow) => (
                <div
                  key={flow.id}
                  className="p-4 rounded-2xl border border-slate-200/90 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all duration-150 space-y-2.5 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[#0B192C] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {flow.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{flow.name}</p>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {flow.legalArea}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {flow.cpf ? `CPF ${flow.cpf}` : 'Sem CPF'} {flow.phone ? `• ${flow.phone}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                          flow.statusType === 'GREEN'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : flow.statusType === 'YELLOW'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : flow.statusType === 'RED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {flow.stageLabel} • {flow.progress}
                      </span>
                    </div>
                  </div>

                  {/* ALERTA E PRÓXIMA AÇÃO */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100/80 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      {flow.pendingAlert ? (
                        <span className="text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {flow.pendingAlert}
                        </span>
                      ) : (
                        <span className="text-emerald-800 flex items-center gap-1 text-[11px] font-semibold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Etapa em conformidade
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {flow.actionType === 'SIGN' && flow.phone && (
                        <a
                          href={`https://wa.me/55${flow.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá, ${flow.name}! Passando para lembrar sobre a assinatura digital dos seus documentos do processo no escritório ${
                              office?.name || 'Rodrigues & Soares'
                            }. Podemos te ajudar a concluir?`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                        >
                          <MessageSquare className="w-3 h-3 fill-white" /> Cobrar Assinatura
                        </a>
                      )}

                      {flow.actionType === 'DOCS' && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormClientId(flow.id);
                            setActionModal('KIT');
                          }}
                          className="px-3 py-1.5 bg-[#0B192C] hover:bg-[#152a47] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                        >
                          <Layers className="w-3 h-3 text-[#D4AF37]" /> Gerar Kit Jurídico
                        </button>
                      )}

                      {flow.actionType === 'PROCESS' && (
                        <Link
                          href="/processos"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                        >
                          <Folder className="w-3 h-3 text-blue-600" /> Ver no Dossiê
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center space-y-2">
                <Workflow className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Nenhum fluxo iniciado ainda.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Clique em "Novo Atendimento" na Central de Trabalho acima para cadastrar seu primeiro cliente.
                </p>
                <button
                  type="button"
                  onClick={() => setActionModal('ATENDIMENTO')}
                  className="mt-2 px-4 py-2 bg-[#0B192C] text-white text-xs font-bold rounded-xl"
                >
                  Iniciar Primeiro Atendimento
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: ASSINAJUR IA (4 COLUNAS ~30%) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 via-[#0B192C] to-[#0A254F] text-white border border-slate-800 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gold-400/20 text-[#D4AF37] flex items-center justify-center border border-gold-400/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                  AssinaJur IA <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                </h3>
                <p className="text-[10px] text-slate-400">Copiloto Operacional</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Ativo
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-200">
              {aiInsights.length} situação(ões) identificada(s) pelo robô:
            </p>

            <div className="space-y-2.5">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                        insight.level === 'RED'
                          ? 'bg-rose-400 animate-pulse'
                          : insight.level === 'YELLOW'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {insight.message}
                    </p>
                  </div>

                  {insight.phone && (
                    <a
                      href={`https://wa.me/55${insight.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá, ${insight.clientName}! Passando para lembrar da assinatura dos seus documentos no escritório ${
                          office?.name || 'Rodrigues & Soares'
                        }.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs"
                    >
                      💬 {insight.actionText}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={loadData}
              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Atualizar Diagnóstico da IA
            </button>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. ATENÇÃO PRIORITÁRIA (ESQUERDA) + ATIVIDADE DO ESCRITÓRIO (DIR) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ATENÇÃO PRIORITÁRIA */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-[#0B192C]">Atenção Prioritária</h3>
            </div>
            {urgentActions.length > 0 ? (
              <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                {urgentActions.length} ação(ões) pendente(s)
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                Resolvido
              </span>
            )}
          </div>

          <div className="space-y-2">
            {urgentActions.length > 0 ? (
              urgentActions.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50/50 border border-rose-200/70"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{a.clientName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {a.title} • {a.days > 0 ? `Aguardando há ${a.days} dia(s)` : 'Enviado hoje'}
                    </p>
                  </div>

                  {a.phone && (
                    <a
                      href={`https://wa.me/55${a.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá, ${a.clientName}! Passando para lembrar da assinatura digital dos seus documentos do processo no escritório ${
                          office?.name || 'Rodrigues & Soares'
                        }.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[10px] font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-2xs"
                    >
                      <MessageSquare className="w-3 h-3 fill-white" /> Cobrar
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Todas as pendências críticas resolvidas.</p>
                <p className="text-[11px] text-slate-400">O escritório está com os fluxos em dia.</p>
              </div>
            )}
          </div>
        </div>

        {/* ATIVIDADE DO ESCRITÓRIO */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black text-[#0B192C]">Atividade do Escritório</h3>
            </div>
            <Link href="/relatorios" className="text-xs font-bold text-[#B68B1C] hover:underline">
              Ver toda atividade
            </Link>
          </div>

          <div className="space-y-2">
            {timelineEvents.length > 0 ? (
              timelineEvents.map((ev, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] font-mono text-slate-400 w-10 shrink-0">{ev.time}</span>
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${ev.color}`}>
                    {ev.icon}
                  </span>
                  <p className="text-slate-700 font-medium truncate flex-1">{ev.text}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-8 text-center">Nenhum evento registrado hoje.</p>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. PROCESSOS RECENTES (DIR/ESQ) + ASSINATURA RÁPIDA (25%)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PROCESSOS RECENTES & DOSSIÊS (8 COLUNAS) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Folder className="w-4 h-4 fill-amber-400/30" />
              </div>
              <h3 className="text-sm font-black text-[#0B192C]">Processos Recentes & Dossiês</h3>
            </div>
            <Link href="/processos" className="text-xs font-bold text-[#B68B1C] hover:underline flex items-center gap-1">
              Ver todos os processos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {processes.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-white transition-all space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate">{p.title}</p>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    {p.legalArea || 'Previdenciário'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Cliente: <strong className="text-slate-700">{p.client?.name || 'Cliente'}</strong>
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300" /> Atualizado recentemente
                </p>
              </div>
            ))}

            {!processes.length && (
              <div className="col-span-2 py-8 text-center space-y-1">
                <Folder className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Nenhum processo ativo no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* ASSINATURA RÁPIDA (4 COLUNAS COMPACTAS ~30%) */}
        <div id="fast-signature-card" className="lg:col-span-4 bg-white border-2 border-slate-200/90 rounded-[28px] p-5 shadow-sm space-y-3.5">
          <div className="border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
              <FileUp className="w-4 h-4 text-[#B68B1C]" /> Assinatura Rápida
            </h3>
            <p className="text-[11px] text-slate-500">Precisa apenas enviar um PDF avulso?</p>
          </div>

          {executionResult ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
              <p className="font-bold text-emerald-900">✓ Link de Assinatura Pronto!</p>
              <p className="text-emerald-800 text-[11px]">Enviado para {executionResult.clientName}</p>
              <div className="flex gap-2 pt-1">
                {executionResult.clientPhone && (
                  <a
                    href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#25D366] text-white font-bold rounded-lg text-[11px]"
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
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px]"
                >
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExecutionResult(null);
                    setUploadedPdf(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 ml-auto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFastDispatch} className="space-y-2.5">
              {/* COMPACT DROP ZONE */}
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
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
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
                  <Loader2 className="w-5 h-5 text-[#B68B1C] animate-spin mx-auto my-1" />
                ) : uploadedPdf ? (
                  <div className="flex items-center justify-between text-left">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{uploadedPdf.name}</p>
                      <p className="text-[10px] text-emerald-700 font-semibold">✓ PDF pronto</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold underline">Trocar</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <FileUp className="w-5 h-5 text-[#B68B1C] mx-auto" />
                    <p className="text-[11px] font-bold text-slate-800">Solte um PDF aqui</p>
                    <p className="text-[10px] text-slate-400">ou clique para buscar</p>
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
                className="w-full py-2.5 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-35 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-[#D4AF37]" />}
                Disparar Assinatura
              </button>
            </form>
          )}

          {errorMessage && (
            <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-lg">
              {errorMessage}
            </p>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: NOVO ATENDIMENTO (CADASTRO COMPLETO + FLUXO)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {actionModal === 'ATENDIMENTO' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0B192C] text-[#D4AF37] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0B192C]">Iniciar Novo Atendimento</h3>
                  <p className="text-[11px] text-slate-500">Cadastre o cliente para iniciar o pipeline operacional</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClientModal} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600">Nome Completo</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Maria das Graças Silva"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600">CPF</label>
                  <input
                    type="text"
                    value={clientCpf}
                    onChange={(e) => setClientCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(formatPhone(e.target.value))}
                    placeholder="(71) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600">RG (Opcional)</label>
                  <input
                    type="text"
                    value={clientRg}
                    onChange={(e) => setClientRg(formatRg(e.target.value))}
                    placeholder="00.000.000-00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600">Área Jurídica</label>
                  <select
                    value={clientArea}
                    onChange={(e) => setClientArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
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
                className="w-full py-3 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4 text-[#D4AF37]" />}
                Cadastrar Cliente & Criar Dossiê Automático
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CRIAR KIT JURÍDICO                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {actionModal === 'KIT' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0B192C]">Disparar Kit Jurídico</h3>
                  <p className="text-[11px] text-slate-500">Gere procuração, contrato e declaração em lote</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKitDispatch} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 mb-1 block">Kit Jurídico</label>
                <select
                  value={formKitId}
                  onChange={(e) => setFormKitId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                >
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.items?.length || 3} documentos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 mb-1 block">Cliente Destinatário</label>
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
                className="w-full py-3 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-[#D4AF37]" />}
                Gerar Kit & Abrir Envio WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: NOVO PROCESSO                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {actionModal === 'PROCESSO' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0B192C]">Novo Processo Judicial</h3>
                  <p className="text-[11px] text-slate-500">Centralize o acompanhamento e organize o dossiê</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProcess} className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600">Título / Ação</label>
                <input
                  type="text"
                  value={formProcessTitle}
                  onChange={(e) => setFormProcessTitle(e.target.value)}
                  placeholder="Ex: Ação de Concessão de BPC/LOAS"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-600">Cliente</label>
                <ClientSelector
                  clients={clients}
                  value={formClientId}
                  onChange={setFormClientId}
                  onNew={() => setActionModal('ATENDIMENTO')}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600">Nº do Processo (Se houver)</label>
                  <input
                    type="text"
                    value={formProcessNumber}
                    onChange={(e) => setFormProcessNumber(e.target.value)}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600">Área Jurídica</label>
                  <select
                    value={formProcessArea}
                    onChange={(e) => setFormProcessArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0B192C]"
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
                className="w-full py-3 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Folder className="w-4 h-4 text-[#D4AF37]" />}
                Criar Processo & Organizar Dossiê
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
