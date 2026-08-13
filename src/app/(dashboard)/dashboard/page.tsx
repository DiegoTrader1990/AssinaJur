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
  Scale,
  Briefcase,
  FolderCheck,
  HardDrive,
  FileCheck2,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Central Dinâmica (Lado Direito da Central): 'KIT' | 'CLIENT' | 'PROCESS'
  const [rightPanelTab, setRightPanelTab] = useState<'KIT' | 'CLIENT' | 'PROCESS'>('KIT');

  // Filtros do Cockpit de Casos (Por Área & Situação)
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedSituation, setSelectedSituation] = useState<string>('ALL');

  // Seleções do Advogado (Padrão Vazio)
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedKitId, setSelectedKitId] = useState<string>('');
  const [docCustomTitle, setDocCustomTitle] = useState<string>('');

  // Drag & Drop State (Lado Esquerdo Fixo Fixo e Elegante)
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form de Cadastro Qualificado Express de Cliente
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientRg, setNewClientRg] = useState('');
  const [newClientCivilStatus, setNewClientCivilStatus] = useState('Solteiro(a)');
  const [newClientProfession, setNewClientProfession] = useState('Autônomo(a)');

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

  const completedDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'CONCLUIDO'),
    [documents],
  );

  const pendingDocuments = useMemo(
    () => documents.filter((doc) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(doc.status)),
    [documents],
  );

  const totalFiles = useMemo(() => {
    return processes.reduce((acc, p) => acc + (p.documents?.length || 0) + (p.attachments?.length || 0), 0);
  }, [processes]);

  // DRAG & DROP HANDLERS (DROP FIXO NA ESQUERDA)
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

  // HANDLER PARA DISPARO DO PDF ARRASTADO NO LADO ESQUERDO
  const handleDispatchPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setExecutionError('');
    setExecutionResult(null);

    try {
      if (!uploadedPdf) throw new Error('Arraste ou selecione um arquivo PDF primeiro.');
      if (!selectedClientId) throw new Error('Selecione a cliente destinatária.');

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

      fetch('/api/documents').then((r) => r.json()).then((d) => setDocuments(d.documents || []));
    } catch (err: any) {
      setExecutionError(err.message || 'Erro ao processar disparo.');
    } finally {
      setSubmitting(false);
    }
  };

  // HANDLER PARA PAINEL DA DIREITA (KIT, CLIENTE OU DOSSIÊ)
  const handleExecuteRightPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setExecutionError('');
    setExecutionResult(null);

    try {
      if (rightPanelTab === 'KIT') {
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
      } else if (rightPanelTab === 'CLIENT') {
        if (!newClientName.trim()) throw new Error('Informe o nome completo da cliente.');
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClientName,
            cpfCnpj: newClientCpf,
            phone: newClientPhone,
            whatsapp: newClientPhone,
            rg: newClientRg,
            civilStatus: newClientCivilStatus,
            profession: newClientProfession,
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
        setNewClientRg('');
      } else if (rightPanelTab === 'PROCESS') {
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

  // FILTRAGEM DE CLIENTES POR ÁREA E SITUAÇÃO
  const filteredClientsList = useMemo(() => {
    return clients.filter((client) => {
      const clientDocs = documents.filter((d) => d.clientId === client.id);
      const clientProc = processes.find((p) => p.clientId === client.id);

      // Filtro por Situação
      if (selectedSituation === 'PRE' && clientDocs.every((d) => d.status !== 'CONCLUIDO')) {
        return true;
      }
      if (selectedSituation === 'PROTOCOLADO' && !clientProc) {
        return false;
      }
      if (selectedSituation === 'DONE' && clientDocs.length > 0 && clientDocs.every((d) => d.status === 'CONCLUIDO')) {
        return true;
      }
      if (selectedSituation !== 'ALL' && selectedSituation === 'PRE' && clientDocs.some((d) => d.status === 'CONCLUIDO')) {
        return false;
      }

      return true;
    });
  }, [clients, documents, processes, selectedSituation]);

  const selectedKit = useMemo(
    () => kits.find((k) => k.id === selectedKitId),
    [kits, selectedKitId],
  );

  const doctorName = currentUser?.name || 'Dr. Diego dos Santos Rodrigues';
  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-8 pb-24">
      {/* 👑 1. SAUDAÇÃO PERSONALIZADA AO ADVOGADO */}
      <section className="bg-white border border-slate-200/90 rounded-[32px] p-6 lg:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#B68B1C] bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#B68B1C]" />
              {office?.name || 'Rodrigues & Soares Advocacia'}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> OAB/BA 51.881 | 62.443 • Notarial ICP-Brasil
            </span>
          </div>

          <h1 className="font-heading text-2xl lg:text-3xl font-black text-[#071B3A] tracking-tight">
            Olá, {doctorName}! ⚖️
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 max-w-3xl leading-relaxed">
            Painel Notarial do Escritório. Solte um documento em PDF na caixa fixa à esquerda ou dispare Kits Jurídicos completos no WhatsApp das clientes à direita.
          </p>
        </div>

        {/* 4 CARDS RESUMO DO ESCRITÓRIO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-center min-w-[105px]">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Base Clientes</p>
            <p className="text-xl font-black font-heading text-[#071B3A]">{metricValue(clients.length)}</p>
          </div>
          <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl text-center min-w-[105px]">
            <p className="text-[10px] font-bold text-amber-800 uppercase">Em Assinatura</p>
            <p className="text-xl font-black font-heading text-amber-600">{metricValue(pendingDocuments.length)}</p>
          </div>
          <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-2xl text-center min-w-[105px]">
            <p className="text-[10px] font-bold text-blue-800 uppercase">Dossiês Windows</p>
            <p className="text-xl font-black font-heading text-blue-700">{metricValue(processes.length)}</p>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl text-center min-w-[105px]">
            <p className="text-[10px] font-bold text-emerald-800 uppercase">Concluídos</p>
            <p className="text-xl font-black font-heading text-emerald-700">{metricValue(completedDocuments.length)}</p>
          </div>
        </div>
      </section>

      {/* 🚀 2. CENTRAL DE OPERAÇÕES EM 2 COLUNAS: DROP FIXO NA ESQUERDA & PAINEL DINÂMICO NA DIREITA */}
      <section className="grid lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA (5 COLUNAS): DROP ZONE FIXO E COMPACTO DE PDF DO COMPUTADOR */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-[32px] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">
                <FileUp className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-heading font-black text-[#071B3A] text-sm">1. Arrastar PDF do Computador (Fixo)</h3>
                <p className="text-[11px] text-slate-500">Envio direto de qualquer petição/contrato avulso</p>
              </div>
            </div>

            {/* CAIXA COMPACTA DE DROP FIXA */}
            <form onSubmit={handleDispatchPdf} className="space-y-3">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-amber-500 bg-amber-50/90 scale-[1.005]'
                    : uploadedPdf
                    ? 'border-emerald-500 bg-emerald-50/70'
                    : 'border-slate-300 bg-slate-50/70 hover:border-amber-500 hover:bg-amber-50/40'
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
                  <div className="py-2 space-y-1">
                    <Loader2 className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
                    <p className="text-[11px] font-bold text-amber-900">Processando PDF...</p>
                  </div>
                ) : uploadedPdf ? (
                  <div className="flex items-center justify-between text-left gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{uploadedPdf.name}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">
                          ✓ Ready ({(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                      Trocar
                    </span>
                  </div>
                ) : (
                  <div className="py-3 space-y-1">
                    <FileUp className="w-8 h-8 text-[#B68B1C] mx-auto" />
                    <p className="text-xs font-black text-slate-800">
                      Solte o contrato PDF do seu Windows aqui
                    </p>
                    <p className="text-[11px] text-slate-500">
                      ou <span className="text-amber-700 font-bold underline">procure nas suas pastas</span>
                    </p>
                  </div>
                )}
              </div>

              {/* DADOS DE ENVIO COMPACTOS */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-700">Cliente Destinatária</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
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

                <input
                  type="text"
                  value={docCustomTitle}
                  onChange={(e) => setDocCustomTitle(e.target.value)}
                  placeholder="Título da peça (Ex: Procuração Ad Judicia)"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={submitting || !uploadedPdf || !selectedClientId}
                  className="w-full py-3 bg-[#071B3A] hover:bg-[#0A254F] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-[#D4AF37]" />} DISPARAR PDF NO WHATSAPP
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA (7 COLUNAS): PAINEL DINÂMICO QUE MUDA (KIT JURÍDICO | CADASTRO QUALIFICADO | DOSSIÊ) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-[32px] p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* TABS DE ALTERNAÇÃO DO LADO DIREITO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-black text-[#071B3A] text-sm">2. Fluxo Notarial Avançado</h3>
                <p className="text-[11px] text-slate-500">Alterne entre disparo de Kits, cadastro e dossiês</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-extrabold shrink-0">
                <button
                  onClick={() => {
                    setRightPanelTab('KIT');
                    setExecutionResult(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    rightPanelTab === 'KIT' ? 'bg-[#071B3A] text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 inline mr-1" /> Kit 10s
                </button>

                <button
                  onClick={() => {
                    setRightPanelTab('CLIENT');
                    setExecutionResult(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    rightPanelTab === 'CLIENT' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1" /> Cadastro Express
                </button>

                <button
                  onClick={() => {
                    setRightPanelTab('PROCESS');
                    setExecutionResult(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    rightPanelTab === 'PROCESS' ? 'bg-amber-500 text-[#071B3A] font-black shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 inline mr-1 fill-[#071B3A]/20" /> Novo Dossiê
                </button>
              </div>
            </div>

            {/* CONTEÚDO DINÂMICO QUE MUDA NO LADO DIREITO */}
            <form onSubmit={handleExecuteRightPanel} className="space-y-3">
              {/* MODO 1: KIT JURÍDICO COMPLETO */}
              {rightPanelTab === 'KIT' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-700">1. Selecionar Cliente</label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
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

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-700">2. Kit Jurídico Completo</label>
                      <select
                        value={selectedKitId}
                        onChange={(e) => setSelectedKitId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {kits.map((k) => (
                          <option key={k.id} value={k.id} className="text-slate-900">
                            {k.name} ({k.items?.length || 3} papéis inclusos)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedKit && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] font-extrabold uppercase text-slate-500">Documentos inclusos no Kit:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedKit.items?.map((item: any, i: number) => (
                          <span key={i} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md">
                            ✓ {item.template?.title || `Doc ${i + 1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !selectedClientId || !selectedKitId}
                    className="w-full py-3.5 bg-gradient-to-r from-[#071B3A] to-[#0A254F] hover:brightness-110 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />} DISPARAR KIT COMPLETO NO WHATSAPP
                  </button>
                </div>
              )}

              {/* MODO 2: CADASTRO QUALIFICADO APRIMORADO DA CLIENTE */}
              {rightPanelTab === 'CLIENT' && (
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-700">Nome Completo da Cliente</label>
                      <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Ex: Maria das Graças Silva"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-700">CPF</label>
                      <input
                        type="text"
                        value={newClientCpf}
                        onChange={(e) => setNewClientCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-700">WhatsApp / Celular</label>
                      <input
                        type="text"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        placeholder="(71) 99999-9999"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-slate-700">RG / Documento</label>
                      <input
                        type="text"
                        value={newClientRg}
                        onChange={(e) => setNewClientRg(e.target.value)}
                        placeholder="00.000.000-00 SSP/BA"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} SALVAR CLIENTE QUALIFICADA &amp; HABILITAR ENVIO
                  </button>
                </div>
              )}

              {/* MODO 3: NOVO DOSSIÊ NO WINDOWS EXPLORER */}
              {rightPanelTab === 'PROCESS' && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div>
                    <h4 className="font-heading font-black text-[#071B3A] text-xs">Criar Dossiê Padronizado no Windows Explorer</h4>
                    <p className="text-[11px] text-slate-500">Cria a pasta oficial da cliente com 4 subpastas automáticas de documentos.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-[#071B3A] font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
                  >
                    <Folder className="w-4 h-4 fill-[#071B3A]/20" /> CRIAR PASTA DOSSIÊ 📁
                  </button>
                </div>
              )}
            </form>

            {/* FEEDBACK DIREITO */}
            {executionResult && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-black">✓ {executionResult.clientName} selecionada/qualificada com sucesso!</p>
                  <button onClick={() => setExecutionResult(null)} className="text-emerald-700 font-bold">X</button>
                </div>

                {executionResult.signatureLink && (
                  <div className="flex items-center gap-2 pt-1">
                    {executionResult.clientPhone && (
                      <a
                        href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá ${executionResult.clientName}! Seus documentos jurídicos estão prontos: ${executionResult.signatureLink}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3 fill-white" /> Disparar WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => setShowQrModal(true)}
                      className="px-2.5 py-1.5 bg-amber-200 text-amber-900 font-bold rounded-lg text-[11px]"
                    >
                      QR Code
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ⚖️ 3. COCKPIT COMPLETO DE CASOS DA CARTEIRA (FILTROS POR ÁREA JURÍDICA E SITUAÇÃO OPERACIONAL) */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* ESQUERDA: CARTEIRA DE CLIENTES COM FILTROS DE SITUAÇÃO OPERACIONAL */}
        <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 lg:p-7 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">
                  Gestão Notarial da Carteira
                </span>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Casos &amp; Situação dos Atendimentos
                </h3>
              </div>

              {/* FILTROS POR SITUAÇÃO OPERACIONAL */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                <button
                  onClick={() => setSelectedSituation('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedSituation === 'ALL' ? 'bg-white text-[#071B3A] font-black shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Todos ({clients.length})
                </button>

                <button
                  onClick={() => setSelectedSituation('PRE')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedSituation === 'PRE' ? 'bg-white text-amber-800 font-black shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  📜 Coleta Docs
                </button>

                <button
                  onClick={() => setSelectedSituation('PROTOCOLADO')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedSituation === 'PROTOCOLADO' ? 'bg-white text-blue-800 font-black shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  🏛️ Protocolados
                </button>
              </div>
            </div>

            {/* CARDS RICOS DAS CLIENTES */}
            {filteredClientsList.length > 0 ? (
              <div className="space-y-3 mt-4">
                {filteredClientsList.slice(0, 4).map((client) => {
                  const clientDocs = documents.filter((d) => d.clientId === client.id);
                  const clientProc = processes.find((p) => p.clientId === client.id);
                  const allSigned = clientDocs.length > 0 && clientDocs.every((d) => d.status === 'CONCLUIDO');

                  return (
                    <div
                      key={client.id}
                      className="bg-slate-50/80 border border-slate-200/90 hover:border-amber-300 p-4 rounded-2xl transition-all shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#071B3A] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-[#071B3A]">{client.name}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>CPF: {client.cpfCnpj || 'Não informado'}</span>
                              {client.phone && <span>• {client.phone}</span>}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full shrink-0 ${
                            allSigned
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {allSigned ? '✓ Kit Assinado Notarial' : `${clientDocs.length} Docs no Fluxo`}
                        </span>
                      </div>

                      {/* BADGES DOS DOCUMENTOS VINCULADOS */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {clientDocs.length > 0 ? (
                          clientDocs.map((doc) => (
                            <span
                              key={doc.id}
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1 ${
                                doc.status === 'CONCLUIDO'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {doc.status === 'CONCLUIDO' ? '✓' : '⏳'} {doc.title}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Nenhum documento gerado ainda.</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {clientProc ? `📁 Dossiê: ${clientProc.title}` : 'Sem pasta de processo'}
                        </span>

                        <div className="flex items-center gap-2">
                          {(client.phone || client.whatsapp) && (
                            <a
                              href={`https://wa.me/55${(client.phone || client.whatsapp).replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 transition-all"
                            >
                              <MessageSquare className="w-3 h-3 fill-white" /> WhatsApp
                            </a>
                          )}

                          <Link
                            href="/clientes"
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-[#071B3A] rounded-lg text-[11px] font-bold"
                          >
                            Ficha Cliente
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <User className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-[#071B3A]">Nenhuma cliente nesta categoria.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Link
              href="/clientes"
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200/80 text-[#071B3A] text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              Acessar Carteira Completa de Clientes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* DIREITA: PASTA DOSSIÊ DE PROCESSOS NO WINDOWS EXPLORER */}
        <div className="bg-[#FBFCFE] border border-slate-200/90 rounded-[32px] p-6 lg:p-7 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">
                  Gerenciador Dossiê dos Processos
                </span>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Pastas Nativas do Windows Explorer
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
