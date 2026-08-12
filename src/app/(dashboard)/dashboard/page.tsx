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
  Loader2
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
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then((res) => res.json()),
      fetch('/api/documents').then((res) => res.json()),
    ])
      .then(([clientsData, docsData]) => {
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

      <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-[#071B3A] via-[#0B2A59] to-blue-700 p-6 text-white shadow-lg">
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

      {/* Grid Principal — Upload Rápido + Resumo de Envio */}
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
            <div className="font-heading text-2xl font-extrabold text-slate-700 mt-1">{stats.totalDocs}</div>
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
