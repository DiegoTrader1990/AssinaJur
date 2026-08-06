import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidade | AssinaJur',
  description: 'Política de Privacidade da plataforma AssinaJur.',
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
      <main className="max-w-3xl mx-auto w-full px-6 py-12 flex-1">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-sm space-y-8">
          <div className="space-y-3">
            <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 text-[#2563EB] text-xs font-semibold rounded-full tracking-wide">
              Conteúdo em preparação
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0B1D3D] tracking-tight">
              Política de Privacidade
            </h1>
          </div>

          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>
              A Política de Privacidade completa do AssinaJur está em fase de revisão para detalhar como os dados das contas, dos escritórios, dos clientes e dos documentos são tratados durante a utilização da plataforma.
            </p>
            <p>
              Em caso de dúvida sobre privacidade ou dados pessoais, entre em contato pelos canais disponibilizados pelo AssinaJur.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6 text-slate-600">
            <p>
              WhatsApp:{' '}
              <a
                href="https://wa.me/5573988250201"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#2563EB] hover:underline inline-flex items-center gap-1"
              >
                (73) 98825-0201
              </a>
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-slate-500 border-t border-slate-200 bg-white">
        © 2026 AssinaJur
      </footer>
    </div>
  );
}
