'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, FileCheck2, CheckCircle2, Calendar, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

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
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadReport = () => {
    setLoading(true);
    setError('');
    Promise.all([
      fetch('/api/clients', { cache: 'no-store' }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os clientes.');
        return data;
      }),
      fetch('/api/documents', { cache: 'no-store' }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os documentos.');
        return data;
      }),
    ])
      .then(([clientsData, docsData]) => {
        const clients = clientsData.clients || [];
        const docs = docsData.documents || [];

        const pending = docs.filter((d: any) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(d.status)).length;
        const completed = docs.filter((d: any) => d.status === 'CONCLUIDO').length;
        const rate = docs.length > 0 ? Math.round((completed / docs.length) * 100) : 0;

        setStats({
          totalClients: clients.length,
          totalDocs: docs.length,
          pendingDocs: pending,
          completedDocs: completed,
          completionRate: rate,
        });

        const grouped = new Map<string, { month: string; docsCount: number; completedCount: number; pendingCount: number }>();
        docs.forEach((doc: any) => {
          const date = new Date(doc.createdAt);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const current = grouped.get(key) || {
            month: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase(),
            docsCount: 0,
            completedCount: 0,
            pendingCount: 0,
          };
          current.docsCount += 1;
          if (doc.status === 'CONCLUIDO') current.completedCount += 1;
          else if (!['CANCELADO', 'EXPIRADO'].includes(doc.status)) current.pendingCount += 1;
          grouped.set(key, current);
        });
        setMonthlyBreakdown(Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([, row]) => ({ ...row, rate: `${row.docsCount ? Math.round((row.completedCount / row.docsCount) * 100) : 0}%` })));
        setUpdatedAt(new Date());
      })
      .catch((err) => {
        console.error('Erro ao carregar dados dos relatórios:', err);
        setError(err instanceof Error ? err.message : 'Não foi possível atualizar o relatório.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
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
          <button type="button" onClick={loadReport} disabled={loading} className="px-3 py-1.5 rounded-xl bg-white text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
      {updatedAt && <p className="text-[11px] text-slate-400 -mt-5">Última atualização: {updatedAt.toLocaleString('pt-BR')}</p>}

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
                    <td className="p-4 text-amber-600">{row.pendingCount}</td>
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
