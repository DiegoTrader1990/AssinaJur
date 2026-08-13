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
  AlertTriangle,
  FileText,
  Building2,
} from 'lucide-react';

type OfficeAction = {
  id: string;
  tone: 'urgent' | 'attention' | 'normal';
  category: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  whatsappPhone?: string;
  signToken?: string;
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)) : 'Sem prazo';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'DUE' | 'SIGNATURE' | 'TRIAGE'>('ALL');

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
    () => documents.filter((document) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(document.status)),
    [documents],
  );
  const completedDocuments = useMemo(() => documents.filter((document) => document.status === 'CONCLUIDO'), [documents]);

  // Total count of all files inside processes
  const totalProcessFiles = useMemo(() => {
    return processes.reduce((acc, p) => acc + (p.documents?.length || 0) + (p.attachments?.length || 0), 0);
  }, [processes]);

  const actions = useMemo<OfficeAction[]>(() => {
    const now = Date.now();
    const dueSoon = processes
      .filter((process) => {
        if (!process.dueDate) return false;
        const distance = new Date(process.dueDate).getTime() - now;
        return distance <= 5 * 86_400_000 && distance >= -86_400_000;
      })
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    const list: OfficeAction[] = [
      ...dueSoon.map((process) => ({
        id: `due-${process.id}`,
        tone: 'urgent' as const,
        category: `Prazo Urgente (${formatDate(process.dueDate)})`,
        title: process.client?.name || process.title,
        description: process.title,
        href: '/processos',
        cta: 'Abrir Dossiê 📁',
      })),
      ...pendingDocuments.map((document) => ({
        id: `signature-${document.id}`,
        tone: 'attention' as const,
        category: 'Aguardando Assinatura',
        title: document.client?.name || 'Cliente pendente',
        description: document.title,
        href: '/documentos',
        cta: 'Ver Assinatura 📄',
        whatsappPhone: document.client?.phone || document.client?.whatsapp,
        signToken: document.token,
      })),
      ...processes
        .filter((process) => process.status === 'EM_TRIAGEM')
        .map((process) => ({
          id: `triage-${process.id}`,
          tone: 'normal' as const,
          category: 'Atendimento em Triagem',
          title: process.client?.name || 'Cliente sem definição',
          description: process.title,
          href: '/processos',
          cta: 'Organizar Caso 📂',
        })),
    ];

    if (filterType === 'DUE') return list.filter((a) => a.tone === 'urgent');
    if (filterType === 'SIGNATURE') return list.filter((a) => a.tone === 'attention');
    if (filterType === 'TRIAGE') return list.filter((a) => a.tone === 'normal');
    return list.slice(0, 6);
  }, [pendingDocuments, processes, filterType]);

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-7 pb-12">
      {/* BANNER ULTRA-PREMIUM PAINEL EXECUTIVO DO ESCRITÓRIO */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#071B3A] via-[#0B2A56] to-[#071B3A] text-white p-7 lg:p-9 shadow-[0_20px_50px_rgba(7,27,58,0.25)] border border-slate-700/50">
        {/* Luzes de Efeito Gold Luxury */}
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#D4AF37] bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
                {office?.name || 'Rodrigues & Soares Advocacia'}
              </span>
              <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Hash ICP-Brasil Ativo
              </span>
            </div>

            <h1 className="font-heading text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">
              Olá, {currentUser?.name ? currentUser.name : 'Dr. Diego & Dra. Dominick'} 👋
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 max-w-2xl">
              Seu centro de comando jurídico inteligente. Acompanhe assinaturas pendentes, prazos operacionais e dossiês de clientes em tempo real.
            </p>
          </div>

          {/* Botões de Ação Imediata Executiva */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Link
              href="/kits/enviar"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C59B27] px-4 py-3 text-xs font-black text-[#071B3A] shadow-md hover:brightness-110 transition-all"
            >
              <Sparkles className="h-4 w-4" /> Preparar Kit Jurídico
            </Link>
            <Link
              href="/documentos/novo"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-3 text-xs font-extrabold text-white transition-all backdrop-blur-md"
            >
              <Send className="h-4 w-4 text-[#D4AF37]" /> Enviar Assinatura
            </Link>
          </div>
        </div>

        {/* REGISTRO DE INDICADORES DE IMPACTO DO ESCRITÓRIO */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 pt-7 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D4AF37]">Clientes na Base</span>
              <User className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl lg:text-3xl font-black font-heading text-white mt-1">{metricValue(clients.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">cadastros ativos</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Em Assinatura</span>
              <FileSignature className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl lg:text-3xl font-black font-heading text-amber-300 mt-1">{metricValue(pendingDocuments.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">aguardando clientes</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300">Dossiês Ativos</span>
              <Folder className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl lg:text-3xl font-black font-heading text-white mt-1">{metricValue(processes.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">{totalProcessFiles} arquivos organizados</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">Assinaturas Concluídas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl lg:text-3xl font-black font-heading text-emerald-400 mt-1">{metricValue(completedDocuments.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">com prova jurídica</p>
          </div>
        </div>
      </section>

      {/* QUADRO DE ATALHOS PREMIUM RÁPIDOS */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/kits/enviar"
          className="group bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-400 p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-full">
              Kit Expresso
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-heading font-black text-[#071B3A] text-sm group-hover:text-amber-700 transition-colors">
              Kit Jurídico em 10 Segundos
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gere Procuração, Contrato e Declaração em um único fluxo de envio.
            </p>
          </div>
        </Link>

        <Link
          href="/processos"
          className="group bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Folder className="w-5 h-5 fill-blue-500/20" />
            </div>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-100/60 px-2 py-0.5 rounded-full">
              Windows Explorer
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-heading font-black text-[#071B3A] text-sm group-hover:text-blue-700 transition-colors">
              Gerenciador de Dossiês
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Navegue pelas pastas amarelas do escritório com drag &amp; drop de PDFs.
            </p>
          </div>
        </Link>

        <Link
          href="/documentos/novo"
          className="group bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSignature className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full">
              WhatsApp Link
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-heading font-black text-[#071B3A] text-sm group-hover:text-emerald-700 transition-colors">
              Enviar para Assinatura
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Envie qualquer contrato ou procuração com notificação por WhatsApp.
            </p>
          </div>
        </Link>

        <Link
          href="/modelos"
          className="group bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-400 p-5 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100/60 px-2 py-0.5 rounded-full">
              Copiloto IA
            </span>
          </div>
          <div className="mt-4">
            <h3 className="font-heading font-black text-[#071B3A] text-sm group-hover:text-indigo-700 transition-colors">
              Editor de Modelos Jurídicos
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Altere clausulados e minutas com auxílio da inteligência artificial.
            </p>
          </div>
        </Link>
      </section>

      {/* PAINEL PRINCIPAL: CENTRAL DE PRIORIDADES E DOSSIÊS ATIVOS */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        {/* COLUNA ESQUERDA: AGENDA DE PRIORIDADES QUE EXIGEM DECISÃO */}
        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 px-6 py-5 gap-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                  Central de Prioridades
                </p>
                <h2 className="mt-1 font-heading text-xl font-black text-[#071B3A]">
                  O que exige sua atenção hoje
                </h2>
              </div>

              {/* Filtros Rápido da Central */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded-lg transition-all ${filterType === 'ALL' ? 'bg-white text-[#071B3A] shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterType('DUE')}
                  className={`px-3 py-1 rounded-lg transition-all ${filterType === 'DUE' ? 'bg-white text-rose-700 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Prazos
                </button>
                <button
                  onClick={() => setFilterType('SIGNATURE')}
                  className={`px-3 py-1 rounded-lg transition-all ${filterType === 'SIGNATURE' ? 'bg-white text-amber-700 shadow-xs' : 'hover:text-slate-900'}`}
                >
                  Assinaturas
                </button>
              </div>
            </div>

            {actions.length ? (
              <div className="divide-y divide-slate-100">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="group grid grid-cols-[10px_1fr_auto] items-center gap-4 px-6 py-4 transition hover:bg-slate-50/80"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        action.tone === 'urgent'
                          ? 'bg-rose-500 ring-4 ring-rose-50'
                          : action.tone === 'attention'
                            ? 'bg-[#D4AF37] ring-4 ring-amber-50'
                            : 'bg-blue-500 ring-4 ring-blue-50'
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                          action.tone === 'urgent'
                            ? 'text-rose-600'
                            : action.tone === 'attention'
                              ? 'text-[#9A7417]'
                              : 'text-blue-600'
                        }`}
                      >
                        {action.category}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-extrabold text-[#071B3A]">{action.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{action.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {action.whatsappPhone && action.signToken && (
                        <a
                          href={`https://wa.me/55${action.whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá! Lembrando da assinatura pendente do documento "${action.description}". Link direto para assinar no celular: https://www.assinajur.com.br/assinar/${action.signToken}`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Cobrar assinatura via WhatsApp"
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Cobrar
                        </a>
                      )}
                      <Link
                        href={action.href}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-extrabold text-[#071B3A] transition"
                      >
                        {action.cta}
                        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="text-sm font-extrabold text-[#071B3A]">Nenhuma prioridade urgente pendente.</p>
                <p className="max-w-sm text-xs text-slate-500">
                  Todas as suas assinaturas e prazos do escritório estão em dia.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <Link href="/processos" className="text-xs font-extrabold text-blue-700 hover:underline inline-flex items-center gap-1">
              Ver todos os processos e dossiês do escritório <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* COLUNA DIREITA: DOSSIÊS ATIVOS ESTILO WINDOWS EXPLORER */}
        <aside className="rounded-[30px] border border-slate-200 bg-[#FBFCFE] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                Windows Explorer
              </p>
              <h2 className="mt-1 font-heading text-xl font-black text-[#071B3A]">
                Dossiês Recentes
              </h2>
            </div>
            <Link href="/processos" className="text-xs font-extrabold text-blue-700 hover:underline">
              Ver todos 📁
            </Link>
          </div>

          <div className="space-y-3">
            {processes.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href="/processos"
                className="group flex items-center justify-between bg-white border border-slate-200 hover:border-blue-300 p-3.5 rounded-2xl shadow-xs transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0">
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
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {(p.documents?.length || 0) + (p.attachments?.length || 0)} PDFs
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            ))}

            {!processes.length && (
              <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                <Folder className="w-8 h-8 mx-auto text-slate-300" />
                <p>Nenhum processo ativo no momento.</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* SEÇÃO INFERIOR: RESUMO DE MOVIMENTAÇÕES DE ASSINATURA */}
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                Formalização Digital
              </p>
              <h2 className="mt-1 font-heading text-lg font-black text-[#071B3A]">
                Assinaturas na Carteira
              </h2>
            </div>
            <Link href="/documentos" className="text-xs font-extrabold text-[#071B3A] hover:text-[#9A7417]">
              Ver todas
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#FFFAFO] border border-amber-100 p-4">
              <p className="font-heading text-2xl font-black text-[#071B3A]">{metricValue(pendingDocuments.length)}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-600">Aguardando assinatura</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="font-heading text-2xl font-black text-emerald-700">{metricValue(completedDocuments.length)}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-600">Concluídas com sucesso</p>
            </div>
          </div>

          <Link
            href="/documentos/novo"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold text-[#071B3A] transition hover:border-[#B68B1C] hover:bg-white"
          >
            <span>Criar novo documento para assinatura</span>
            <ArrowRight className="h-4 w-4 text-[#B68B1C]" />
          </Link>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                Movimentação em Tempo Real
              </p>
              <h2 className="mt-1 font-heading text-lg font-black text-[#071B3A]">
                Últimos Documentos Gerados
              </h2>
            </div>
            <Link href="/documentos" className="text-xs font-extrabold text-[#071B3A] hover:text-[#9A7417]">
              Abrir Central
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {documents.slice(0, 4).map((doc) => (
              <Link key={doc.id} href="/documentos" className="group flex items-center justify-between py-3 transition hover:px-1">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      doc.status === 'CONCLUIDO' ? 'bg-emerald-500' : 'bg-[#D4AF37]'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[#071B3A]">{doc.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                      {doc.client?.name || 'Cliente avulso'} • {String(doc.status).replaceAll('_', ' ')}
                    </p>
                  </div>
                </div>
                <Clock3 className="h-4 w-4 text-slate-300 transition group-hover:text-[#B68B1C] shrink-0" />
              </Link>
            ))}
            {!documents.length && (
              <p className="py-8 text-center text-xs text-slate-400">Nenhum documento gerado ainda.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
