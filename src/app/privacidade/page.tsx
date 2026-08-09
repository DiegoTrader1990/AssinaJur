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
              Versão de acesso antecipado • 09/08/2026
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0B1D3D] tracking-tight">
              Política de Privacidade
            </h1>
          </div>

          <div className="space-y-6 text-slate-600 leading-relaxed">
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">1. Dados tratados</h2><p>O AssinaJur trata dados da conta e do escritório, cadastros de clientes e signatários, documentos, mensagens operacionais, assinatura gráfica, registros fotográficos, endereço IP, informações do dispositivo e localização quando autorizada.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">2. Finalidades</h2><p>Os dados são utilizados para autenticar usuários, preparar e armazenar documentos, viabilizar assinaturas, registrar evidências, prevenir fraudes, prestar suporte, manter auditoria e cumprir obrigações legais.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">3. Escritório e AssinaJur</h2><p>Em regra, o escritório decide quais dados de seus clientes serão inseridos e para quais finalidades. O AssinaJur realiza o tratamento necessário para prestar a plataforma, conforme as instruções do escritório e as exigências legais aplicáveis.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">4. Dados sensíveis e registros fotográficos</h2><p>Fotos e eventuais dados biométricos exigem proteção reforçada. Esses registros são utilizados no fluxo de evidências da assinatura e não devem ser reutilizados para finalidade incompatível.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">5. Compartilhamento e fornecedores</h2><p>Dados podem ser processados por fornecedores de hospedagem, banco de dados, armazenamento, comunicação, OCR e inteligência artificial estritamente para viabilizar os recursos contratados. O AssinaJur não comercializa dados pessoais.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">6. Segurança e retenção</h2><p>São aplicadas medidas de controle de acesso, isolamento por escritório, armazenamento privado, trilhas de atividade e proteção de credenciais. Os dados são mantidos pelo tempo necessário às finalidades informadas, à execução do serviço e ao cumprimento de obrigações legais.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">7. Direitos dos titulares</h2><p>O titular pode solicitar confirmação, acesso, correção e demais providências previstas na LGPD. Pedidos relacionados a dados inseridos por um escritório poderão ser encaminhados ao respectivo controlador para atendimento.</p></section>
            <section><h2 className="text-lg font-bold text-[#0B1D3D] mb-2">8. Contato</h2><p>Dúvidas, solicitações e comunicações sobre privacidade podem ser enviadas pelo canal indicado abaixo. A identidade do solicitante poderá ser confirmada para proteção dos dados.</p></section>
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
