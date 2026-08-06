'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileCheck,
  Layers,
  Smartphone,
  CheckCircle,
  ArrowRight,
  UserCheck,
  Send,
  Sparkles,
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Award
} from 'lucide-react';
import { getWhatsAppLink, SHOW_LEGACY_PLANS } from '@/lib/constants';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const whatsappConsultantUrl = getWhatsAppLink();

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800 flex flex-col selection:bg-gold-500 selection:text-white">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#0B1D3D] text-white shadow-lg border-b border-gold-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-[#0B1D3D] text-xl shadow-md">
              AJ
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white">Assina<span className="text-gold-400">Jur</span></span>
              <p className="text-[10px] text-gray-300 font-medium tracking-wide hidden sm:block">Plataforma de Contratação Jurídica</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-200">
            <a href="#como-funciona" className="hover:text-gold-400 transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-gold-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-gold-400 transition-colors">Perguntas Frequentes</a>
            <a
              href={whatsappConsultantUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com consultor
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-200 hover:text-white px-3 py-2 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold bg-gold-500 text-[#0B1D3D] hover:bg-gold-400 px-4 sm:px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              Testar gratuitamente
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#0B1D3D] via-[#10274F] to-[#132A54] text-white py-16 sm:py-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-400 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-gold-400" />
            Desenvolvido para Escritórios de Advocacia
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Contratação jurídica completa em um único link
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-8 leading-relaxed">
            Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie todos os documentos juntos para assinatura pelo celular.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/register"
              className="w-full sm:w-auto text-base font-bold bg-gold-500 text-[#0B1D3D] hover:bg-gold-400 px-8 py-4 rounded-xl shadow-xl hover:shadow-gold-500/20 transition-all flex items-center justify-center gap-3"
            >
              Testar gratuitamente
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#como-funciona"
              className="w-full sm:w-auto text-base font-semibold bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl backdrop-blur-sm border border-white/15 transition-all text-center"
            >
              Ver como funciona
            </a>
          </div>

          <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-gold-300 font-medium bg-[#0B1D3D]/60 px-4 py-2 rounded-lg border border-gold-500/20">
            <Sparkles className="w-4 h-4 text-gold-400" />
            5 pacotes gratuitos • 30 dias • Sem cartão
          </div>

          <div className="mt-4 text-xs text-slate-400">
            * Você não será cobrado automaticamente após o teste.
          </div>
        </div>
      </section>

      {/* Seção Como Funciona (Demostração dos 6 Passos) */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-50 text-[#0B1D3D] text-xs font-bold uppercase tracking-wider mb-3">
            Fluxo Simples e Rápido
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3D] mb-4">Como funciona o AssinaJur</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-base">
            Conheça as 6 etapas simples para fechar contratos de honorários e procurações em minutos no seu escritório:
          </p>
        </div>

        {/* Grid de 6 Passos */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {/* Passo 1 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-navy-50 rounded-bl-full -z-0 group-hover:bg-gold-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-400/30">PASSO 1</span>
                <div className="w-10 h-10 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5 text-gold-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#0B1D3D] mb-2">1. Cadastre o cliente</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Cadastre os dados pessoais e de contato do seu cliente uma única vez para preenchimento automático em todos os documentos.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-navy-50 rounded-bl-full -z-0 group-hover:bg-gold-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-400/30">PASSO 2</span>
                <div className="w-10 h-10 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5 text-gold-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#0B1D3D] mb-2">2. Escolha o kit jurídico</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Selecione a área jurídica e o pacote contendo Contrato de Honorários, Procuração, Declaração de Hipossuficiência e Termos.
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-navy-50 rounded-bl-full -z-0 group-hover:bg-gold-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-400/30">PASSO 3</span>
                <div className="w-10 h-10 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5 text-gold-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#0B1D3D] mb-2">3. Confira os documentos</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Visualize a prévia automática dos documentos gerados com todas as cláusulas e qualificações preenchidas com precisão.
              </p>
            </div>
          </div>

          {/* Passo 4 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-navy-50 rounded-bl-full -z-0 group-hover:bg-gold-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-400/30">PASSO 4</span>
                <div className="w-10 h-10 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold">
                  <Send className="w-5 h-5 text-gold-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#0B1D3D] mb-2">4. Envie um único link</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Gere o link individual e compartilhe diretamente pelo WhatsApp ou e-mail do cliente em uma única mensagem.
              </p>
            </div>
          </div>

          {/* Passo 5 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-navy-50 rounded-bl-full -z-0 group-hover:bg-gold-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-400/30">PASSO 5</span>
                <div className="w-10 h-10 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5 text-gold-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#0B1D3D] mb-2">5. O cliente assina pelo celular</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                O cliente abre a página no navegador do próprio smartphone, lê o pacote e assina com rapidez, sem precisar criar conta.
              </p>
            </div>
          </div>

          {/* Passo 6 */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-navy-50 rounded-bl-full -z-0 group-hover:bg-gold-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-400/30">PASSO 6</span>
                <div className="w-10 h-10 rounded-xl bg-navy-50 text-[#0B1D3D] flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-gold-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#0B1D3D] mb-2">6. Documentos concluídos e certificado</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Acompanhe em tempo real no painel e acesse os documentos finalizados acompanhados do certificado de evidências com QR Code.
              </p>
            </div>
          </div>
        </div>

        {/* Card Informativo sobre o Teste Gratuito */}
        <div className="bg-gradient-to-r from-[#0B1D3D] to-[#163468] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-gold-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 text-xs font-bold uppercase tracking-wide">
              <CheckCircle className="w-3.5 h-3.5 text-gold-400" />
              Garantia do Teste Gratuito
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Experimente 5 pacotes de assinatura gratuitos por 30 dias
            </h3>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Cada pacote de assinatura permite reunir contrato de honorários, procuração e declarações em um único link seguro. O teste encerra ao utilizar os 5 pacotes ou completar os 30 dias.
            </p>
          </div>
          <div className="flex-shrink-0 w-full md:w-auto text-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-extrabold px-6 py-3.5 rounded-xl shadow-lg transition-all w-full md:w-auto"
            >
              Começar teste gratuito
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-[11px] text-slate-400 mt-2">Você não será cobrado automaticamente após o teste.</p>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 px-4 sm:px-6 bg-slate-100 border-t border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 text-gold-600 border border-gold-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              Valores Transparentes
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3D] mb-4">Escolha a opção ideal para o seu escritório</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              Sem surpresas ou taxas ocultas. Comece sem custo no teste gratuito ou aproveite nossa oferta especial de lançamento no Plano Solo.
            </p>
          </div>

          {/* Exibição dos Planos (SHOW_LEGACY_PLANS = false) */}
          {!SHOW_LEGACY_PLANS ? (
            <div className="space-y-12">
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
                {/* 1. Card Teste Gratuito */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-extrabold text-[#0B1D3D] uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">
                        Degustação
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Sem compromisso</span>
                    </div>

                    <h3 className="text-2xl font-bold text-[#0B1D3D] mb-2">Teste gratuito</h3>
                    <p className="text-slate-500 text-sm mb-6">Para experimentar o sistema em contratações reais.</p>

                    <div className="mb-6 pb-6 border-b border-slate-100">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-extrabold text-[#0B1D3D]">R$ 0</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-1">30 dias para utilizar</p>
                    </div>

                    <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span><strong>5 pacotes de assinatura</strong></span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>30 dias para utilizar</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Sem cartão de crédito</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Sem cobrança automática</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Um usuário</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Acesso às principais funções disponíveis</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <Link
                      href="/register"
                      className="w-full text-center py-3.5 px-4 bg-[#0B1D3D] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors block text-sm shadow-sm"
                    >
                      Começar teste gratuito
                    </Link>
                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      Você não será cobrado automaticamente após o teste.
                    </p>
                  </div>
                </div>

                {/* 2. Card Plano Solo (Destaque Oferta de Lançamento) */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-gold-500 relative shadow-xl flex flex-col justify-between">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gold-500 text-[#0B1D3D] text-xs font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Oferta de Lançamento
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4 mt-2">
                      <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-3 py-1 rounded-full border border-gold-400/30">
                        Plano Solo
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        Economize R$ 120/ano
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-[#0B1D3D] mb-1">Plano Solo</h3>
                    <p className="text-slate-500 text-sm mb-4">Ideal para advogados autônomos e consultores.</p>

                    <div className="mb-6 pb-6 border-b border-slate-100 bg-gold-50/50 p-4 rounded-xl border border-gold-400/20">
                      <div className="text-xs font-semibold text-slate-500 line-through">
                        Preço oficial: R$ 39,90 por mês
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-4xl sm:text-5xl font-extrabold text-[#0B1D3D]">R$ 29,90</span>
                        <span className="text-sm font-bold text-slate-600">/mês</span>
                      </div>
                      <p className="text-xs font-semibold text-gold-600 mt-1">
                        Oferta de lançamento nos primeiros 12 meses
                      </p>
                    </div>

                    <ul className="space-y-3 text-sm text-slate-700 mb-6">
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span><strong>Até 20 pacotes de assinatura por mês</strong></span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Um usuário</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Cadastro de clientes</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Modelos de documentos</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Kits jurídicos</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Contrato, procuração e declarações em 1 único link</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Assinatura pelo celular</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Acompanhamento dos documentos</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Certificado de evidências com QR Code</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Suporte padrão</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 mb-4 leading-relaxed">
                      Oferta de lançamento válida para os primeiros clientes do AssinaJur. Após os primeiros 12 meses, o valor passa para R$ 39,90 por mês.
                    </div>

                    <Link
                      href="/register"
                      className="w-full text-center py-3.5 px-4 bg-gold-500 text-[#0B1D3D] font-extrabold rounded-xl hover:bg-gold-400 transition-all block text-sm shadow-md"
                    >
                      Assinar por R$ 29,90
                    </Link>
                  </div>
                </div>
              </div>

              {/* Seção Opção para Escritórios Maiores */}
              <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#0B1D3D]">Precisa de mais volume ou usuários?</h3>
                  <p className="text-slate-600 text-sm max-w-xl">
                    Entre em contato para conhecer as condições para escritórios com maior número de documentos e colaboradores.
                  </p>
                </div>
                <a
                  href={whatsappConsultantUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md transition-colors whitespace-nowrap text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar com consultor
                </a>
              </div>
            </div>
          ) : (
            /* Planos Antigos (Ocultos por padrão) */
            <div className="grid md:grid-cols-3 gap-8">
              {/* Solo Antigo */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 flex flex-col justify-between opacity-80">
                <div>
                  <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Solo (Legado)</span>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2 mb-4">Para Advogado Autônomo</h3>
                  <div className="text-4xl font-extrabold text-[#0B1D3D] mb-6">R$ 59<span className="text-sm font-normal text-slate-500">/mês</span></div>
                </div>
                <Link href="/register" className="w-full text-center py-3 bg-[#0B1D3D] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                  Assinar Plano Solo
                </Link>
              </div>

              {/* Profissional Antigo */}
              <div className="bg-white rounded-2xl p-8 border-2 border-gold-500 flex flex-col justify-between opacity-80">
                <div>
                  <span className="text-xs font-bold text-gold-600 uppercase tracking-wider">Profissional (Legado)</span>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2 mb-4">Para Pequenos Escritórios</h3>
                  <div className="text-4xl font-extrabold text-[#0B1D3D] mb-6">R$ 149<span className="text-sm font-normal text-slate-500">/mês</span></div>
                </div>
                <Link href="/register" className="w-full text-center py-3 bg-gold-500 text-[#0B1D3D] font-bold rounded-xl hover:bg-gold-400 transition-colors">
                  Experimente Grátis
                </Link>
              </div>

              {/* Escritório Antigo */}
              <div className="bg-white rounded-2xl p-8 border border-slate-200 flex flex-col justify-between opacity-80">
                <div>
                  <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Escritório (Legado)</span>
                  <h3 className="text-2xl font-bold text-slate-800 mt-2 mb-4">Para Médios e Grandes</h3>
                  <div className="text-4xl font-extrabold text-[#0B1D3D] mb-6">R$ 299<span className="text-sm font-normal text-slate-500">/mês</span></div>
                </div>
                <a href={whatsappConsultantUrl} target="_blank" rel="noopener noreferrer" className="w-full text-center py-3 bg-[#0B1D3D] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors block">
                  Falar com Consultor
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Perguntas Frequentes (FAQ) */}
      <section id="faq" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-50 text-[#0B1D3D] text-xs font-bold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-gold-600" />
            Tire suas dúvidas
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1D3D] mb-4">Perguntas Frequentes</h2>
          <p className="text-slate-600 text-base">
            Respostas para as principais dúvidas sobre o teste gratuito, planos e funcionamento do AssinaJur.
          </p>
        </div>

        <div className="space-y-4">
          {/* FAQ 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all">
            <button
              onClick={() => toggleFaq(1)}
              className="w-full p-6 text-left font-bold text-base sm:text-lg text-[#0B1D3D] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <span>Quantos documentos posso testar gratuitamente?</span>
              <ChevronDown className={`w-5 h-5 text-gold-600 transition-transform ${openFaq === 1 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 1 && (
              <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                O teste inclui 5 pacotes de assinatura. Cada pacote pode reunir vários documentos relacionados à contratação de um cliente, como contrato, procuração e declarações.
              </div>
            )}
          </div>

          {/* FAQ 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all">
            <button
              onClick={() => toggleFaq(2)}
              className="w-full p-6 text-left font-bold text-base sm:text-lg text-[#0B1D3D] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <span>Preciso cadastrar cartão?</span>
              <ChevronDown className={`w-5 h-5 text-gold-600 transition-transform ${openFaq === 2 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 2 && (
              <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                Não. O teste gratuito não exige cartão de crédito.
              </div>
            )}
          </div>

          {/* FAQ 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all">
            <button
              onClick={() => toggleFaq(3)}
              className="w-full p-6 text-left font-bold text-base sm:text-lg text-[#0B1D3D] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <span>Haverá cobrança automática?</span>
              <ChevronDown className={`w-5 h-5 text-gold-600 transition-transform ${openFaq === 3 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 3 && (
              <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                Não. Nenhuma cobrança será realizada automaticamente ao final do teste.
              </div>
            )}
          </div>

          {/* FAQ 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all">
            <button
              onClick={() => toggleFaq(4)}
              className="w-full p-6 text-left font-bold text-base sm:text-lg text-[#0B1D3D] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <span>Quanto custa depois do teste?</span>
              <ChevronDown className={`w-5 h-5 text-gold-600 transition-transform ${openFaq === 4 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 4 && (
              <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                O Plano Solo possui preço oficial de R$ 39,90 por mês. Durante o lançamento, os primeiros clientes poderão contratar por R$ 29,90 mensais durante 12 meses.
              </div>
            )}
          </div>

          {/* FAQ 5 */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all">
            <button
              onClick={() => toggleFaq(5)}
              className="w-full p-6 text-left font-bold text-base sm:text-lg text-[#0B1D3D] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
            >
              <span>O cliente precisa criar uma conta?</span>
              <ChevronDown className={`w-5 h-5 text-gold-600 transition-transform ${openFaq === 5 ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === 5 && (
              <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                Não. O cliente recebe o link e realiza a assinatura pelo celular.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer / Rodapé */}
      <footer className="bg-[#0B1D3D] text-white py-16 px-4 sm:px-6 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 text-sm">
          {/* Coluna 1: Logo & Descrição */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold-500 text-[#0B1D3D] flex items-center justify-center font-bold text-xl">
                AJ
              </div>
              <span className="font-extrabold text-white text-2xl">Assina<span className="text-gold-400">Jur</span></span>
            </div>
            <p className="text-slate-400 max-w-md text-sm leading-relaxed">
              Plataforma de contratação e assinatura eletrônica para escritórios de advocacia. Cadastre o cliente uma vez, monte kits jurídicos e receba documentos assinados pelo celular.
            </p>
          </div>

          {/* Coluna 2: Navegação */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase text-xs tracking-wider text-gold-400">Navegação</h4>
            <ul className="space-y-2 text-slate-300">
              <li><a href="#como-funciona" className="hover:text-gold-400 transition-colors">Como funciona</a></li>
              <li><a href="#planos" className="hover:text-gold-400 transition-colors">Planos e Preços</a></li>
              <li><Link href="/register" className="hover:text-gold-400 transition-colors">Teste gratuito</Link></li>
              <li><Link href="/login" className="hover:text-gold-400 transition-colors">Entrar no painel</Link></li>
            </ul>
          </div>

          {/* Coluna 3: Suporte & Legal */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase text-xs tracking-wider text-gold-400">Contato &amp; Legal</h4>
            <ul className="space-y-2 text-slate-300">
              <li>
                <a
                  href={whatsappConsultantUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Falar com consultor
                </a>
              </li>
              <li><Link href="/termos" className="hover:text-gold-400 transition-colors">Termos de Uso</Link></li>
              <li><Link href="/privacidade" className="hover:text-gold-400 transition-colors">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <p>© 2026 AssinaJur. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
