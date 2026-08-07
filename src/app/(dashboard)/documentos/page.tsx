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
  Kanban
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

      // 3. Pasta de Cliente
      if (selectedClientFolder) {
        if (selectedClientFolder === AVULSO_KEY) {
          if (doc.client) return false;
        } else {
          if (doc.client?.id !== selectedClientFolder) return false;
        }
      }

      // 4. Tag
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

  // Lista de clientes para o menu de pastas
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

  // Agrupamento de tabela por cliente
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; subtitle?: string; docs: DocumentItem[] }>();
    for (const doc of filteredDocuments) {
      const key = doc.client?.id || AVULSO_KEY;
      const label = doc.client?.name || 'Sem Cliente (Avulso)';
      if (!map.has(key)) {
        map.set(key, { key, label, subtitle: doc.client?.cpfCnpj, docs: [] });
      }
      map.get(key)!.docs.push(doc);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.key === AVULSO_KEY) return 1;
      if (b.key === AVULSO_KEY) return -1;
      return a.label.localeCompare(b.label, 'pt-BR');
    });
    return arr;
  }, [filteredDocuments]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Enviado
          </span>
        );
      case 'VISUALIZADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-[11px] border border-indigo-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Visualizado
          </span>
        );
      case 'EM_ASSINATURA':
      case 'PARCIALMENTE_ASSINADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-extrabold text-[11px] border border-amber-200 font-heading">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> Parcialmente Assinado
          </span>
        );
      case 'CONCLUIDO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-extrabold text-[11px] border border-emerald-300 font-heading shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Concluído
          </span>
        );
      case 'RECUSADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-extrabold text-[11px] border border-rose-200 font-heading">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Recusado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 font-extrabold text-[11px] border border-red-200 font-heading">
            <Ban className="w-3.5 h-3.5 text-red-500" /> Cancelado
          </span>
        );
      case 'EXPIRADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] border border-slate-300 font-heading">
            Expirado
          </span>
        );
      case 'PRONTO_PARA_ENVIO':
      case 'RASCUNHO':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] border border-slate-200 font-heading">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Pronto p/ Envio
          </span>
        );
    }
  };

  /* Renderizador de Card Distinto para Documentos Assinados vs Pendentes */
  const renderDocumentCard = (doc: DocumentItem) => {
    const signedCount = doc.signers.filter((s) => s.status === 'ASSINADO').length;
    const totalSigners = doc.signers.length;
    const isCompleted = doc.status === 'CONCLUIDO';
    const isSelected = selectedDocIds.has(doc.id);
    const firstSigner = doc.signers[0];

    if (isCompleted) {
      /* FORMATO 1: CERTIFICADO JURÍDICO AUTÊNTICO (DOCUMENTOS ASSINADOS) */
      return (
        <div
          key={doc.id}
          className={`bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-6 rounded-3xl border border-emerald-300/90 shadow-md hover:shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between space-y-5 relative overflow-hidden group ${
            isSelected ? 'ring-2 ring-emerald-500' : ''
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            {/* Topo do Certificado */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleSelectDoc(doc.id)} className="text-slate-400 hover:text-emerald-600">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                </button>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 font-black text-[10px] uppercase border border-emerald-300 font-heading tracking-wider flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-700" /> CERTIFICADO EMITIDO
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                MP 2.200-2
              </span>
            </div>

            {/* Título & Cliente */}
            <div className="space-y-1">
              <h3 className="font-heading text-base font-black text-emerald-950 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                {doc.title}
              </h3>
              {doc.client && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-extrabold font-heading">
                  <Folder className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate">{doc.client.name}</span>
                </div>
              )}
            </div>

            {/* Hash Jurídico de Autenticidade & Signatários */}
            <div className="p-3 bg-white/90 rounded-2xl border border-emerald-200/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold font-heading">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Prova de Vida ao Vivo Validade
                </span>
                <span className="text-emerald-700 font-mono">100% ASSINADO</span>
              </div>
              {doc.verificationCode && (
                <div className="text-[10px] font-mono text-slate-500 truncate bg-slate-50 p-1.5 rounded-lg border border-slate-200/60">
                  CÓDIGO: {doc.verificationCode}
                </div>
              )}
            </div>

            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {doc.tags.map((t) => (
                  <span
                    key={t.id}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white font-heading"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer do Certificado */}
          <div className="pt-4 border-t border-emerald-200/60 flex items-center justify-between gap-2 relative z-10">
            <a
              href={`/api/documents/${doc.id}/download`}
              download
              title="Baixar PDF Assinado com Certificado"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-900/30 transition-all font-heading"
            >
              <Download className="w-4 h-4" /> PDF Assinado
            </a>

            <button
              onClick={() => setSelectedDoc(doc)}
              className="px-3.5 py-2.5 bg-white text-emerald-900 font-extrabold border border-emerald-300 rounded-xl text-xs hover:bg-emerald-50 transition-all font-heading"
            >
              Dossiê
            </button>
          </div>
        </div>
      );
    }

    /* FORMATO 2: CARD DE ACOMPANHAMENTO EM ANDAMENTO / RASCUNHO */
    return (
      <div
        key={doc.id}
        className={`bg-white p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-5 group relative ${
          isSelected ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200/80 hover:border-slate-300 hover:shadow-lg'
        }`}
      >
        <div className="space-y-4">
          {/* Topo do Card */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => toggleSelectDoc(doc.id)} className="text-slate-400 hover:text-blue-600">
                {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
              </button>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase border border-blue-200 font-heading">
                {doc.documentType || 'CONTRATO'}
              </span>
            </div>
            {getStatusBadge(doc.status)}
          </div>

          {/* Título & Cliente */}
          <div className="space-y-1">
            <h3 className="font-heading text-base font-extrabold text-[#071B3A] line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
              {doc.title}
            </h3>

            {doc.client ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold font-heading">
                <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{doc.client.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Sem cliente vinculado</span>
              </div>
            )}
          </div>

          {/* Progresso de Assinaturas */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 font-heading">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-500" /> Signatários
              </span>
              <span className="text-[#071B3A]">
                {signedCount} de {totalSigners} assinados
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${(signedCount / (totalSigners || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Tags */}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <span
                  key={t.id}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white font-heading"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer do Card */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          {firstSigner && doc.status !== 'CANCELADO' ? (
            <button
              onClick={() => handleOpenWhatsApp(doc.title, firstSigner.name, firstSigner.token)}
              title="Enviar cobrança de assinatura via WhatsApp"
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold rounded-xl text-xs border border-emerald-200 flex items-center gap-1.5 font-heading"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
            </button>
          ) : <div />}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDoc(doc)}
              className="px-3.5 py-2 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-xl text-xs transition-all font-heading shadow-xs"
            >
              Dossiê
            </button>
            <button
              onClick={() => handleDelete(doc)}
              title="Excluir documento permanentemente"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 bg-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Top Banner Luxuoso */}
      <div className="bg-gradient-to-r from-[#071B3A] via-[#0B254C] to-[#071B3A] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-[10px] uppercase tracking-widest font-heading border border-blue-400/30">
                Central de Contratos Legal SaaS
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                MP 2.200-2 / Lei 14.063
              </span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight">
              Gestão Executiva de Documentos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Organização inteligente por pastas de clientes, emissão de Certificados de Evidências em PDF e notificações instantâneas via WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/documentos/novo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-extrabold rounded-2xl shadow-lg hover:shadow-blue-900/40 transition-all text-xs font-heading tracking-wide border border-white/20 active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Novo Envio de Documento
            </Link>
          </div>
        </div>
      </div>

      {/* Grid Principal: Navegação por Categorias/Pastas à Esquerda + Conteúdo de Documentos à Direita */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Painel Lateral de Pastas e Estágios (3 colunas em telas grandes) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Box 1: Filtro por Ciclo de Vida */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-heading text-xs font-extrabold text-[#071B3A] uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Estágios do Documento
            </h3>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setCategoryFilter('ALL');
                  setSelectedClientFolder(null);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold font-heading transition-all flex items-center justify-between ${
                  categoryFilter === 'ALL' && !selectedClientFolder
                    ? 'bg-[#071B3A] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-blue-400" /> Todos os Documentos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">{stats.total}</span>
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('CONCLUIDO');
                  setSelectedClientFolder(null);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold font-heading transition-all flex items-center justify-between ${
                  categoryFilter === 'CONCLUIDO' && !selectedClientFolder
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-emerald-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Concluídos Válidos
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold font-mono">
                  {stats.completed}
                </span>
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('EM_ANDAMENTO');
                  setSelectedClientFolder(null);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold font-heading transition-all flex items-center justify-between ${
                  categoryFilter === 'EM_ANDAMENTO' && !selectedClientFolder
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-amber-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Em Assinatura
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-extrabold font-mono">
                  {stats.inProgress}
                </span>
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('RASCUNHO');
                  setSelectedClientFolder(null);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold font-heading transition-all flex items-center justify-between ${
                  categoryFilter === 'RASCUNHO' && !selectedClientFolder
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-slate-500" /> Prontos p/ Envio
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">{stats.draft}</span>
              </button>

              <button
                onClick={() => {
                  setCategoryFilter('CANCELADO');
                  setSelectedClientFolder(null);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold font-heading transition-all flex items-center justify-between ${
                  categoryFilter === 'CANCELADO' && !selectedClientFolder
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-rose-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-500" /> Cancelados / Recusados
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-mono">{stats.cancelled}</span>
              </button>
            </div>
          </div>

          {/* Box 2: Pastas por Cliente */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xs font-extrabold text-[#071B3A] uppercase tracking-wider flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600" /> Pastas por Cliente
              </h3>
              {selectedClientFolder && (
                <button
                  onClick={() => setSelectedClientFolder(null)}
                  className="text-[10px] text-blue-600 font-bold hover:underline"
                >
                  Limpar Pasta
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {clientFolders.length === 0 ? (
                <p className="text-[11px] text-slate-400 p-2">Nenhum cliente cadastrado.</p>
              ) : (
                clientFolders.map((folder) => {
                  const isSelected = selectedClientFolder === folder.id;
                  return (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedClientFolder(isSelected ? null : folder.id)}
                      className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-bold font-heading transition-all flex items-center justify-between ${
                        isSelected ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {folder.id === AVULSO_KEY ? (
                          <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">
                        {folder.count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Box 3: Tags Temáticas */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xs font-extrabold text-[#071B3A] uppercase tracking-wider flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-blue-600" /> Tags Temáticas
              </h3>
              <button
                onClick={() => setShowTagManager(true)}
                className="text-[10px] text-blue-600 font-bold hover:underline"
              >
                + Gerenciar
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {allTags.length === 0 ? (
                <p className="text-[11px] text-slate-400">Nenhuma tag criada.</p>
              ) : (
                allTags.map((t) => {
                  const isSelected = selectedTagId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTagId(isSelected ? null : t.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold transition-all border font-heading ${
                        isSelected ? 'ring-2 ring-blue-600 shadow-xs' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: t.color, color: '#fff', borderColor: t.color }}
                    >
                      {t.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Área de Documentos (9 colunas em telas grandes) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Barra de Controle de Pesquisa e Modos de Exibição */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:w-80 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título, cliente ou CPF..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Botões do Alternador de Visualização Tríplice */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setViewFormat('KANBAN')}
                  className={`p-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 font-heading ${
                    viewFormat === 'KANBAN' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Visão Kanban (Colunas por Status)"
                >
                  <Kanban className="w-4 h-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </button>

                <button
                  onClick={() => setViewFormat('GRID')}
                  className={`p-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 font-heading ${
                    viewFormat === 'GRID' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Modo Cards Visuais (Certificados x Pendentes)"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>

                <button
                  onClick={() => setViewFormat('TABLE')}
                  className={`p-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 font-heading ${
                    viewFormat === 'TABLE' ? 'bg-[#071B3A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Modo Tabela por Pastas de Cliente"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Tabela</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barra Flutuante de Ações em Lote */}
          {selectedDocIds.size > 0 && (
            <div className="bg-[#071B3A] text-white p-4 rounded-3xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2 font-heading font-extrabold text-xs">
                <CheckSquare className="w-4 h-4 text-blue-400" />
                <span>{selectedDocIds.size} documento(s) selecionado(s)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    alert('Os PDFs dos documentos selecionados estão sendo preparados para download em lote.');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-xs font-heading"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar PDFs
                </button>

                <button
                  onClick={() => setSelectedDocIds(new Set())}
                  className="text-xs text-slate-300 hover:text-white font-bold px-2 py-1"
                >
                  Cancelar Seleção
                </button>
              </div>
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL (LOADING, EMPTY OU LISTAGEM NOS FORMATOS DIVERSOS) */}
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
                <p className="text-xs text-slate-500 font-medium">Ajuste a busca por nome ou selecione outro estágio.</p>
              </div>
              <Link
                href="/documentos/novo"
                className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-bold rounded-2xl text-xs font-heading shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Criar Novo Envio
              </Link>
            </div>
          ) : viewFormat === 'KANBAN' ? (
            /* FORMATO 1: QUADRO KANBAN POR ESTÁGIO JURÍDICO */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {/* Coluna 1: Concluídos */}
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <span className="font-heading font-black text-xs text-emerald-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. Concluídos & Válidos
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-extrabold text-[10px] font-mono">
                    {kanbanColumns.completed.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {kanbanColumns.completed.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                      Nenhum concluído nesta busca
                    </div>
                  ) : (
                    kanbanColumns.completed.map((doc) => renderDocumentCard(doc))
                  )}
                </div>
              </div>

              {/* Coluna 2: Em Assinatura */}
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                  <span className="font-heading font-black text-xs text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-amber-600" /> 2. Em Assinatura
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-extrabold text-[10px] font-mono">
                    {kanbanColumns.inProgress.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {kanbanColumns.inProgress.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                      Nenhum em andamento nesta busca
                    </div>
                  ) : (
                    kanbanColumns.inProgress.map((doc) => renderDocumentCard(doc))
                  )}
                </div>
              </div>

              {/* Coluna 3: Rascunhos */}
              <div className="space-y-3">
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <span className="font-heading font-black text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <FileCheck2 className="w-4 h-4 text-slate-600" /> 3. Rascunhos / Prontos
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px] font-mono">
                    {kanbanColumns.drafts.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {kanbanColumns.drafts.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
                      Nenhum rascunho localizado
                    </div>
                  ) : (
                    kanbanColumns.drafts.map((doc) => renderDocumentCard(doc))
                  )}
                </div>
              </div>
            </div>
          ) : viewFormat === 'GRID' ? (
            /* FORMATO 2: CARDS LUXUOSOS DIVERSOS */
            <div className="grid md:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => renderDocumentCard(doc))}
            </div>
          ) : (
            /* FORMATO 3: TABELA AGRUPADA POR CLIENTE */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 font-heading">
                    <tr>
                      <th className="px-6 py-4">Título do Documento</th>
                      <th className="px-6 py-4">Progresso de Assinaturas</th>
                      <th className="px-6 py-4">Tags</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groups.map((group) => {
                      const isCollapsed = collapsedGroups.has(group.key);
                      return (
                        <Fragment key={group.key}>
                          <tr
                            className="bg-slate-50/90 hover:bg-slate-100/80 transition-colors cursor-pointer select-none border-t border-slate-200/60"
                            onClick={() => toggleGroup(group.key)}
                          >
                            <td colSpan={5} className="px-6 py-3.5">
                              <div className="flex items-center gap-2.5">
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                                )}
                                {group.key === AVULSO_KEY ? (
                                  <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                                ) : (
                                  <Folder className="w-4 h-4 text-blue-600 shrink-0" />
                                )}
                                <span className="font-heading font-extrabold text-slate-900 text-xs tracking-tight">{group.label}</span>
                                {group.subtitle && (
                                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                                    CPF/CNPJ: {maskCpfCnpj(group.subtitle)}
                                  </span>
                                )}
                                <span className="ml-auto text-[10px] font-extrabold text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-0.5 shrink-0 shadow-2xs font-heading">
                                  {group.docs.length} doc{group.docs.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>
                          </tr>

                          {!isCollapsed &&
                            group.docs.map((doc) => {
                              const signedCount = doc.signers.filter((s) => s.status === 'ASSINADO').length;
                              const totalSigners = doc.signers.length;

                              return (
                                <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-extrabold text-slate-900 flex items-center gap-2 font-heading">
                                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                      <span>{doc.title}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                      Criado em {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                                    </div>
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs font-bold text-slate-700 font-heading">
                                        <span>{signedCount} de {totalSigners} assinados</span>
                                      </div>
                                      <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-blue-600 transition-all duration-300"
                                          style={{ width: `${(signedCount / (totalSigners || 1)) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                                      {doc.tags && doc.tags.length > 0 ? (
                                        doc.tags.map((t) => (
                                          <span
                                            key={t.id}
                                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white font-heading"
                                            style={{ backgroundColor: t.color }}
                                          >
                                            {t.name}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-slate-300 text-[10px]">—</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>

                                  <td className="px-6 py-4 text-right space-x-2">
                                    {(doc.status === 'CONCLUIDO' || doc.status === 'PARCIALMENTE_ASSINADO') && (
                                      <a
                                        href={`/api/documents/${doc.id}/download`}
                                        download
                                        title="Baixar PDF Assinado com Certificado"
                                        className="px-3 py-1.5 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 bg-emerald-50 inline-flex items-center gap-1.5 text-xs font-extrabold font-heading"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        PDF Assinado
                                      </a>
                                    )}

                                    <button
                                      onClick={() => setSelectedDoc(doc)}
                                      className="px-3.5 py-1.5 bg-[#071B3A] text-white font-extrabold rounded-xl text-xs hover:bg-[#0B1D3D] transition-colors font-heading shadow-xs"
                                    >
                                      Dossiê
                                    </button>

                                    <button
                                      onClick={() => handleDelete(doc)}
                                      title="Excluir documento permanentemente"
                                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 bg-white"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Gerenciar Tags */}
      {showTagManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="font-heading text-lg font-black text-[#071B3A] flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-blue-600" /> Gerenciar Tags
              </h2>
              <button onClick={() => setShowTagManager(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allTags.length === 0 && <p className="text-xs text-slate-400">Nenhuma tag criada ainda.</p>}
                {allTags.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white font-heading"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                    </span>
                    <button onClick={() => handleDeleteTag(t.id)} className="text-slate-400 hover:text-red-600 p-1" title="Excluir tag">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  placeholder="Nome da nova tag (ex: Urgente, Trabalhista)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-medium"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: newTagColor === c ? '#071B3A' : 'transparent' }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={savingTag || !newTagName.trim()}
                  className="w-full py-2.5 bg-[#071B3A] hover:bg-[#0B1D3D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs transition-all font-heading shadow-md"
                >
                  {savingTag ? 'Salvando...' : '+ Criar Nova Tag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over / Modal: Dossiê Jurídico & Evidências */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh] space-y-6">
            {/* Header do Dossiê */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase font-heading border border-blue-200">
                    {selectedDoc.documentType || 'DOCUMENTO'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedDoc.id}</span>
                </div>
                <h2 className="font-heading text-xl font-black text-[#071B3A] mt-1">{selectedDoc.title}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Card de Certificado de Evidências */}
              {(selectedDoc.status === 'CONCLUIDO' || selectedDoc.status === 'PARCIALMENTE_ASSINADO') && (
                <div className="p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5 font-heading">
                      <Award className="w-4 h-4 text-emerald-600" /> Certificado Jurídico de Evidências
                    </span>
                    {selectedDoc.verificationCode && (
                      <Link
                        href={`/verificar/${selectedDoc.verificationCode}`}
                        target="_blank"
                        className="text-xs font-extrabold text-blue-600 hover:underline flex items-center gap-1 font-heading"
                      >
                        Página de Verificação Pública <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <a
                    href={`/api/documents/${selectedDoc.id}/download`}
                    download
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all font-heading"
                  >
                    <Download className="w-4 h-4" /> Baixar Documento Assinado com Certificado (.PDF)
                  </a>
                </div>
              )}

              {/* Dossiê dos Signatários & Links WhatsApp */}
              <div>
                <h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider mb-3 font-heading flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" /> Signatários & Envio via WhatsApp
                </h3>
                <div className="space-y-3">
                  {selectedDoc.signers.map((s) => (
                    <div key={s.id} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900 font-heading">
                          {s.name} <span className="text-slate-500 font-normal">({s.role})</span>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px] mt-0.5">CPF: {s.cpf}</div>
                        {s.status === 'ASSINADO' && s.signedAt && (
                          <div className="text-[10px] text-emerald-700 font-extrabold mt-1 flex items-center gap-1 font-heading">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Assinado em {new Date(s.signedAt).toLocaleString('pt-BR')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleOpenWhatsApp(selectedDoc.title, s.name, s.token)}
                          className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 font-heading shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                        </button>
                        <button
                          onClick={() => handleCopyLink(s.token)}
                          className="px-3 py-2 bg-white border border-slate-200 text-slate-700 font-extrabold rounded-xl hover:bg-slate-100 flex items-center gap-1.5 font-heading shadow-2xs"
                        >
                          {copiedToken === s.token ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                          Copiar Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags do Documento */}
              <div>
                <h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider mb-3 font-heading flex items-center gap-1.5">
                  <TagIcon className="w-4 h-4 text-blue-600" /> Tags do Documento
                </h3>
                {allTags.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Nenhuma tag cadastrada ainda.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((t) => {
                      const active = selectedDoc.tags?.some((dt) => dt.id === t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleToggleDocTag(selectedDoc, t.id)}
                          className="px-3 py-1 rounded-full text-[10px] font-extrabold border-2 transition-all font-heading"
                          style={
                            active
                              ? { backgroundColor: t.color, borderColor: t.color, color: '#fff' }
                              : { borderColor: t.color, color: t.color, backgroundColor: 'transparent' }
                          }
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Zona de Risco: Exclusão Permanente */}
              <div className="pt-4 border-t border-slate-100">
                <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-red-800 font-heading">Excluir Documento Permanentemente</p>
                    <p className="text-[11px] text-red-700/80 mt-0.5">
                      Esta ação apaga irreversivelmente o documento e seu certificado de evidências.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedDoc)}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 font-heading shadow-xs shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
