'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Search, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export default function VerificationPortalPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();
    router.push(`/verificar/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-[#0B1D3D] text-white flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500 text-[#0B1D3D] font-extrabold flex items-center justify-center text-xl shadow-md">
            AJ
          </div>
          <div>
            <span className="font-extrabold text-white text-xl tracking-tight">Assina<span className="text-gold-400">Jur</span></span>
            <p className="text-[10px] text-slate-300 font-medium">Verificador de Autenticidade Jurídica</p>
          </div>
        </Link>

        <Link href="/login" className="text-xs font-bold text-gold-400 hover:underline">
          Acessar Painel
        </Link>
      </header>

      {/* Hero & Form */}
      <main className="max-w-xl mx-auto w-full my-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gold-500/20 border border-gold-500/40 text-gold-400 flex items-center justify-center mx-auto shadow-xl">
          <ShieldCheck className="w-10 h-10 text-gold-400" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">Verificação de Autenticidade de Documentos</h1>
        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          Digite o código de verificação impresso no certificado ou no QR Code do seu documento para conferir sua autenticidade e validade jurídica.
        </p>

        <form onSubmit={handleSubmit} className="bg-[#132A54]/90 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: AJ-8F92-K3D1"
              className="w-full bg-[#0B1D3D] border border-slate-600 focus:border-gold-500 rounded-xl py-3.5 pl-12 pr-4 text-center font-mono text-lg text-white placeholder-slate-400 focus:outline-none uppercase font-bold"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
          >
            Verificar Autenticidade do Documento
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-gold-400" />
          <span>Conformidade com a MP 2.200-2/2001 e Lei 14.063/2020</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 border-t border-white/10 pt-4">
        © 2026 AssinaJur. Todos os direitos reservados.
      </footer>
    </div>
  );
}
