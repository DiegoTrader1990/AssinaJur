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
  CheckCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Central de Disparo: Abas do Fluxo Correto
  const [activeTab, setActiveTab] = useState<'DRAG_DROP' | 'KIT' | 'CLIENT'>('DRAG_DROP');

  // DRAG & DROP PDF STATE
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SELEÇÃO DE CLIENTE & KIT (PADRÃO VAZIO PARA FORÇAR O FLUXO CORRETO DO ADVOGADO)
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedKitId, setSelectedKitId] = useState<string>('');
  const [docCustomTitle, setDocCustomTitle] = useState<string>('');

  // Quick Client Register State
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Execution Feedback State
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Search & Explorer state
  const [selectedProcess, setSelectedProcess] = useState<any>(null);

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
        if (procs.length > 0) setSelectedProcess(procs[0]);

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

  const totalFiles = useMemo(() => {
    return processes.reduce((acc, p) => acc + (p.documents?.length || 0) + (p.attachments?.length || 0), 0);
  }, [processes]);

  // DRAG & DROP HANDLERS FOR PDF UPLOAD
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

  // HANDLER PARA DISPARO RÁPIDO DO PDF OU KIT
  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setExecutionError('');
    setExecutionResult(null);

    try {
      if (activeTab === 'DRAG_DROP') {
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
      } else if (activeTab === 'KIT') {
        if (!selectedClientId) throw new Error('Selecione a cliente que receberá o Kit.');
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
      }

      // Refresh documents
      fetch('/api/documents').then((r) => r.json()).then((d) => setDocuments(d.documents || []));
    } catch (err: any) {
      setExecutionError(err.message || 'Erro ao processar disparo.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-8 pb-20">
      {/* 🚀 1. GIGANTE CENTRAL DE DISPARO RÁPIDO COM DRAG & DROP EM DESTAQUE (FLUXO CORRETO) */}
      <section className="relative overflow-hidden rounded-[38px] bg-gradient-to-br from-[#06101E] via-[#0A1D38] to-[#040D1A] text-white p-7 lg:p-9 shadow-[0_30px_70px_rgba(6,16,30,0.4)] border-2 border-[#D4AF37]/60 space-y-6">
        {/* Glow Ambient Gold Lights */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* TOPO DA CENTRAL: IDENTIFICAÇÃO DO ESCRITÓRIO E SELEÇÃO DE FLUXO */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#D4AF37] bg-amber-400/10 border border-amber-400/30 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {office?.name || 'Rodrigues & Soares Advocacia'}
                </span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Direct • OAB/BA 51.881 | 62.443
                </span>
              </div>
              <h1 className="font-heading text-2xl lg:text-3xl font-black text-white tracking-tight mt-1">
                Central de Disparo Rápido &amp; Assinaturas
              </h1>
              <p className="text-xs lg:text-sm text-slate-300 max-w-3xl leading-relaxed">
                Arraste um documento em PDF do seu computador ou escolha um Kit Jurídico para enviar direto para o celular da cliente.
              </p>
            </div>

            {/* ABAS DO FLUXO DE TRABALHO */}
            <div className="grid grid-cols-3 gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/15 text-xs font-black shrink-0">
              <button
                onClick={() => {
                  setActiveTab('DRAG_DROP');
                  setExecutionResult(null);
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'DRAG_DROP'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#C59B27] text-[#06101E] font-black shadow-lg scale-[1.02]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileUp className="w-4 h-4" /> Arrastar PDF do PC
              </button>

              <button
                onClick={() => {
                  setActiveTab('KIT');
                  setExecutionResult(null);
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'KIT'
                    ? 'bg-white text-[#06101E] font-black shadow-lg scale-[1.02]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Disparar Kit 10s
              </button>

              <button
                onClick={() => {
                  setActiveTab('CLIENT');
                  setExecutionResult(null);
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'CLIENT'
                    ? 'bg-emerald-500 text-white font-black shadow-lg scale-[1.02]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <UserPlus className="w-4 h-4" /> Nova Cliente
              </button>
            </div>
          </div>

          {/* PAINEL EXPANSIVO PRINCIPAL COM FEEDBACK DE EXECUÇÃO */}
          {executionResult ? (
            <div className="bg-emerald-950/90 border-2 border-emerald-500/60 rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-white text-lg">
                      {executionResult.type === 'SINGLE_DOC'
                        ? `Documento Pronto para ${executionResult.clientName}!`
                        : executionResult.type === 'KIT'
                        ? `Kit Jurídico Gerado para ${executionResult.clientName}!`
                        : `Cliente ${executionResult.clientName} Cadastrada!`}
                    </h3>
                    <p className="text-xs text-emerald-300">
                      {executionResult.type === 'CLIENT'
                        ? `Qualificação salva com sucesso. Selecione a cliente na aba acima para disparar os documentos.`
                        : `Link seguro de assinatura digital via WhatsApp gerado instantaneamente.`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setExecutionResult(null);
                    setUploadedPdf(null);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {executionResult.signatureLink && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  {executionResult.clientPhone ? (
                    <a
                      href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá ${executionResult.clientName}! Seus documentos jurídicos estão prontos para assinatura digital. Acesse o link seguro no seu celular: ${executionResult.signatureLink}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-7 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      <MessageSquare className="w-4 h-4 fill-white" /> DISPARAR MENSAGEM NO WHATSAPP DA CLIENTE
                    </a>
                  ) : (
                    <div className="text-xs text-amber-300 bg-amber-950/60 px-4 py-3 rounded-xl">
                      ⚠️ Cliente sem telefone cadastrado. Copie o link abaixo para enviar manualmente.
                    </div>
                  )}

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(executionResult.signatureLink);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="w-full sm:w-auto px-6 py-4 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" /> Link Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[#D4AF37]" /> Copiar Link de Assinatura
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleExecuteDispatch} className="space-y-4">
              {/* FLUXO 1: DRAG & DROP GIGANTE DO PDF */}
              {activeTab === 'DRAG_DROP' && (
                <div className="space-y-4">
                  {/* ÁREA DE SOLTAR O ARQUIVO DO COMPUTADOR */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-7 text-center cursor-pointer transition-all ${
                      dragActive
                        ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
                        : uploadedPdf
                        ? 'border-emerald-500/60 bg-emerald-950/40'
                        : 'border-white/25 bg-slate-900/60 hover:border-amber-400/80 hover:bg-slate-900/90'
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
                      <div className="py-4 space-y-2">
                        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
                        <p className="text-xs font-extrabold text-amber-300">Carregando PDF do computador...</p>
                      </div>
                    ) : uploadedPdf ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 font-black">
                            <File className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">{uploadedPdf.name}</p>
                            <p className="text-[11px] text-emerald-400 font-bold">
                              ✓ PDF Pronto ({(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-xl">
                          Clique se quiser trocar o PDF
                        </span>
                      </div>
                    ) : (
                      <div className="py-5 space-y-2">
                        <FileUp className="w-12 h-12 text-[#D4AF37] mx-auto animate-bounce" />
                        <p className="text-sm font-black text-white">
                          Arraste e solte o contrato em PDF aqui do seu computador
                        </p>
                        <p className="text-xs text-slate-300">
                          ou <span className="text-[#D4AF37] underline font-bold">clique para selecionar o arquivo no Windows</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FLUXO LÓGICO DE SELEÇÃO DE CLIENTE (PADRÃO VAZIO PARA O ADVOGADO ESCOLHER) */}
                  <div className="grid md:grid-cols-[1.5fr_1.5fr_auto] items-end gap-3 bg-slate-900/90 border border-white/15 p-5 rounded-3xl">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center justify-between">
                        <span>1. Selecionar Cliente (Para quem enviar?)</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('CLIENT')}
                          className="text-[10px] font-bold text-blue-300 hover:underline"
                        >
                          + Cadastrar Nova
                        </button>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none"
                        >
                          <option value="" className="bg-slate-900 text-slate-400">
                            -- Selecione a cliente na lista --
                          </option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                              {c.name} {c.cpfCnpj ? `(CPF: ${c.cpfCnpj})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                        2. Título da Peça / Contrato
                      </label>
                      <input
                        type="text"
                        value={docCustomTitle}
                        onChange={(e) => setDocCustomTitle(e.target.value)}
                        placeholder="Ex: Procuração e Contrato de Honorários"
                        className="w-full px-4 py-3 bg-slate-950 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !uploadedPdf || !selectedClientId}
                      className="w-full md:w-auto px-7 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#E5C365] to-[#C59B27] hover:brightness-110 text-[#06101E] font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 shrink-0"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-[#06101E]" /> DISPARAR NO WHATSAPP DA CLIENTE
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* FLUXO 2: DISPARO DE KIT JURÍDICO (PADRÃO CLIENTE VAZIA) */}
              {activeTab === 'KIT' && (
                <div className="grid md:grid-cols-[1.5fr_1.5fr_auto] items-end gap-4 bg-slate-900/90 border border-white/15 p-6 rounded-3xl space-y-0">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center justify-between">
                      <span>1. Selecionar Cliente</span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('CLIENT')}
                        className="text-[10px] font-bold text-blue-300 hover:underline"
                      >
                        + Cadastrar Nova Cliente
                      </button>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">
                          -- Selecione a cliente na lista --
                        </option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                            {c.name} {c.cpfCnpj ? `(CPF: ${c.cpfCnpj})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37]">
                      2. Kit Jurídico Completo
                    </label>
                    <div className="relative">
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                      <select
                        value={selectedKitId}
                        onChange={(e) => setSelectedKitId(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none"
                      >
                        {kits.map((k) => (
                          <option key={k.id} value={k.id} className="bg-slate-900 text-white">
                            {k.name} ({k.items?.length || 3} documentos automáticos)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedClientId || !selectedKitId}
                    className="w-full md:w-auto px-7 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#E5C365] to-[#C59B27] hover:brightness-110 text-[#06101E] font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 shrink-0"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Gerando Kit...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> DISPARAR KIT COMPLETO
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* FLUXO 3: CADASTRO EXPRESS DE CLIENTE */}
              {activeTab === 'CLIENT' && (
                <div className="grid sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_auto] items-end gap-3 bg-slate-900/90 border border-white/15 p-6 rounded-3xl">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      Nome Completo da Cliente
                    </label>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Ex: Maria das Graças Silva"
                      className="w-full px-4 py-3 bg-slate-950 border border-white/20 focus:border-emerald-400 rounded-2xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-400">CPF</label>
                    <input
                      type="text"
                      value={newClientCpf}
                      onChange={(e) => setNewClientCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-4 py-3 bg-slate-950 border border-white/20 focus:border-emerald-400 rounded-2xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-400">WhatsApp / Celular</label>
                    <input
                      type="text"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="(71) 99999-9999"
                      className="w-full px-4 py-3 bg-slate-950 border border-white/20 focus:border-emerald-400 rounded-2xl text-xs font-bold text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Cadastrar Cliente
                  </button>
                </div>
              )}
            </form>
          )}

          {executionError && (
            <p className="text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40 px-4 py-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> {executionError}
            </p>
          )}
        </div>
      </section>

      {/* 2. REGISTRO DE RESUMO OPERACIONAL (4 CARDS DE INDICADORES) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/clientes"
          className="bg-white border border-slate-200 hover:border-amber-400 p-5 rounded-3xl transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#B68B1C]">Clientes</span>
            <Users className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl lg:text-3xl font-black font-heading text-[#071B3A] mt-2">
            {metricValue(clients.length)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">cadastros na base</p>
        </Link>

        <Link
          href="/documentos"
          className="bg-white border border-slate-200 hover:border-amber-400 p-5 rounded-3xl transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Em Assinatura</span>
            <FileSignature className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl lg:text-3xl font-black font-heading text-amber-600 mt-2">
            {metricValue(pendingDocuments.length)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">aguardando clientes</p>
        </Link>

        <Link
          href="/processos"
          className="bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-3xl transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">Dossiês Ativos</span>
            <Folder className="w-4 h-4 text-blue-500 fill-blue-500/20 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl lg:text-3xl font-black font-heading text-[#071B3A] mt-2">
            {metricValue(processes.length)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{totalFiles} PDFs em pastas</p>
        </Link>

        <Link
          href="/documentos"
          className="bg-white border border-slate-200 hover:border-emerald-400 p-5 rounded-3xl transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Concluídos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl lg:text-3xl font-black font-heading text-emerald-700 mt-2">
            {metricValue(completedDocuments.length)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">com validade ICP-Brasil</p>
        </Link>
      </section>

      {/* 3. PAINEL INTEGRADO EM 2 COLUNAS DE ALTO EQUILÍBRIO: ASSINATURAS & DOSSIÊS WINDOWS */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* ESQUERDA: CENTRAL DE ASSINATURAS E DISPARO DE COBRANÇA */}
        <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                  Acompanhamento de Formalizações
                </p>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Assinaturas Aguardando Clientes
                </h3>
              </div>
              <Link href="/documentos" className="text-xs font-bold text-blue-700 hover:underline">
                Ver todas ({pendingDocuments.length})
              </Link>
            </div>

            {pendingDocuments.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-2">
                {pendingDocuments.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <h4 className="text-xs font-black text-[#071B3A] truncate">{doc.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {doc.client?.name || 'Cliente pendente'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {(doc.client?.phone || doc.client?.whatsapp) && (
                        <a
                          href={`https://wa.me/55${(doc.client?.phone || doc.client?.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá! Lembrando da assinatura do documento "${doc.title}". Link para assinar direto no celular: https://www.assinajur.com.br/assinar/${doc.token}`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Disparar WhatsApp
                        </a>
                      )}
                      <Link
                        href="/documentos"
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#071B3A] rounded-xl text-xs font-bold"
                      >
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-[#071B3A]">Nenhuma assinatura pendente no momento.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Todos os documentos enviados até agora foram concluídos pelos clientes com sucesso.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DIREITA: DOSSIÊS DO WINDOWS EXPLORER (PASTAS AMARELAS) */}
        <div className="bg-[#FBFCFE] border border-slate-200/90 rounded-[32px] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                  Windows Explorer
                </p>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Dossiês Ativos de Processos
                </h3>
              </div>
              <Link href="/processos" className="text-xs font-bold text-blue-700 hover:underline">
                Abrir Central 📁
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {processes.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href="/processos"
                  className="group flex items-center justify-between bg-white border border-slate-200 hover:border-amber-400 p-3.5 rounded-2xl shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0">
                      <Folder className="w-5.5 h-5.5 text-amber-600 fill-amber-500/30" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-[#071B3A] truncate">{p.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {p.client?.name || 'Cliente'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full shrink-0">
                    {(p.documents?.length || 0) + (p.attachments?.length || 0)} PDFs
                  </span>
                </Link>
              ))}

              {!processes.length && (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Folder className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Nenhum processo ativo no momento.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80">
            <Link
              href="/processos"
              className="w-full py-3 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 rounded-2xl text-xs font-extrabold text-amber-900 flex items-center justify-center gap-2 transition-all"
            >
              <Folder className="w-4 h-4 text-amber-600 fill-amber-500/30" /> Navegar pelas Pastas dos Processos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
