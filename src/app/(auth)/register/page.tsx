'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Building2, User, Mail, Phone, Lock, FileText, ArrowRight, AlertCircle, Loader2, Sparkles, Check } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F7F9FC] text-slate-800 flex flex-col justify-between items-center p-6 relative font-sans">
      {/* Background Decorativo */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-[#071B3A] to-[#0B1D3D] pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header com Logo */}
      <header className="relative z-10 w-full max-w-xl mx-auto pt-8 pb-4 text-center">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#071B3A] text-white font-heading font-extrabold flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform border border-white/10">
            AJ
          </div>
          <span className="font-heading font-extrabold text-white text-2xl tracking-tight">
            Assina<span className="text-blue-400">Jur</span>
          </span>
        </Link>
      </header>

      {/* Card de Cadastro Premium */}
      <main className="w-full max-w-xl bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl relative z-10 my-auto">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> 5 Pacotes Gratuitos • Teste por 30 Dias
          </span>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A]">Cadastre seu Escritório</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sem cartão de crédito • Configuração rápida em menos de 2 minutos
          </p>
        </div>

        {/* Garantias em Destaque */}
        <div className="mb-6 grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
            <span>Sem fidelidade</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
            <span>5 Envios grátis</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
            <span>Marca própria</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nome do Escritório *
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="officeName"
                  required
                  value={formData.officeName}
                  onChange={handleChange}
                  placeholder="Rodrigues & Soares Advocacia"
                  className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                CPF ou CNPJ do Escritório *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="cpfCnpj"
                  required
                  value={formData.cpfCnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                OAB do Responsável
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="oabNumber"
                  value={formData.oabNumber}
                  onChange={handleChange}
                  placeholder="OAB/SP 123.456"
                  className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Telefone / WhatsApp *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200/60 my-4" />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nome Completo do Advogado Responsável *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="adminName"
                required
                value={formData.adminName}
                onChange={handleChange}
                placeholder="Dr. Diego Rodrigues"
                className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                E-mail de Acesso *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="adminEmail"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@escritorio.adv.br"
                  className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Senha *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  name="adminPassword"
                  required
                  minLength={6}
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando Escritório...
              </>
            ) : (
              <>
                Criar Conta Grátis e Acessar Painel
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Já possui conta cadastrada?{' '}
          <Link href="/login" className="text-blue-600 font-bold hover:text-blue-800 hover:underline">
            Faça Login
          </Link>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Assinatura eletrônica juridicamente autêntica • MP 2.200-2/2001</span>
      </footer>
    </div>
  );
}
