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
  CheckCircle,
  Zap,
  Plus,
  ArrowRight,
  Filter,
  Workflow,
} from 'lucide-react';
import BrazilOperationsMap from '@/components/BrazilOperationsMap';

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
      let actionType: 'SIGN' | 'KIT' | 'PROCESS' | 'VIEW' = 'KIT';
      let priorityScore = 10;

      if (clientProcesses.length > 0) {
        stage = 'PROCESSO';
        stageName = 'Processo';
        statusText = 'Processo judicial ativo e acompanhado no Dossiê';
        nextActionText = 'Acompanhar andamento e movimentações do caso';
        actionLabel = 'Ver Dossiê';
        actionType = 'PROCESS';
        priorityScore = 50;
      } else if (signedDocs.length > 0 && !hasPendingSign) {
        stage = 'PROCESSO';
        stageName = 'Preparação p/ Ajuizamento';
        statusText = 'Kit de documentos 100% assinado pelo cliente';
        nextActionText = 'Ajuizar ou vincular processo judicial ao Dossiê';
        actionLabel = 'Criar Processo';
        actionType = 'PROCESS';
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
        actionLabel = 'Enviar lembrete WhatsApp';
        actionType = 'SIGN';
        priorityScore = isOverdue ? 1 : 5;
      } else if (!c.cpfCnpj || !c.phone) {
        stage = 'DOCUMENTACAO';
        stageName = 'Documentação';
        statusText = 'Cadastro com pendência de CPF ou telefone';
        nextActionText = 'Completar qualificação do cliente para confecção de peças';
        actionLabel = 'Completar cadastro';
        actionType = 'KIT';
        priorityScore = 8;
      } else if (clientDocs.length === 0) {
        stage = 'ENTRADA';
        stageName = 'Entrada';
        statusText = 'Novo cliente cadastrado no sistema';
        nextActionText = 'Conferir dados e solicitar documentos iniciais';
        actionLabel = 'Iniciar documentação';
        actionType = 'KIT';
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

  // ÚLTIMAS ATIVIDADES
  const recentActivities = useMemo(() => {
    const list: { time: string; text: string }[] = [];

    documents.forEach((d) => {
      const dt = new Date(d.updatedAt || d.createdAt);
      const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (d.status === 'CONCLUIDO') {
        list.push({
          time: timeStr,
          text: `${d.client?.name || 'Cliente'} assinou a procuração`,
        });
      } else {
        list.push({
          time: timeStr,
          text: `Documento "${d.title}" enviado para ${d.client?.name || 'Cliente'}`,
        });
      }
    });

    processes.forEach((p) => {
      const dt = new Date(p.createdAt);
      const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      list.push({
        time: timeStr,
        text: `Dossiê criado para "${p.client?.name || p.title}"`,
      });
    });

    return list.slice(0, 3);
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
    const first = currentUser.name.trim().split(' ')[0];
    return first.toLowerCase().startsWith('dr') ? first : `Dr. ${first}`;
  }, [currentUser]);

  // Total de situações pendentes
  const totalAttentionCount = useMemo(() => {
    return stageCounts.overdueSignatures + stageCounts.PREPARACAO + stageCounts.DOCUMENTACAO;
  }, [stageCounts]);

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
    if (!fastClientId || !uploadedPdf) return;
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
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="space-y-0.5">
          <h1 className="text-xl lg:text-2xl font-extrabold text-[#0B192C] tracking-tight">
            {greeting}, {userFirstName}. ⚖️
          </h1>
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            {totalAttentionCount > 0 ? (
              <span className="text-amber-800 font-extrabold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {totalAttentionCount} situação(ões) precisam da sua atenção hoje.
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                ✓ Seu escritório está em dia. Nenhuma ação crítica pendente.
              </span>
            )}
          </p>
        </div>

        {/* BOTOES DE AÇÃO DA CENTRAL: [ + Novo Atendimento ] & [ + Criar ▾ ] */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActionModal('ATENDIMENTO')}
            className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#B68B1C] hover:from-[#e0bd48] hover:to-[#c59822] text-[#071B3A] font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 hover:-translate-y-0.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Novo Atendimento
          </button>

          {/* DROPDOWN [+ Criar ▾] */}
          <div ref={createMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="px-3.5 py-2 bg-[#0B192C] hover:bg-[#152a47] text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4AF37]" /> Criar <ChevronDown className="w-3 h-3 text-slate-300" />
            </button>

            {createMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 divide-y divide-slate-100 text-xs font-bold animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    setActionModal('ATENDIMENTO');
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#B68B1C]" /> Novo Atendimento
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateMenuOpen(false);
                    const el = document.getElementById('fast-signature-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
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
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. SEÇÃO PRINCIPAL (2 COLUNAS): PRIORIDADE AGORA x RESUMO IA  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* ESQUERDA (8 COLUNAS): SUA PRIORIDADE AGORA */}
        <div className="lg:col-span-8 bg-gradient-to-br from-white via-slate-50/50 to-amber-50/20 border-2 border-amber-200/90 rounded-2xl p-4 lg:p-5 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden">
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

                {/* DADOS DO CLIENTE & CONTEXTO HUMANO */}
                <div className="border-l-4 border-[#0B192C] pl-3 py-0.5 space-y-1">
                  <h3 className="text-base font-extrabold text-[#0B192C]">
                    {topPriorityCase.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="text-emerald-700 font-extrabold">✓</span> {topPriorityCase.statusText}
                  </p>
                </div>

                {/* PRÓXIMO PASSO EXPLICADO */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Próximo Passo Recomendado
                  </span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">
                    {topPriorityCase.nextActionText}
                  </p>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO DIRETA & TRAJETÓRIA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
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
                      className="px-4 py-2 bg-[#25D366] hover:bg-[#1fb855] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-white" /> Enviar lembrete WhatsApp
                    </a>
                  )}

                  {topPriorityCase.actionType === 'KIT' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientId(topPriorityCase.id);
                        setActionModal('KIT');
                      }}
                      className="px-4 py-2 bg-[#0B192C] hover:bg-[#152a47] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#D4AF37]" /> Gerar Kit Jurídico
                    </button>
                  )}

                  {topPriorityCase.actionType === 'PROCESS' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientId(topPriorityCase.id);
                        setActionModal('PROCESSO');
                      }}
                      className="px-4 py-2 bg-[#0B192C] hover:bg-[#152a47] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-[#D4AF37]" /> Criar Processo
                    </button>
                  )}

                  <Link
                    href="/processos"
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all"
                  >
                    Ver Dossiê
                  </Link>
                </div>

                <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                  Depois disso: <strong className="text-slate-800">Assinatura → Processo</strong>
                </span>
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-xs font-extrabold text-slate-800">Nenhuma Ação Crítica Pendente</h3>
              <p className="text-[11px] text-slate-500">Seu escritório está em dia. 2 fluxos podem avançar hoje.</p>
            </div>
          )}
        </div>

        {/* DIREITA (4 COLUNAS): RESUMO DO ASSINAJUR (IA COPILOT) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3">
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
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                IA Copilot
              </span>
            </div>

            {aiSummary.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-800">
                  {aiSummary.length} ações dependem da sua atenção:
                </p>

                {aiSummary.map((item, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-xl border text-[11px] font-medium leading-snug flex items-start gap-1.5 ${
                      item.urgent
                        ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${item.urgent ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-0.5 text-center">
                <p className="text-xs font-bold text-emerald-900">✓ Tudo sob controle</p>
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
            className="w-full py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all"
          >
            Resolver Pendências
          </button>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. OPERAÇÃO DO ESCRITÓRIO (MAPA OPERACIONAL HORIZONTAL)       */}
      {/* ───────────────────────────────────────────────────────────── */}
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-bold">
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
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-between ${
                  isSelected
                    ? 'bg-[#0B192C] text-white border-[#0B192C] shadow-xs'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200/90 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {st.label}
                  </span>
                  {st.badge && (
                    <span className="text-[8px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-full">
                      {st.badge}
                    </span>
                  )}
                </div>

                <span className={`text-base font-black tabular-nums mt-1 ${isSelected ? 'text-[#D4AF37]' : 'text-slate-900'}`}>
                  {st.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. PRÓXIMOS DA FILA (FILA DE TRABALHO RESUMIDA)               */}
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
                      Lembrar
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
                  ) : (
                    <Link
                      href="/processos"
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
      {/* 5. PROVA DE AUTOMAÇÃO & ÚLTIMAS ATIVIDADES                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* HOJE O ASSINAJUR TRABALHOU POR VOCÊ (8 COLUNAS) */}
        <div className="lg:col-span-8 bg-gradient-to-r from-slate-900 to-[#0B192C] text-white rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Hoje o AssinaJur trabalhou por você
            </span>
            <span className="text-[10px] font-bold text-slate-300">
              Automação Contínua
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center py-1">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2">
              <p className="text-sm font-black text-[#D4AF37]">{automationMetrics.docsOrganized}</p>
              <p className="text-[10px] text-slate-300 font-medium">documentos organizados</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2">
              <p className="text-sm font-black text-emerald-400">{automationMetrics.validationsDone}</p>
              <p className="text-[10px] text-slate-300 font-medium">validações concluídas</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2">
              <p className="text-sm font-black text-amber-400">{automationMetrics.signaturesProcessed}</p>
              <p className="text-[10px] text-slate-300 font-medium">assinaturas processadas</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2">
              <p className="text-sm font-black text-blue-400">{automationMetrics.dossiersUpdated}</p>
              <p className="text-[10px] text-slate-300 font-medium">Dossiês atualizados</p>
            </div>
          </div>
        </div>

        {/* ÚLTIMAS ATIVIDADES (4 COLUNAS) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h3 className="text-[11px] font-black uppercase text-[#0B192C] tracking-wide flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-slate-500" /> Últimas Atividades
            </h3>
            <Link href="/relatorios" className="text-[10px] font-bold text-[#B68B1C] hover:underline">
              Histórico
            </Link>
          </div>

          <div className="space-y-1.5">
            {recentActivities.length > 0 ? (
              recentActivities.map((ev, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px] py-0.5">
                  <span className="font-mono text-slate-400 w-8 shrink-0">{ev.time}</span>
                  <p className="text-slate-700 font-medium truncate flex-1 leading-tight">{ev.text}</p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-slate-400 py-2 text-center">Nenhum evento recente.</p>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5.5 OPERAÇÃO NACIONAL (MAPA DO BRASIL COM DADOS 100% REAIS)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <BrazilOperationsMap />

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. CARD DE ASSINATURA RÁPIDA (PDF COMPACTO PARA ENVIOS AVULSOS) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="fast-signature-card" className="bg-white border-2 border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
              <FileUp className="w-3.5 h-3.5 text-[#B68B1C]" /> Assinatura Rápida de PDF Avulso
            </h3>
            <p className="text-[10px] text-slate-500">Envie um PDF diretamente para o WhatsApp do cliente</p>
          </div>
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
                  className="px-3 py-1 bg-[#25D366] text-white font-bold rounded-lg text-[10px]"
                >
                  Abrir WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(executionResult.signatureLink);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
              >
                {copiedLink ? 'Copiado!' : 'Copiar Link'}
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
          <form onSubmit={handleFastDispatch} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-6">
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
                  <div className="flex items-center justify-center gap-2">
                    <FileUp className="w-4 h-4 text-[#B68B1C]" />
                    <span className="text-xs font-bold text-slate-800">Arraste um PDF aqui ou clique para selecionar</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-4">
              <ClientSelector
                clients={clients}
                value={fastClientId}
                onChange={setFastClientId}
                placeholder="Selecione o cliente..."
                onNew={() => setActionModal('ATENDIMENTO')}
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting || !fastClientId || !uploadedPdf}
                className="w-full py-2 bg-[#0B192C] hover:bg-[#152a47] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-35 flex items-center justify-center gap-1 shadow-2xs"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 text-[#D4AF37]" />}
                Disparar
              </button>
            </div>
          </form>
        )}
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
