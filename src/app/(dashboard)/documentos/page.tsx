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
  History,
  Eye,
  RotateCcw
} from 'lucide-react';
import { maskCpfCnpj } from '@/lib/formatters';

interface Signer {
  id: string;
  name: string;
  cpf: string;
  role: string;
  status: string;
  token: string;
  signingMode?: string;
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
  kitBatchId?: string | null;
  processId?: string | null;
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
  const [isOfficeAdmin, setIsOfficeAdmin] = useState(false);
  const [redoingIds, setRedoingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('NEWEST');
  const [selectedClientFolder, setSelectedClientFolder] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [viewFormat, setViewFormat] = useState<ViewFormat>('KANBAN');

  // Seleção múltipla em lote
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

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
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setIsOfficeAdmin(data?.user?.role === 'OFFICE_ADMIN'))
      .catch(() => {});
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
  const signerRoleLabel = (role: string) => ({ CLIENTE: 'Cliente', ASSINANTE_A_ROGO: 'Assinante a rogo', TESTEMUNHA_1: '1ª testemunha', TESTEMUNHA_2: '2ª testemunha', TESTEMUNHA: 'Testemunha' }[role] || role.replace(/_/g, ' '));
  const signerProgress = (signer: Signer) => {
    if (signer.status === 'ASSINADO') return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Assinou</span>;
    if (signer.status === 'VISUALIZADO') return <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700"><Eye className="w-3 h-3" /> Link aberto</span>;
    return <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-extrabold text-slate-600"><Clock className="w-3 h-3" /> Aguardando</span>;
  };

