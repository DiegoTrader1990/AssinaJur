'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileCheck2,
  Plus,
  Search,
  Copy,
  Check,
  Send,
  Ban,
  Loader2,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  FileText,
  Download,
  Award,
  Trash2,
  Folder,
  FolderOpen,
  Tag as TagIcon,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  Sparkles,
  Share2,
  Scale,
  ShieldCheck,
  Users,
  AlertCircle,
  Inbox,
  Layers,
  Filter,
  CheckSquare,
  Square,
  MessageSquare,
  Kanban,
  Calendar,
  KeyRound,
  User,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  History
} from 'lucide-react';
import { maskCpfCnpj } from '@/lib/formatters';

interface Signer {
  id: string;
  name: string;
  cpf: string;
  role: string;
  status: string;
  token: string;
  signedAt?: string;
  ip?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface DocumentItem {
  id: string;
  title: string;
  documentType: string;
  status: string;
  verificationCode?: string;
  createdAt: string;
  completedAt?: string;
  client?: { id: string; name: string; cpfCnpj: string };
  signers: Signer[];
  createdBy?: { name: string };
  tags: Tag[];
}

const TAG_COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#475569'];
const AVULSO_KEY = '__avulso__';

type CategoryFilter = 'ALL' | 'CONCLUIDO' | 'EM_ANDAMENTO' | 'RASCUNHO' | 'CANCELADO';
type DateFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
type SortOrder = 'NEWEST' | 'OLDEST';
type ViewFormat = 'KANBAN' | 'COMPACT' | 'TABLE';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('NEWEST');
  const [selectedClientFolder, setSelectedClientFolder] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [viewFormat, setViewFormat] = useState<ViewFormat>('KANBAN');

