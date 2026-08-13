'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSignature,
  FolderPlus,
  Plus,
  Send,
  Sparkles,
  Folder,
  User,
  ShieldCheck,
  Zap,
  MessageSquare,
  Building2,
  Search,
  FileText,
  Users,
  Grid,
  List,
  Award,
  ArrowUpRight,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  X,
  UserPlus,
  Upload,
  FileUp,
  File,
  QrCode,
  Smartphone,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  Eye,
  Filter,
  Layers,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Central de Operações Abas
  const [activeTab, setActiveTab] = useState<'KIT' | 'DRAG_DROP' | 'CLIENT' | 'PROCESS'>('KIT');

  // Filtro na Tabela de Formalizações
  const [formalizationFilter, setFormalizationFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('PENDING');

  // Seleções do Advogado (Padrão Vazio)
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedKitId, setSelectedKitId] = useState<string>('');
  const [docCustomTitle, setDocCustomTitle] = useState<string>('');

  // Drag & Drop State
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form de Cadastro Express de Cliente
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Execution Feedback State
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Explorer State
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, officeData, clientData, documentData, processData, kitData]) => {
        if (userData?.user) setCurrentUser(userData.user);
        if (officeData?.office) setOffice(officeData.office);

        setClients(clientData?.clients || []);
        setDocuments(documentData?.documents || []);

        const procs = processData?.processes || [];
        setProcesses(procs);
        if (procs.length > 0) setExpandedFolderId(procs[0].id);

        const loadedKits = kitData?.kits || [];
        setKits(loadedKits);
        if (loadedKits.length > 0) setSelectedKitId(loadedKits[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pendingDocuments = useMemo(
    () => documents.filter((doc) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(doc.status)),
    [documents],
  );

  const completedDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'CONCLUIDO'),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    if (formalizationFilter === 'PENDING') return pendingDocuments;
    if (formalizationFilter === 'DONE') return completedDocuments;
    return documents;
  }, [documents, pendingDocuments, completedDocuments, formalizationFilter]);

  const totalFiles = useMemo(() => {
    return processes.reduce((acc, p) => acc + (p.documents?.length || 0) + (p.attachments?.length || 0), 0);
  }, [processes]);

  // DRAG & DROP HANDLERS
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setExecutionError('Por favor, envie um arquivo no formato PDF.');
      return;
    }

    setUploadingPdf(true);
    setExecutionError('');
    setDocCustomTitle(file.name.replace(/\.pdf$/i, ''));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar PDF.');

      setUploadedPdf(data.file);
    } catch (err: any) {
      setExecutionError(err.message || 'Falha ao processar upload do PDF.');
    } finally {
      setUploadingPdf(false);
    }
  };

  // HANDLER DISPARO RÁPIDO
  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setExecutionError('');
    setExecutionResult(null);

    try {
      if (activeTab === 'KIT') {
        if (!selectedClientId) throw new Error('Selecione uma cliente para receber o Kit.');
        if (!selectedKitId) throw new Error('Selecione o Kit Jurídico.');

        const res = await fetch('/api/kits/generate-package', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedClientId,
            kitId: selectedKitId,
            variables: { valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%' },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao disparar kit.');

        const clientObj = clients.find((c) => c.id === selectedClientId);
        setExecutionResult({
          type: 'KIT',
          clientName: data.result.clientName,
          clientPhone: clientObj?.phone || clientObj?.whatsapp || '',
          kitName: data.result.kitName,
          documentsCount: data.result.documentsCount,
          signatureLink: data.result.signatureLink,
        });
      } else if (activeTab === 'DRAG_DROP') {
        if (!uploadedPdf) throw new Error('Arraste ou selecione um arquivo PDF primeiro.');
        if (!selectedClientId) throw new Error('Selecione a cliente que vai assinar o documento.');

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: docCustomTitle || uploadedPdf.name,
            clientId: selectedClientId,
            fileId: uploadedPdf.id,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar documento.');

        const clientObj = clients.find((c) => c.id === selectedClientId);
        setExecutionResult({
          type: 'SINGLE_DOC',
          clientName: clientObj?.name || 'Cliente',
          clientPhone: clientObj?.phone || clientObj?.whatsapp || '',
          docTitle: data.document.title,
          signatureLink: `https://www.assinajur.com.br/assinar/${data.document.token}`,
        });
      } else if (activeTab === 'CLIENT') {
        if (!newClientName.trim()) throw new Error('Informe o nome completo da cliente.');
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClientName,
            cpfCnpj: newClientCpf,
            phone: newClientPhone,
            whatsapp: newClientPhone,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente.');

        const updatedClientsRes = await fetch('/api/clients').then((r) => r.json());
        if (updatedClientsRes?.clients) {
          setClients(updatedClientsRes.clients);
          setSelectedClientId(data.client.id);
        }

        setExecutionResult({
          type: 'CLIENT',
          clientName: data.client.name,
        });
        setNewClientName('');
        setNewClientCpf('');
        setNewClientPhone('');
      } else if (activeTab === 'PROCESS') {
        if (!selectedClientId) throw new Error('Selecione a cliente para criar o dossiê.');
        window.location.href = `/processos?novo=true&clientId=${selectedClientId}`;
        return;
      }

      fetch('/api/documents').then((r) => r.json()).then((d) => setDocuments(d.documents || []));
    } catch (err: any) {
      setExecutionError(err.message || 'Erro ao processar.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const selectedKit = useMemo(
    () => kits.find((k) => k.id === selectedKitId),
    [kits, selectedKitId],
  );

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-8 pb-24">
      {/* 👑 1. HEADER DO PAINEL PRINCIPAL (TOTALMENTE ACOPLADO E INTEGRADO AO DESIGN DO SITE) */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-[28px] p-6 lg:p-7 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#B68B1C] bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#B68B1C]" />
              {office?.name || 'Rodrigues & Soares Advocacia'}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Notarial ICP-Brasil
            </span>
          </div>
          <h1 className="font-heading text-2xl lg:text-3xl font-black text-[#071B3A] tracking-tight mt-1">
            Painel Operacional do Escritório
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Gestão integrada de disparos para WhatsApp, formalizações com validade jurídica e dossiês de clientes.
          </p>
        </div>

        {/* 4 CARDS DE INDICADORES COMPACTOS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Clientes</p>
            <p className="text-xl font-black font-heading text-[#071B3A]">{metricValue(clients.length)}</p>
          </div>
          <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-amber-800 uppercase">Aguardando</p>
            <p className="text-xl font-black font-heading text-amber-600">{metricValue(pendingDocuments.length)}</p>
          </div>
          <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-2xl text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-blue-800 uppercase">Dossiês</p>
            <p className="text-xl font-black font-heading text-blue-700">{metricValue(processes.length)}</p>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl text-center min-w-[100px]">
            <p className="text-[10px] font-bold text-emerald-800 uppercase">Concluídos</p>
            <p className="text-xl font-black font-heading text-emerald-700">{metricValue(completedDocuments.length)}</p>
          </div>
        </div>
      </section>

      {/* 🚀 2. CENTRAL DE OPERAÇÕES & DISPAROS (DESIGN ACOPLADO NATIVO AO SITE) */}
      <section className="bg-white border border-slate-200/90 rounded-[32px] p-6 lg:p-8 shadow-xs space-y-6">
        {/* NAVEGAÇÃO DE ABAS NATIVA (STYLE PILL BUTTONS NATIVOS) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <Zap className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div>
              <h2 className="font-heading font-black text-[#071B3A] text-lg">Central de Atendimento Rápido</h2>
              <p className="text-xs text-slate-500">Selecione o fluxo desejado para disparar no WhatsApp da cliente</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 text-xs font-extrabold shrink-0">
            <button
              onClick={() => {
                setActiveTab('KIT');
                setExecutionResult(null);
              }}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'KIT'
                  ? 'bg-[#071B3A] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Disparar Kit 10s
            </button>

            <button
              onClick={() => {
                setActiveTab('DRAG_DROP');
                setExecutionResult(null);
              }}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'DRAG_DROP'
                  ? 'bg-[#071B3A] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 text-blue-400" /> Soltar PDF do PC
            </button>

            <button
              onClick={() => {
                setActiveTab('CLIENT');
                setExecutionResult(null);
              }}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'CLIENT'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Nova Cliente
            </button>

            <button
              onClick={() => {
                setActiveTab('PROCESS');
                setExecutionResult(null);
              }}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${
                activeTab === 'PROCESS'
                  ? 'bg-amber-500 text-[#071B3A] font-black shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Folder className="w-3.5 h-3.5 fill-[#071B3A]/20" /> Novo Dossiê
            </button>
          </div>
        </div>

        {/* FEEDBACK DE EXECUÇÃO */}
        {executionResult ? (
          <div className="bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-emerald-950 text-lg">
                    {executionResult.type === 'SINGLE_DOC'
                      ? `Documento Pronto para ${executionResult.clientName}!`
                      : executionResult.type === 'KIT'
                      ? `Kit Jurídico Gerado para ${executionResult.clientName}!`
                      : `Cliente ${executionResult.clientName} Cadastrada!`}
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    {executionResult.type === 'CLIENT'
                      ? `Qualificação armazenada com sucesso. Selecione a cliente no fluxo acima para disparar os documentos.`
                      : `Link seguro de assinatura digital notarial gerado e pronto para envio.`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setExecutionResult(null);
                  setUploadedPdf(null);
                }}
                className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {executionResult.signatureLink && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-emerald-200">
                {executionResult.clientPhone ? (
                  <a
                    href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá ${executionResult.clientName}! Seus documentos jurídicos do escritório Rodrigues & Soares estão prontos para assinatura digital. Acesse o link seguro no celular: ${executionResult.signatureLink}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    <MessageSquare className="w-4 h-4 fill-white" /> DISPARAR MENSAGEM NO WHATSAPP
                  </a>
                ) : (
                  <div className="text-xs font-bold text-amber-800 bg-amber-100 px-4 py-2.5 rounded-xl">
                    ⚠️ Cliente sem telefone cadastrado. Copie o link abaixo para enviar.
                  </div>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(executionResult.signatureLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-5 py-3.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" /> Link Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#B68B1C]" /> Copiar Link Seguro
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-4 py-3.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <QrCode className="w-4 h-4 text-amber-700" /> QR Code Presencial
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleExecuteDispatch} className="space-y-5">
            {/* FLUXO 1: DISPARO DE KIT JURÍDICO (PROCURAÇÃO + CONTRATO + HIPOSSUFICIÊNCIA) */}
            {activeTab === 'KIT' && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* SELEÇÃO DE CLIENTE (PADRÃO VAZIO) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span>1. Selecionar Cliente (Destinatária)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('CLIENT')}
                        className="text-[11px] font-extrabold text-blue-700 hover:underline"
                      >
                        + Cadastrar Nova
                      </button>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        <option value="" className="text-slate-400">
                          -- Selecione a cliente na lista --
                        </option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id} className="text-slate-900">
                            {c.name} {c.cpfCnpj ? `(CPF: ${c.cpfCnpj})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SELEÇÃO DE KIT JURÍDICO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Selecionar Kit Jurídico
                    </label>
                    <div className="relative">
                      <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                      <select
                        value={selectedKitId}
                        onChange={(e) => setSelectedKitId(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {kits.map((k) => (
                          <option key={k.id} value={k.id} className="text-slate-900">
                            {k.name} ({k.items?.length || 3} documentos inclusos)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* VISUALIZAÇÃO DOS DOCUMENTOS INCLUSOS */}
                {selectedKit && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-600" /> Documentos gerados automaticamente neste Kit:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedKit.items?.map((item: any, i: number) => (
                        <span key={i} className="text-[11px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-lg shadow-2xs">
                          ✓ {item.template?.title || `Documento ${i + 1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedClientId || !selectedKitId}
                  className="w-full py-3.5 bg-[#071B3A] hover:bg-[#0A254F] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.005] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Gerando Kit de Documentos...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" /> GERAR &amp; DISPARAR KIT COMPLETO NO WHATSAPP
                    </>
                  )}
                </button>
              </div>
            )}

            {/* FLUXO 2: SOLTAR PDF DO COMPUTADOR (DRAG & DROP NATIVO) */}
            {activeTab === 'DRAG_DROP' && (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-amber-500 bg-amber-50/80 scale-[1.005]'
                      : uploadedPdf
                      ? 'border-emerald-500 bg-emerald-50/60'
                      : 'border-slate-300 bg-slate-50/60 hover:border-amber-500 hover:bg-amber-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {uploadingPdf ? (
                    <div className="py-3 space-y-1.5">
                      <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-amber-900">Processando upload do PDF...</p>
                    </div>
                  ) : uploadedPdf ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                          <File className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{uploadedPdf.name}</p>
                          <p className="text-[11px] text-emerald-600 font-bold">
                            ✓ Arquivo PDF Carregado ({(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                        Clique para trocar arquivo
                      </span>
                    </div>
                  ) : (
                    <div className="py-4 space-y-1.5">
                      <FileUp className="w-10 h-10 text-amber-600 mx-auto animate-bounce" />
                      <p className="text-sm font-black text-slate-800">
                        Arraste e solte o contrato em PDF aqui do seu computador
                      </p>
                      <p className="text-xs text-slate-500">
                        ou <span className="text-amber-700 font-bold underline">clique para procurar no seu Windows</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-[1.5fr_1.5fr_auto] items-end gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      1. Cliente Destinatária
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="" className="text-slate-400">
                        -- Selecione a cliente na lista --
                      </option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id} className="text-slate-900">
                          {c.name} {c.cpfCnpj ? `(CPF: ${c.cpfCnpj})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Título da Peça / Contrato
                    </label>
                    <input
                      type="text"
                      value={docCustomTitle}
                      onChange={(e) => setDocCustomTitle(e.target.value)}
                      placeholder="Ex: Procuração Ad Judicia"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !uploadedPdf || !selectedClientId}
                    className="w-full md:w-auto px-6 py-3 bg-[#071B3A] hover:bg-[#0A254F] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-[#D4AF37]" />} DISPARAR NO WHATSAPP
                  </button>
                </div>
              </div>
            )}

            {/* FLUXO 3: CADASTRO EXPRESS DE CLIENTE */}
            {activeTab === 'CLIENT' && (
              <div className="grid sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_auto] items-end gap-3 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nome Completo da Cliente
                  </label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ex: Maria das Graças Silva"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">CPF</label>
                  <input
                    type="text"
                    value={newClientCpf}
                    onChange={(e) => setNewClientCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">WhatsApp / Celular</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="(71) 99999-9999"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Cadastrar Cliente
                </button>
              </div>
            )}

            {/* FLUXO 4: NOVO DOSSIÊ NO WINDOWS EXPLORER */}
            {activeTab === 'PROCESS' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                <div>
                  <h3 className="font-heading font-black text-[#071B3A] text-base">Criar Nova Pasta de Processo no Windows Explorer</h3>
                  <p className="text-xs text-slate-500">Crie a pasta padronizada da cliente com as 5 subpastas automáticas de documentos.</p>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-[#071B3A] font-black text-xs rounded-xl shadow-sm flex items-center gap-2 shrink-0"
                >
                  <Folder className="w-4 h-4 fill-[#071B3A]/20" /> Criar Pasta Dossiê 📁
                </button>
              </div>
            )}
          </form>
        )}

        {executionError && (
          <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {executionError}
          </p>
        )}
      </section>

      {/* 📊 3. SEÇÃO INFERIOR REFORMULADA EM 2 COLUNAS DE ALTO VALOR DE GESTÃO */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* ESQUERDA: REFORMULADO ACOMPANHAMENTO DE FORMALIZAÇÕES (CARDS INTERATIVOS NOTARIAIS) */}
        <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 lg:p-7 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">
                  Central Notarial de Acompanhamento
                </span>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Formalizações de Documentos
                </h3>
              </div>

              {/* FILTROS DE FORMALIZAÇÃO */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setFormalizationFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    formalizationFilter === 'PENDING' ? 'bg-white text-[#071B3A] shadow-2xs font-extrabold' : 'text-slate-600'
                  }`}
                >
                  Pendentes ({pendingDocuments.length})
                </button>

                <button
                  onClick={() => setFormalizationFilter('DONE')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    formalizationFilter === 'DONE' ? 'bg-white text-emerald-700 shadow-2xs font-extrabold' : 'text-slate-600'
                  }`}
                >
                  Concluídas ({completedDocuments.length})
                </button>
              </div>
            </div>

            {/* LISTA REFORMULADA DE FORMALIZAÇÕES */}
            {filteredDocuments.length > 0 ? (
              <div className="space-y-3 mt-4">
                {filteredDocuments.slice(0, 5).map((doc) => {
                  const isDone = doc.status === 'CONCLUIDO';
                  return (
                    <div
                      key={doc.id}
                      className="bg-slate-50/70 border border-slate-200/80 hover:border-amber-300 p-4 rounded-2xl transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                isDone ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                              }`}
                            />
                            <h4 className="text-xs font-black text-[#071B3A] truncate">{doc.title}</h4>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700">{doc.client?.name || 'Cliente'}</span>
                            {doc.client?.cpfCnpj && <span className="text-slate-400">({doc.client.cpfCnpj})</span>}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-3 py-1 rounded-full shrink-0 ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isDone ? '✓ Assinado ICP-Brasil' : '⏳ Aguardando Cliente'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock3 className="w-3 h-3" />
                          Enviado em {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </span>

                        <div className="flex items-center gap-2">
                          {!isDone && (doc.client?.phone || doc.client?.whatsapp) && (
                            <a
                              href={`https://wa.me/55${(doc.client?.phone || doc.client?.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Olá ${doc.client?.name}! Lembrando da assinatura do documento "${doc.title}". Link para assinar direto no celular: https://www.assinajur.com.br/assinar/${doc.token}`,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 shadow-2xs transition-all"
                            >
                              <MessageSquare className="w-3 h-3 fill-white" /> Disparar WhatsApp
                            </a>
                          )}

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://www.assinajur.com.br/assinar/${doc.token}`);
                              alert('Link de assinatura copiado!');
                            }}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3 text-[#B68B1C]" /> Link
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-[#071B3A]">Nenhuma formalização nesta categoria.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/documentos"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200/80 text-[#071B3A] text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Gerenciar Todas as Formalizações <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* DIREITA: REFORMULADO DOSSIÊ DE PROCESSOS (ÁRVORE DE PASTAS NATIVA ESTILO WINDOWS EXPLORER) */}
        <div className="bg-[#FBFCFE] border border-slate-200/90 rounded-[32px] p-6 lg:p-7 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">
                  Organizador Dossiê do Processo
                </span>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Pastas Estilo Windows Explorer
                </h3>
              </div>
              <Link href="/processos" className="text-xs font-bold text-blue-700 hover:underline">
                Abrir Central 📁
              </Link>
            </div>

            {/* ESTRUTURA DE PASTAS INTERATIVAS DO DOSSIÊ */}
            <div className="space-y-3 mt-4">
              {processes.slice(0, 4).map((p) => {
                const isExpanded = expandedFolderId === p.id;
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl shadow-2xs overflow-hidden transition-all"
                  >
                    {/* CABEÇALHO DA PASTA DO CLIENTE */}
                    <div
                      onClick={() => setExpandedFolderId(isExpanded ? null : p.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Folder className="w-5.5 h-5.5 fill-amber-500/30 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-[#071B3A] truncate">{p.title}</h4>
                          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            {p.client?.name || 'Cliente'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                          {(p.documents?.length || 0) + (p.attachments?.length || 0)} arquivos
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>

                    {/* CONTEÚDO DA PASTA COM SUBPASTAS AUTOMÁTICAS DO WINDOWS */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 border-t border-slate-100 p-3.5 space-y-2 text-xs animate-in fade-in duration-150">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Estrutura de Subpastas Padronizadas:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700">
                          <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center gap-2">
                            <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> 01. Doc Pessoais
                          </div>
                          <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center gap-2">
                            <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> 02. Procuração e Contrato
                          </div>
                          <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center gap-2">
                            <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> 03. Provas &amp; Hipossuficiência
                          </div>
                          <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center gap-2">
                            <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> 04. Peças Processuais
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Link
                            href="/processos"
                            className="text-[11px] font-extrabold text-blue-700 hover:underline flex items-center gap-1"
                          >
                            Abrir Pasta Completa no Explorer <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {!processes.length && (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Folder className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Nenhum dossiê de processo ativo no momento.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80">
            <Link
              href="/processos"
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-950 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Folder className="w-4 h-4 text-amber-600 fill-amber-500/20" /> Navegar pelas Pastas dos Processos
            </Link>
          </div>
        </div>
      </section>

      {/* MODAL QR CODE PRESENCIAL SE O ADVOGADO ESTIVER COM A CLIENTE NA MESA */}
      {showQrModal && executionResult?.signatureLink && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <QrCode className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-heading font-black text-[#071B3A] text-lg">Assinatura Presencial</h3>
              <p className="text-xs text-slate-500 mt-1">
                Peça para a cliente apontar a câmera do celular para o código abaixo para assinar na hora no seu escritório:
              </p>
            </div>

            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  executionResult.signatureLink,
                )}`}
                alt="QR Code Assinatura"
                className="w-48 h-48 rounded-xl shadow-xs"
              />
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-[#071B3A] text-white text-xs font-extrabold rounded-xl"
            >
              Concluir Atendimento Presencial
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
