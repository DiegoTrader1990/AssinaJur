'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  AlertCircle
} from 'lucide-react';

export default function DashboardPage() {
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

          const pending = docs.filter((d: any) => d.status === 'PENDENTE' || d.status === 'PARCIALMENTE_ASSINADO').length;
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Redireciona para novo documento com o arquivo
      window.location.href = '/documentos/novo';
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Welcome Header & Quick Action Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-[#0B1D3D] tracking-tight">
            Bom dia, Diego! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Quinta-feira, 6 de Agosto de 2026</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Escritório com Validade Jurídica Ativa (MP 2.200-2 / Lei 14.063)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/kits/enviar"
            className="px-3.5 py-2 rounded-xl bg-gold-50 text-[#0B1D3D] font-extrabold text-xs border border-gold-300 hover:bg-gold-100 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            Automatizar Kits
          </Link>
          <Link
            href="/documentos/novo"
            className="px-3.5 py-2 rounded-xl bg-white text-slate-700 font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#0B1D3D]" />
            Área de Envio
          </Link>
          <Link
            href="/clientes?novo=true"
            className="px-3.5 py-2 rounded-xl bg-[#0B1D3D] text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5 text-gold-400" />
            Novo Cliente
          </Link>
        </div>
      </div>

      {/* Grid Principal — Upload Rápido Estilo Clicksign + Resumo de Envio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Zona de Drag & Drop de Arquivos */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`bg-white p-8 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center min-h-[220px] shadow-sm relative overflow-hidden group ${
            dragActive
              ? 'border-gold-500 bg-gold-50/30 scale-[1.01]'
              : 'border-slate-200 hover:border-gold-400 hover:bg-slate-50/50'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-gold-100/80 text-gold-600 border border-gold-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className="w-7 h-7" />
          </div>

          <h3 className="text-base font-extrabold text-[#0B1D3D]">Adicionar documentos</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Clique aqui ou arraste os arquivos PDF do contrato ou procuração
          </p>

          <Link
            href="/documentos/novo"
            className="px-5 py-2.5 bg-[#0B1D3D] hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            Selecionar Documentos do Computador
          </Link>
        </div>

        {/* Card 2: Resumo de Envio nos Últimos 30 Dias */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Resumo da Atividade de Envio
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                Últimos 30 dias
              </span>
            </div>

            {stats.totalDocs === 0 ? (
              <div className="py-4 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">Você ainda não enviou documentos este mês.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Que tal criar o seu primeiro Kit Jurídico com Contrato e Procuração em 1 único link?
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 py-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Enviados</span>
                  <span className="text-2xl font-black text-[#0B1D3D]">{stats.totalDocs}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block">Pendente</span>
                  <span className="text-2xl font-black text-amber-600">{stats.pendingDocs}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Assinados</span>
                  <span className="text-2xl font-black text-emerald-600">{stats.completedDocs}</span>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/kits/enviar"
            className="text-xs font-extrabold text-gold-600 hover:text-gold-500 flex items-center gap-1 mt-4 pt-4 border-t border-slate-100"
          >
            Enviar Kit de Contratação em 1 Link
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Cards de Métricas Detalhadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clientes Cadastrados</span>
            <div className="text-2xl font-black text-[#0B1D3D] mt-1">{stats.clientsCount}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Assinatura</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.pendingDocs}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assinados com Éxito</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{stats.completedDocs}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Processos</span>
            <div className="text-2xl font-black text-slate-700 mt-1">{stats.totalDocs}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Seção Inferior de 3 Colunas — Plano/Upgrade + Central de Ajuda + Notificações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Banner Comercial de Plano */}
        <div className="bg-gradient-to-br from-[#0B1D3D] via-[#102854] to-indigo-950 text-white p-6 rounded-2xl shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="px-2.5 py-1 rounded-full bg-gold-500/20 text-gold-300 font-extrabold text-[10px] uppercase border border-gold-500/40">
              Plano Escritório SaaS
            </span>
            <h3 className="text-base font-extrabold text-white">
              Ganhe agilidade e segurança jurídica nas contratações
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Simplifique seus contratos de honorários e procurações. Assinatura mobile criptografada com certificado de evidências.
            </p>
          </div>

          <Link
            href="/plano"
            className="w-full py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-extrabold rounded-xl text-xs text-center transition-all shadow-md"
          >
            Gerenciar Limites do Plano
          </Link>
        </div>

        {/* Card 2: Central de Ajuda & Suporte */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#0B1D3D]" />
              <h3 className="text-sm font-extrabold text-[#0B1D3D]">Precisa de ajuda?</h3>
            </div>

            <div className="space-y-2 text-xs">
              <Link href="/modelos" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between text-slate-700 font-semibold transition-colors">
                <span>📘 Como criar modelos com variáveis</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link href="/kits" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between text-slate-700 font-semibold transition-colors">
                <span>📦 Como agrupar kits em 1 link</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link href="/verificar" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-between text-slate-700 font-semibold transition-colors">
                <span>🔒 Consultar autenticidade do PDF</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card 3: Feed de Notificações e Atividades Recentes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#0B1D3D]">Notificações Recentes</h3>
              <span className="text-[10px] font-bold text-slate-400">Tempo real</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                <span className="font-bold text-blue-900 block">✓ Sistema de Validade Jurídica Ativo</span>
                <p className="text-[11px] text-blue-700 leading-snug">
                  Seus documentos possuem criptografia SHA-256 e selo imutável (MP 2.200-2/2001).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <span className="font-bold text-slate-800 block">📄 Nova Funcionalidade de Kits</span>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Envie Procuração + Contrato + Declaração em apenas 1 link de assinatura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela dos Últimos Clientes Cadastrados */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0B1D3D]" />
            <h2 className="text-base font-extrabold text-[#0B1D3D]">Últimos Clientes do Escritório</h2>
          </div>
          <Link
            href="/clientes"
            className="text-xs font-extrabold text-gold-600 hover:text-gold-500 flex items-center gap-1"
          >
            Ver todos os clientes
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando clientes...</div>
        ) : recentClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-sm">Nenhum cliente cadastrado ainda.</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Cadastre um cliente para poder enviar o Kit Jurídico de contratação.</p>
            <Link
              href="/clientes?novo=true"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-[#0B1D3D] font-extrabold rounded-xl text-xs shadow-md"
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
                  <div className="font-bold text-slate-800 text-sm">{client.name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
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
                    className="text-xs font-extrabold text-[#0B1D3D] bg-gold-400 hover:bg-gold-300 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                  >
                    Enviar Kit
                  </Link>
                  <Link
                    href={`/clientes?id=${client.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-[#0B1D3D] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
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
