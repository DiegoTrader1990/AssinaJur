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

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

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
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/documents', window.location.origin);
      if (searchQuery) url.searchParams.set('q', searchQuery);
      if (statusFilter) url.searchParams.set('status', statusFilter);

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

  const handleAction = async (docId: string, action: 'send' | 'cancel') => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao executar ação.');

      fetchDocuments();
      if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    const isConcluded = doc.status === 'CONCLUIDO';
    const warning = isConcluded
      ? `Este documento já foi ASSINADO e CONCLUÍDO. Excluir "${doc.title}" apaga permanentemente o certificado de evidências e todo o histórico de assinatura — isso NÃO pode ser desfeito e pode comprometer a prova jurídica do documento. Tem certeza que deseja excluir mesmo assim?`
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
    if (!window.confirm('Excluir esta tag? Ela será removida de todos os documentos que a usam.')) return;
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir tag.');
      }
      if (tagFilter === tagId) setTagFilter('');
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
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar tags do documento.');

      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, tags: data.document.tags } : d)));
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc({ ...selectedDoc, tags: data.document.tags });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Filtro de tag é aplicado no cliente (a busca por título/cliente e o filtro de
  // status já vão para a API em fetchDocuments).
  const filteredDocuments = tagFilter ? documents.filter((d) => d.tags?.some((t) => t.id === tagFilter)) : documents;

  // Agrupamento automático "por pasta": cada cliente vinculado vira uma pasta;
  // documentos avulsos (sem cliente) caem numa pasta única "Sem Cliente".
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO':
        return <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">Enviado</span>;
      case 'VISUALIZADO':
        return <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">Visualizado</span>;
      case 'EM_ASSINATURA':
      case 'PARCIALMENTE_ASSINADO':
        return <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">Parcialmente Assinado</span>;
      case 'CONCLUIDO':
        return <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">Concluído</span>;
      case 'RECUSADO':
        return <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">Recusado</span>;
      case 'CANCELADO':
        return <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs border border-red-200">Cancelado</span>;
      case 'EXPIRADO':
        return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300">Expirado</span>;
      case 'PRONTO_PARA_ENVIO':
      case 'RASCUNHO':
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">Pronto p/ Envio</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">Documentos para Assinatura</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Organizados automaticamente por cliente, com tags para filtrar rápido. Acompanhe status e baixe PDFs com Certificado de Evidências.</p>
        </div>

        <Link
          href="/documentos/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all font-heading"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Novo Envio de Documento
        </Link>
      </div>

      {/* Pesquisa & Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="w-full md:w-96 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()}
            placeholder="Buscar por título ou cliente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <span className="text-xs text-slate-500 font-bold font-heading">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchDocuments();
            }}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 font-heading"
          >
            <option value="">Todos os Status</option>
            <option value="PRONTO_PARA_ENVIO">Pronto p/ Envio</option>
            <option value="ENVIADO">Enviado</option>
            <option value="VISUALIZADO">Visualizado</option>
            <option value="PARCIALMENTE_ASSINADO">Parcialmente Assinado</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="RECUSADO">Recusado</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="EXPIRADO">Expirado</option>
          </select>

          <span className="text-xs text-slate-500 font-bold font-heading">Tag:</span>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 font-heading"
          >
            <option value="">Todas as Tags</option>
            {allTags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowTagManager(true)}
            title="Gerenciar tags"
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 bg-white"
          >
            <TagIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabela de Documentos, agrupada por pasta (cliente) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Carregando documentos...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            {documents.length === 0 ? (
              <>
                <p className="font-heading text-slate-800 font-extrabold text-base">Nenhum documento enviado ainda.</p>
                <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">Envie seu primeiro PDF para colher assinaturas eletrônicas.</p>
                <Link
                  href="/documentos/novo"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 font-heading shadow-md"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Criar Novo Envio
                </Link>
              </>
            ) : (
              <p className="font-heading text-slate-800 font-extrabold text-base">Nenhum documento com essa tag.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-heading">
                <tr>
                  <th className="px-6 py-3.5">Título do Documento</th>
                  <th className="px-6 py-3.5">Progresso de Assinaturas</th>
                  <th className="px-6 py-3.5">Tags</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.key);
                  return (
                    <Fragment key={group.key}>
                      <tr
                        className="bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer select-none"
                        onClick={() => toggleGroup(group.key)}
                      >
                        <td colSpan={5} className="px-6 py-3">
                          <div className="flex items-center gap-2">
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
                            <span className="font-heading font-extrabold text-slate-800 text-xs">{group.label}</span>
                            {group.subtitle && (
                              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                                CPF/CNPJ: {maskCpfCnpj(group.subtitle)}
                              </span>
                            )}
                            <span className="ml-auto text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-0.5 shrink-0">
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
                                <div className="font-bold text-slate-900 flex items-center gap-2 font-heading">
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
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
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
                                {/* Botão de Download do PDF Final Assinado */}
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

                                {/* Botão Copiar Link do 1º signatário pendente */}
                                {doc.signers[0] && doc.status !== 'CANCELADO' && doc.status !== 'CONCLUIDO' && (
                                  <button
                                    onClick={() => handleCopyLink(doc.signers[0].token)}
                                    title="Copiar link de assinatura do celular"
                                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 bg-white"
                                  >
                                    {copiedToken === doc.signers[0].token ? (
                                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-blue-600" />
                                    )}
                                  </button>
                                )}

                                <button
                                  onClick={() => setSelectedDoc(doc)}
                                  className="px-3.5 py-1.5 bg-[#071B3A] text-white font-bold rounded-xl text-xs hover:bg-[#0B1D3D] transition-colors font-heading shadow-xs"
                                >
                                  Ver Detalhes
                                </button>

                                <button
                                  onClick={() => handleDelete(doc)}
                                  title="Excluir documento permanentemente"
                                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-slate-200 bg-white"
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
        )}
      </div>

      {/* Modal: Gerenciar Tags */}
      {showTagManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="font-heading text-lg font-extrabold text-[#071B3A] flex items-center gap-2">
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
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
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
                  placeholder="Nome da nova tag (ex: Urgente)"
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
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all font-heading"
                >
                  {savingTag ? 'Salvando...' : '+ Criar Tag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalhes & Links dos Signatários */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">{selectedDoc.title}</h2>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedDoc.id}</span>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="py-4 space-y-6">
              {/* Opções de Download para Concluídos / Parcialmente Assinados */}
              {(selectedDoc.status === 'CONCLUIDO' || selectedDoc.status === 'PARCIALMENTE_ASSINADO') && (
                <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5 font-heading">
                      <Award className="w-4 h-4 text-emerald-600" /> Certificado de Evidências Gerado
                    </span>
                    {selectedDoc.verificationCode && (
                      <Link
                        href={`/verificar/${selectedDoc.verificationCode}`}
                        target="_blank"
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 font-heading"
                      >
                        Página de Verificação <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <a
                    href={`/api/documents/${selectedDoc.id}/download`}
                    download
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all font-heading"
                  >
                    <Download className="w-4 h-4" /> Baixar Documento Assinado com Certificado (.PDF)
                  </a>
                </div>
              )}

              {/* Signatários e Links */}
              <div>
                <h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider mb-3 font-heading">
                  Links de Assinatura por Signatário
                </h3>
                <div className="space-y-3">
                  {selectedDoc.signers.map((s) => (
                    <div key={s.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 font-heading">{s.name} <span className="text-slate-400 font-normal">({s.role})</span></div>
                        <div className="text-slate-500 font-mono">CPF: {s.cpf}</div>
                        {s.status === 'ASSINADO' && s.signedAt && (
                          <div className="text-[10px] text-emerald-600 font-bold mt-1">
                            ✓ Assinado em {new Date(s.signedAt).toLocaleString('pt-BR')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(s.token)}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 flex items-center gap-1.5 font-heading shadow-xs"
                        >
                          {copiedToken === s.token ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                          Copiar Link
                        </button>
                        <a
                          href={`/assinar/${s.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-500 hover:text-[#071B3A]"
                          title="Testar como cliente"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags do Documento */}
              <div>
                <h3 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider mb-3 font-heading">
                  Tags
                </h3>
                {allTags.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    Nenhuma tag cadastrada ainda. Clique no ícone de tag ao lado do filtro de Status para criar.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((t) => {
                      const active = selectedDoc.tags?.some((dt) => dt.id === t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => handleToggleDocTag(selectedDoc, t.id)}
                          className="px-3 py-1 rounded-full text-[10px] font-bold border-2 transition-all"
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

              {/* Botões de Ação */}
              {selectedDoc.status !== 'CANCELADO' && selectedDoc.status !== 'CONCLUIDO' && (
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <button
                    onClick={() => handleAction(selectedDoc.id, 'cancel')}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1.5 font-heading"
                  >
                    <Ban className="w-4 h-4" />
                    Cancelar Documento
                  </button>

                  <button
                    onClick={() => handleAction(selectedDoc.id, 'send')}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 font-heading shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    Reenviar Notificações
                  </button>
                </div>
              )}

              {/* Zona de Risco: Exclusão Permanente */}
              <div className="pt-4 border-t border-slate-100">
                <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-red-800 font-heading">Excluir Documento Permanentemente</p>
                    <p className="text-[11px] text-red-700/80 mt-0.5">
                      {selectedDoc.status === 'CONCLUIDO'
                        ? 'Este documento já está assinado — excluir apaga o certificado de evidências e o histórico de assinatura para sempre.'
                        : 'Remove o documento e os arquivos associados de forma irreversível.'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedDoc)}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 font-heading shadow-xs shrink-0"
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
