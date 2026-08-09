import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Termos de Uso | AssinaJur',
  description: 'Termos de Uso da plataforma AssinaJur.',
};

export default function TermosPage() {
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
              Versão de acesso antecipado • 09/08/2026
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0B1D3D] tracking-tight">
              Termos de Uso
            </h1>
          </div>

          <div className="space-y-6 text-slate-600 leading-relaxed">
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">1. Objeto</h2><p>O AssinaJur oferece ferramentas para organização de clientes, preparação de documentos, coleta de assinaturas eletrônicas e registro de evidências técnicas. Durante o acesso antecipado, determinados recursos podem ser ajustados a partir dos testes realizados pelos usuários.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">2. Conta e responsabilidade</h2><p>O escritório é responsável pela veracidade dos dados cadastrados, pelas instruções dadas ao sistema, pela revisão das minutas e pela proteção das credenciais de sua equipe. O acesso não deve ser compartilhado com pessoas não autorizadas.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">3. Documentos e assinaturas</h2><p>O escritório deve revisar e aprovar todo documento antes de enviá-lo. O AssinaJur registra elementos técnicos que podem contribuir para demonstrar autoria, integridade e manifestação de vontade, mas a adequação do método de assinatura depende do documento, das partes e da legislação aplicável.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">4. Inteligência artificial</h2><p>Resultados de OCR e textos produzidos por inteligência artificial são auxiliares e podem conter omissões ou imprecisões. Nenhuma minuta gerada pela IA deve ser utilizada sem conferência e aprovação de advogado responsável.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">5. Uso aceitável</h2><p>É proibido usar a plataforma para fraude, violação de direitos, acesso não autorizado, envio de conteúdo malicioso ou tratamento de dados sem fundamento legítimo. O acesso poderá ser suspenso quando necessário para proteger usuários e a plataforma.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">6. Teste gratuito</h2><ul className="list-disc pl-5 space-y-2"><li>não é solicitado cartão de crédito;</li><li>não existe cobrança automática;</li><li>o acesso observa os limites informados no cadastro e no painel;</li><li>recursos experimentais podem sofrer alterações.</li></ul></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">7. Disponibilidade e suporte</h2><p>A plataforma busca manter disponibilidade contínua, mas poderá passar por manutenção ou sofrer indisponibilidades de serviços de terceiros. Incidentes e dificuldades devem ser comunicados pelo canal de suporte.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">8. Encerramento</h2><p>O usuário pode solicitar o encerramento da conta e receber orientação sobre exportação, retenção ou exclusão de dados, observadas obrigações legais e a preservação de documentos e evidências necessárias.</p></section>
          </div>

          <div className="border-t border-slate-100 pt-6 text-slate-600">
            <p>
              Para dúvidas, entre em contato pelo WhatsApp:{' '}
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
