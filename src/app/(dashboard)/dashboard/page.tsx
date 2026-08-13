'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  FileCheck2,
  Clock,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  FolderPlus,
  UserPlus,
  Upload,
  Sparkles,
  HelpCircle,
  FileText,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Scale,
  Loader2,
  BriefcaseBusiness,
  CalendarDays
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    clientsCount: 0,
    pendingDocs: 0,
    completedDocs: 0,
    totalDocs: 0,
  });

  const [recentClients, setRecentClients] = useState<any[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then((res) => res.json()),
      fetch('/api/documents').then((res) => res.json()),
      fetch('/api/processos').then((res) => res.json()),
    ])
      .then(([clientsData, docsData, processesData]) => {
        if (clientsData.clients) {
          setRecentClients(clientsData.clients.slice(0, 5));
          setStats((prev) => ({ ...prev, clientsCount: clientsData.clients.length }));
        }

        if (docsData.documents) {
          const docs = docsData.documents;
          setRecentDocuments(docs.slice(0, 4));

          const pending = docs.filter((d: any) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(d.status)).length;
          const completed = docs.filter((d: any) => d.status === 'CONCLUIDO').length;

          setStats((prev) => ({
            ...prev,
            pendingDocs: pending,
            completedDocs: completed,
            totalDocs: docs.length,
          }));
        }
        if (processesData.processes) setProcesses(processesData.processes);
      })
      .catch((err) => console.error('Erro ao carregar dados do dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processDashboardFiles = async (files: File[]) => {
    setUploadingPdf(true);
    try {
      const uploadedIds: string[] = [];
      for (const file of files) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Selecione apenas arquivos PDF.');
        const data = new FormData();
        data.append('file', file);
        const res = await fetch('/api/documents/upload', { method: 'POST', body: data });
        const result = await res.json();
        if (!res.ok || !result.file?.id) throw new Error(result.error || `Não foi possível enviar ${file.name}.`);
        uploadedIds.push(result.file.id);
      }
      router.push(`/documentos/novo?files=${encodeURIComponent(uploadedIds.join(','))}`);
    } catch {
      router.push('/documentos/novo?erro=upload');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      await processDashboardFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDashboardFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) await processDashboardFiles(files);
    e.target.value = '';
  };

  const actionCenter = [
    ...recentDocuments.filter((doc) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(doc.status)).slice(0, 3).map((doc) => ({ id: `signature-${doc.id}`, priority: 'URGENTE', title: `Fale com ${doc.client?.name || 'o signatário'}`, detail: `${doc.title} ainda aguarda assinatura.`, href: '/documentos', cta: 'Acompanhar assinatura' })),
    ...processes.filter((process) => process.dueDate && new Date(process.dueDate).getTime() - Date.now() <= 3 * 86400000).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 3).map((process) => ({ id: `deadline-${process.id}`, priority: 'ATENÇÃO', title: `Revise o processo de ${process.client?.name || 'cliente'}`, detail: `${process.title} • prazo em ${new Date(process.dueDate).toLocaleDateString('pt-BR')}.`, href: '/processos', cta: 'Abrir processo' })),
    ...processes.filter((process) => process.status === 'EM_TRIAGEM').slice(0, 2).map((process) => ({ id: `triage-${process.id}`, priority: 'PRÓXIMA ETAPA', title: `Avance o atendimento de ${process.client?.name || 'cliente'}`, detail: `${process.title} está em triagem.`, href: '/processos', cta: 'Organizar processo' })),
  ].slice(0, 5);

  return (
    <div className="space-y-8 font-sans">
      {/* Top Welcome Header & Quick Action Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">
            Painel do Escritório 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })}</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Evidências e integridade documental ativas
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/kits/enviar"
            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1.5 shadow-xs font-heading"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Automatizar Kits
          </Link>
          <Link
            href="/documentos/novo"
            className="px-4 py-2 rounded-xl bg-white text-slate-700 font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs font-heading"
          >
            <Plus className="w-3.5 h-3.5 text-[#071B3A]" />
            Área de Envio
          </Link>
          <Link
            href="/clientes?novo=true"
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-md font-heading"
          >
            <UserPlus className="w-3.5 h-3.5 text-white" />
            Novo Cliente
          </Link>
        </div>
      </div>

      <section className="rounded-[30px] bg-[#071B3A] p-6 sm:p-8 text-white shadow-[0_22px_60px_rgba(7,27,58,.22)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between"><div className="max-w-2xl"><p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[#d4af37]">AssinaJur • operação do escritório</p><h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">Bom trabalho. Aqui está o que precisa da sua decisão.</h2><p className="mt-3 text-sm leading-relaxed text-slate-300">Uma visão única de assinaturas, atendimentos e processos para você conduzir a carteira sem perder tempo procurando informações.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/documentos/novo" className="rounded-xl bg-[#d4af37] px-5 py-3 text-xs font-extrabold text-[#071B3A] shadow-lg">Nova assinatura</Link><Link href="/clientes?novo=true" className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-extrabold text-white">Novo atendimento</Link></div></div><div className="grid w-full max-w-xl grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Assinaturas</p><p className="mt-2 font-heading text-3xl font-extrabold">{stats.pendingDocs}</p><p className="text-[11px] text-amber-200">aguardando ação</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Processos</p><p className="mt-2 font-heading text-3xl font-extrabold">{processes.length}</p><p className="text-[11px] text-blue-200">na carteira</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Concluídos</p><p className="mt-2 font-heading text-3xl font-extrabold">{stats.completedDocs}</p><p className="text-[11px] text-emerald-200">documentos</p></div></div></div>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.06] px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#d4af37]">Prioridades automáticas</p><p className="mt-1 text-sm font-bold">Seu próximo passo, organizado por urgência.</p></div><Link href="/processos" className="text-xs font-extrabold text-white underline underline-offset-4">Abrir carteira</Link></div><div className="mt-4 grid gap-2">{actionCenter.length ? actionCenter.slice(0, 3).map((action) => <Link key={action.id} href={action.href} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.07] px-4 py-3 hover:bg-white/[.12]"><span className={`h-2 w-2 rounded-full ${action.priority === 'URGENTE' ? 'bg-rose-400' : action.priority === 'ATENÇÃO' ? 'bg-amber-400' : 'bg-blue-400'}`} /><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold tracking-wider text-slate-300">{action.priority}</p><p className="truncate text-xs font-bold">{action.title}</p></div><span className="text-[11px] font-bold text-[#f1d778]">{action.cta} →</span></Link>) : <p className="text-sm text-slate-300">Nenhuma pendência crítica no momento. Sua operação está em dia.</p>}</div></div>
      </section>

      <div className="hidden rounded-3xl border border-blue-200 bg-gradient-to-r from-[#071B3A] via-[#0B2A59] to-blue-700 p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.18em] text-blue-200 uppercase">Comece por aqui</p>
            <h2 className="font-heading text-xl font-extrabold mt-1">Envie os documentos já prontos para assinatura</h2>
            <p className="text-sm text-blue-100 mt-2 max-w-2xl">Adicione um ou vários PDFs, escolha o cliente e os signatários. Ao final, o sistema gera um único link seguro para o cliente.</p>
          </div>
          <Link href="/documentos/novo" className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-extrabold text-[#071B3A] shadow-md hover:bg-blue-50"><Upload className="w-4 h-4" /> Abrir envio de PDFs</Link>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-white/10 p-3 border border-white/15"><b>1. Adicione os PDFs</b><span className="block text-blue-100 mt-1">Contrato, procuração e declarações.</span></div>
          <div className="rounded-xl bg-white/10 p-3 border border-white/15"><b>2. Escolha o cliente</b><span className="block text-blue-100 mt-1">Dados e CPF são preenchidos.</span></div>
          <div className="rounded-xl bg-white/10 p-3 border border-white/15"><b>3. Envie um único link</b><span className="block text-blue-100 mt-1">Assinatura de todos em uma sessão.</span></div>
        </div>
      </div>

      <div className="hidden grid-cols-1 lg:grid-cols-[1.25fr_.75fr] gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold tracking-widest text-blue-600 uppercase">Fluxo recomendado</p><h2 className="font-heading text-lg font-extrabold text-[#071B3A] mt-1">O que fazer agora</h2><p className="text-xs text-slate-500 mt-1">Siga esta sequência para não perder nenhuma etapa do atendimento.</p></div><Link href="/processos" className="text-xs font-extrabold text-blue-700">Ver processos</Link></div><div className="mt-5 grid sm:grid-cols-3 gap-3">{[{ n: '1', title: 'Cadastre o cliente', text: 'Dados e representante, quando houver.', href: '/clientes?novo=true' }, { n: '2', title: 'Envie para assinatura', text: 'PDFs próprios ou kit jurídico em um link.', href: '/documentos/novo' }, { n: '3', title: 'Organize o processo', text: 'Migre os assinados e acompanhe prazos.', href: '/processos' }].map((step) => <Link key={step.n} href={step.href} className="rounded-2xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/40 transition-colors"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#071B3A] text-xs font-bold text-white">{step.n}</span><p className="mt-3 text-xs font-extrabold text-[#071B3A]">{step.title}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{step.text}</p></Link>)}</div></div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm"><div className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-amber-700" /><div><p className="text-xs font-extrabold text-[#071B3A]">Lembretes de processos</p><p className="text-[11px] text-amber-800">Acompanhe prioridades e prazos.</p></div></div><div className="mt-4 space-y-2">{processes.filter((process) => process.dueDate).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 3).map((process) => <Link key={process.id} href="/processos" className="block rounded-xl bg-white border border-amber-100 px-3 py-2"><p className="text-xs font-bold text-[#071B3A] truncate">{process.title}</p><p className="text-[10px] text-amber-800">Prazo: {new Date(process.dueDate).toLocaleDateString('pt-BR')} • {process.client?.name}</p></Link>)}{!processes.some((process) => process.dueDate) && <p className="rounded-xl bg-white border border-amber-100 p-3 text-xs text-slate-600">Nenhum prazo cadastrado. Ao criar ou editar um processo, informe o próximo prazo para ele aparecer aqui.</p>}</div></div>
      </div>

      {/* Grid Principal — Upload Rápido + Resumo de Envio */}
      <section className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-extrabold tracking-[0.18em] text-blue-600 uppercase">Inteligência operacional</p><h2 className="font-heading text-lg font-extrabold text-[#071B3A]">O que merece sua atenção hoje</h2><p className="mt-1 text-xs text-slate-500">Prioridades geradas a partir das assinaturas e processos do escritório.</p></div><Link href="/processos" className="rounded-xl bg-[#071B3A] px-4 py-2.5 text-center text-xs font-extrabold text-white">Abrir gestão do escritório</Link></div>
        <div className="divide-y divide-slate-100">{actionCenter.length ? actionCenter.map((action) => <Link key={action.id} href={action.href} className="group flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${action.priority === 'URGENTE' ? 'bg-rose-500 shadow-[0_0_0_5px_rgba(244,63,94,.12)]' : action.priority === 'ATENÇÃO' ? 'bg-amber-500 shadow-[0_0_0_5px_rgba(245,158,11,.12)]' : 'bg-blue-500 shadow-[0_0_0_5px_rgba(59,130,246,.12)]'}`} /><div className="min-w-0 flex-1"><p className={`text-[10px] font-extrabold tracking-widest ${action.priority === 'URGENTE' ? 'text-rose-600' : action.priority === 'ATENÇÃO' ? 'text-amber-700' : 'text-blue-600'}`}>{action.priority}</p><p className="mt-0.5 text-sm font-extrabold text-[#071B3A]">{action.title}</p><p className="mt-0.5 text-xs text-slate-500">{action.detail}</p></div><span className="shrink-0 text-xs font-extrabold text-blue-700 group-hover:underline">{action.cta} →</span></Link>) : <div className="p-8 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" /><p className="mt-3 font-bold text-[#071B3A]">Tudo sob controle.</p><p className="mt-1 text-xs text-slate-500">Quando houver uma assinatura pendente, triagem ou prazo próximo, a próxima ação aparecerá aqui.</p></div>}</div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Zona de Drag & Drop Inteligente */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`bg-white p-8 rounded-3xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center min-h-[230px] shadow-sm relative overflow-hidden group ${
            dragActive
              ? 'border-blue-600 bg-blue-50/40 scale-[1.01]'
              : 'border-slate-200 hover:border-blue-500 hover:bg-slate-50/50'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
            {uploadingPdf ? <Loader2 className="w-7 h-7 animate-spin text-blue-600" /> : <Upload className="w-7 h-7" />}
          </div>

          <h3 className="font-heading text-base font-extrabold text-[#071B3A]">
            {uploadingPdf ? 'Enviando documentos...' : dragActive ? 'Solte os PDFs para enviar!' : 'Adicionar documentos para assinatura'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">
            Arraste um ou vários PDFs e siga para escolher cliente, signatários e gerar o link único.
          </p>

          <label className="px-5 py-2.5 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer font-heading">
            <Plus className="w-4 h-4 text-blue-400 stroke-[3]" />
            <span>Selecionar PDFs do computador</span>
            <input type="file" accept=".pdf,application/pdf" multiple onChange={handleDashboardFileInput} className="hidden" />
          </label>
        </div>

        {/* Card 2: Resumo de Envio */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-heading">
                Resumo da Atividade de Envio
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-100">
                Últimos 30 dias
              </span>
            </div>

            {stats.totalDocs === 0 ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700 font-heading">Você ainda não enviou documentos este mês.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                  Crie o seu primeiro Kit Jurídico reunindo Contrato, Procuração e Declarações em um único link.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 py-2 text-center">
                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block font-heading">Enviados</span>
                  <span className="font-heading text-2xl font-extrabold text-[#071B3A]">{stats.totalDocs}</span>
                </div>
                <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block font-heading">Pendentes</span>
                  <span className="font-heading text-2xl font-extrabold text-amber-600">{stats.pendingDocs}</span>
                </div>
                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block font-heading">Assinados</span>
                  <span className="font-heading text-2xl font-extrabold text-emerald-600">{stats.completedDocs}</span>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/kits/enviar"
            className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-4 pt-4 border-t border-slate-100 font-heading"
          >
            Enviar Kit de Contratação em 1 Único Link
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* Cards de Métricas Detalhadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Clientes Cadastrados</span>
            <div className="font-heading text-2xl font-extrabold text-[#071B3A] mt-1">{stats.clientsCount}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Aguardando Assinatura</span>
            <div className="font-heading text-2xl font-extrabold text-amber-600 mt-1">{stats.pendingDocs}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Assinados com Éxito</span>
            <div className="font-heading text-2xl font-extrabold text-emerald-600 mt-1">{stats.completedDocs}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Total de Processos</span>
            <div className="font-heading text-2xl font-extrabold text-slate-700 mt-1">{processes.length}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Seção Inferior de 3 Colunas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Banner Comercial de Plano */}
        <div className="bg-gradient-to-br from-[#071B3A] via-[#0B1D3D] to-slate-900 text-white p-6 rounded-3xl shadow-md flex flex-col justify-between space-y-4 border border-white/10">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-[10px] uppercase border border-blue-400/30">
              Plano Profissional
            </span>
            <h3 className="font-heading text-base font-extrabold text-white">
              Agilidade e segurança jurídica nas contratações
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Simplifique contratos de honorários e procurações com assinatura pelo celular e certificado completo de evidências.
            </p>
          </div>

          <Link
            href="/plano"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs text-center transition-all shadow-md font-heading"
          >
            Gerenciar Limites do Plano
          </Link>
        </div>

        {/* Card 2: Central de Ajuda */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#071B3A]" />
              <h3 className="font-heading text-sm font-extrabold text-[#071B3A]">Precisa de ajuda?</h3>
            </div>

            <div className="space-y-2 text-xs font-medium">
              <Link href="/modelos" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between text-slate-700 transition-colors border border-slate-100">
                <span>📘 Como criar modelos com variáveis</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link href="/kits" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between text-slate-700 transition-colors border border-slate-100">
                <span>📦 Como agrupar kits em 1 link</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link href="/verificar" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between text-slate-700 transition-colors border border-slate-100">
                <span>🔒 Consultar autenticidade do PDF</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card 3: Feed de Notificações */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-extrabold text-[#071B3A]">Notificações Recentes</h3>
              <span className="text-[10px] font-bold text-slate-400">Dados do escritório</span>
            </div>

            <div className="space-y-2.5">
              {loading ? <p className="text-xs text-slate-400">Atualizando atividades...</p> : recentDocuments.length === 0 ? (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"><span className="font-bold text-slate-700">Nenhuma atividade documental ainda.</span><p className="text-[11px] text-slate-500 mt-1">Os documentos criados pelo painel ou WhatsApp aparecerão aqui.</p></div>
              ) : recentDocuments.slice(0, 2).map((doc) => (
                <div key={doc.id} className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                  <span className="font-bold text-blue-900 block font-heading">📄 {doc.title}</span>
                  <p className="text-[11px] text-blue-700 leading-snug font-medium">{doc.client?.name || 'Documento avulso'} • {String(doc.status).replaceAll('_', ' ')} • {new Date(doc.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela dos Últimos Clientes */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#071B3A]" />
            <h2 className="font-heading text-base font-extrabold text-[#071B3A]">Últimos Clientes do Escritório</h2>
          </div>
          <Link
            href="/clientes"
            className="text-xs font-extrabold text-blue-600 hover:text-blue-800 flex items-center gap-1 font-heading"
          >
            Ver todos os clientes
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm font-medium">Carregando clientes...</div>
        ) : recentClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-sm font-heading">Nenhum cliente cadastrado ainda.</p>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">Cadastre um cliente para poder enviar o Kit Jurídico de contratação.</p>
            <Link
              href="/clientes?novo=true"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all font-heading"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Primeiro Cliente
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentClients.map((client) => (
              <div key={client.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm font-heading">{client.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5 font-medium">
                    <span>CPF/CNPJ: {client.cpfCnpj}</span>
                    <span>•</span>
                    <span>Tel: {client.phone}</span>
                    {client.legalArea && (
                      <>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {client.legalArea}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/kits/enviar?clientId=${client.id}`}
                    className="text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl shadow-xs transition-colors font-heading"
                  >
                    Enviar Kit
                  </Link>
                  <Link
                    href={`/clientes?id=${client.id}`}
                    className="text-xs font-bold text-slate-600 hover:text-[#071B3A] px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors font-heading"
                  >
                    Ficha
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