  // Seleção múltipla em lote
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [savingTag, setSavingTag] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/documents', window.location.origin);
      if (searchQuery) url.searchParams.set('q', searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.documents) setDocuments(data.documents);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      if (data.tags) setAllTags(data.tags);
    } catch (err) {
      console.error('Erro ao carregar tags:', err);
    }
  };

  const handleCopyLink = (signerToken: string) => {
    const link = `${window.location.origin}/assinar/${signerToken}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(signerToken);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleOpenWhatsApp = (docTitle: string, signerName: string, signerToken: string) => {
    const link = `${window.location.origin}/assinar/${signerToken}`;
    const text = encodeURIComponent(
      `Olá ${signerName}, tudo bem?\n\nSegue o link seguro para sua assinatura eletrônica no documento *${docTitle}* com Prova de Presença ao Vivo:\n\n${link}\n\nAtenciosamente,\nRodrigues & Soares Advocacia.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDelete = async (doc: DocumentItem) => {
    const isConcluded = doc.status === 'CONCLUIDO';
    const warning = isConcluded
      ? `Este documento já foi ASSINADO e CONCLUÍDO. Excluir "${doc.title}" apaga permanentemente o certificado de evidências — tem certeza?`
      : `Tem certeza que deseja excluir permanentemente "${doc.title}"? Essa ação não pode ser desfeita.`;

    if (!window.confirm(warning)) return;

    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir documento.');

      fetchDocuments();
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Estatísticas globais do acervo
  const stats = useMemo(() => {
    const total = documents.length;
    const completed = documents.filter((d) => d.status === 'CONCLUIDO').length;
    const inProgress = documents.filter(
      (d) => d.status === 'ENVIADO' || d.status === 'VISUALIZADO' || d.status === 'PARCIALMENTE_ASSINADO' || d.status === 'EM_ASSINATURA'
    ).length;
    const draft = documents.filter((d) => d.status === 'PRONTO_PARA_ENVIO' || d.status === 'RASCUNHO').length;
    return { total, completed, inProgress, draft };
  }, [documents]);

  // Filtro avançado composto com ORDENAÇÃO E FILTRO POR DATA
  const filteredDocuments = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

    let result = documents.filter((doc) => {
      // 1. Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = doc.title.toLowerCase().includes(q);
        const clientMatch = doc.client?.name.toLowerCase().includes(q) || doc.client?.cpfCnpj.includes(q);
        const codeMatch = doc.verificationCode?.toLowerCase().includes(q);
        if (!titleMatch && !clientMatch && !codeMatch) return false;
      }

      // 2. Filtro por Estágio
      if (categoryFilter === 'CONCLUIDO' && doc.status !== 'CONCLUIDO') return false;
      if (
        categoryFilter === 'EM_ANDAMENTO' &&
        !['ENVIADO', 'VISUALIZADO', 'PARCIALMENTE_ASSINADO', 'EM_ASSINATURA'].includes(doc.status)
      )
        return false;
      if (categoryFilter === 'RASCUNHO' && !['PRONTO_PARA_ENVIO', 'RASCUNHO'].includes(doc.status)) return false;
      if (categoryFilter === 'CANCELADO' && !['CANCELADO', 'RECUSADO', 'EXPIRADO'].includes(doc.status)) return false;

      // 3. Filtro por Data
      const docTime = new Date(doc.createdAt).getTime();
      if (dateFilter === 'TODAY' && docTime < todayStart) return false;
      if (dateFilter === 'WEEK' && docTime < weekStart) return false;
      if (dateFilter === 'MONTH' && docTime < monthStart) return false;

      // 4. Pasta de Cliente
      if (selectedClientFolder) {
        if (selectedClientFolder === AVULSO_KEY) {
          if (doc.client) return false;
        } else {
          if (doc.client?.id !== selectedClientFolder) return false;
        }
      }

      // 5. Tag
      if (selectedTagId) {
        if (!doc.tags?.some((t) => t.id === selectedTagId)) return false;
      }

      return true;
    });

    // Ordenação por Data (Mais recentes vs Mais antigos)
    result.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [documents, searchQuery, categoryFilter, dateFilter, sortOrder, selectedClientFolder, selectedTagId]);

  // Divisão dos documentos por coluna para o Kanban
  const kanbanColumns = useMemo(() => {
    const completed = filteredDocuments.filter((d) => d.status === 'CONCLUIDO');
    const inProgress = filteredDocuments.filter((d) =>
      ['ENVIADO', 'VISUALIZADO', 'PARCIALMENTE_ASSINADO', 'EM_ASSINATURA'].includes(d.status)
    );
    const drafts = filteredDocuments.filter((d) =>
      ['PRONTO_PARA_ENVIO', 'RASCUNHO', 'CANCELADO', 'RECUSADO', 'EXPIRADO'].includes(d.status)
    );
    return { completed, inProgress, drafts };
  }, [filteredDocuments]);

  // Lista de clientes para o dropdown de pastas
  const clientFolders = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    let avulsoCount = 0;

    for (const doc of documents) {
      if (doc.client) {
        if (!map.has(doc.client.id)) {
          map.set(doc.client.id, { id: doc.client.id, name: doc.client.name, count: 0 });
        }
        map.get(doc.client.id)!.count += 1;
      } else {
        avulsoCount += 1;
      }
    }

    const arr = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    if (avulsoCount > 0) {
      arr.push({ id: AVULSO_KEY, name: 'Sem Cliente (Avulso)', count: avulsoCount });
    }
    return arr;
  }, [documents]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Enviado
          </span>
        );
      case 'VISUALIZADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Visualizado
          </span>
        );
      case 'EM_ASSINATURA':
      case 'PARCIALMENTE_ASSINADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> Em Assinatura
          </span>
        );
      case 'CONCLUIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 font-heading">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Concluído
          </span>
        );
      case 'RECUSADO':
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200 font-heading">
            <Ban className="w-3 h-3 text-rose-600" /> Cancelado
          </span>
        );
      case 'PRONTO_PARA_ENVIO':
      case 'RASCUNHO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold text-[10px] border border-slate-200 font-heading">
            <Clock className="w-3 h-3 text-slate-500" /> Pronto
          </span>
        );
    }
  };

  /* CARD KANBAN ULTRA-COMPACTO DE ALTA DENSIDADE (NÃO EMBOLA) */
  const renderCompactCard = (doc: DocumentItem) => {
    const signedCount = doc.signers.filter((s) => s.status === 'ASSINADO').length;
    const totalSigners = doc.signers.length;
    const isCompleted = doc.status === 'CONCLUIDO';
    const isSelected = selectedDocIds.has(doc.id);
    const firstSigner = doc.signers[0];

    const formattedDate = new Date(doc.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    return (
      <div
        key={doc.id}
        className={`bg-white p-3 rounded-xl border transition-all space-y-2 relative group shadow-2xs hover:shadow-sm ${
          isCompleted
            ? 'border-emerald-200 hover:border-emerald-300'
            : isSelected
            ? 'border-blue-600 ring-1 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Linha 1: Status Badge + Data Formatada */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <button onClick={() => toggleSelectDoc(doc.id)} className="text-slate-400 hover:text-blue-600">
              {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
            </button>
            {getStatusBadge(doc.status)}
          </div>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" /> {formattedDate}
          </span>
        </div>

        {/* Linha 2: Título do Documento em 1 linha limpa */}
        <h4 className="font-heading text-xs font-black text-slate-900 truncate leading-snug group-hover:text-blue-600 transition-colors">
          {doc.title}
        </h4>

        {/* Linha 3: Cliente + CPF (Uma Única Linha Compacta) */}
        <div className="flex items-center justify-between text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <span className="truncate font-bold text-slate-700 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{doc.client?.name || 'Sem cliente'}</span>
          </span>
          {doc.client?.cpfCnpj && (
            <span className="font-mono text-slate-400 shrink-0 text-[9px] ml-1">
              {maskCpfCnpj(doc.client.cpfCnpj)}
            </span>
          )}
        </div>

        {/* Linha 4: Ações Alinhadas em Botões Ícones/Texto Compactos */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
          {isCompleted ? (
            <a
              href={`/api/documents/${doc.id}/download`}
              download
              title="Baixar PDF Assinado"
              className="flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center gap-1 font-heading"
            >
              <Download className="w-3 h-3" /> PDF Assinado
            </a>
          ) : firstSigner && doc.status !== 'CANCELADO' ? (
            <button
              onClick={() => handleOpenWhatsApp(doc.title, firstSigner.name, firstSigner.token)}
              title="Enviar cobrança pelo WhatsApp"
              className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-lg text-[10px] border border-emerald-200 flex items-center justify-center gap-1 font-heading"
            >
              <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
            </button>
          ) : (
            <span className="flex-1 text-[10px] text-slate-400 text-center font-mono">
              {signedCount}/{totalSigners} assinados
            </span>
          )}

          <button
            onClick={() => setSelectedDoc(doc)}
            className="px-2.5 py-1 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-lg text-[10px] font-heading"
          >
            Dossiê
          </button>
          {doc.status !== 'CONCLUIDO' && (
            <button
              onClick={() => handleDelete(doc)}
              title="Excluir"
              className="p-1 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Header Compacto da Página */}
      <div className="bg-gradient-to-r from-[#071B3A] via-[#0B254C] to-[#071B3A] text-white p-5 rounded-3xl shadow-lg relative overflow-hidden border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-[9px] uppercase tracking-widest font-heading border border-blue-400/30">
              Central de Documentos
            </span>
            <span className="text-[10px] font-mono text-slate-300">MP 2.200-2 / Lei 14.063</span>
          </div>
          <h1 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight">
            Gestão & Evidências de Assinatura
          </h1>
        </div>

        <Link
          href="/documentos/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md text-xs font-heading"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Novo Envio
        </Link>
      </div>

      {/* PAINEL DE CONTROLE E FILTROS COMPACTOS COM ORDENAÇÃO POR DATA */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Linha 1: Busca + Ordenação por Data + Dropdowns */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="w-full lg:w-80 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documento, cliente ou CPF..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            {/* Seletor de Ordenação por Data */}
            <button
              onClick={() => setSortOrder(sortOrder === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 flex items-center gap-1.5 font-heading"
              title="Mudar ordenação da data"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>{sortOrder === 'NEWEST' ? 'Mais Recentes Primeiro' : 'Mais Antigos Primeiro'}</span>
            </button>

            {/* Dropdown por Filtro de Período de Data */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-extrabold focus:outline-none font-heading"
            >
              <option value="ALL">🗓️ Todo o Período</option>
              <option value="TODAY">🗓️ Criados Hoje</option>
              <option value="WEEK">🗓️ Últimos 7 dias</option>
              <option value="MONTH">🗓️ Último Mês</option>
            </select>

            {/* Dropdown por Pastas de Cliente */}
            <select
              value={selectedClientFolder || ''}
              onChange={(e) => setSelectedClientFolder(e.target.value || null)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-extrabold focus:outline-none font-heading max-w-[200px] truncate"
            >
              <option value="">📂 Todas as Pastas ({documents.length})</option>
              {clientFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.count})
                </option>
              ))}
            </select>

            {/* Alternador de Visualização */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewFormat('KANBAN')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 font-heading ${
                  viewFormat === 'KANBAN' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>

              <button
                onClick={() => setViewFormat('TABLE')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 font-heading ${
                  viewFormat === 'TABLE' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>
            </div>
          </div>
        </div>

        {/* Linha 2: Chips de Estágios Otimizados */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'ALL' ? 'bg-[#071B3A] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({stats.total})
          </button>

          <button
            onClick={() => setCategoryFilter('CONCLUIDO')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'CONCLUIDO' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Concluídos ({stats.completed})
          </button>

          <button
            onClick={() => setCategoryFilter('EM_ANDAMENTO')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'EM_ANDAMENTO' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            Em Assinatura ({stats.inProgress})
          </button>

          <button
            onClick={() => setCategoryFilter('RASCUNHO')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'RASCUNHO' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Prontos / Rascunhos ({stats.draft})
          </button>
        </div>
      </div>

      {/* ÁREA KANBAN DE ALTA DENSIDADE (ORGANIZADO E SEM EMBOLAR) */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-2">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto" />
          <p className="font-heading font-extrabold text-[#071B3A] text-xs">Carregando acervo...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 max-w-sm mx-auto my-4">
          <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-heading font-extrabold text-[#071B3A] text-sm">Nenhum documento localizado</p>
          <p className="text-xs text-slate-500">Tente ajustar o filtro de busca ou período de data acima.</p>
        </div>
      ) : viewFormat === 'KANBAN' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Coluna 1: Concluídos */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-3">
            <div className="p-2.5 bg-white border border-emerald-200 rounded-xl flex items-center justify-between shadow-2xs">
              <span className="font-heading font-black text-xs text-emerald-900 flex items-center gap-1.5 uppercase">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 1. Concluídos ({kanbanColumns.completed.length})
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">100% Válidos</span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-0.5">
              {kanbanColumns.completed.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium bg-white/40">
                  Nenhum concluído neste filtro
                </div>
              ) : (
                kanbanColumns.completed.map((doc) => renderCompactCard(doc))
              )}
            </div>
          </div>

          {/* Coluna 2: Em Assinatura */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-3">
            <div className="p-2.5 bg-white border border-amber-200 rounded-xl flex items-center justify-between shadow-2xs">
              <span className="font-heading font-black text-xs text-amber-900 flex items-center gap-1.5 uppercase">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> 2. Em Assinatura ({kanbanColumns.inProgress.length})
              </span>
              <span className="text-[10px] text-amber-700 font-mono font-bold">Aguardando Cliente</span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-0.5">
              {kanbanColumns.inProgress.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium bg-white/40">
                  Nenhum pendente neste filtro
                </div>
              ) : (
                kanbanColumns.inProgress.map((doc) => renderCompactCard(doc))
              )}
            </div>
          </div>

          {/* Coluna 3: Rascunhos */}
          <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200 space-y-3">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
              <span className="font-heading font-black text-xs text-slate-800 flex items-center gap-1.5 uppercase">
                <FileCheck2 className="w-3.5 h-3.5 text-slate-600" /> 3. Prontos ({kanbanColumns.drafts.length})
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">Em Preparação</span>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-0.5">
              {kanbanColumns.drafts.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium bg-white/40">
                  Nenhum rascunho neste filtro
                </div>
              ) : (
                kanbanColumns.drafts.map((doc) => renderCompactCard(doc))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VISÃO TABELA */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 font-heading">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Título do Documento</th>
                  <th className="px-5 py-3">Cliente / CPF</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3 font-extrabold text-slate-900 font-heading">{doc.title}</td>
                    <td className="px-5 py-3 text-slate-600">{doc.client?.name || 'Avulso'}</td>
                    <td className="px-5 py-3">{getStatusBadge(doc.status)}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="px-3 py-1 bg-[#071B3A] text-white font-extrabold rounded-lg text-xs"
                      >
                        Dossiê
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over / Modal: Dossiê Jurídico & Evidências */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh] space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase font-heading border border-blue-200">
                  {selectedDoc.documentType || 'DOCUMENTO'}
                </span>
                <h2 className="font-heading text-lg font-black text-[#071B3A] mt-1">{selectedDoc.title}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {(selectedDoc.status === 'CONCLUIDO' || selectedDoc.status === 'PARCIALMENTE_ASSINADO') && (
                <a
                  href={`/api/documents/${selectedDoc.id}/download`}
                  download
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all font-heading"
                >
                  <Download className="w-4 h-4" /> Baixar Documento Assinado com Certificado (.PDF)
                </a>
              )}

              <div>
                <h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider mb-2 font-heading">
                  Signatários & Links WhatsApp
                </h3>
                <div className="space-y-2">
                  {selectedDoc.signers.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900">{s.name} ({s.role})</div>
                        <div className="text-slate-500 font-mono text-[10px]">CPF: {s.cpf}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenWhatsApp(selectedDoc.title, s.name, s.token)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg border border-emerald-200 flex items-center gap-1 text-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
