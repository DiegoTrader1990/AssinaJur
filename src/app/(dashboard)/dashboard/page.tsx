'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Phone,
  FileSpreadsheet,
  Layers,
  ChevronDown,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Central de Disparo & Operações Rápidas (Modos Expansivos)
  const [activeAction, setActiveAction] = useState<'KIT' | 'DOC' | 'CLIENT' | 'PROCESS'>('KIT');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  
  // Quick Client Register State inside Dashboard
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Execution feedback state
  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Search & Explorer state
  const [searchTerm, setSearchTerm] = useState('');
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

        const loadedClients = clientData?.clients || [];
        setClients(loadedClients);
        if (loadedClients.length > 0) setSelectedClientId(loadedClients[0].id);

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

  // Handler para Execução das Ações da Central GIGANTE
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setExecutionError('');
    setExecutionResult(null);

    try {
      if (activeAction === 'KIT') {
        if (!selectedClientId) throw new Error('Selecione uma cliente.');
        if (!selectedKitId) throw new Error('Selecione um Kit Jurídico.');

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
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar kit.');
        setExecutionResult({ type: 'KIT', ...data.result });
      } else if (activeAction === 'CLIENT') {
        if (!newClientName.trim()) throw new Error('Informe o nome da cliente.');
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
        
        // Refresh clients list and select the newly created client
        const updatedClientsRes = await fetch('/api/clients').then(r => r.json());
        if (updatedClientsRes?.clients) {
          setClients(updatedClientsRes.clients);
          setSelectedClientId(data.client.id);
        }
        setExecutionResult({ type: 'CLIENT', clientName: data.client.name });
        setNewClientName('');
        setNewClientCpf('');
        setNewClientPhone('');
      } else if (activeAction === 'DOC') {
        if (!selectedClientId) throw new Error('Selecione uma cliente.');
        window.location.href = `/documentos/novo?clientId=${selectedClientId}`;
        return;
      } else if (activeAction === 'PROCESS') {
        if (!selectedClientId) throw new Error('Selecione uma cliente.');
        window.location.href = `/processos?novo=true&clientId=${selectedClientId}`;
        return;
      }

      // Refresh documents
      fetch('/api/documents').then(r => r.json()).then(d => setDocuments(d.documents || []));
    } catch (err: any) {
      setExecutionError(err.message || 'Erro no processamento.');
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
      {/* 👑 1. CENTRAL MAGNÍFICA DE DISPARO & OPERAÇÕES RÁPIDAS (BANNER GIGANTE NO TOPO) */}
      <section className="relative overflow-hidden rounded-[38px] bg-gradient-to-br from-[#06101E] via-[#0A1D38] to-[#040D1A] text-white p-7 lg:p-9 shadow-[0_30px_70px_rgba(6,16,30,0.4)] border-2 border-[#D4AF37]/60 space-y-6">
        {/* Glow Ambient Gold Lights */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* TOPO: IDENTIFICAÇÃO DO ESCRITÓRIO E SAUDAÇÃO EXECUTIVA */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="space-y-1">
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
                Central Magnífica de Operações Rápidas
              </h1>
              <p className="text-xs lg:text-sm text-slate-300 max-w-3xl leading-relaxed">
                Dispare kits de procuração e contratos no WhatsApp, cadastre clientes e organize dossiês do Windows em segundos.
              </p>
            </div>

            {/* SELEÇÃO DAS 4 OPERAÇÕES RÁPIDAS (BOTÕES GRANDES) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/15 text-xs font-black shrink-0">
              <button
                onClick={() => {
                  setActiveAction('KIT');
                  setExecutionResult(null);
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeAction === 'KIT'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#C59B27] text-[#06101E] font-black shadow-lg scale-[1.02]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-4 h-4" /> Disparar Kit
              </button>

              <button
                onClick={() => {
                  setActiveAction('DOC');
                  setExecutionResult(null);
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeAction === 'DOC'
                    ? 'bg-white text-[#06101E] font-black shadow-lg scale-[1.02]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Send className="w-4 h-4 text-[#D4AF37]" /> Assinar PDF
              </button>

              <button
                onClick={() => {
                  setActiveAction('CLIENT');
                  setExecutionResult(null);
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeAction === 'CLIENT'
                    ? 'bg-emerald-500 text-white font-black shadow-lg scale-[1.02]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <UserPlus className="w-4 h-4" /> Nova Cliente
              </button>

              <button
                onClick={() => {
                  setActiveAction('PROCESS');
                  setExecutionResult(null);
                }}
                className={`px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  activeAction === 'PROCESS'
                    ? 'bg-amber-500 text-[#06101E] font-black shadow-lg scale-[1.02]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Folder className="w-4 h-4 text-[#06101E] fill-[#06101E]/30" /> Novo Dossiê
              </button>
            </div>
          </div>

          {/* PAINEL EXPANSIVO PRINCIPAL DA AÇÃO SELECIONADA */}
          {executionResult ? (
            <div className="bg-emerald-950/90 border-2 border-emerald-500/60 rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-white text-lg">
                      {executionResult.type === 'KIT'
                        ? `Kit Jurídico Gerado para ${executionResult.clientName}!`
                        : `Cliente ${executionResult.clientName} Cadastrada com Sucesso!`}
                    </h3>
                    <p className="text-xs text-emerald-300">
                      {executionResult.type === 'KIT'
                        ? `${executionResult.documentsCount} documento(s) prontos para assinatura no WhatsApp.`
                        : `Qualificação salva. Agora você pode disparar os documentos ou criar o dossiê.`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setExecutionResult(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {executionResult.type === 'KIT' && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  {selectedClient?.phone || selectedClient?.whatsapp ? (
                    <a
                      href={`https://wa.me/55${(selectedClient.phone || selectedClient.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá ${executionResult.clientName}! Seus documentos (${executionResult.kitName}) estão prontos para assinatura digital. Acesse o link seguro no celular: ${executionResult.signatureLink}`,
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
            <form onSubmit={handleExecuteAction} className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 space-y-4 backdrop-blur-md">
              {/* CASO AÇÃO = KIT */}
              {activeAction === 'KIT' && (
                <div className="grid lg:grid-cols-[1.2fr_1.2fr_auto] items-end gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center justify-between">
                      <span>1. Selecionar Cliente</span>
                      <button
                        type="button"
                        onClick={() => setActiveAction('CLIENT')}
                        className="text-[10px] font-extrabold text-blue-300 hover:underline"
                      >
                        + Cadastrar Nova Cliente
                      </button>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none transition-all"
                      >
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
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none transition-all"
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
                    disabled={submitting || !clients.length}
                    className="w-full lg:w-auto px-7 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#E5C365] to-[#C59B27] hover:brightness-110 text-[#06101E] font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 shrink-0"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Gerando Kit...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> DISPARAR KIT AGORA VIA WHATSAPP
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* CASO AÇÃO = CADASTRO RÁPIDO DE CLIENTE */}
              {activeAction === 'CLIENT' && (
                <div className="grid sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_auto] items-end gap-3">
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
                    className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Cadastrar Cliente
                  </button>
                </div>
              )}

              {/* CASO AÇÃO = DOCUMENTO AVULSO */}
              {activeAction === 'DOC' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-black text-white text-base">Enviar Documento PDF Avulso</h3>
                    <p className="text-xs text-slate-300">Escolha a cliente cadastrada para direcionar o documento para o fluxo de assinatura.</p>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-white hover:bg-slate-100 text-[#06101E] font-black text-xs rounded-2xl shadow-md flex items-center gap-2 shrink-0"
                  >
                    <Send className="w-4 h-4 text-[#D4AF37]" /> Abrir Editor de Envio Avulso
                  </button>
                </div>
              )}

              {/* CASO AÇÃO = NOVO DOSSIÊ */}
              {activeAction === 'PROCESS' && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading font-black text-white text-base">Criar Nova Pasta de Processo no Windows Explorer</h3>
                    <p className="text-xs text-slate-300">Crie a pasta padronizada da cliente com as 5 subpastas automáticas de documentos.</p>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-[#06101E] font-black text-xs rounded-2xl shadow-md flex items-center gap-2 shrink-0"
                  >
                    <Folder className="w-4 h-4 fill-[#06101E]/30" /> Criar Pasta Dossiê 📁
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
