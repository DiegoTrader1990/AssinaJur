'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
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
  ArrowUpRight,
  Sparkle
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
type ViewFormat = 'KANBAN' | 'GRID' | 'TABLE';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [selectedClientFolder, setSelectedClientFolder] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [viewFormat, setViewFormat] = useState<ViewFormat>('KANBAN');

  // Seleção múltipla em lote
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
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

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setSavingTag(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar tag.');

      setNewTagName('');
      setNewTagColor(TAG_COLORS[0]);
      fetchTags();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!window.confirm('Excluir esta tag? Ela será removida de todos os documentos.')) return;
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir tag.');
      }
      if (selectedTagId === tagId) setSelectedTagId(null);
      fetchTags();
      fetchDocuments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleDocTag = async (doc: DocumentItem, tagId: string) => {
    const hasTag = doc.tags.some((t) => t.id === tagId);
    const newTagIds = hasTag
      ? doc.tags.filter((t) => t.id !== tagId).map((t) => t.id)
      : [...doc.tags.map((t) => t.id), tagId];

    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-tags', tagIds: newTagIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar tags.');

      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, tags: data.document.tags } : d)));
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc({ ...selectedDoc, tags: data.document.tags });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Seleção múltipla
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
    const cancelled = documents.filter((d) => d.status === 'CANCELADO' || d.status === 'RECUSADO').length;
    return { total, completed, inProgress, draft, cancelled };
  }, [documents]);

  // Filtro avançado composto (Busca + Estágio + Pasta Cliente + Tag)
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = doc.title.toLowerCase().includes(q);
        const clientMatch = doc.client?.name.toLowerCase().includes(q) || doc.client?.cpfCnpj.includes(q);
        const codeMatch = doc.verificationCode?.toLowerCase().includes(q);
        if (!titleMatch && !clientMatch && !codeMatch) return false;
      }

      if (categoryFilter === 'CONCLUIDO' && doc.status !== 'CONCLUIDO') return false;
      if (
        categoryFilter === 'EM_ANDAMENTO' &&
        !['ENVIADO', 'VISUALIZADO', 'PARCIALMENTE_ASSINADO', 'EM_ASSINATURA'].includes(doc.status)
      )
        return false;
      if (categoryFilter === 'RASCUNHO' && !['PRONTO_PARA_ENVIO', 'RASCUNHO'].includes(doc.status)) return false;
      if (categoryFilter === 'CANCELADO' && !['CANCELADO', 'RECUSADO', 'EXPIRADO'].includes(doc.status)) return false;

      if (selectedClientFolder) {
        if (selectedClientFolder === AVULSO_KEY) {
          if (doc.client) return false;
        } else {
          if (doc.client?.id !== selectedClientFolder) return false;
        }
      }

      if (selectedTagId) {
        if (!doc.tags?.some((t) => t.id === selectedTagId)) return false;
      }

      return true;
    });
  }, [documents, searchQuery, categoryFilter, selectedClientFolder, selectedTagId]);

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Enviado
          </span>
        );
      case 'VISUALIZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Visualizado
          </span>
        );
      case 'EM_ASSINATURA':
      case 'PARCIALMENTE_ASSINADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-extrabold text-[10px] border border-amber-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> Em Assinatura
          </span>
        );
      case 'CONCLUIDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 font-heading shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" /> Concluído
          </span>
        );
      case 'RECUSADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-extrabold text-[10px] border border-rose-200 font-heading">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Recusado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 font-extrabold text-[10px] border border-red-200 font-heading">
            <Ban className="w-3 h-3 text-red-500" /> Cancelado
          </span>
        );
      case 'EXPIRADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[10px] border border-slate-300 font-heading">
            Expirado
          </span>
        );
      case 'PRONTO_PARA_ENVIO':
      case 'RASCUNHO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[10px] border border-slate-200 font-heading">
            <Clock className="w-3 h-3 text-slate-500" /> Pronto p/ Envio
          </span>
        );
    }
  };

  /* RENDERIZADOR DE CARD KANBAN ULTRA-ORGANIZADO */
  const renderDocumentCard = (doc: DocumentItem) => {
    const signedCount = doc.signers.filter((s) => s.status === 'ASSINADO').length;
    const totalSigners = doc.signers.length;
    const isCompleted = doc.status === 'CONCLUIDO';
    const isSelected = selectedDocIds.has(doc.id);
    const firstSigner = doc.signers[0];

    return (
      <div
        key={doc.id}
        className={`bg-white p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-xs hover:shadow-md relative group ${
          isCompleted
            ? 'border-emerald-200/90 hover:border-emerald-300'
            : isSelected
            ? 'border-blue-600 ring-2 ring-blue-500/20'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        <div className="space-y-3">
          {/* Linha 1: Tipo de Documento & Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleSelectDoc(doc.id)} className="text-slate-400 hover:text-blue-600">
                {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
              </button>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase font-heading tracking-tight border border-slate-200">
                {doc.documentType || 'CONTRATO'}
              </span>
            </div>
            {getStatusBadge(doc.status)}
          </div>

          {/* Linha 2: Título do Documento */}
          <div>
            <h4 className="font-heading text-sm font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
              {doc.title}
            </h4>
          </div>

          {/* Linha 3: Box do Cliente (Organizado) */}
          {doc.client ? (
            <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/60 space-y-1">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 font-heading">
                <span className="truncate flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{doc.client.name}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>CPF: {maskCpfCnpj(doc.client.cpfCnpj)}</span>
                <span className="text-slate-400">
                  {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/50 text-[11px] text-slate-400 italic">
              Sem cliente específico vinculado
            </div>
          )}

          {/* Linha 4: Evidências ou Progresso de Assinatura */}
          {isCompleted ? (
            <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-200/70 flex items-center justify-between text-[10px] text-emerald-900 font-bold font-heading">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Prova de Vida Validade
              </span>
              <span className="font-mono text-emerald-700">MP 2.200-2</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 font-heading">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" /> Progresso
                </span>
                <span className="text-[#071B3A] font-extrabold">
                  {signedCount} de {totalSigners} assinados
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(signedCount / (totalSigners || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.tags.map((t) => (
                <span
                  key={t.id}
                  className="px-2 py-0.5 rounded-md text-[9px] font-extrabold text-white font-heading"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Linha 5: Botões de Ação Perfeitamente Alinhados */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
          {isCompleted ? (
            <a
              href={`/api/documents/${doc.id}/download`}
              download
              title="Baixar PDF Assinado com Certificado"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all font-heading"
            >
              <Download className="w-3.5 h-3.5" /> PDF Assinado
            </a>
          ) : firstSigner && doc.status !== 'CANCELADO' ? (
            <button
              onClick={() => handleOpenWhatsApp(doc.title, firstSigner.name, firstSigner.token)}
              className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-xl text-xs border border-emerald-200 flex items-center justify-center gap-1.5 font-heading shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
            </button>
          ) : <div className="flex-1" />}

          <button
            onClick={() => setSelectedDoc(doc)}
            className="px-3.5 py-2 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-xl text-xs font-heading shadow-2xs"
          >
            Dossiê
          </button>
          <button
            onClick={() => handleDelete(doc)}
            title="Excluir documento"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 bg-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Top Banner Executivo */}
      <div className="bg-gradient-to-r from-[#071B3A] via-[#0B254C] to-[#071B3A] text-white p-6 sm:p-7 rounded-3xl shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-[10px] uppercase tracking-widest font-heading border border-blue-400/30">
                Central Executiva de Contratos
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                MP 2.200-2 / Lei 14.063
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight">
              Gestão da Assinatura Digital
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Quadro organizacional amplo por estágio jurídico, certificação de evidências e envio por WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/documentos/novo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-blue-900/40 transition-all text-xs font-heading tracking-wide border border-white/20 active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Novo Documento
            </Link>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS SUPERIOR (EXPANDIDA DE PONTA A PONTA PARA DAR 100% DE ESPAÇO AO KANBAN) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Busca por texto */}
          <div className="w-full lg:w-96 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título de documento, cliente ou CPF..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium"
            />
          </div>

          {/* Filtros em Dropdown & Modo de Visualização */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
            {/* Dropdown por Cliente */}
            <select
              value={selectedClientFolder || ''}
              onChange={(e) => setSelectedClientFolder(e.target.value || null)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-extrabold focus:outline-none font-heading"
            >
              <option value="">📂 Todas as Pastas ({documents.length})</option>
              {clientFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.count})
                </option>
              ))}
            </select>

            {/* Alternador de Visualização Tríplice */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setViewFormat('KANBAN')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 font-heading ${
                  viewFormat === 'KANBAN' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>

              <button
                onClick={() => setViewFormat('GRID')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 font-heading ${
                  viewFormat === 'GRID' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>

              <button
                onClick={() => setViewFormat('TABLE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 font-heading ${
                  viewFormat === 'TABLE' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chips de Estágios Globais */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'ALL' ? 'bg-[#071B3A] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({stats.total})
          </button>

          <button
            onClick={() => setCategoryFilter('CONCLUIDO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'CONCLUIDO' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Concluídos ({stats.completed})
          </button>

          <button
            onClick={() => setCategoryFilter('EM_ANDAMENTO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'EM_ANDAMENTO' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            Em Assinatura ({stats.inProgress})
          </button>

          <button
            onClick={() => setCategoryFilter('RASCUNHO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-heading transition-all ${
              categoryFilter === 'RASCUNHO' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Prontos / Rascunhos ({stats.draft})
          </button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO KANBAN COM 100% DA LARGURA DA TELA */}
      {loading ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200/80 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="font-heading font-extrabold text-[#071B3A] text-sm">Carregando acervo jurídico...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-slate-200/80 text-center space-y-4 max-w-md mx-auto my-6">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
            <FileCheck2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading font-extrabold text-[#071B3A] text-base">Nenhum documento localizado</h3>
            <p className="text-xs text-slate-500 font-medium">Ajuste os filtros de busca no topo.</p>
          </div>
        </div>
      ) : viewFormat === 'KANBAN' ? (
        /* ESTRUTURA KANBAN AMPLA E ORGANIZADA (3 COLUNAS ESPAÇOSAS) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* Coluna 1: Concluídos */}
          <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="p-3 bg-white border border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs">
              <span className="font-heading font-black text-xs text-emerald-900 flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. Concluídos & Autênticos
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[10px] font-mono">
                {kanbanColumns.completed.length}
              </span>
            </div>

            <div className="space-y-3.5">
              {kanbanColumns.completed.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium bg-white/50">
                  Nenhum contrato assinado nesta busca
                </div>
              ) : (
                kanbanColumns.completed.map((doc) => renderDocumentCard(doc))
              )}
            </div>
          </div>

          {/* Coluna 2: Em Assinatura */}
          <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="p-3 bg-white border border-amber-200 rounded-2xl flex items-center justify-between shadow-2xs">
              <span className="font-heading font-black text-xs text-amber-900 flex items-center gap-2 uppercase tracking-wide">
                <Clock className="w-4 h-4 text-amber-600" /> 2. Em Assinatura (Cliente)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] font-mono">
                {kanbanColumns.inProgress.length}
              </span>
            </div>

            <div className="space-y-3.5">
              {kanbanColumns.inProgress.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium bg-white/50">
                  Nenhum documento pendente nesta busca
                </div>
              ) : (
                kanbanColumns.inProgress.map((doc) => renderDocumentCard(doc))
              )}
            </div>
          </div>

          {/* Coluna 3: Rascunhos / Prontos */}
          <div className="bg-slate-50/70 p-4 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
              <span className="font-heading font-black text-xs text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <FileCheck2 className="w-4 h-4 text-slate-600" /> 3. Prontos p/ Envio
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px] font-mono">
                {kanbanColumns.drafts.length}
              </span>
            </div>

            <div className="space-y-3.5">
              {kanbanColumns.drafts.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium bg-white/50">
                  Nenhum rascunho localizado
                </div>
              ) : (
                kanbanColumns.drafts.map((doc) => renderDocumentCard(doc))
              )}
            </div>
          </div>
        </div>
      ) : viewFormat === 'GRID' ? (
        /* VISÃO GRADES */
        <div className="grid md:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => renderDocumentCard(doc))}
        </div>
      ) : (
        /* VISÃO TABELA */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-500 font-heading">
                <tr>
                  <th className="px-6 py-4">Título do Documento</th>
                  <th className="px-6 py-4">Cliente / CPF</th>
                  <th className="px-6 py-4">Assinaturas</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-extrabold text-slate-900 font-heading">{doc.title}</td>
                    <td className="px-6 py-4 text-slate-600">{doc.client?.name || 'Avulso'}</td>
                    <td className="px-6 py-4">
                      {doc.signers.filter((s) => s.status === 'ASSINADO').length} de {doc.signers.length} assinados
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="px-3.5 py-1.5 bg-[#071B3A] text-white font-extrabold rounded-xl text-xs"
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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh] space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase font-heading border border-blue-200">
                  {selectedDoc.documentType || 'DOCUMENTO'}
                </span>
                <h2 className="font-heading text-xl font-black text-[#071B3A] mt-1">{selectedDoc.title}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {(selectedDoc.status === 'CONCLUIDO' || selectedDoc.status === 'PARCIALMENTE_ASSINADO') && (
                <a
                  href={`/api/documents/${selectedDoc.id}/download`}
                  download
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all font-heading"
                >
                  <Download className="w-4 h-4" /> Baixar Documento Assinado com Certificado (.PDF)
                </a>
              )}

              <div>
                <h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider mb-3 font-heading flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" /> Signatários & Links
                </h3>
                <div className="space-y-2.5">
                  {selectedDoc.signers.map((s) => (
                    <div key={s.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900">{s.name} ({s.role})</div>
                        <div className="text-slate-500 font-mono text-[11px]">CPF: {s.cpf}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenWhatsApp(selectedDoc.title, s.name, s.token)}
                          className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 font-extrabold rounded-xl border border-emerald-200 flex items-center gap-1 text-xs"
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
