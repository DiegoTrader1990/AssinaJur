'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileCheck2,
  Users,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronDown,
  MessageSquare,
  Building2,
  FileText,
  Clock,
  Eye,
  Award,
  Zap,
  HelpCircle,
  Play,
  QrCode,
  Shield,
  Layers,
  Search,
  Check,
  PhoneCall
} from 'lucide-react';
import { COMMERCIAL_WHATSAPP } from '@/lib/constants';

const FAQ_ITEMS = [
  {
    q: 'A assinatura do AssinaJur possui validade jurídica?',
    a: 'Sim. A assinatura possui plena validade respaldada pelo Art. 10, § 2º da Medida Provisória nº 2.200-2/2001 e pela Lei nº 14.063/2020 (assinatura eletrônica avançada), contando com registro imutável de IP, geolocalização, prova de presença com 3 fotos e hash SHA-256.',
  },
  {
    q: 'O cliente precisa instalar algum aplicativo para assinar?',
    a: 'Não. Todo o fluxo é feito diretamente no navegador do celular ou computador através de um único link seguro enviado pelo WhatsApp ou e-mail.',
  },
  {
    q: 'Como funciona a prova de presença ao vivo?',
    a: 'A câmera do celular guia o cliente em tempo real para capturar 3 registros faciais (Frontal, Perfil Esquerdo e Perfil Direito) na proporção 4:3. A inteligência de detecção facial valida a posição e estabilidade antes de registrar a foto.',
  },
  {
    q: 'Posso enviar vários documentos juntos em um único pacote?',
    a: 'Sim! Essa é a principal proposta do AssinaJur. Você pode reunir contrato de honorários, procuração, declaração de hipossuficiência e outros documentos daquela contratação em um único link enviado ao cliente.',
  },
  {
    q: 'Como é feita a validação de um documento assinado?',
    a: 'Qualquer pessoa com o documento ou o código de autenticidade pode escanear o QR Code impresso no Certificado de Evidências ou acessar a página pública de verificação no site.',
  },
  {
    q: 'O cliente recebe uma cópia do documento assinado?',
    a: 'Sim, ao concluir o fluxo de assinatura o cliente visualiza a confirmação e o escritório responsável recebe o PDF consolidado com todas as evidências registradas.',
  },
  {
    q: 'Posso personalizar com o nome e marca do meu escritório?',
    a: 'Sim. O sistema permite configurar o nome do escritório, dados de contato e identidade visual exibida na página de assinatura e no certificado.',
  },
  {
    q: 'O que acontece após o período de teste gratuito de 30 dias?',
    a: 'Após os 30 dias ou após utilizar os 5 pacotes gratuitos, você poderá escolher um dos nossos planos pagos. Não há nenhuma cobrança automática.',
  },
  {
    q: 'É necessário cadastrar cartão de crédito para testar?',
    a: 'Não! O cadastro para o teste gratuito exige apenas seu e-mail e dados básicos do seu escritório.',
  },
  {
    q: 'Como cancelar ou suspender um documento enviado por engano?',
    a: 'No painel do escritório você pode cancelar qualquer documento pendente a qualquer momento, invalidando o link de assinatura.',
  },
  {
    q: 'O sistema funciona perfeitamente em qualquer modelo de celular?',
    a: 'Sim, é totalmente otimizado para Android (Chrome) e iPhone (Safari), adaptando-se com fluidez às telas de smartphones.',
  },
  {
    q: 'O Certificado de Evidências acompanha o próprio PDF do documento?',
    a: 'Sim. O AssinaJur compila todas as páginas do documento original com uma faixa discreta de autenticação e adiciona o Certificado de Evidências com fotos, hashes e QR Code no final do PDF.',
  },
  {
    q: 'Qual a diferença entre o AssinaJur e um assinador de PDFs convencional?',
    a: 'Enquanto assinadores comuns trabalham com PDFs avulsos já prontos, o AssinaJur organiza a contratação jurídica desde o cadastro do cliente, permitindo preparar kits de documentos e colher assinaturas em lote.',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDemoTab, setActiveDemoTab] = useState<'PANEL' | 'PACKAGE' | 'WHATSAPP' | 'SIGNING' | 'CERTIFICATE'>('PANEL');

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getWhatsAppLink = (message: string) => {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${COMMERCIAL_WHATSAPP}?text=${encoded}`;
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800 font-sans selection:bg-gold-500 selection:text-[#0B1D3D]">
      {/* ── HEADER STICKY PREMIUM ── */}
      <header className="sticky top-0 z-50 bg-[#0B1D3D]/95 backdrop-blur-md border-b border-gold-500/20 text-white transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500 text-[#0B1D3D] font-extrabold flex items-center justify-center text-xl shadow-lg">
              AJ
            </div>
            <div>
              <span className="font-extrabold text-white text-xl tracking-tight">
                Assina<span className="text-gold-400">Jur</span>
              </span>
              <p className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">Advocacia Digital & Evidências</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#como-funciona" className="hover:text-gold-400 transition-colors">Como Funciona</a>
            <a href="#demonstracao" className="hover:text-gold-400 transition-colors">Demonstração Real</a>
            <a href="#diferenciais" className="hover:text-gold-400 transition-colors">Diferenciais</a>
            <a href="#seguranca" className="hover:text-gold-400 transition-colors">Segurança</a>
            <a href="#planos" className="hover:text-gold-400 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-gold-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-200 hover:text-white px-3.5 py-2 rounded-xl transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-extrabold rounded-xl shadow-md text-xs transition-all flex items-center gap-1.5"
            >
              Testar Gratuito
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 1. PRIMEIRA DOBRA (HERO) ── */}
      <section className="bg-[#0B1D3D] text-white pt-10 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 font-bold text-xs">
              <Sparkles className="w-4 h-4" /> Desenvolvido para advogados e escritórios de advocacia
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Assinatura jurídica completa em um único link
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie todos os documentos juntos para assinatura pelo celular.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-extrabold rounded-xl shadow-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                Testar gratuitamente
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#demonstracao"
                className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/10 text-sm transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 text-gold-400 fill-gold-400" />
                Ver o AssinaJur em ação
              </a>
            </div>

            <div className="pt-2 text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-300">5 pacotes gratuitos por 30 dias • Sem cartão</p>
              <p className="text-[11px] text-slate-400">Sem cobrança automática ao final do teste.</p>
            </div>
          </div>

          {/* Composição Visual Interativa do Produto */}
          <div className="lg:col-span-5">
            <div className="bg-[#132A54]/90 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono text-slate-400 ml-2">assinajur.app/assinar/token</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                  Criptografia 256-bit
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-200">
                <div className="p-3 bg-[#0B1D3D] rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gold-400" />
                    <div>
                      <div className="font-bold text-white">João da Silva Santos</div>
                      <div className="text-[10px] text-slate-400">CPF: 111.222.333-44</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400">Cliente Cadastrado</span>
                </div>

                <div className="p-3 bg-[#0B1D3D] rounded-xl border border-white/10 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-gold-400">Pacote Jurídico Previdenciário (3 Documentos)</span>
                  <div className="space-y-1 pl-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1. Contrato de Honorários
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 2. Procuração Ad Judicia
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 3. Declaração de Hipossuficiência
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <Eye className="w-4 h-4" /> Prova de presença ao vivo (3 selfies 4:3)
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-400">VALIDADA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. SEÇÃO COMO FUNCIONA (5 PASSOS) ── */}
      <section id="como-funciona" className="py-20 px-4 sm:px-6 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Fluxo Jurídico Simplificado
            </span>
            <h2 className="text-3xl font-black text-[#0B1D3D]">Como funciona o AssinaJur</h2>
            <p className="text-sm text-slate-600">
              Em apenas cinco etapas simples seu escritório organiza o atendimento, envia os documentos e colhe todas as assinaturas com validade imutável.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              { step: '01', title: 'Cadastre o cliente', desc: 'Preencha os dados do cliente uma única vez no painel do escritório.' },
              { step: '02', title: 'Prepare os documentos', desc: 'Escolha contrato, procuração e declarações em um único pacote jurídico.' },
              { step: '03', title: 'Envie um único link', desc: 'Compartilhe o link direto no WhatsApp do cliente para assinatura no celular.' },
              { step: '04', title: 'Acompanhe as assinaturas', desc: 'Receba confirmações em tempo real à medida que as etapas são validadas.' },
              { step: '05', title: 'Receba o certificado', desc: 'Acesse o PDF consolidado com fotos 4:3, IP, geolocalização e QR Code.' },
            ].map((s, idx) => (
              <div key={idx} className="bg-[#F7F8FA] p-6 rounded-2xl border border-slate-200 relative space-y-3">
                <span className="text-2xl font-black text-gold-500 block">{s.step}</span>
                <h3 className="text-sm font-extrabold text-[#0B1D3D]">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. DEMONSTRAÇÃO REAL DO PRODUTO ── */}
      <section id="demonstracao" className="py-20 px-4 sm:px-6 bg-[#F7F8FA] border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-gold-600 uppercase tracking-wider bg-gold-100 px-3 py-1 rounded-full border border-gold-300">
              Interface Real
            </span>
            <h2 className="text-3xl font-black text-[#0B1D3D]">Veja o AssinaJur em ação</h2>
            <p className="text-sm text-slate-600">
              Conheça as telas verdadeiras do sistema e entenda como a experiência móvel garante rapidez e conformidade técnica.
            </p>
          </div>

          {/* Abas de Navegação */}
          <div className="flex flex-wrap items-center justify-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs max-w-3xl mx-auto">
            {[
              { id: 'PANEL', label: 'Painel Inicial' },
              { id: 'PACKAGE', label: 'Pacote Jurídico' },
              { id: 'WHATSAPP', label: 'Envio WhatsApp' },
              { id: 'SIGNING', label: 'Assinatura Mobile' },
              { id: 'CERTIFICATE', label: 'Certificado Final' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemoTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                  activeDemoTab === tab.id
                    ? 'bg-[#0B1D3D] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo da Aba */}
          <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-lg max-w-4xl mx-auto">
            {activeDemoTab === 'PANEL' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-extrabold text-[#0B1D3D] text-lg">Painel de Gestão do Escritório</h3>
                    <p className="text-xs text-slate-500">Visão geral dos documentos e consumos</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">
                    Plano Ativo
                  </span>
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-slate-50 rounded-xl border">
                    <span className="text-xs text-slate-500 font-semibold block">Aguardando Assinatura</span>
                    <span className="text-2xl font-black text-amber-600">4</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border">
                    <span className="text-xs text-slate-500 font-semibold block">Concluídos no Mês</span>
                    <span className="text-2xl font-black text-emerald-600">18</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border">
                    <span className="text-xs text-slate-500 font-semibold block">Pacotes Utilizados</span>
                    <span className="text-2xl font-black text-blue-600">18 / 60</span>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'PACKAGE' && (
              <div className="space-y-4 text-xs text-slate-700">
                <h3 className="font-extrabold text-[#0B1D3D] text-base">Criação de Pacote Previdenciário</h3>
                <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                  <div className="font-bold text-slate-900">Cliente: Maria das Graças Oliveira</div>
                  <div className="text-slate-500">Documentos incluídos no mesmo link:</div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-800 font-semibold">
                    <li>Contrato de Honorários Advocatícios Previdenciários</li>
                    <li>Procuração Ad Judicia (INSS e Justiça Federal)</li>
                    <li>Declaração de Hipossuficiência Financeira</li>
                  </ul>
                </div>
              </div>
            )}

            {activeDemoTab === 'WHATSAPP' && (
              <div className="space-y-4 text-xs">
                <h3 className="font-extrabold text-[#0B1D3D] text-base">Mensagem Pronta para o WhatsApp</h3>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 font-mono space-y-2">
                  <p>Olá Maria! Segue o link seguro para revisão e assinatura do seu contrato e procuração:</p>
                  <p className="font-bold text-emerald-700 underline">https://assinajur.app/assinar/token-exemplo</p>
                  <p>Você pode assinar diretamente pelo celular em poucos passos.</p>
                </div>
              </div>
            )}

            {activeDemoTab === 'SIGNING' && (
              <div className="space-y-4 text-xs text-slate-700">
                <h3 className="font-extrabold text-[#0B1D3D] text-base">Fluxo de Prova de Presença no Celular</h3>
                <div className="grid sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-emerald-400">
                    <span className="font-bold block text-emerald-700">1. Foto Frontal</span>
                    <span className="text-[10px] text-slate-500">Rosto centralizado</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-emerald-400">
                    <span className="font-bold block text-emerald-700">2. Perfil Esquerdo</span>
                    <span className="text-[10px] text-slate-500">Giro guiado</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-emerald-400">
                    <span className="font-bold block text-emerald-700">3. Perfil Direito</span>
                    <span className="text-[10px] text-slate-500">Giro guiado</span>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'CERTIFICATE' && (
              <div className="space-y-4 text-xs text-slate-700">
                <h3 className="font-extrabold text-[#0B1D3D] text-base">Certificado de Evidências em PDF</h3>
                <div className="p-4 bg-[#0B1D3D] text-white rounded-xl space-y-2">
                  <div className="flex justify-between font-bold text-gold-400">
                    <span>CERTIFICADO ASSINAJUR</span>
                    <span>CÓDIGO: AJ-8F92-K3D1</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Horário de Brasília (UTC-3) • Hash SHA-256 de 64 caracteres • QR Code de Verificação Imutável
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. SEÇÃO DE DIFERENCIAIS ── */}
      <section id="diferenciais" className="py-20 px-4 sm:px-6 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Especializado para Advocacia
            </span>
            <h2 className="text-3xl font-black text-[#0B1D3D]">Diferenciais que simplificam a rotina</h2>
            <p className="text-sm text-slate-600">
              Conheça as vantagens exclusivas do AssinaJur em comparação com assinadores genéricos de arquivos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Layers,
                title: 'Vários documentos no mesmo link',
                desc: 'Reúna contrato, procuração, declarações e documentos pessoais no mesmo envio para o cliente.',
              },
              {
                icon: Users,
                title: 'Cadastro único de clientes',
                desc: 'Cadastre os dados uma só vez e reutilize nos modelos jurídicos sem precisar reescrever.',
              },
              {
                icon: Smartphone,
                title: 'Assinatura fluida pelo celular',
                desc: 'Fluxo responsivo desenvolvido especificamente para telas de smartphones no WhatsApp.',
              },
              {
                icon: Eye,
                title: 'Prova de presença guiada',
                desc: 'Três fotos faciais (frontal, perfil esquerdo e perfil direito) na proporção 4:3 para maior segurança.',
              },
              {
                icon: Lock,
                title: 'Registro de evidências imutável',
                desc: 'Gravação de IP, dispositivo, navegador, geolocalização aproximada e carimbo de tempo em Brasília.',
              },
              {
                icon: QrCode,
                title: 'QR Code e Verificação pública',
                desc: 'Qualquer pessoa pode validar a autenticidade e a integridade do PDF diretamente pelo QR Code.',
              },
            ].map((diff, idx) => (
              <div key={idx} className="bg-[#F7F8FA] p-6 rounded-2xl border border-slate-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-600 border border-gold-500/30 flex items-center justify-center">
                  <diff.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#0B1D3D]">{diff.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{diff.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. SEÇÃO DE SEGURANÇA E CONFORMIDADE ── */}
      <section id="seguranca" className="py-20 px-4 sm:px-6 bg-[#0B1D3D] text-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-gold-400 uppercase tracking-wider bg-gold-500/10 px-3 py-1 rounded-full border border-gold-500/30">
              Conformidade Técnica e Jurídica
            </span>
            <h2 className="text-3xl font-black text-white">Rastreabilidade e Integridade Garantidas</h2>
            <p className="text-sm text-slate-300">
              Segurança estruturada nos termos da Legislação Brasileira de Assinaturas Eletrônicas.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="p-6 bg-[#132A54] rounded-2xl border border-white/10 space-y-2">
              <ShieldCheck className="w-8 h-8 text-gold-400 mx-auto" />
              <h3 className="font-bold text-white text-sm">MP 2.200-2 / 2001</h3>
              <p className="text-xs text-slate-300">Respaldo legal do Art. 10, § 2º para assinaturas avançadas.</p>
            </div>

            <div className="p-6 bg-[#132A54] rounded-2xl border border-white/10 space-y-2">
              <FileCheck2 className="w-8 h-8 text-gold-400 mx-auto" />
              <h3 className="font-bold text-white text-sm">Lei 14.063 / 2020</h3>
              <p className="text-xs text-slate-300">Classificação oficial de assinatura eletrônica avançada.</p>
            </div>

            <div className="p-6 bg-[#132A54] rounded-2xl border border-white/10 space-y-2">
              <Lock className="w-8 h-8 text-gold-400 mx-auto" />
              <h3 className="font-bold text-white text-sm">Hash SHA-256</h3>
              <p className="text-xs text-slate-300">Código criptográfico único de 64 caracteres impresso no PDF.</p>
            </div>

            <div className="p-6 bg-[#132A54] rounded-2xl border border-white/10 space-y-2">
              <Clock className="w-8 h-8 text-gold-400 mx-auto" />
              <h3 className="font-bold text-white text-sm">Horário de Brasília</h3>
              <p className="text-xs text-slate-300">Carimbo de data e hora em fuso oficial UTC-3.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. PLANOS DE ASSINATURA ── */}
      <section id="planos" className="py-20 px-4 sm:px-6 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              Planos Transparentes
            </span>
            <h2 className="text-3xl font-black text-[#0B1D3D]">Escolha o plano ideal para seu escritório</h2>
            <p className="text-sm text-slate-600">
              Valores acessíveis sem taxas escondidas, sem multa de fidelidade e sem cobrança automática.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 items-stretch">
            {/* PLANO ESSENCIAL */}
            <div className="bg-[#F7F8FA] p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="font-extrabold text-[#0B1D3D] text-lg block">Essencial</span>
                <div className="text-3xl font-black text-[#0B1D3D]">
                  R$ 39,90 <span className="text-xs font-normal text-slate-500">/mês</span>
                </div>
                <p className="text-xs text-slate-600">Para advogados autônomos que estão iniciando a digitalização.</p>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Até 20 pacotes / mês</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 1 Usuário</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Cadastro de Clientes</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Prova de presença 4:3</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Certificado de Evidências</li>
                </ul>
              </div>
              <a
                href={getWhatsAppLink('Olá! Gostaria de contratar o Plano Essencial do AssinaJur por R$ 39,90/mês.')}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 text-center bg-[#0B1D3D] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Contratar Essencial
              </a>
            </div>

            {/* PLANO PROFISSIONAL (RECOMENDADO) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-brand-600 shadow-xl flex flex-col justify-between space-y-6 relative transform lg:-translate-y-2">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Mais Escolhido
              </span>
              <div className="space-y-4">
                <span className="font-extrabold text-[#0B1D3D] text-lg block">Profissional</span>
                <div className="text-3xl font-black text-brand-600">
                  R$ 69,90 <span className="text-xs font-normal text-slate-500">/mês</span>
                </div>
                <p className="text-xs text-slate-600">Para advogados e pequenos escritórios com maior fluxo de atendimento.</p>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Até 60 pacotes / mês</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Até 3 Usuários</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Todos os recursos Essencial</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Marca do escritório</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Suporte prioritário</li>
                </ul>
              </div>
              <a
                href={getWhatsAppLink('Olá! Gostaria de contratar o Plano Profissional do AssinaJur por R$ 69,90/mês.')}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 text-center bg-brand-600 hover:bg-brand-500 text-white font-extrabold rounded-xl text-xs transition-colors shadow-md"
              >
                Contratar Profissional
              </a>
            </div>

            {/* PLANO ESCRITÓRIO */}
            <div className="bg-[#F7F8FA] p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="font-extrabold text-[#0B1D3D] text-lg block">Escritório</span>
                <div className="text-3xl font-black text-[#0B1D3D]">
                  R$ 99,90 <span className="text-xs font-normal text-slate-500">/mês</span>
                </div>
                <p className="text-xs text-slate-600">Para escritórios em crescimento com equipes de advogados.</p>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Até 150 pacotes / mês</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Até 5 Usuários</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Todos os recursos do Profissional</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Gestão de permissões</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Suporte Comercial dedicado</li>
                </ul>
              </div>
              <a
                href={getWhatsAppLink('Olá! Gostaria de contratar o Plano Escritório do AssinaJur por R$ 99,90/mês.')}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 text-center bg-[#0B1D3D] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Contratar Escritório
              </a>
            </div>

            {/* PLANO SOB MEDIDA */}
            <div className="bg-[#F7F8FA] p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="font-extrabold text-[#0B1D3D] text-lg block">Sob Medida</span>
                <div className="text-2xl font-black text-[#0B1D3D]">
                  Consulte-nos
                </div>
                <p className="text-xs text-slate-600">Para grandes bancadas jurídicas ou demandas volumosas.</p>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Pacotes personalizados</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Múltiplas filiais / OABs</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Atendimento consultivo</li>
                </ul>
              </div>
              <a
                href={getWhatsAppLink('Olá! Gostaria de uma proposta de plano Sob Medida para o meu escritório.')}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 text-center bg-[#0B1D3D] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Falar com Consultor
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. SEÇÃO DE PERGUNTAS FREQUENTES (FAQ) ── */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-[#F7F8FA] border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-gold-600 uppercase tracking-wider bg-gold-100 px-3 py-1 rounded-full border border-gold-300">
              Esclareça suas dúvidas
            </span>
            <h2 className="text-3xl font-black text-[#0B1D3D]">Perguntas Frequentes (FAQ)</h2>
            <p className="text-sm text-slate-600">
              Tudo o que você precisa saber sobre a validade jurídica, o fluxo de assinatura e o teste do AssinaJur.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-[#0B1D3D] text-sm flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gold-500 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. SEÇÃO DE SUPORTE E CONTATO COMERCIAL ── */}
      <section className="py-16 px-4 sm:px-6 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto bg-[#0B1D3D] text-white p-8 sm:p-12 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <h2 className="text-2xl font-black text-white">Precisa de atendimento do nosso time?</h2>
            <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
              Tire dúvidas diretamente com a equipe comercial do AssinaJur pelo WhatsApp no número comercial (73) 98825-0201.
            </p>
          </div>

          <a
            href={getWhatsAppLink('Olá! Gostaria de tirar dúvidas com o suporte do AssinaJur.')}
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-[#0B1D3D] font-extrabold rounded-xl shadow-lg text-sm transition-all flex items-center gap-2 shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            Falar pelo WhatsApp
          </a>
        </div>
      </section>

      {/* ── 9. RODAPÉ COMPLETO ── */}
      <footer className="bg-[#0B1D3D] text-white pt-16 pb-12 px-4 sm:px-6 border-t border-gold-500/20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-10 pb-12 border-b border-white/10 text-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold-500 text-[#0B1D3D] font-extrabold flex items-center justify-center text-lg">
                AJ
              </div>
              <span className="font-extrabold text-white text-lg tracking-tight">Assina<span className="text-gold-400">Jur</span></span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Plataforma de assinatura eletrônica jurídica desenvolvida para advogados e escritórios de advocacia.
            </p>
            <div className="text-gold-400 font-mono font-semibold">
              WhatsApp: (73) 98825-0201
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Plataforma</h4>
            <ul className="space-y-2 text-slate-300">
              <li><a href="#como-funciona" className="hover:text-gold-400">Como funciona</a></li>
              <li><a href="#demonstracao" className="hover:text-gold-400">Demonstração real</a></li>
              <li><a href="#diferenciais" className="hover:text-gold-400">Diferenciais</a></li>
              <li><a href="#seguranca" className="hover:text-gold-400">Segurança & Legalidade</a></li>
              <li><a href="#planos" className="hover:text-gold-400">Planos & Preços</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Acesso Rápido</h4>
            <ul className="space-y-2 text-slate-300">
              <li><Link href="/login" className="hover:text-gold-400">Painel do Escritório</Link></li>
              <li><Link href="/register" className="hover:text-gold-400">Criar Conta Gratuita</Link></li>
              <li><Link href="/verificar" className="hover:text-gold-400">Verificar Documento</Link></li>
              <li><Link href="/admin/login" className="hover:text-gold-400">Acesso Admin</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm">Informações Legais</h4>
            <ul className="space-y-2 text-slate-300">
              <li><Link href="/termos" className="hover:text-gold-400">Termos de Uso</Link></li>
              <li><Link href="/privacidade" className="hover:text-gold-400">Política de Privacidade</Link></li>
              <li className="text-slate-400 pt-2">Conformidade com a MP 2.200-2/2001 e a Lei 14.063/2020.</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 AssinaJur. Todos os direitos reservados.</p>
          <p className="text-[11px]">Horário Oficial de Brasília — UTC−3</p>
        </div>
      </footer>
    </div>
  );
}
