'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Send,
  Ban,
  Loader2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  FileText,
  Download,
  Award
} from 'lucide-react';

interface Signer {
  id: string;
  name: string;
  cpf: string;
  role: string;
  status: string;
  token: string;
  signedAt?: string;
}

interface DocumentItem {
  id: string;
  title: string;
  documentType: string;
  status: string;
  verificationCode?: string;
  createdAt: string;
  completedAt?: string;
  client?: { name: string; cpfCnpj: string };
  signers: Signer[];
  createdBy?: { name: string };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    fetchDocuments();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENVIADO':
        return <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">Enviado</span>;
      case 'VISUALIZADO':
        return <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">Visualizado</span>;
      case 'PARCIALMENTE_ASSINADO':
        return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">Parcialmente Assinado</span>;
      case 'CONCLUIDO':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">Concluído</span>;
      case 'CANCELADO':
        return <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs border border-red-200">Cancelado</span>;
      case 'PRONTO_PARA_ENVIO':
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">Pronto p/ Envio</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Documentos para Assinatura</h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe os links disparados, status dos signatários e baixe PDFs com Certificado de Evidências.</p>
        </div>

        <Link
          href="/documentos/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Envio de Documento
        </Link>
      </div>

      {/* Pesquisa & Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="w-full md:w-96 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título ou cliente..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-gold-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchDocuments();
            }}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-gold-500"
          >
            <option value="">Todos os Status</option>
            <option value="ENVIADO">Enviado</option>
            <option value="PARCIALMENTE_ASSINADO">Parcialmente Assinado</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Documentos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
            Carregando documentos...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-base">Nenhum documento enviado ainda.</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Envie seu primeiro PDF para colher assinaturas eletrônicas.</p>
            <Link
              href="/documentos/novo"
              className="px-4 py-2 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Envio
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Título do Documento</th>
                  <th className="px-6 py-3.5">Cliente / Vinculo</th>
                  <th className="px-6 py-3.5">Progresso de Assinaturas</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const signedCount = doc.signers.filter((s) => s.status === 'ASSINADO').length;
                  const totalSigners = doc.signers.length;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gold-500 shrink-0" />
                          <span>{doc.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Criado em {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {doc.client ? (
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{doc.client.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">CPF: {doc.client.cpfCnpj}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Avulso</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{signedCount} de {totalSigners} assinados</span>
                          </div>
                          <div className="w-36 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gold-500 transition-all duration-300"
                              style={{ width: `${(signedCount / (totalSigners || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>

                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Botão de Download do PDF Final Assinado */}
                        {doc.status === 'CONCLUIDO' && (
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            download
                            title="Baixar PDF Assinado com Certificado"
                            className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 bg-emerald-50/50 inline-flex items-center gap-1 text-xs font-bold"
                          >
                            <Download className="w-4 h-4" />
                            PDF Assinado
                          </a>
                        )}

                        {/* Botão Copiar Link do 1º signatário pendente */}
                        {doc.signers[0] && doc.status !== 'CANCELADO' && doc.status !== 'CONCLUIDO' && (
                          <button
                            onClick={() => handleCopyLink(doc.signers[0].token)}
                            title="Copiar link de assinatura do celular"
                            className="p-2 text-slate-600 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors border border-slate-200 bg-white"
                          >
                            {copiedToken === doc.signers[0].token ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="px-3 py-1.5 bg-[#0B1D3D] text-white font-bold rounded-lg text-xs hover:bg-slate-800 transition-colors"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Detalhes & Links dos Signatários */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#0B1D3D]">{selectedDoc.title}</h2>
                <span className="text-xs text-slate-500">ID: {selectedDoc.id}</span>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="py-4 space-y-6">
              {/* Opções de Download e Validação para Documentos Concluídos */}
              {selectedDoc.status === 'CONCLUIDO' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" /> Certificado de Evidências Gerado
                    </span>
                    {selectedDoc.verificationCode && (
                      <Link
                        href={`/verificar/${selectedDoc.verificationCode}`}
                        target="_blank"
                        className="text-xs font-bold text-gold-600 hover:underline flex items-center gap-1"
                      >
                        Página de Verificação <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                  <a
                    href={`/api/documents/${selectedDoc.id}/download`}
                    download
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" /> Baixar Documento Final (.PDF)
                  </a>
                </div>
              )}

              {/* Signatários e Links */}
              <div>
                <h3 className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider mb-3">
                  Links de Assinatura por Signatário
                </h3>
                <div className="space-y-3">
                  {selectedDoc.signers.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{s.name} <span className="text-slate-400 font-normal">({s.role})</span></div>
                        <div className="text-slate-500 font-mono">CPF: {s.cpf}</div>
                        {s.status === 'ASSINADO' && s.signedAt && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                            ✓ Assinado em {new Date(s.signedAt).toLocaleString('pt-BR')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(s.token)}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 flex items-center gap-1.5"
                        >
                          {copiedToken === s.token ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gold-600" />}
                          Copiar Link
                        </button>
                        <a
                          href={`/assinar/${s.token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-500 hover:text-[#0B1D3D]"
                          title="Testar como cliente"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de Ação */}
              {selectedDoc.status !== 'CANCELADO' && selectedDoc.status !== 'CONCLUIDO' && (
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <button
                    onClick={() => handleAction(selectedDoc.id, 'cancel')}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Ban className="w-4 h-4" />
                    Cancelar Documento
                  </button>

                  <button
                    onClick={() => handleAction(selectedDoc.id, 'send')}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold text-xs rounded-xl flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Reenviar Notificações
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
