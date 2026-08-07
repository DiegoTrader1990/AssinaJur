'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Search, ArrowRight, Lock, CheckCircle2, Scale } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F7F9FC] text-slate-800 flex flex-col justify-between p-6 relative font-sans">
      {/* Background Decorativo */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-[#071B3A] to-[#0B1D3D] pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between py-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#071B3A] text-white font-heading font-extrabold flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform border border-white/10">
            AJ
          </div>
          <div>
            <span className="font-heading font-extrabold text-white text-xl tracking-tight block leading-none">
              Assina<span className="text-blue-400">Jur</span>
            </span>
            <span className="text-[10px] text-slate-300 font-medium mt-0.5 block">
              Portal Público de Verificação Jurídica
            </span>
          </div>
        </Link>

        <Link href="/login" className="text-xs font-bold text-white hover:text-blue-300 transition-colors">
          Acessar Painel do Escritório →
        </Link>
      </header>

      {/* Hero & Form */}
      <main className="relative z-10 max-w-xl mx-auto w-full my-auto text-center space-y-6 pt-6">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-xl border border-slate-200 text-blue-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-10 h-10 text-blue-600" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Scale className="w-3.5 h-3.5" /> Consulta Pública de Autenticidade
          </span>
          <h1 className="font-heading text-3xl font-extrabold text-[#071B3A]">
            Validação de Documentos e Evidências
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed font-medium">
            Informe o código alfanumérico do documento para conferir o certificado de autenticidade, registros faciais e trilha imutável.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: AJ-8F92-K3D1"
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-2xl py-4 pl-12 pr-4 text-center font-mono text-xl text-[#071B3A] placeholder-slate-400 focus:outline-none uppercase font-bold tracking-wider shadow-inner transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg hover:shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm"
          >
            Consultar Autenticidade do Documento
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>

        <div className="pt-2 text-xs text-slate-500 flex items-center justify-center gap-2 font-medium">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span>Validade jurídica respaldada pela MP 2.200-2/2001 e Lei 14.063/2020</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 border-t border-slate-200/60 pt-4">
        © 2026 AssinaJur. Todos os direitos reservados.
      </footer>
    </div>
  );
}
