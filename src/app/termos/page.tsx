import Link from 'next/link';
import { ArrowLeft, Clock, ShieldCheck } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/constants';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-[#0B1D3D] text-white py-6 px-6 border-b border-gold-500/30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-[#0B1D3D] text-xl shadow-md">
              AJ
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white">Assina<span className="text-gold-400">Jur</span></span>
              <p className="text-[10px] text-gray-300 font-medium tracking-wide">Plataforma de Contratação Jurídica</p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-gray-200 hover:text-white flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o início
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full py-16 px-6">
        <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-gold-600" />
            Documentação Legal
          </div>

          <h1 className="text-3xl font-extrabold text-[#0B1D3D] mb-4">Termos de Uso</h1>
          
          <div className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6">
            Página em Preparação
          </div>

          <p className="text-slate-600 max-w-xl mx-auto mb-8 leading-relaxed">
            Os Termos de Uso formais do <strong>AssinaJur</strong> estão sendo finalizados por nossa equipe jurídica para o lançamento oficial da plataforma.
          </p>

          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left text-sm text-slate-600 space-y-3 mb-8">
            <p className="font-semibold text-slate-800">Compromisso de Transparência:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>O teste gratuito é 100% isento de cobranças automáticas e não exige cartão de crédito.</li>
              <li>Todas as assinaturas eletrônicas emitidas cumprem rigorosamente a Lei Federal nº 14.063/2020 e a MP 2.200-2/2001.</li>
              <li>Seu escritório possui total controle sobre os dados de seus clientes e documentos.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto text-sm font-bold bg-[#0B1D3D] text-white hover:bg-slate-800 px-6 py-3 rounded-xl transition-colors text-center"
            >
              Voltar para a página principal
            </Link>
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded-xl transition-colors text-center"
            >
              Falar com consultor
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0B1D3D] text-white py-8 px-6 border-t border-slate-800 text-center text-sm text-slate-400">
        <p>© 2026 AssinaJur. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
