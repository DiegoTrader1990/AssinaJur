'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowDownUp,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileCheck2,
  FileClock,
  Filter,
  FolderKanban,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';

type Pendency = {
  id: string;
  title?: string | null;
  description: string;
  status: string;
  category: string;
  priority: string;
  dueDate?: string | null;
  updatedAt: string;
  responsible?: { id: string; name: string } | null;
};

type Process = {
  id: string;
  title: string;
  legalArea?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  protocolNumber?: string | null;
  lastActivityAt: string;
};

type Document = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
};

export type CentralClient = {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  legalArea?: string | null;
  notes?: string | null;
  processNumber?: string | null;
  createdAt: string;
  updatedAt?: string;
  lawyerInCharge?: { id: string; name: string; oabNumber?: string | null } | null;
  processes?: Process[];
  documents?: Document[];
  pendencies?: Pendency[];
};

type QuickFilter = 'TODOS' | 'ATENCAO' | 'AGUARDANDO' | 'PENDENCIAS' | 'NOVOS' | 'PARADOS' | 'SEM_DEMANDA';
type StatusKey = 'CRITICO' | 'ATENCAO' | 'AGUARDANDO' | 'ASSINATURA' | 'ANDAMENTO' | 'CONCLUIDO' | 'SEM_DEMANDA';

const DAY = 86_400_000;

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isOpenProcess(status: string) {
  return !['CONCLUIDO', 'ARQUIVADO', 'CANCELADO'].includes(String(status || '').toUpperCase());
}

function isPendingDocument(status: string) {
  return ['ENVIADO', 'PENDENTE', 'PARCIALMENTE_ASSINADO'].includes(String(status || '').toUpperCase());
}

function newestDate(client: CentralClient) {
  const dates = [
    safeDate(client.updatedAt),
    safeDate(client.createdAt),
    ...(client.processes || []).map((item) => safeDate(item.lastActivityAt)),
    ...(client.documents || []).map((item) => safeDate(item.completedAt || item.createdAt)),
    ...(client.pendencies || []).map((item) => safeDate(item.updatedAt)),
  ].filter(Boolean) as Date[];
  return dates.sort((a, b) => b.getTime() - a.getTime())[0] || new Date(0);
}

