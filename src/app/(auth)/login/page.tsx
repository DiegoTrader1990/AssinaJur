'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Loader2, Scale } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login.');
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
      <header className="relative z-10 w-full max-w-md mx-auto pt-8 pb-4 text-center">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#071B3A] text-white font-heading font-extrabold flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform border border-white/10">
            AJ
          </div>
          <span className="font-heading font-extrabold text-white text-2xl tracking-tight">
            Assina<span className="text-blue-400">Jur</span>
          </span>
        </Link>
      </header>

      {/* Card de Login Premium */}
      <main className="w-full max-w-md bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl relative z-10 my-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Scale className="w-3.5 h-3.5" /> Acesso ao Escritório
          </span>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A]">Entrar no Sistema</h1>
          <p className="text-xs text-slate-500 mt-1.5">
            Gestão simplificada de contratos, procurações e evidências jurídicas
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              E-mail Profissional
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@escritorio.adv.br"
                className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Senha
              </label>
              <a href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                Esqueceu a senha?
              </a>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              <>
                Entrar no Painel
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Ainda não cadastrou seu escritório?{' '}
            <Link href="/register" className="text-blue-600 font-bold hover:text-blue-800 hover:underline">
              Testar grátis por 30 dias
            </Link>
          </p>
        </div>
      </main>

      {/* Footer de Conformidade */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Validade jurídica garantida conforme MP 2.200-2/2001 e Lei 14.063/2020</span>
      </footer>
    </div>
  );
}
