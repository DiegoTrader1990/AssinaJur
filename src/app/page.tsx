import Link from 'next/link';
import { ShieldCheck, FileCheck, Layers, Smartphone, CheckCircle, ArrowRight, UserCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800 flex flex-col">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#0B1D3D] text-white shadow-lg border-b border-gold-500/30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-[#0B1D3D] text-xl shadow-md">
              AJ
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white">Assina<span className="text-gold-400">Jur</span></span>
              <p className="text-[10px] text-gray-300 font-medium tracking-wide">Plataforma de Contratação Jurídica</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-200">
            <a href="#como-funciona" className="hover:text-gold-400 transition-colors">Como Funciona</a>
            <a href="#kits" className="hover:text-gold-400 transition-colors">Kits Jurídicos</a>
            <a href="#recursos" className="hover:text-gold-400 transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-gold-400 transition-colors">Planos</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-200 hover:text-white px-4 py-2 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold bg-gold-500 text-[#0B1D3D] hover:bg-gold-400 px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              Teste Grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#0B1D3D] to-[#132A54] text-white py-24 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4 text-gold-400" />
            Especializado para Escritórios de Advocacia
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Contratação e assinatura eletrônica para <span className="text-gold-400 underline decoration-gold-500/50 underline-offset-8">advogados</span>.
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Cadastre o cliente uma única vez, escolha o kit jurídico (Contrato, Procuração e Declarações) e envie todos os documentos em um único link para assinatura no celular sem necessidade de criar conta.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto text-base font-bold bg-gold-500 text-[#0B1D3D] hover:bg-gold-400 px-8 py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-3"
            >
              Começar Agora sem Custos
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#como-funciona"
              className="w-full sm:w-auto text-base font-semibold bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl backdrop-blur-sm border border-white/10 transition-all text-center"
            >
              Ver Demonstração
            </a>
          </div>
        </div>
      </section>

      {/* Como Funciona / Diferencial */}
      <section id="como-funciona" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#0B1D3D] mb-4">Mais do que um simples assinador de PDFs</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Desenvolvido sob medida para a rotina da advocacia moderna. Reduza o tempo de atendimento do seu cliente de dias para minutos.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold text-xl mb-6">
              <UserCheck className="w-6 h-6 text-gold-500" />
            </div>
            <h3 className="text-xl font-bold text-[#0B1D3D] mb-3">1. Cadastre o Cliente 1 vez</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Armazene os dados pessoais do cliente centralizados. Nunca mais digite o mesmo CPF, RG e endereço em múltiplos modelos manuais.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold text-xl mb-6">
              <Layers className="w-6 h-6 text-gold-500" />
            </div>
            <h3 className="text-xl font-bold text-[#0B1D3D] mb-3">2. Selecione o Kit Jurídico</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Combine Contrato de Honorários, Procuração, Declaração de Hipossuficiência e Termos em um único pacote por área jurídica.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold text-xl mb-6">
              <Smartphone className="w-6 h-6 text-gold-500" />
            </div>
            <h3 className="text-xl font-bold text-[#0B1D3D] mb-3">3. Assinatura via Celular</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              O cliente recebe um único link direto no celular, visualiza todos os documentos e assina sem burocracia nem necessidade de criar conta.
            </p>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 px-6 bg-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0B1D3D] mb-4">Planos Transparentes para Qualquer Tamanho de Escritório</h2>
            <p className="text-slate-600">Escolha a solução ideal para acelerar o fechamento de contratos no seu escritório.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Solo */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Solo</span>
                <h3 className="text-2xl font-bold text-slate-800 mt-2 mb-4">Para Advogado Autônomo</h3>
                <div className="text-4xl font-extrabold text-[#0B1D3D] mb-6">R$ 59<span className="text-sm font-normal text-slate-500">/mês</span></div>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> 1 Usuário Advogado</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Até 30 Documentos/mês</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Modelos de Documentos</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Certificado de Evidências com QR Code</li>
                </ul>
              </div>
              <Link href="/register" className="w-full text-center py-3 bg-[#0B1D3D] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                Assinar Plano Solo
              </Link>
            </div>

            {/* Profissional */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gold-500 relative shadow-lg flex flex-col justify-between">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold-500 text-[#0B1D3D] text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                Mais Popular
              </div>
              <div>
                <span className="text-xs font-bold text-gold-600 uppercase tracking-wider">Profissional</span>
                <h3 className="text-2xl font-bold text-slate-800 mt-2 mb-4">Para Pequenos Escritórios</h3>
                <div className="text-4xl font-extrabold text-[#0B1D3D] mb-6">R$ 149<span className="text-sm font-normal text-slate-500">/mês</span></div>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Até 5 Usuários</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Documentos Ilimitados</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Kits Jurídicos Personalizados</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Personalização com Logo e Cores</li>
                </ul>
              </div>
              <Link href="/register" className="w-full text-center py-3 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl hover:bg-gold-400 transition-colors">
                Experimente Grátis
              </Link>
            </div>

            {/* Escritório */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Escritório</span>
                <h3 className="text-2xl font-bold text-slate-800 mt-2 mb-4">Para Médios e Grandes</h3>
                <div className="text-4xl font-extrabold text-[#0B1D3D] mb-6">R$ 299<span className="text-sm font-normal text-slate-500">/mês</span></div>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Usuários Ilimitados</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Permissões Granulares por Cargo</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Relatórios e Auditoria Avançada</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600" /> Suporte Prioritário</li>
                </ul>
              </div>
              <Link href="/register" className="w-full text-center py-3 bg-[#0B1D3D] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                Falar com Consultor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1D3D] text-white py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gold-500 text-[#0B1D3D] flex items-center justify-center font-bold text-base">AJ</div>
            <span className="font-bold text-white text-lg">Assina<span className="text-gold-400">Jur</span></span>
          </div>
          <p>© 2026 AssinaJur. Todos os direitos reservados. Plataforma de contratação e assinatura para escritórios de advocacia.</p>
        </div>
      </footer>
    </div>
  );
}
