'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  FileCheck2,
  CreditCard,
  ShieldCheck,
  Search,
  Edit3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Lock,
  LogOut
} from 'lucide-react';

interface OfficeAdminItem {
  id: string;
  name: string;
  tradeName?: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  plan: string;
  planStatus: string;
  monthlyDocLimit: number;
  maxUsersLimit: number;
  additionalCredits: number;
  usersCount: number;
  clientsCount: number;
  totalDocsCount: number;
  monthDocsCount: number;
  createdAt: string;
}

export default function SuperAdminDashboardPage() {
  const [offices, setOffices] = useState<OfficeAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<OfficeAdminItem | null>(null);

  // Formulário de Edição do Escritório pelo Super Admin
  const [editData, setEditData] = useState({
    plan: 'SOLO',
    planStatus: 'ACTIVE',
    monthlyDocLimit: 30,
    maxUsersLimit: 1,
    additionalCredits: 0,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/offices');
      const data = await res.json();
      if (data.offices) setOffices(data.offices);
    } catch (err) {
      console.error('Erro ao carregar escritórios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (off: OfficeAdminItem) => {
    setSelectedOffice(off);
    setEditData({
      plan: off.plan,
      planStatus: off.planStatus,
      monthlyDocLimit: off.monthlyDocLimit,
      maxUsersLimit: off.maxUsersLimit,
      additionalCredits: off.additionalCredits,
    });
  };

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffice) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/offices/${selectedOffice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!res.ok) throw new Error('Erro ao atualizar escritório.');

      setSelectedOffice(null);
      fetchOffices();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalOffices = offices.length;
  const activeOffices = offices.filter((o) => o.planStatus === 'ACTIVE').length;
  const totalMonthDocs = offices.reduce((acc, o) => acc + o.monthDocsCount, 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800 flex flex-col font-sans">
      {/* Header Admin */}
      <header className="bg-[#0B1D3D] text-white py-5 px-6 shadow-md border-b border-gold-500/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-[#0B1D3D] font-extrabold flex items-center justify-center text-xl shadow-md">
              AJ
            </div>
            <div>
              <span className="font-extrabold text-white text-xl tracking-tight">Assina<span className="text-gold-400">Jur</span></span>
              <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Painel Administrativo da Plataforma (SaaS Global)</p>
            </div>
          </div>

          <Link href="/login" className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> Sair do Painel Admin
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 flex-1">
        {/* Métricas Globais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Escritórios</span>
              <div className="text-3xl font-extrabold text-[#0B1D3D] mt-1">{totalOffices}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gold-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contas Ativas</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">{activeOffices}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Docs Emitidos no Mês</span>
              <div className="text-3xl font-extrabold text-blue-600 mt-1">{totalMonthDocs}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MRR Estimado</span>
              <div className="text-3xl font-extrabold text-gold-600 mt-1">R$ 1.490</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tabela de Escritórios Cadastrados */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0B1D3D]">Escritórios Cadastrados na Plataforma</h2>
            <span className="text-xs text-slate-500">Gestão de limites e assinaturas</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
              Carregando escritórios...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Escritório</th>
                    <th className="px-6 py-3.5">Plano Ativo</th>
                    <th className="px-6 py-3.5">Consumo / Limite</th>
                    <th className="px-6 py-3.5">Usuários</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offices.map((off) => (
                    <tr key={off.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{off.name}</div>
                        <div className="text-xs text-slate-400">CNPJ/CPF: {off.cpfCnpj} • {off.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-gold-100 text-[#0B1D3D] font-extrabold text-xs">
                          {off.plan}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold">
                        {off.monthDocsCount} / {off.monthlyDocLimit + off.additionalCredits} docs
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        {off.usersCount} / {off.maxUsersLimit}
                      </td>

                      <td className="px-6 py-4">
                        {off.planStatus === 'ACTIVE' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">Ativo</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-bold text-xs">Suspenso</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(off)}
                          className="px-3 py-1.5 bg-[#0B1D3D] text-white font-bold rounded-lg text-xs hover:bg-slate-800 transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-gold-400" />
                          Gerenciar Plano
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Editar Plano e Limites do Escritório */}
      {selectedOffice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#0B1D3D]">{selectedOffice.name}</h2>
                <p className="text-xs text-slate-500">Alteração de Limites & Status do SaaS</p>
              </div>
              <button onClick={() => setSelectedOffice(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOffice} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Plano de Assinatura</label>
                <select
                  value={editData.plan}
                  onChange={(e) => setEditData({ ...editData, plan: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold"
                >
                  <option value="SOLO">Solo (R$ 59/mês)</option>
                  <option value="PROFISSIONAL">Profissional (R$ 149/mês)</option>
                  <option value="ESCRITORIO">Escritório (R$ 299/mês)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status da Conta</label>
                <select
                  value={editData.planStatus}
                  onChange={(e) => setEditData({ ...editData, planStatus: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold"
                >
                  <option value="ACTIVE">Ativo (Liberado)</option>
                  <option value="SUSPENDED">Suspenso (Bloqueado)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Limite Docs/Mês</label>
                  <input
                    type="number"
                    value={editData.monthlyDocLimit}
                    onChange={(e) => setEditData({ ...editData, monthlyDocLimit: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Limite Usuários</label>
                  <input
                    type="number"
                    value={editData.maxUsersLimit}
                    onChange={(e) => setEditData({ ...editData, maxUsersLimit: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Créditos Adicionais</label>
                <input
                  type="number"
                  value={editData.additionalCredits}
                  onChange={(e) => setEditData({ ...editData, additionalCredits: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-xs"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOffice(null)}
                  className="px-4 py-2.5 text-slate-600 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-xs transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