function dateLabel(date: Date) {
  const today = startOfToday();
  const diff = Math.floor((today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / DAY);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Hoje, ${time}`;
  if (diff === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function dueLabel(value?: string | null) {
  const due = safeDate(value);
  if (!due) return null;
  const today = startOfToday();
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / DAY);
  if (diff < 0) return { text: `Atrasada há ${Math.abs(diff)}d`, overdue: true };
  if (diff === 0) return { text: 'Prazo hoje', overdue: false };
  if (diff === 1) return { text: 'Prazo amanhã', overdue: false };
  return { text: `Prazo ${due.toLocaleDateString('pt-BR')}`, overdue: false };
}

function normalize(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function clientOperational(client: CentralClient) {
  const today = startOfToday();
  const pendencies = (client.pendencies || []).filter((item) => item.status !== 'CONCLUIDO');
  const pendingDocuments = (client.documents || []).filter((item) => isPendingDocument(item.status));
  const activeProcesses = (client.processes || []).filter((item) => isOpenProcess(item.status));
  const orderedPendencies = [...pendencies].sort((a, b) => {
    const weight = (value: string) => ({ URGENTE: 0, ALTA: 1, NORMAL: 2, BAIXA: 3 }[value] ?? 4);
    const priority = weight(a.priority) - weight(b.priority);
    if (priority) return priority;
    return (safeDate(a.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER) - (safeDate(b.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER);
  });
  const mainPendency = orderedPendencies[0];
  const processDue = [...activeProcesses].filter((item) => item.dueDate).sort((a, b) => (safeDate(a.dueDate)?.getTime() || 0) - (safeDate(b.dueDate)?.getTime() || 0))[0];
  const due = mainPendency?.dueDate || processDue?.dueDate || null;
  const overdue = Boolean(due && (safeDate(due)?.getTime() || 0) < today.getTime());
  const urgent = mainPendency?.priority === 'URGENTE' || processDue?.priority === 'ALTA';
  const waitingClient = mainPendency?.status === 'AGUARDANDO_CLIENTE';
  const lastActivity = newestDate(client);
  const stale = today.getTime() - lastActivity.getTime() > 30 * DAY;
  const newThisMonth = new Date(client.createdAt).getMonth() === today.getMonth() && new Date(client.createdAt).getFullYear() === today.getFullYear();
  const awaitingDocs = pendencies.some((item) => /doc|rg|cnh|cadunico|cadúnico/i.test(`${item.title || ''} ${item.description || ''}`));

  let status: StatusKey = 'SEM_DEMANDA';
  if (overdue) status = 'CRITICO';
  else if (urgent) status = 'ATENCAO';
  else if (waitingClient) status = 'AGUARDANDO';
  else if (pendingDocuments.length) status = 'ASSINATURA';
  else if (activeProcesses.length || pendencies.length) status = 'ANDAMENTO';
  else if ((client.processes || []).some((item) => item.status === 'CONCLUIDO')) status = 'CONCLUIDO';

  const currentProcess = activeProcesses[0] || client.processes?.[0];
  const nextAction = mainPendency?.title || mainPendency?.description || (pendingDocuments.length ? 'Concluir assinatura pendente' : processDue ? `Acompanhar ${processDue.title}` : activeProcesses.length ? 'Acompanhar demanda' : 'Criar primeira demanda');
  const activityDescription = mainPendency
    ? mainPendency.status === 'AGUARDANDO_CLIENTE' ? 'Aguardando retorno do cliente' : 'Acompanhamento atualizado'
    : pendingDocuments[0]
      ? pendingDocuments[0].status === 'CONCLUIDO' ? 'Documento concluído' : 'Assinatura em andamento'
      : currentProcess ? 'Processo acompanhado' : 'Cadastro atualizado';

  return {
    status,
    mainPendency,
    pendingDocuments,
    activeProcesses,
    currentProcess,
    nextAction,
    due,
    overdue,
    waitingClient,
    lastActivity,
    activityDescription,
    stale,
    newThisMonth,
    awaitingDocs,
    requiresAttention: overdue || urgent,
  };
}

const STATUS: Record<StatusKey, { label: string; classes: string; dot: string }> = {
  CRITICO: { label: 'Prazo crítico', classes: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  ATENCAO: { label: 'Requer atenção', classes: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  AGUARDANDO: { label: 'Aguardando cliente', classes: 'border-violet-200 bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  ASSINATURA: { label: 'Aguardando assinatura', classes: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  ANDAMENTO: { label: 'Em andamento', classes: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  CONCLUIDO: { label: 'Concluído', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  SEM_DEMANDA: { label: 'Sem demanda ativa', classes: 'border-slate-200 bg-slate-50 text-slate-600', dot: 'bg-slate-400' },
};

const QUICK_FILTERS: Array<{ key: QuickFilter; label: string }> = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'ATENCAO', label: 'Precisam de atenção' },
  { key: 'AGUARDANDO', label: 'Aguardando cliente' },
  { key: 'PENDENCIAS', label: 'Com pendências' },
  { key: 'NOVOS', label: 'Novos' },
  { key: 'PARADOS', label: 'Sem movimentação' },
  { key: 'SEM_DEMANDA', label: 'Sem demanda' },
];

export default function ClientsCentral({
  clients,
  loading,
  onRefresh,
  onCreate,
  onOpen,
  onEdit,
  onDelete,
  onCreateFollowUp,
}: {
  clients: CentralClient[];
  loading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onOpen: (client: CentralClient) => void;
  onEdit: (client: CentralClient) => void;
  onDelete: (client: CentralClient) => void;
  onCreateFollowUp: (client: CentralClient) => void;
}) {
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('TODOS');
  const [showFilters, setShowFilters] = useState(false);
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [responsible, setResponsible] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<'ATTENTION' | 'RECENT' | 'NAME'>('ATTENTION');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pageSize = 12;

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const enriched = useMemo(() => clients.map((client) => ({ client, info: clientOperational(client) })), [clients]);
  const areas = useMemo(() => Array.from(new Set(clients.map((item) => item.legalArea).filter(Boolean) as string[])).sort(), [clients]);
  const cities = useMemo(() => Array.from(new Set(clients.map((item) => [item.city, item.state].filter(Boolean).join('/')).filter(Boolean))).sort(), [clients]);
  const responsibles = useMemo(() => Array.from(new Map(clients.filter((item) => item.lawyerInCharge).map((item) => [item.lawyerInCharge!.id, item.lawyerInCharge!.name])).entries()), [clients]);

  const metrics = useMemo(() => ({
    total: enriched.length,
    attention: enriched.filter((item) => item.info.requiresAttention).length,
    newMonth: enriched.filter((item) => item.info.newThisMonth).length,
    stale: enriched.filter((item) => item.info.stale).length,
    awaitingDocs: enriched.filter((item) => item.info.awaitingDocs).length,
    awaitingSignature: enriched.filter((item) => item.info.pendingDocuments.length > 0).length,
  }), [enriched]);

  const filtered = useMemo(() => {
    const needle = normalize(search);
    const list = enriched.filter(({ client, info }) => {
      const haystack = normalize([
        client.name, client.cpfCnpj, client.phone, client.whatsapp, client.email, client.city, client.state,
        client.legalArea, client.notes, client.processNumber, client.lawyerInCharge?.name,
        ...(client.processes || []).flatMap((item) => [item.title, item.protocolNumber, item.legalArea]),
        ...(client.documents || []).map((item) => item.title),
        ...(client.pendencies || []).flatMap((item) => [item.title, item.description, item.category]),
      ].join(' '));
      if (needle && !haystack.includes(needle)) return false;
      if (area && client.legalArea !== area && !client.processes?.some((item) => item.legalArea === area)) return false;
      if (city && [client.city, client.state].filter(Boolean).join('/') !== city) return false;
      if (responsible && client.lawyerInCharge?.id !== responsible) return false;
      if (status && info.status !== status) return false;
      if (quickFilter === 'ATENCAO' && !info.requiresAttention) return false;
      if (quickFilter === 'AGUARDANDO' && !info.waitingClient) return false;
      if (quickFilter === 'PENDENCIAS' && !(client.pendencies || []).length && !info.pendingDocuments.length) return false;
      if (quickFilter === 'NOVOS' && !info.newThisMonth) return false;
      if (quickFilter === 'PARADOS' && !info.stale) return false;
      if (quickFilter === 'SEM_DEMANDA' && info.status !== 'SEM_DEMANDA') return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === 'NAME') return a.client.name.localeCompare(b.client.name, 'pt-BR');
      if (sort === 'RECENT') return b.info.lastActivity.getTime() - a.info.lastActivity.getTime();
      const weight: Record<StatusKey, number> = { CRITICO: 0, ATENCAO: 1, AGUARDANDO: 2, ASSINATURA: 3, ANDAMENTO: 4, CONCLUIDO: 5, SEM_DEMANDA: 6 };
      return weight[a.info.status] - weight[b.info.status] || b.info.lastActivity.getTime() - a.info.lastActivity.getTime();
    });
  }, [enriched, search, area, city, responsible, status, quickFilter, sort]);

  useEffect(() => setPage(1), [search, area, city, responsible, status, quickFilter, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectedClients = clients.filter((item) => selected.has(item.id));
  const activeFilters = [area, city, responsible, status].filter(Boolean).length;

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      const everySelected = visible.every(({ client }) => next.has(client.id));
      visible.forEach(({ client }) => everySelected ? next.delete(client.id) : next.add(client.id));
      return next;
    });
  };

  const exportSelected = () => {
    if (!selectedClients.length) return;
    const rows = [['Cliente', 'CPF/CNPJ', 'Telefone', 'E-mail', 'Cidade', 'Área'], ...selectedClients.map((client) => [client.name, client.cpfCnpj, client.phone, client.email || '', [client.city, client.state].filter(Boolean).join('/'), client.legalArea || ''])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = 'clientes-selecionados.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const clearFilters = () => { setArea(''); setCity(''); setResponsible(''); setStatus(''); setQuickFilter('TODOS'); };
  const metricItems: Array<{ label: string; value: number; Icon: LucideIcon; color: string; quick?: QuickFilter }> = [
    { label: 'Total de clientes', value: metrics.total, Icon: UsersRound, color: 'text-[#071B3A]' },
    { label: 'Precisam de atenção', value: metrics.attention, Icon: CircleAlert, color: metrics.attention ? 'text-rose-600' : 'text-slate-500', quick: 'ATENCAO' },
    { label: 'Novos neste mês', value: metrics.newMonth, Icon: UserPlus, color: 'text-blue-600', quick: 'NOVOS' },
    { label: 'Sem movimento +30d', value: metrics.stale, Icon: Clock3, color: metrics.stale ? 'text-amber-600' : 'text-slate-500', quick: 'PARADOS' },
    { label: 'Aguardando documentos', value: metrics.awaitingDocs, Icon: FileClock, color: 'text-violet-600' },
    { label: 'Aguardando assinatura', value: metrics.awaitingSignature, Icon: FileCheck2, color: 'text-sky-600' },
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_14px_40px_-32px_rgba(7,27,58,.45)] sm:px-6">
        <span className="absolute inset-y-0 left-0 w-1 bg-[#d6b23f]" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#071B3A] text-[#e3c45e] shadow-[0_12px_24px_-15px_rgba(7,27,58,.85)]"><UsersRound className="h-5 w-5" /></span>
            <div className="min-w-0">
              <div className="mb-1 text-[9px] font-black uppercase tracking-[.2em] text-[#b79222]">Carteira do escritório</div>
              <h1 className="font-heading text-2xl font-black tracking-tight text-[#071B3A] sm:text-[28px]">Central de Clientes</h1>
              <p className="mt-1 max-w-2xl text-[11px] font-medium leading-5 text-slate-500 sm:text-xs">Uma visão única para localizar clientes, acompanhar pendências e acessar toda a operação jurídica.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pl-16 lg:pl-0">
            <button onClick={onRefresh} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-extrabold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"><Clock3 className="h-3.5 w-3.5" /> Atualizar</button>
            <button onClick={onCreate} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#071B3A] px-4 text-[11px] font-black text-white shadow-[0_12px_24px_-16px_rgba(7,27,58,.9)] transition hover:bg-[#12335e]"><UserPlus className="h-4 w-4 text-[#e3c45e]" /> Novo cliente</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_32px_-30px_rgba(7,27,58,.4)] sm:grid-cols-3 xl:grid-cols-6">
        {metricItems.map(({ label, value, Icon, color, quick }) => (
          <button key={label} onClick={() => quick && setQuickFilter(quick)} className="group flex min-h-[84px] items-center gap-3 border-b border-r border-slate-100 px-4 text-left transition hover:bg-[#fafbfc] xl:border-b-0">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 ${color}`}><Icon className="h-4 w-4" /></span>
            <span><strong className="block font-heading text-[19px] font-black leading-none text-[#071B3A]">{value}</strong><span className="mt-1.5 block text-[8px] font-black uppercase leading-3 tracking-[.08em] text-slate-400">{label}</span></span>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, CPF/CNPJ, telefone, processo, benefício, protocolo ou observação..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFilters((value) => !value)} className={`relative inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-extrabold transition xl:flex-none ${showFilters || activeFilters ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><SlidersHorizontal className="h-4 w-4" /> Filtros {activeFilters > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] text-white">{activeFilters}</span>}</button>
              <button onClick={() => setSort((current) => current === 'ATTENTION' ? 'RECENT' : current === 'RECENT' ? 'NAME' : 'ATTENTION')} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 xl:flex-none"><ArrowDownUp className="h-4 w-4" /> {sort === 'ATTENTION' ? 'Prioridade' : sort === 'RECENT' ? 'Recentes' : 'Nome'}</button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect label="Área jurídica" value={area} onChange={setArea} options={areas.map((item) => [item, item])} />
              <FilterSelect label="Cidade" value={city} onChange={setCity} options={cities.map((item) => [item, item])} />
              <FilterSelect label="Responsável" value={responsible} onChange={setResponsible} options={responsibles} />
              <FilterSelect label="Status operacional" value={status} onChange={setStatus} options={(Object.entries(STATUS) as Array<[StatusKey, typeof STATUS[StatusKey]]>).map(([key, item]) => [key, item.label])} />
              <div className="flex items-end sm:col-span-2 lg:col-span-4 lg:justify-end"><button onClick={clearFilters} className="text-[11px] font-extrabold text-slate-500 hover:text-blue-700">Limpar todos os filtros</button></div>
            </div>
          )}

          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {QUICK_FILTERS.map((item) => (
              <button key={item.key} onClick={() => setQuickFilter(item.key)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition ${quickFilter === item.key ? 'border-[#071B3A] bg-[#071B3A] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-[#071B3A]'}`}>{item.label}</button>
            ))}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2 text-xs font-extrabold text-blue-900"><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] text-white">{selected.size}</span> clientes selecionados</div>
            <div className="flex flex-wrap gap-2"><button onClick={exportSelected} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-[10px] font-extrabold text-blue-800"><Download className="h-3.5 w-3.5" /> Exportar seleção</button><button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-2 text-[10px] font-extrabold text-slate-500">Limpar seleção</button></div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : visible.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search className="h-6 w-6" /></span><h3 className="font-heading text-base font-black text-[#071B3A]">Nenhum cliente encontrado</h3><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Ajuste a busca ou limpe os filtros para visualizar outros cadastros.</p><button onClick={clearFilters} className="mt-4 text-xs font-extrabold text-blue-700">Limpar filtros</button></div>
        ) : (
          <div className="bg-[#f6f8fb]">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-extrabold text-slate-600"><input type="checkbox" checked={visible.length > 0 && visible.every(({ client }) => selected.has(client.id))} onChange={toggleAllVisible} className="h-4 w-4 rounded border-slate-300 text-blue-600" /> Selecionar clientes desta página</label>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.13em] text-slate-400"><span className="h-px w-6 bg-[#d6b23f]" /> Carteira operacional</div>
            </div>

            <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2 2xl:grid-cols-3">
              {visible.map(({ client, info }) => {
                const statusInfo = STATUS[info.status];
                const due = dueLabel(info.due);
                const whatsapp = String(client.whatsapp || client.phone || '').replace(/\D/g, '');
                return (
                  <article key={client.id} onClick={() => onOpen(client)} className="group relative cursor-pointer rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-[0_10px_28px_-28px_rgba(7,27,58,.48)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_38px_-26px_rgba(7,27,58,.34)]">
                    <span className={`absolute inset-y-4 left-0 w-[3px] rounded-r-full ${statusInfo.dot}`} />

                    <div className="flex items-start gap-3">
                      <div onClick={(event) => event.stopPropagation()} className="pt-1"><input type="checkbox" checked={selected.has(client.id)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(client.id) ? next.delete(client.id) : next.add(client.id); return next; })} className="h-4 w-4 rounded border-slate-300 text-blue-600" /></div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-br from-[#f8fafc] to-[#eef2f7] font-heading text-[11px] font-black text-[#071B3A] transition group-hover:border-[#d7c06b]">{initials(client.name)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><strong className="block truncate font-heading text-[13px] font-black text-[#071B3A]">{client.name}</strong><span className="mt-1 block truncate text-[10px] font-semibold text-slate-400">{maskCpfCnpj(client.cpfCnpj)}{client.city ? ` · ${client.city}${client.state ? `/${client.state}` : ''}` : ''}</span></div>
                          <div className="relative shrink-0" onClick={(event) => event.stopPropagation()}><button onClick={() => setMenuId(menuId === client.id ? null : client.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#071B3A]" aria-label={`Mais ações para ${client.name}`}><MoreHorizontal className="h-4 w-4" /></button>{menuId === client.id && <ActionMenu menuRef={menuRef} client={client} onOpen={() => onOpen(client)} onEdit={() => onEdit(client)} onFollowUp={() => onCreateFollowUp(client)} onDelete={() => onDelete(client)} />}</div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[8px] font-black ${statusInfo.classes}`}><span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />{statusInfo.label}</span>{info.pendingDocuments.length > 0 && <span className="rounded-full border border-sky-100 bg-sky-50 px-2 py-1 text-[8px] font-black text-sky-700">Assinatura pendente</span>}</div>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 border-y border-slate-100 py-2.5">
                      <div className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-[.12em] text-slate-400">Demanda</span><strong className="mt-1 block truncate text-[10px] font-extrabold text-slate-700">{info.currentProcess?.title || client.legalArea || 'Sem demanda ativa'}</strong>{info.currentProcess?.protocolNumber && <span className="mt-0.5 block truncate text-[8px] text-slate-400">Prot. {info.currentProcess.protocolNumber}</span>}</div>
                      <div className="min-w-0 border-l border-slate-100 pl-3"><span className="block text-[8px] font-black uppercase tracking-[.12em] text-slate-400">Responsável</span><strong className="mt-1 block truncate text-[10px] font-extrabold text-slate-700">{client.lawyerInCharge?.name || 'A definir'}</strong><span className="mt-0.5 block truncate text-[8px] text-slate-400">{client.legalArea || info.currentProcess?.legalArea || 'Área geral'}</span></div>
                    </div>

                    <div className="mt-2 rounded-xl border border-[#eadca9] bg-[#fffdf7] px-2.5 py-2">
                      <div className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[#f4e9bd] text-[#8c6910]"><Zap className="h-3 w-3" /></span><div className="min-w-0 flex-1"><span className="block text-[8px] font-black uppercase tracking-[.11em] text-[#9c7b24]">{info.mainPendency ? 'Acompanhamento em aberto' : 'Próxima ação'}</span><strong className="mt-0.5 block truncate text-[10px] font-black leading-4 text-[#071B3A]">{info.nextAction}</strong>{due && <span className={`mt-0.5 inline-flex items-center gap-1 text-[8px] font-bold ${due.overdue ? 'text-rose-600' : 'text-amber-700'}`}><CalendarClock className="h-3 w-3" />{due.text}</span>}</div></div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0"><strong className="block truncate text-[10px] font-extrabold text-slate-600">{maskPhone(client.phone)}</strong><span className="mt-0.5 block truncate text-[8px] text-slate-400">{dateLabel(info.lastActivity)} · {info.activityDescription}</span></div>
                      <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>{whatsapp && <a href={`https://wa.me/${whatsapp.startsWith('55') ? whatsapp : `55${whatsapp}`}`} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100" aria-label={`WhatsApp de ${client.name}`}><MessageCircle className="h-3.5 w-3.5" /></a>}<button onClick={() => onCreateFollowUp(client)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dec66e] bg-[#fffaf0] px-2 text-[8px] font-black text-[#7d5f0d] transition hover:bg-[#f8edc4]"><Plus className="h-3 w-3" /> Acompanhar</button><button onClick={() => onOpen(client)} className="h-8 rounded-lg bg-[#071B3A] px-2.5 text-[8px] font-black text-white transition hover:bg-[#12335e]">Abrir ficha</button></div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-[10px] font-semibold text-slate-400">Exibindo <strong className="text-slate-600">{visible.length}</strong> de <strong className="text-slate-600">{filtered.length}</strong> clientes</p><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span className="px-2 text-[10px] font-extrabold text-slate-600">{page} de {pages}</span><button disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="space-y-1.5"><span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-400"><option value="">Todos</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function ActionMenu({ menuRef, client, onOpen, onEdit, onFollowUp, onDelete }: { menuRef: React.RefObject<HTMLDivElement>; client: CentralClient; onOpen: () => void; onEdit: () => void; onFollowUp: () => void; onDelete: () => void }) {
  const phone = String(client.whatsapp || client.phone || '').replace(/\D/g, '');
  const href = phone ? `https://wa.me/${phone.startsWith('55') ? phone : `55${phone}`}` : '#';
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[#071B3A]';
  return <div ref={menuRef} className="absolute right-0 top-10 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-[0_18px_45px_-15px_rgba(15,23,42,.28)]">
    <button onClick={onOpen} className={item}><UsersRound className="h-3.5 w-3.5" /> Ver cliente</button>
    <button onClick={onEdit} className={item}><SlidersHorizontal className="h-3.5 w-3.5" /> Editar cadastro</button>
    <button onClick={onFollowUp} className={item}><CalendarClock className="h-3.5 w-3.5 text-[#9c7b24]" /> Criar acompanhamento</button>
    <a href={href} target="_blank" rel="noreferrer" className={item}><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> Enviar WhatsApp</a>
    <div className="my-1 border-t border-slate-100" />
    <a href={`/processos?clienteId=${client.id}`} className={item}><FolderKanban className="h-3.5 w-3.5" /> Criar ou abrir demanda</a>
    <a href={`/documentos/novo?clientId=${client.id}`} className={item}><FileCheck2 className="h-3.5 w-3.5" /> Solicitar assinatura</a>
    <a href={`/kits/enviar?clientId=${client.id}`} className={item}><Sparkles className="h-3.5 w-3.5" /> Criar Kit Jurídico</a>
    <div className="my-1 border-t border-slate-100" />
    <button onClick={onDelete} className={`${item} text-rose-600 hover:bg-rose-50 hover:text-rose-700`}><Archive className="h-3.5 w-3.5" /> Excluir cliente</button>
  </div>;
}
