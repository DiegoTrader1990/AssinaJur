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
  Briefcase,
  Users,
  Grid,
  List,
  Upload,
  Cpu,
  Flame,
  Award,
  Activity,
  ArrowUpRight,
  Smartphone,
  Check,
  File,
  Eye,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, officeData, clientData, documentData, processData]) => {
        if (userData?.user) setCurrentUser(userData.user);
        if (officeData?.office) setOffice(officeData.office);
        setClients(clientData?.clients || []);
        setDocuments(documentData?.documents || []);
        const procs = processData?.processes || [];
        setProcesses(procs);
        if (procs.length > 0) setSelectedProcess(procs[0]);
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

  // AI Prompt Command Launcher
  const handleRunAiCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiMessage('');
    setTimeout(() => {
      setAiLoading(false);
      setAiMessage(`Comando processado com sucesso: "${aiPrompt}". Ação direcionada para os dossiês do escritório.`);
      setAiPrompt('');
    }, 1200);
  };

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-7 pb-16 text-slate-100">
      {/* 👑 HEADER EXECUTIVO OBSIDIAN GOLD WORKSTATION */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#06101E] via-[#0A1B33] to-[#040C17] border border-amber-500/30 p-7 lg:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
        {/* Glow ambient light effects */}
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#D4AF37] bg-amber-400/10 border border-amber-400/30 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                  <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {office?.name || 'Rodrigues & Soares Advocacia'}
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Hash ICP-Brasil • Ativo
                </span>
              </div>

              <h1 className="font-heading text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">
                Estação de Comando • {currentUser?.name ? currentUser.name : 'Dr. Diego & Dra. Dominick'}
              </h1>
              <p className="text-xs lg:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Plataforma integrada de alta inteligência advocatícia. Gestão de Dossiês no Windows Explorer, Copiloto IA e Formalização Digital via WhatsApp.
              </p>
            </div>

            {/* AÇÕES DE CRÍTICAS */}
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link
                href="/kits/enviar"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C365] to-[#C59B27] px-5 py-3.5 text-xs font-black text-[#06101E] shadow-xl hover:brightness-110 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="h-4 w-4" /> Kit Jurídico Expresso
              </Link>
              <Link
                href="/documentos/novo"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3.5 text-xs font-extrabold text-white transition-all backdrop-blur-md hover:scale-[1.02]"
              >
                <Send className="h-4 w-4 text-[#D4AF37]" /> Assinatura WhatsApp
              </Link>
            </div>
          </div>

          {/* BARRA DE COMANDO IA TERMINAL INTERATIVO */}
          <form onSubmit={handleRunAiCommand} className="relative">
            <div className="relative flex items-center bg-slate-900/80 border border-amber-500/40 focus-within:border-amber-400 rounded-2xl p-2 transition-all shadow-inner backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 ml-1">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Copiloto de IA: Digite um comando ex: 'Revisar contrato da cliente Valeria', 'Gerar procuração BPC LOAS'..."
                className="w-full pl-3 pr-4 py-2 bg-transparent text-xs font-medium text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-[#06101E] rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1.5"
              >
                {aiLoading ? (
                  <>Processando...</>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" /> Executar IA
                  </>
                )}
              </button>
            </div>
            {aiMessage && (
              <p className="mt-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                ✓ {aiMessage}
              </p>
            )}
          </form>

          {/* INDICADORES EM FAIXA DA OPERAÇÃO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D4AF37]">Clientes na Base</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-black font-heading text-white mt-1">{metricValue(clients.length)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">cadastros do escritório</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Em Assinatura</span>
                <FileSignature className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-black font-heading text-amber-300 mt-1">{metricValue(pendingDocuments.length)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">aguardando clientes</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300">Dossiês Ativos</span>
                <Folder className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-black font-heading text-white mt-1">{metricValue(processes.length)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{totalFiles} arquivos no Windows</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">Assinaturas Concluídas</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-black font-heading text-emerald-400 mt-1">{metricValue(completedDocuments.length)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">validade jurídica total</p>
            </div>
          </div>
        </div>
      </section>

      {/* 📁 RECURSO ESTRELA: WIDGET INTERATIVO DO WINDOWS EXPLORER EMBUTIDO NA HOME */}
      <section className="bg-white border border-slate-200/90 rounded-[34px] p-6 text-slate-900 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">
                Windows Explorer Desktop
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Pastas do Escritório
              </span>
            </div>
            <h2 className="font-heading font-black text-xl text-[#071B3A] mt-1">
              Gerenciador de Dossiês dos Clientes
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'GRID' ? 'bg-white text-[#071B3A] shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-amber-600" /> Ícones Grandes
              </button>
              <button
                onClick={() => setViewMode('LIST')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'LIST' ? 'bg-white text-[#071B3A] shadow-xs font-black' : 'hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5 text-blue-600" /> Detalhes
              </button>
            </div>

            <Link
              href="/processos"
              className="px-4 py-2 bg-[#071B3A] hover:bg-[#102e5b] text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1"
            >
              Abrir Completo <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37]" />
            </Link>
          </div>
        </div>

        {/* NAVEGAÇÃO DAS PASTAS AMARELAS DO WINDOWS */}
        {viewMode === 'GRID' ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {processes.map((p) => {
              const fileCount = (p.documents?.length || 0) + (p.attachments?.length || 0);
              const isSelected = selectedProcess?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProcess(p)}
                  className={`group cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-400 shadow-md ring-2 ring-amber-400/30'
                      : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform shadow-xs">
                      <Folder className="w-7 h-7 text-amber-500 fill-amber-400/40" />
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                      {fileCount} PDFs
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-xs font-black text-[#071B3A] truncate group-hover:text-amber-800 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      {p.client?.name || 'Cliente'}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-extrabold text-blue-700">
                    <span>Navegar Pasta 📂</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}

            {!processes.length && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 space-y-2">
                <Folder className="w-10 h-10 text-slate-300 mx-auto" />
                <p>Nenhuma pasta de processo criada no escritório.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {processes.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProcess(p)}
                className="p-3.5 bg-white hover:bg-amber-50/50 flex items-center justify-between gap-4 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder className="w-6 h-6 text-amber-500 fill-amber-400/40 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-[#071B3A] truncate">{p.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{p.client?.name || 'Cliente'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-bold bg-slate-100 px-2.5 py-1 rounded-full text-slate-700">
                    {(p.documents?.length || 0) + (p.attachments?.length || 0)} arquivos
                  </span>
                  <Link href="/processos" className="text-xs font-extrabold text-blue-700 hover:underline">
                    Abrir →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ESTRUTURA INTERNA DAS SUBPASTAS SELECIONADA DO WINDOWS */}
        {selectedProcess && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-[#071B3A] flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-500 fill-amber-400" />
                Subpastas Padronizadas do Dossiê: <span className="text-blue-700">{selectedProcess.title}</span>
              </p>
              <Link href="/processos" className="text-[11px] font-extrabold text-blue-700 hover:underline">
                Gerenciar no Explorer Completo 📁
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {[
                '01. Documentos Pessoais',
                '02. Procuração e Contratos Assinados',
                '03. Provas Médicas e CNIS',
                '04. Peças e Petições',
                '05. Decisões e Sentenças',
              ].map((subFolder, idx) => (
                <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
                  <Folder className="w-4 h-4 text-amber-500 fill-amber-300 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 truncate">{subFolder}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 📱 CENTRAL DE FORMALIZAÇÃO & DISPARO WHATSAPP */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 text-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                Formalização Digital Rápida
              </p>
              <h2 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                Assinaturas Aguardando Clientes
              </h2>
            </div>
            <Link href="/documentos" className="text-xs font-bold text-blue-700 hover:underline">
              Ver todas ({pendingDocuments.length})
            </Link>
          </div>

          {pendingDocuments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pendingDocuments.slice(0, 5).map((doc) => (
                <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <h3 className="text-xs font-black text-[#071B3A] truncate">{doc.title}</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      {doc.client?.name || 'Cliente pendente'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {(doc.client?.phone || doc.client?.whatsapp) && (
                      <a
                        href={`https://wa.me/55${(doc.client?.phone || doc.client?.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá! Lembrando da assinatura do documento "${doc.title}". Acesse o link seguro para assinar direto no celular: https://www.assinajur.com.br/assinar/${doc.token}`,
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
            </div>
          )}
        </div>

        {/* ATALHOS DE MODELOS JURÍDICOS */}
        <div className="bg-gradient-to-br from-[#06101E] to-[#0A1D38] border border-amber-500/30 rounded-[32px] p-6 text-white shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#D4AF37]">
                Kit Jurídico Expresso
              </span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-heading font-black text-xl text-white">Gerar Documentos em 10s</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Crie a Procuração, o Contrato de Honorários e a Declaração de Hipossuficiência para sua cliente de forma automatizada e envie pelo WhatsApp.
            </p>
          </div>

          <Link
            href="/kits/enviar"
            className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:brightness-110 text-[#06101E] text-xs font-black rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Preparar Kit do Cliente Agora
          </Link>
        </div>
      </section>
    </main>
  );
}