  const handleSyncPackageSignature = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync-package-signature' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível concluir os documentos restantes.');
      alert(`${data.synchronized} documento(s) restante(s) foram concluídos e certificados.`);
      await fetchDocuments();
      setSelectedDoc(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reabre a assinatura de um documento (ou do pacote inteiro) já concluído, para o caso
  // de a prova de presença ter saído ruim (selo mal posicionado, selfie não aproveitável
  // etc.). Reaproveita o mesmo link/token já enviado e todo o conteúdo do documento já
  // revisado - a pessoa só refaz a etapa de assinar, não precisa de um link novo.
  const handleRedoSignature = async (doc: DocumentItem, mode: 'redo-document' | 'redo-package') => {
    const isPackage = mode === 'redo-package';
    const confirmMsg = isPackage
      ? `Reabrir TODO O PACOTE (${selectedPackageDocuments.length || 1} documentos) de ${doc.client?.name || 'este cliente'} para uma nova tentativa de assinatura? O mesmo link será reativado e o conteúdo já editado é mantido.`
      : `Reabrir "${doc.title}" para uma nova tentativa de assinatura? O mesmo link será reativado e o conteúdo já editado é mantido.`;
    if (!window.confirm(confirmMsg)) return;
    const reason = window.prompt('Motivo (opcional, fica registrado na trilha de auditoria):') || '';

    setRedoingIds((current) => new Set(current).add(doc.id));
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível reabrir a assinatura.');
      await fetchDocuments();
      setSelectedDoc(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRedoingIds((current) => {
        const next = new Set(current);
        next.delete(doc.id);
        return next;
      });
    }
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

  // Um kit concluído representa uma única contratação, embora contenha vários
  // PDFs. A exclusão do kit remove o conjunto inteiro após uma única confirmação.
  const handleDeleteCompletedPackage = async (packageDocuments: DocumentItem[]) => {
    if (!packageDocuments.length) return;
    const clientName = packageDocuments[0]?.client?.name || 'este cliente';
    if (!window.confirm(`Excluir permanentemente este kit concluído com ${packageDocuments.length} documentos de ${clientName}? Os PDFs assinados e certificados vinculados serão apagados. Esta ação não pode ser desfeita.`)) return;

    setDeletingSelected(true);
    try {
      const results = await Promise.all(
        packageDocuments.map(async (document) => {
          const response = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || `Não foi possível excluir "${document.title}".`);
          return document.id;
        })
      );
      setDocuments((current) => current.filter((document) => !results.includes(document.id)));
      setSelectedDocIds((current) => new Set([...current].filter((id) => !results.includes(id))));
      setSelectedDoc(null);
    } catch (err: any) {
      alert(err.message || 'Não foi possível excluir o kit completo.');
      await fetchDocuments();
    } finally {
      setDeletingSelected(false);
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

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredDocuments.map((doc) => doc.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedDocIds.has(id));
    setSelectedDocIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => allVisibleSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const selected = documents.filter((doc) => selectedDocIds.has(doc.id));
    const deletable = selected.filter((doc) => doc.status !== 'CONCLUIDO');
    const protectedCount = selected.length - deletable.length;
    if (!deletable.length) { alert('Documentos concluídos devem ser preservados e não podem ser excluídos em lote.'); return; }
    const extraWarning = protectedCount ? ` ${protectedCount} documento(s) concluído(s) serão preservados.` : '';
    if (!window.confirm(`Excluir permanentemente ${deletable.length} documento(s) selecionado(s)?${extraWarning} Esta ação não pode ser desfeita.`)) return;
    setDeletingSelected(true);
    try {
      const res = await fetch('/api/documents/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: deletable.map((doc) => doc.id) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível excluir os documentos.');
      setDocuments((current) => current.filter((doc) => !data.deletedIds.includes(doc.id)));
      setSelectedDocIds(new Set());
    } catch (err: any) { alert(err.message); } finally { setDeletingSelected(false); }
  };

  // A exclusão de documentos concluídos só é permitida quando a seleção
  // representa integralmente um único kit. Isso evita apagar itens de clientes
  // ou kits diferentes por engano.
  const selectedCompletedKit = useMemo(() => {
    const kits = new Map<string, DocumentItem[]>();
    documents.forEach((document) => {
      if (!document.kitBatchId) return;
      const current = kits.get(document.kitBatchId) || [];
      current.push(document);
      kits.set(document.kitBatchId, current);
    });

    const fullySelectedKits = Array.from(kits.values()).filter(
      (kit) => kit.every((document) => document.status === 'CONCLUIDO' && selectedDocIds.has(document.id))
    );

    return fullySelectedKits.length === 1 && fullySelectedKits[0].length === selectedDocIds.size
      ? fullySelectedKits[0]
      : null;
  }, [documents, selectedDocIds]);

  const selectedNonConcludedCount = useMemo(
    () => documents.filter((document) => selectedDocIds.has(document.id) && document.status !== 'CONCLUIDO').length,
    [documents, selectedDocIds]
  );

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

  const groupPackages = (items: DocumentItem[]) => {
    const groups = new Map<string, DocumentItem[]>();
    for (const item of items) {
      const key = item.kitBatchId ? `kit:${item.kitBatchId}` : `doc:${item.id}`;
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    return Array.from(groups.values());
  };

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

  const selectedPackageDocuments = useMemo(() => {
    if (!selectedDoc) return [];
    return selectedDoc.kitBatchId
      ? documents.filter((item) => item.kitBatchId === selectedDoc.kitBatchId && item.client?.id === selectedDoc.client?.id)
      : [selectedDoc];
  }, [selectedDoc, documents]);

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

          {isCompleted && doc.client && !doc.processId && (
            <Link
              href={`/processos?clienteId=${doc.client.id}&documentoIds=${doc.id}`}
              title="Organizar este documento em um processo"
              className="px-2.5 py-1 border border-blue-200 text-blue-700 hover:bg-blue-50 font-extrabold rounded-lg text-[10px] font-heading"
            >
              Processo
            </Link>
          )}

          {isCompleted && isOfficeAdmin && (
            <button
              onClick={() => handleRedoSignature(doc, 'redo-document')}
              disabled={redoingIds.has(doc.id)}
              title="Reabrir para uma nova tentativa de assinatura, mantendo o mesmo link"
              className="p-1 text-amber-600 hover:text-amber-700 disabled:opacity-50 rounded-lg border border-amber-200 transition-colors"
            >
              {redoingIds.has(doc.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => setSelectedDoc(doc)}
            className="px-2.5 py-1 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-lg text-[10px] font-heading"
          >
            Dossiê
          </button>
          <button
            onClick={() => handleDelete(doc)}
            title="Excluir Documento"
            className="p-1 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    );
  };

  const renderPackageCard = (packageDocuments: DocumentItem[]) => {
    if (packageDocuments.length === 1) return renderCompactCard(packageDocuments[0]);
    const lead = packageDocuments[0];
    const allSelected = packageDocuments.every((item) => selectedDocIds.has(item.id));
    const isCompleted = packageDocuments.every((item) => item.status === 'CONCLUIDO');
    const formattedDate = new Date(lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const togglePackage = () => setSelectedDocIds((current) => {
      const next = new Set(current);
      packageDocuments.forEach((item) => allSelected ? next.delete(item.id) : next.add(item.id));
      return next;
    });
    return (
      <div key={lead.kitBatchId} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isCompleted ? 'border-emerald-300' : 'border-blue-200'}`}>
        <div className={`p-3.5 ${isCompleted ? 'bg-emerald-50/70' : 'bg-blue-50/70'} border-b ${isCompleted ? 'border-emerald-100' : 'border-blue-100'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><div className="flex items-center gap-1.5"><Layers className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-blue-600'}`} /><span className={`text-[10px] font-black uppercase tracking-wider ${isCompleted ? 'text-emerald-800' : 'text-blue-800'}`}>Pacote de assinatura</span></div><h4 className="font-heading font-black text-sm text-[#071B3A] mt-1">{packageDocuments.length} documentos • {lead.client?.name || 'Cliente não vinculado'}</h4><p className="text-[10px] text-slate-500 mt-0.5">Criado em {formattedDate} • uma única sessão de assinatura</p></div>
            <button onClick={togglePackage} className="text-slate-400 hover:text-blue-600 pt-0.5">{allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}</button>
          </div>
          <div className="mt-2 flex items-center justify-between"><div>{getStatusBadge(isCompleted ? 'CONCLUIDO' : lead.status)}</div>{lead.client?.cpfCnpj && <span className="font-mono text-[9px] text-slate-500">{maskCpfCnpj(lead.client.cpfCnpj)}</span>}</div>
        </div>
        <div className="divide-y divide-slate-100">
          {packageDocuments.map((item, index) => <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2"><div className="min-w-0 flex items-center gap-2"><span className="w-5 h-5 shrink-0 rounded-md bg-slate-100 text-slate-600 grid place-items-center text-[10px] font-black">{index + 1}</span><span className="truncate text-[11px] font-bold text-slate-700">{item.title}</span></div>{item.status === 'CONCLUIDO' && <a href={`/api/documents/${item.id}/download`} download title={`Baixar ${item.title}`} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"><Download className="w-3.5 h-3.5" /></a>}</div>)}
        </div>
        <div className="p-3 border-t border-slate-100 flex flex-wrap gap-2">
          <button onClick={() => setSelectedDoc(lead)} className="flex-1 py-2 bg-[#071B3A] hover:bg-[#0B1D3D] text-white rounded-xl text-[10px] font-extrabold">Abrir dossiê do pacote</button>
          {isCompleted && isOfficeAdmin && (
            <button
              type="button"
              onClick={() => handleRedoSignature(lead, packageDocuments.length > 1 ? 'redo-package' : 'redo-document')}
              disabled={redoingIds.has(lead.id)}
              title="Reabrir para uma nova tentativa de assinatura, mantendo o mesmo link"
              className="px-3 py-2 border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50 rounded-xl text-[10px] font-extrabold inline-flex items-center gap-1"
            >
              {redoingIds.has(lead.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Refazer
            </button>
          )}
          {isCompleted && (
            <button
              type="button"
              onClick={() => handleDeleteCompletedPackage(packageDocuments)}
              disabled={deletingSelected}
              className="px-3 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 rounded-xl text-[10px] font-extrabold inline-flex items-center gap-1"
            >
              {deletingSelected ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Excluir kit
            </button>
          )}
          {isCompleted && lead.client && packageDocuments.every((item) => !item.processId) && <Link href={`/processos?clienteId=${lead.client.id}&documentoIds=${packageDocuments.map((item) => item.id).join(',')}`} className="px-3 py-2 border border-blue-200 text-blue-700 rounded-xl text-[10px] font-extrabold">Processo</Link>}
          {!isCompleted && lead.signers[0] && <button onClick={() => handleCopyLink(lead.signers[0].token)} className="px-3 py-2 border border-blue-200 text-blue-700 rounded-xl text-[10px] font-extrabold">Copiar link</button>}
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
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={toggleSelectAllVisible} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold text-[#071B3A] bg-slate-50 border border-slate-200 hover:bg-slate-100">
          {filteredDocuments.length > 0 && filteredDocuments.every((doc) => selectedDocIds.has(doc.id)) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
          Selecionar todos os resultados ({filteredDocuments.length})
        </button>
        {selectedDocIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600">{selectedDocIds.size} selecionado(s)</span>
            <button type="button" onClick={() => setSelectedDocIds(new Set())} className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Limpar</button>
            {selectedCompletedKit && (
              <button
                type="button"
                onClick={() => handleDeleteCompletedPackage(selectedCompletedKit)}
                disabled={deletingSelected}
                className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold"
              >
                {deletingSelected ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                Excluir este kit concluído
              </button>
            )}
            {selectedNonConcludedCount > 0 && (
              <button type="button" onClick={handleBulkDelete} disabled={deletingSelected} className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold">
                {deletingSelected ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir documentos não concluídos
              </button>
            )}
          </div>
        )}
      </div>

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
                groupPackages(kanbanColumns.completed).map((items) => renderPackageCard(items))
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
                groupPackages(kanbanColumns.inProgress).map((items) => renderPackageCard(items))
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
                groupPackages(kanbanColumns.drafts).map((items) => renderPackageCard(items))
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
                  <th className="px-5 py-3"><button type="button" onClick={toggleSelectAllVisible} title="Selecionar todos"><CheckSquare className="w-4 h-4" /></button></th>
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
                    <td className="px-5 py-3"><button type="button" onClick={() => toggleSelectDoc(doc.id)}>{selectedDocIds.has(doc.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}</button></td>
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
                      <button
                        onClick={() => handleDelete(doc)}
                        title="Excluir Documento"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 inline-flex items-center align-middle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                  {selectedPackageDocuments.length > 1 ? 'PACOTE DE ASSINATURA' : selectedDoc.documentType || 'DOCUMENTO'}
                </span>
                <h2 className="font-heading text-lg font-black text-[#071B3A] mt-1">{selectedPackageDocuments.length > 1 ? `${selectedPackageDocuments.length} documentos de ${selectedDoc.client?.name || 'cliente'}` : selectedDoc.title}</h2>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedPackageDocuments.some((item) => item.status === 'CONCLUIDO' || item.status === 'PARCIALMENTE_ASSINADO') && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                  <p className="text-xs font-extrabold text-emerald-900">Documentos do pacote</p>
                  {selectedPackageDocuments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 bg-white rounded-xl border border-emerald-100 px-3 py-2">
                      <span className="text-xs font-bold text-slate-700 truncate">{item.title}</span>
                      <div className="shrink-0 flex items-center gap-2">
                        {(item.status === 'CONCLUIDO' || item.status === 'PARCIALMENTE_ASSINADO') && <a href={`/api/documents/${item.id}/download`} download className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700"><Download className="w-3.5 h-3.5" /> Baixar PDF</a>}
                        {isOfficeAdmin && item.status === 'CONCLUIDO' && selectedPackageDocuments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRedoSignature(item, 'redo-document')}
                            disabled={redoingIds.has(item.id)}
                            title="Refazer só este documento, mantendo o mesmo link"
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 hover:text-amber-800 disabled:opacity-50"
                          >
                            {redoingIds.has(item.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Refazer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedPackageDocuments.length > 1 && selectedDoc.status === 'CONCLUIDO' && selectedPackageDocuments.some((item) => item.status !== 'CONCLUIDO') && (
                <button onClick={() => handleSyncPackageSignature(selectedDoc)} className="w-full py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-extrabold">
                  Concluir os documentos restantes deste pacote
                </button>
              )}

              {isOfficeAdmin && selectedDoc.status === 'CONCLUIDO' && (
                <button
                  type="button"
                  onClick={() => handleRedoSignature(selectedDoc, selectedPackageDocuments.length > 1 ? 'redo-package' : 'redo-document')}
                  disabled={redoingIds.has(selectedDoc.id)}
                  className="w-full py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {redoingIds.has(selectedDoc.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {selectedPackageDocuments.length > 1 ? 'Refazer assinatura de todo o pacote' : 'Refazer assinatura deste documento'}
                </button>
              )}

              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">Acompanhamento dos participantes</h3><span className="text-[10px] font-bold text-slate-500">{selectedDoc.signers.filter((s) => s.status === 'ASSINADO').length}/{selectedDoc.signers.length} concluídos</span></div>
                <p className="mb-2 text-[11px] text-slate-500">Acompanhe se cada pessoa abriu o link e reenvie-o sem precisar copiar manualmente.</p>
                <div className="space-y-2">
                  {selectedDoc.signers.map((s) => (
                    <div key={s.id} className={`p-3 rounded-xl border text-xs ${s.status === 'ASSINADO' ? 'bg-emerald-50/40 border-emerald-200' : s.status === 'VISUALIZADO' ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50 border-slate-200/80'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><div className="font-extrabold text-slate-900 truncate">{s.name}</div><div className="mt-1 flex flex-wrap gap-1.5 items-center"><span className="text-slate-500 text-[10px]">{signerRoleLabel(s.role)}</span>{signerProgress(s)}{s.signingMode === 'SAME_DEVICE' && <span className="text-[10px] font-bold text-violet-700">Mesmo celular</span>}</div><div className="text-slate-400 font-mono text-[10px] mt-1">CPF: {maskCpfCnpj(s.cpf)}</div></div>
                        {s.status !== 'ASSINADO' && <div className="flex items-center gap-1 shrink-0"><button onClick={() => handleCopyLink(s.token)} title="Copiar link" className="p-2 rounded-lg border border-blue-200 bg-white text-blue-700 hover:bg-blue-50">{copiedToken === s.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button><button onClick={() => handleOpenWhatsApp(selectedDoc.title, s.name, s.token)} title="Enviar pelo WhatsApp" className="px-2.5 py-2 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg border border-emerald-200 flex items-center gap-1 text-[10px]"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Enviar</button></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Exclusão no Dossiê */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedDoc;
                    setSelectedDoc(null);
                    handleDelete(target);
                  }}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-extrabold rounded-xl text-xs flex items-center gap-1.5 font-heading transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Excluir Documento Definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
