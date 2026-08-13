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
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');

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
        setProcesses(processData?.processes || []);
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

  // Filtered documents by tab & search term
  const filteredDocuments = useMemo(() => {
    let list = documents;
    if (activeTab === 'PENDING') list = pendingDocuments;
    if (activeTab === 'COMPLETED') list = completedDocuments;

    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase();
    return list.filter(
      (doc) =>
        doc.title?.toLowerCase().includes(term) ||
        doc.client?.name?.toLowerCase().includes(term) ||
        doc.client?.cpf?.includes(term),
    );
  }, [documents, pendingDocuments, completedDocuments, activeTab, searchTerm]);

  // Filtered processes by search term
  const filteredProcesses = useMemo(() => {
    if (!searchTerm.trim()) return processes;
    const term = searchTerm.toLowerCase();
    return processes.filter(
      (p) =>
        p.title?.toLowerCase().includes(term) ||
        p.client?.name?.toLowerCase().includes(term) ||
        p.processNumber?.includes(term),
    );
  }, [processes, searchTerm]);

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-7 pb-16">
      {/* 1. MESA DE TRABALHO DO ADVOGADO: BARRA DE BUSCA GLOBAL E AÇÕES RÁPIDAS */}
      <header className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#071B3A] text-[#D4AF37] flex items-center justify-center font-black shadow-md shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">
                  {office?.name || 'Rodrigues & Soares Advocacia'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  OAB/BA 51.881 | 62.443
                </span>
              </div>
              <h1 className="font-heading text-xl lg:text-2xl font-black text-[#071B3A] mt-0.5">
                Mesa de Trabalho • {currentUser?.name ? currentUser.name : 'Dr. Diego & Dra. Dominick'}
              </h1>
            </div>
          </div>

          {/* ATALHOS DIRETOS */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/kits/enviar"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#c4a02d] px-4 py-2.5 text-xs font-black text-[#071B3A] shadow-xs transition-all"
            >
              <Sparkles className="h-4 w-4" /> Kit 10s
            </Link>
            <Link
              href="/documentos/novo"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#071B3A] hover:bg-[#102d5a] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all"
            >
              <Send className="h-4 w-4 text-[#D4AF37]" /> Assinatura WhatsApp
            </Link>
            <Link
              href="/clientes?novo=true"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-xs font-extrabold text-[#071B3A] transition-all"
            >
              <Plus className="h-4 w-4 text-blue-600" /> Nova Cliente
            </Link>
          </div>
        </div>

        {/* CAMPO DE BUSCA UNIVERSAL (CLIENTE, DOCUMENTO OU PROCESSO) */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar cliente por nome ou CPF, documento ou processo..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 hover:text-slate-600"
            >
              Limpar
            </button>
          )}
        </div>
      </header>

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

      {/* 3. PAINEL INTEGRADO: CENTRAL DE GESTÃO DE DOCUMENTOS E DOSSIÊS */}
      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        {/* COLUNA ESQUERDA: PAINEL DE GESTÃO DE ASSINATURAS */}
        <div className="bg-white border border-slate-200/90 rounded-[30px] p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                Formalização &amp; Assinaturas
              </p>
              <h2 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                Central de Assinaturas Digitais
              </h2>
            </div>

            {/* FILTROS DA TABELA */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-extrabold text-slate-600">
              <button
                onClick={() => setActiveTab('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'PENDING' ? 'bg-white text-[#071B3A] shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Pendentes ({pendingDocuments.length})
              </button>
              <button
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Concluídos ({completedDocuments.length})
              </button>
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'ALL' ? 'bg-white text-[#071B3A] shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Todos ({documents.length})
              </button>
            </div>
          </div>

          {/* LISTA DE DOCUMENTOS */}
          {filteredDocuments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredDocuments.slice(0, 6).map((doc) => (
                <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          doc.status === 'CONCLUIDO' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      <h3 className="text-xs font-black text-[#071B3A] truncate group-hover:text-blue-700 transition-colors">
                        {doc.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {doc.client?.name || 'Cliente avulso'}
                      </span>
                      <span>•</span>
                      <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('pt-BR') : ''}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {doc.status !== 'CONCLUIDO' && (doc.client?.phone || doc.client?.whatsapp) && (
                      <a
                        href={`https://wa.me/55${(doc.client?.phone || doc.client?.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá! Lembrando da assinatura do documento "${doc.title}". Link seguro para assinar no celular: https://www.assinajur.com.br/assinar/${doc.token}`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Cobrar WhatsApp
                      </a>
                    )}
                    <Link
                      href="/documentos"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#071B3A] rounded-xl text-xs font-bold transition-all"
                    >
                      Ver Detalhes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Nenhum documento encontrado.</p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-center">
            <Link href="/documentos" className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1">
              Ver todos os documentos na Central de Formalização <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* COLUNA DIREITA: DOSSIÊS WINDOWS EXPLORER E MODELOS RÁPIDOS */}
        <div className="space-y-6">
          {/* DOSSIÊS DE PROCESSOS (PASTAS AMARELAS) */}
          <div className="bg-[#FBFCFE] border border-slate-200/90 rounded-[30px] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                  Windows Explorer
                </p>
                <h3 className="font-heading font-black text-[#071B3A] text-base mt-0.5">
                  Dossiês de Processos
                </h3>
              </div>
              <Link href="/processos" className="text-xs font-bold text-blue-700 hover:underline">
                Abrir Pastas 📁
              </Link>
            </div>

            <div className="space-y-2.5">
              {filteredProcesses.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href="/processos"
                  className="group flex items-center justify-between bg-white border border-slate-200/80 hover:border-amber-400 p-3.5 rounded-2xl shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9.5 h-9.5 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5 text-amber-600 fill-amber-500/30" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-[#071B3A] truncate">{p.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {p.client?.name || 'Cliente'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full shrink-0">
                    {(p.documents?.length || 0) + (p.attachments?.length || 0)} PDFs
                  </span>
                </Link>
              ))}

              {!filteredProcesses.length && (
                <div className="py-8 text-center text-xs text-slate-400">Nenhum dossiê de processo ativo.</div>
              )}
            </div>
          </div>

          {/* MODELOS JURÍDICOS COM IA (ACESSO DIRETO) */}
          <div className="bg-gradient-to-br from-[#071B3A] to-[#0D2A56] text-white rounded-[30px] p-6 shadow-md space-y-3 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#D4AF37]">
                Modelos de Peças &amp; Contratos
              </span>
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <h3 className="font-heading font-black text-lg text-white">Copiloto IA de Modelos</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Edite clausulados de Procuração, Contratos de Honorários e Petições com inteligência artificial integrada.
            </p>
            <Link
              href="/modelos"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c5a02d] text-[#071B3A] text-xs font-black rounded-xl transition-all shadow-xs mt-1"
            >
              Abrir Editor de Modelos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
