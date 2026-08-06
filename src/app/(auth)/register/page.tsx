'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Building2, User, Mail, Phone, Lock, FileText, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    officeName: '',
    cpfCnpj: '',
    oabNumber: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar escritório.');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1D3D] text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-[#132A54]/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10 my-8">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gold-500 flex items-center justify-center font-extrabold text-[#0B1D3D] text-2xl shadow-lg">
              AJ
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cadastre seu Escritório no AssinaJur</h1>
          <p className="text-sm text-slate-300 mt-1">Crie sua conta multiempresa e comece a emitir documentos jurídicos em minutos.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Nome do Escritório *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="officeName"
                  required
                  value={formData.officeName}
                  onChange={handleChange}
                  placeholder="Rodrigues & Soares Advocacia"
                  className="w-full bg-[#0B1D3D]/80 border border-slate-600 focus:border-gold-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                CPF ou CNPJ do Escritório *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="cpfCnpj"
                  required
                  value={formData.cpfCnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-[#0B1D3D]/80 border border-slate-600 focus:border-gold-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                OAB do Responsável
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="oabNumber"
                  value={formData.oabNumber}
                  onChange={handleChange}
                  placeholder="OAB/SP 123.456"
                  className="w-full bg-[#0B1D3D]/80 border border-slate-600 focus:border-gold-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Telefone / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-[#0B1D3D]/80 border border-slate-600 focus:border-gold-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <hr className="border-white/10 my-4" />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Nome Completo do Advogado Responsável *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="adminName"
                required
                value={formData.adminName}
                onChange={handleChange}
                placeholder="Dr. Diego Rodrigues"
                className="w-full bg-[#0B1D3D]/80 border border-slate-600 focus:border-gold-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                E-mail de Acesso *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="adminEmail"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@escritorio.adv.br"
                  className="w-full bg-[#0B1D3D]/80 border border-slate-600 focus:border-gold-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="adminPassword"
                  required
                  minLength={6}
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0B1D3D]/80 border border-slate-600 focus:border-gold-500 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando Escritório...
              </>
            ) : (
              <>
                Concluir Cadastro e Acessar Painel
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          Já possui conta?{' '}
          <Link href="/login" className="text-gold-400 font-bold hover:underline">
            Faça Login
          </Link>
        </div>
      </div>
    </div>
  );
}
