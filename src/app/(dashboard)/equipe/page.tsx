'use client';

import { useState, useEffect } from 'react';
import { UserCheck, UserPlus, Shield, Mail, Phone, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  oabNumber?: string;
  phone?: string;
  active: boolean;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'LAWYER',
    oabNumber: '',
    phone: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/office/team');
      const data = await res.json();
      if (data.members) setMembers(data.members);
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/office/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao adicionar membro.');
      }

      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'LAWYER',
        oabNumber: '',
        phone: '',
      });
      fetchTeam();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OFFICE_ADMIN':
        return <span className="px-2.5 py-1 rounded-full bg-[#0B1D3D] text-gold-400 font-bold text-xs">Administrador</span>;
      case 'LAWYER':
        return <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">Advogado(a)</span>;
      case 'STAFF':
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs">Secretária / Colaborador</span>;
      case 'VIEWER':
        return <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium text-xs">Visualizador</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Gestão da Equipe do Escritório</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastre advogados, secretárias e defina cargos e permissões de acesso.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Membro
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
            Carregando membros da equipe...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Nome do Membro</th>
                  <th className="px-6 py-3.5">Cargo / Papel</th>
                  <th className="px-6 py-3.5">Inscrição OAB</th>
                  <th className="px-6 py-3.5">Contato</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-400">{member.email}</div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(member.role)}</td>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-600">
                      {member.oabNumber || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{member.phone || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-gold-500" />
                <h2 className="text-lg font-bold text-[#0B1D3D]">Novo Membro da Equipe</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateMember} className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dra. Carolina Silva"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="carolina@escritorio.adv.br"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Senha de Acesso *</label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 10 caracteres, com letras e números"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cargo / Papel *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none text-xs"
                  >
                    <option value="LAWYER">Advogado(a)</option>
                    <option value="OFFICE_ADMIN">Administrador</option>
                    <option value="STAFF">Secretária / Colaborador</option>
                    <option value="VIEWER">Visualizador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Número OAB</label>
                  <input
                    type="text"
                    value={formData.oabNumber}
                    onChange={(e) => setFormData({ ...formData, oabNumber: e.target.value })}
                    placeholder="OAB/SP 999.999"
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:border-gold-500 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  Cadastrar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
