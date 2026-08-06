'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, FileCheck2, Clock, CheckCircle2, Calendar, Download, ShieldCheck } from 'lucide-react';

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDocs: 0,
    pendingDocs: 0,
    completedDocs: 0,
    completionRate: 0,
  });

  const [monthlyBreakdown, setMonthlyBreakdown] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then((res) => res.json()),
      fetch('/api/documents').then((res) => res.json()),
    ])
      .then(([clientsData, docsData]) => {
        const clients = clientsData.clients || [];
        const docs = docsData.documents || [];

        const pending = docs.filter((d: any) => d.status === 'PENDENTE' || d.status === 'PARCIALMENTE_ASSINADO').length;
        const completed = docs.filter((d: any) => d.status === 'CONCLUIDO').length;
        const rate = docs.length > 0 ? Math.round((completed / docs.length) * 100) : 0;

        setStats({
          totalClients: clients.length,
          totalDocs: docs.length,
          pendingDocs: pending,
          completedDocs: completed,
          completionRate: rate,
        });

        // Agrupamento por mês
        const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });
        setMonthlyBreakdown([
          { month: currentMonthName.toUpperCase(), docsCount: docs.length, completedCount: completed, rate: `${rate}%` },
        ]);
      })
      .catch((err) => console.error('Erro ao carregar dados dos relatórios:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#0B1D3D] tracking-tight">Relatórios & Métricas do Escritório</h1>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhe o desempenho de contratação, taxa de conversão e volume de assinaturas recolhidas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Dados em Tempo Real
          </span>
        </div>
      </div>

      {/* Cards de Desempenho Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total de Clientes</span>
            <div className="text-3xl font-black text-[#0B1D3D] mt-1">{stats.totalClients}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Documentos Gerados</span>
            <div className="text-3xl font-black text-[#0B1D3D] mt-1">{stats.totalDocs}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B1D3D] text-gold-400 flex items-center justify-center font-bold">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assinaturas Concluídas</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">{stats.completedDocs}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Conclusão</span>
            <div className="text-3xl font-black text-gold-600 mt-1">{stats.completionRate}%</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Relatório Mensal Consolidado */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#0B1D3D]" />
            <h2 className="text-base font-extrabold text-[#0B1D3D]">Consolidado por Período</h2>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando relatório...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="p-4">Mês de Referência</th>
                  <th className="p-4">Documentos Criados</th>
                  <th className="p-4">Assinados</th>
                  <th className="p-4">Pendentes</th>
                  <th className="p-4">Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {monthlyBreakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-[#0B1D3D] font-extrabold">{row.month}</td>
                    <td className="p-4">{row.docsCount}</td>
                    <td className="p-4 text-emerald-600">{row.completedCount}</td>
                    <td className="p-4 text-amber-600">{stats.pendingDocs}</td>
                    <td className="p-4 font-bold text-gold-600">{row.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
