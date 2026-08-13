'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSignature,
  FolderKanban,
  FolderPlus,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';

type OfficeAction = {
  id: string;
  tone: 'urgent' | 'attention' | 'normal';
  category: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)) : 'Sem prazo';

export default function DashboardPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then((response) => response.json()),
      fetch('/api/documents').then((response) => response.json()),
      fetch('/api/processos').then((response) => response.json()),
    ])
      .then(([clientData, documentData, processData]) => {
        setClients(clientData.clients || []);
        setDocuments(documentData.documents || []);
        setProcesses(processData.processes || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingDocuments = useMemo(
    () => documents.filter((document) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(document.status)),
    [documents],
  );
  const completedDocuments = useMemo(() => documents.filter((document) => document.status === 'CONCLUIDO'), [documents]);

  const actions = useMemo<OfficeAction[]>(() => {
    const now = Date.now();
    const dueSoon = processes
      .filter((process) => {
        if (!process.dueDate) return false;
        const distance = new Date(process.dueDate).getTime() - now;
        return distance <= 3 * 86_400_000 && distance >= -86_400_000;
      })
      .sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    return [
      ...dueSoon.slice(0, 2).map((process) => ({
        id: `due-${process.id}`,
        tone: 'urgent' as const,
        category: `Prazo ${formatDate(process.dueDate)}`,
        title: process.client?.name || process.title,
        description: process.title,
        href: '/processos',
        cta: 'Abrir processo',
      })),
      ...pendingDocuments.slice(0, 3).map((document) => ({
        id: `signature-${document.id}`,
        tone: 'attention' as const,
        category: 'Assinatura em andamento',
        title: document.client?.name || 'Documento aguardando assinatura',
        description: document.title,
        href: '/documentos',
        cta: 'Acompanhar',
      })),
      ...processes
        .filter((process) => process.status === 'EM_TRIAGEM')
        .slice(0, 2)
        .map((process) => ({
          id: `triage-${process.id}`,
          tone: 'normal' as const,
          category: 'Atendimento em triagem',
          title: process.client?.name || 'Cliente sem definição',
          description: process.title,
          href: '/processos',
          cta: 'Organizar',
        })),
    ].slice(0, 5);
  }, [pendingDocuments, processes]);

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-7 pb-12">
      <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[#B68B1C]">Rodrigues &amp; Soares • Advocacia</p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-[#071B3A]">Painel do escritório</h1>
          <p className="mt-1.5 text-sm text-slate-500">Uma visão objetiva da operação, das assinaturas e dos atendimentos em curso.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/clientes?novo=true" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-extrabold text-[#071B3A] shadow-sm transition hover:border-[#B68B1C] hover:bg-[#fffdf7]">
            <Plus className="h-4 w-4 text-[#B68B1C]" /> Novo cliente
          </Link>
          <Link href="/documentos/novo" className="inline-flex items-center gap-2 rounded-xl bg-[#071B3A] px-4 py-3 text-xs font-extrabold text-white shadow-[0_8px_20px_rgba(7,27,58,.18)] transition hover:bg-[#102a56]">
            <Send className="h-4 w-4 text-[#D4AF37]" /> Enviar para assinatura
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-[30px] bg-[#071B3A] shadow-[0_24px_60px_rgba(7,27,58,.2)]">
        <div className="grid lg:grid-cols-[1.18fr_.82fr]">
          <div className="relative p-7 text-white lg:p-9">
            <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[.22em] text-[#D4AF37]">Resumo executivo</p>
            <h2 className="relative mt-4 max-w-xl font-heading text-[28px] font-extrabold leading-[1.12] tracking-tight">Controle a jornada do cliente, do primeiro documento ao processo organizado.</h2>
            <p className="relative mt-4 max-w-xl text-sm leading-6 text-slate-300">O AssinaJur concentra formalização, evidências de assinatura e gestão do caso para que o escritório trabalhe com clareza.</p>
            <div className="relative mt-7 flex flex-wrap gap-3">
              <Link href="/kits/enviar" className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-xs font-extrabold text-[#071B3A] transition hover:bg-[#e0c05d]">
                <Sparkles className="h-4 w-4" /> Preparar kit jurídico
              </Link>
              <Link href="/processos" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-white/[.12]">
                Ver processos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-white/10 bg-white/[.045] lg:border-l lg:border-t-0">
            {[
              { value: metricValue(clients.length), label: 'Clientes', note: 'na base' },
              { value: metricValue(pendingDocuments.length), label: 'Em assinatura', note: 'para acompanhar' },
              { value: metricValue(processes.length), label: 'Processos', note: 'em gestão' },
            ].map((metric) => (
              <div key={metric.label} className="flex min-w-0 flex-col justify-end border-r border-white/10 p-4 last:border-r-0 lg:p-5">
                <p className="font-heading text-3xl font-extrabold text-white">{metric.value}</p>
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-wide text-[#D4AF37]">{metric.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-300">{metric.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_8px_26px_rgba(15,23,42,.05)]">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#B68B1C]">Agenda do escritório</p>
              <h2 className="mt-1 font-heading text-xl font-extrabold text-[#071B3A]">Atenções que merecem sua decisão</h2>
            </div>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 sm:block">Atualização automática</span>
          </div>
          {actions.length ? (
            <div className="divide-y divide-slate-100">
              {actions.map((action) => (
                <Link key={action.id} href={action.href} className="group grid grid-cols-[10px_1fr_auto] items-center gap-4 px-6 py-4 transition hover:bg-[#f8fafc]">
                  <span className={`h-2.5 w-2.5 rounded-full ${action.tone === 'urgent' ? 'bg-rose-500 ring-4 ring-rose-50' : action.tone === 'attention' ? 'bg-[#D4AF37] ring-4 ring-amber-50' : 'bg-blue-500 ring-4 ring-blue-50'}`} />
                  <div className="min-w-0">
                    <p className={`text-[10px] font-extrabold uppercase tracking-[.12em] ${action.tone === 'urgent' ? 'text-rose-600' : action.tone === 'attention' ? 'text-[#9A7417]' : 'text-blue-600'}`}>{action.category}</p>
                    <p className="mt-1 truncate text-sm font-extrabold text-[#071B3A]">{action.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{action.description}</p>
                  </div>
                  <span className="hidden items-center gap-1 text-xs font-extrabold text-[#071B3A] sm:inline-flex">{action.cta}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-extrabold text-[#071B3A]">Operação sem pendências críticas.</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">As próximas assinaturas, prazos e atendimentos que exigirem ação aparecerão nesta área.</p>
            </div>
          )}
        </div>

        <aside className="rounded-[26px] border border-slate-200 bg-[#fbfcfe] p-6 shadow-[0_8px_26px_rgba(15,23,42,.04)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#B68B1C]">Atalhos operacionais</p>
          <h2 className="mt-1 font-heading text-xl font-extrabold text-[#071B3A]">Iniciar uma atividade</h2>
          <div className="mt-5 space-y-2.5">
            {[
              { href: '/documentos/novo', icon: FileSignature, title: 'Nova assinatura', description: 'Envie PDFs e acompanhe os signatários.' },
              { href: '/kits/enviar', icon: Sparkles, title: 'Kit jurídico', description: 'Prepare documentos padronizados em uma sessão.' },
              { href: '/processos', icon: FolderPlus, title: 'Novo processo', description: 'Estruture o caso e centralize arquivos.' },
            ].map((item) => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-2xl border border-transparent bg-white p-3.5 shadow-sm transition hover:border-[#d8bd68] hover:shadow-md">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F7F1DE] text-[#9A7417]"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-[#071B3A]">{item.title}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{item.description}</span></span>
                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#9A7417]" />
              </Link>;
            })}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_8px_26px_rgba(15,23,42,.04)]">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#B68B1C]">Formalização</p><h2 className="mt-1 font-heading text-lg font-extrabold text-[#071B3A]">Assinaturas</h2></div>
            <Link href="/documentos" className="text-xs font-extrabold text-[#071B3A] hover:text-[#9A7417]">Ver todas</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#fffaf0] p-4"><p className="font-heading text-2xl font-extrabold text-[#071B3A]">{metricValue(pendingDocuments.length)}</p><p className="mt-1 text-[11px] font-bold text-slate-500">Aguardando conclusão</p></div>
            <div className="rounded-2xl bg-emerald-50 p-4"><p className="font-heading text-2xl font-extrabold text-emerald-700">{metricValue(completedDocuments.length)}</p><p className="mt-1 text-[11px] font-bold text-slate-500">Concluídas</p></div>
          </div>
          <Link href="/documentos/novo" className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-xs font-extrabold text-[#071B3A] transition hover:border-[#B68B1C]">Enviar novo documento <ArrowRight className="h-4 w-4 text-[#B68B1C]" /></Link>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_8px_26px_rgba(15,23,42,.04)]">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#B68B1C]">Movimentações recentes</p><h2 className="mt-1 font-heading text-lg font-extrabold text-[#071B3A]">Documentos do escritório</h2></div><Link href="/documentos" className="text-xs font-extrabold text-[#071B3A] hover:text-[#9A7417]">Abrir documentos</Link></div>
          <div className="mt-3 divide-y divide-slate-100">
            {documents.slice(0, 4).map((document) => <Link key={document.id} href="/documentos" className="group flex items-center gap-3 py-3 transition hover:px-1"><span className={`h-2 w-2 rounded-full ${document.status === 'CONCLUIDO' ? 'bg-emerald-500' : 'bg-[#D4AF37]'}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-[#071B3A]">{document.title}</p><p className="mt-0.5 text-[11px] text-slate-500">{document.client?.name || 'Documento avulso'} • {String(document.status).replaceAll('_', ' ')}</p></div><Clock3 className="h-4 w-4 text-slate-300 transition group-hover:text-[#B68B1C]" /></Link>)}
            {!documents.length && <p className="py-8 text-center text-xs text-slate-500">Ainda não há documentos na carteira.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
