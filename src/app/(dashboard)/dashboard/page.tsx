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
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Express Launcher State
  const [dispatchTab, setDispatchTab] = useState<'KIT' | 'SINGLE_DOC' | 'PROCESS'>('KIT');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [singleDocTitle, setSingleDocTitle] = useState('');
  const [submittingExpress, setSubmittingExpress] = useState(false);
  const [expressResult, setExpressResult] = useState<any>(null);
  const [expressError, setExpressError] = useState('');
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

  // Handle Express Kit Dispatch directly on Dashboard
  const handleFireExpressKit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setExpressError('Por favor, selecione uma cliente para receber os documentos.');
      return;
    }
    if (dispatchTab === 'KIT' && !selectedKitId) {
      setExpressError('Por favor, selecione um Kit Jurídico.');
      return;
    }

    setSubmittingExpress(true);
    setExpressError('');
    setExpressResult(null);

    try {
      if (dispatchTab === 'KIT') {
        const response = await fetch('/api/kits/generate-package', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedClientId,
            kitId: selectedKitId,
            variables: {
              valor_honorarios: 'R$ 3.000,00',
              percentual_exito: '30%',
            },
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Falha ao disparar kit.');

        setExpressResult(data.result);

        // Refresh documents list
        fetch('/api/documents')
          .then((r) => r.json())
          .then((d) => setDocuments(d.documents || []));
      } else if (dispatchTab === 'SINGLE_DOC') {
        // Quick document creation redirect or API
        window.location.href = `/documentos/novo?clientId=${selectedClientId}`;
      } else if (dispatchTab === 'PROCESS') {
        window.location.href = `/processos?novo=true&clientId=${selectedClientId}`;
      }
    } catch (err: any) {
      setExpressError(err.message || 'Erro ao processar disparo.');
    } finally {
      setSubmittingExpress(false);
    }
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId],
  );

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-7 pb-16">
      {/* 🚀 CONSOLE DE DISPARO RÁPIDO DO ADVOGADO (O FOCO PRINCIPAL DO ESCRITÓRIO) */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-[#071B3A] via-[#0C2B56] to-[#071B3A] text-white p-6 lg:p-8 shadow-[0_25px_60px_rgba(7,27,58,0.35)] border-2 border-[#D4AF37]/50">
        {/* Glow ambient lights */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* IDENTIFICAÇÃO E MENSAGEM */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D4AF37] bg-amber-400/10 border border-amber-400/30 px-3 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {office?.name || 'Rodrigues & Soares Advocacia'}
                </span>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp Direct
                </span>
              </div>
              <h1 className="font-heading text-xl lg:text-2xl font-black text-white mt-1">
                Central de Disparo Rápido • {currentUser?.name ? currentUser.name : 'Dr. Diego & Dra. Dominick'}
              </h1>
            </div>

            {/* SELEÇÃO DE MODALIDADE DE DISPARO */}
            <div className="flex bg-white/10 p-1 rounded-2xl border border-white/15 text-xs font-black shrink-0">
              <button
                onClick={() => {
                  setDispatchTab('KIT');
                  setExpressResult(null);
                }}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                  dispatchTab === 'KIT' ? 'bg-[#D4AF37] text-[#071B3A] shadow-md' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" /> Kit 10 Segundos
              </button>
              <button
                onClick={() => {
                  setDispatchTab('SINGLE_DOC');
                  setExpressResult(null);
                }}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                  dispatchTab === 'SINGLE_DOC' ? 'bg-white text-[#071B3A] shadow-md' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Send className="w-4 h-4 text-[#D4AF37]" /> Assinatura Avulsa
              </button>
              <button
                onClick={() => {
                  setDispatchTab('PROCESS');
                  setExpressResult(null);
                }}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                  dispatchTab === 'PROCESS' ? 'bg-white text-[#071B3A] shadow-md' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Folder className="w-4 h-4 text-amber-400 fill-amber-400/30" /> Novo Dossiê
              </button>
            </div>
          </div>

          {/* PAINEL DE AÇÃO EXPRESSA INTERATIVO */}
          {expressResult ? (
            <div className="bg-emerald-950/80 border-2 border-emerald-500/50 rounded-3xl p-5 lg:p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-white text-base">
                      Kit Gerado com Sucesso para {expressResult.clientName}!
                    </h3>
                    <p className="text-xs text-emerald-300">
                      {expressResult.documentsCount} documento(s) prontos para assinatura digital via WhatsApp.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setExpressResult(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* BARRAS DE ENVIO WHATSAPP OU COPIAR LINK */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {selectedClient?.phone || selectedClient?.whatsapp ? (
                  <a
                    href={`https://wa.me/55${(selectedClient.phone || selectedClient.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Olá ${expressResult.clientName}! Seus documentos (${expressResult.kitName}) estão prontos para assinatura digital. Acesse o link seguro no celular: ${expressResult.signatureLink}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <MessageSquare className="w-4 h-4 fill-white" /> DISPARAR MENSAGEM NO WHATSAPP
                  </a>
                ) : (
                  <div className="text-xs text-amber-300 bg-amber-950/60 px-3 py-2 rounded-xl">
                    ⚠️ Cliente sem telefone cadastrado. Copie o link abaixo para enviar manualmente.
                  </div>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(expressResult.signatureLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="w-full sm:w-auto px-5 py-3.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
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

                <Link
                  href="/documentos"
                  className="w-full sm:w-auto px-4 py-3.5 text-xs font-bold text-slate-300 hover:text-white underline text-center"
                >
                  Ver na Central de Documentos
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFireExpressKit} className="grid md:grid-cols-[1.2fr_1.2fr_auto] items-end gap-3">
              {/* PASSO 1: SELECIONAR CLIENTE */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#D4AF37] flex items-center justify-between">
                  <span>1. Selecionar Cliente</span>
                  <Link href="/clientes?novo=true" className="text-[10px] font-bold text-blue-300 hover:underline">
                    + Cadastrar Nova
                  </Link>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none transition-all"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name} {c.cpfCnpj ? `(${c.cpfCnpj})` : ''}
                      </option>
                    ))}
                    {!clients.length && (
                      <option value="" className="bg-slate-900 text-slate-400">
                        Nenhum cliente cadastrado ainda
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* PASSO 2: SELECIONAR KIT OU DOCUMENTO */}
              {dispatchTab === 'KIT' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#D4AF37]">
                    2. Selecionar Kit Jurídico
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                    <select
                      value={selectedKitId}
                      onChange={(e) => setSelectedKitId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none transition-all"
                    >
                      {kits.map((k) => (
                        <option key={k.id} value={k.id} className="bg-slate-900 text-white">
                          {k.name} ({k.items?.length || 3} documentos)
                        </option>
                      ))}
                      {!kits.length && (
                        <option value="" className="bg-slate-900 text-slate-400">
                          Carregando kits do escritório...
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#D4AF37]">
                    2. Título do Documento / PDF
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={singleDocTitle}
                      onChange={(e) => setSingleDocTitle(e.target.value)}
                      placeholder="Ex: Contrato de Honorários Avulso"
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-white/20 focus:border-amber-400 rounded-2xl text-xs font-bold text-white focus:outline-none transition-all placeholder-slate-500"
                    />
                  </div>
                </div>
              )}

              {/* BOTÃO DE DISPARO RÁPIDO */}
              <button
                type="submit"
                disabled={submittingExpress || !clients.length}
                className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-[#D4AF37] via-[#E5C365] to-[#C59B27] hover:brightness-110 text-[#071B3A] font-black text-xs rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 shrink-0"
              >
                {submittingExpress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Gerando Kit...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> DISPARAR KIT AGORA
                  </>
                )}
              </button>
            </form>
          )}

          {expressError && (
            <p className="text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-500/40 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> {expressError}
            </p>
          )}
        </div>
      </section>

      {/* 2. REGISTRO DE RESUMO OPERACIONAL EM 4 CARDS ELEGANTES */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/clientes"
          className="bg-white border border-slate-200/80 hover:border-amber-400 p-5 rounded-3xl transition-all shadow-xs group"
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
          className="bg-white border border-slate-200/80 hover:border-amber-400 p-5 rounded-3xl transition-all shadow-xs group"
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
          className="bg-white border border-slate-200/80 hover:border-blue-400 p-5 rounded-3xl transition-all shadow-xs group"
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
          className="bg-white border border-slate-200/80 hover:border-emerald-400 p-5 rounded-3xl transition-all shadow-xs group"
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

      {/* 3. SEÇÃO PRINCIPAL: ASSINATURAS PENDENTES PARA COBRANÇA DIRETA & WINDOWS EXPLORER */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        {/* COLUNA ESQUERDA: COBRANÇA WHATSAPP DE ASSINATURAS EM ANDAMENTO */}
        <div className="bg-white border border-slate-200/90 rounded-[32px] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                  Acompanhamento de Formalizações
                </p>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Assinaturas Pendentes dos Clientes
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

        {/* COLUNA DIREITA: DOSSIÊS DO WINDOWS EXPLORER */}
        <div className="bg-[#FBFCFE] border border-slate-200/90 rounded-[32px] p-6 shadow-xs flex flex-col justify-between">
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

          <div className="pt-4 border-t border-slate-200/80 mt-4">
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
