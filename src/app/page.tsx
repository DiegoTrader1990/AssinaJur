'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, FileCheck, Layers, Smartphone, CheckCircle, ArrowRight,
  UserCheck, Send, HelpCircle, ChevronDown, MessageCircle, Award,
  Menu, X, Scale, RefreshCw, Clock, FolderOpen, FileText, Users,
  QrCode, Palette, Eye, LinkIcon, ClipboardList, Building2,
  Fingerprint, Hash, Globe, Lock, ChevronRight
} from 'lucide-react';
import {
  getWhatsAppLink,
  SHOW_LEGACY_PLANS,
  DEFAULT_WHATSAPP_MESSAGE,
  SOLO_PLAN_WHATSAPP_MESSAGE,
  ENTERPRISE_WHATSAPP_MESSAGE
} from '@/lib/constants';

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll animations                   */
/* ------------------------------------------------------------------ */
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const el = ref.current;
    if (el) {
      const children = el.querySelectorAll('.scroll-animate');
      children.forEach((child) => observer.observe(child));
      // Also observe the container itself
      if (el.classList.contains('scroll-animate')) {
        observer.observe(el);
      }
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ------------------------------------------------------------------ */
/*  Section wrapper with scroll animation                              */
/* ------------------------------------------------------------------ */
function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useScrollAnimation();
  return (
    <div ref={ref} id={id} className={className}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion Item                                                 */
/* ------------------------------------------------------------------ */
function FaqItem({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full p-5 sm:p-6 text-left font-semibold text-[15px] sm:text-base text-navy-900 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 text-brand-600 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        role="region"
      >
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          {answer}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Demo Tab Component                                                 */
/* ------------------------------------------------------------------ */
const DEMO_STEPS = [
  {
    tab: 'Cadastro',
    title: 'Cliente cadastrado',
    description: 'Os dados do cliente ficam salvos para reutilização nos documentos do pacote.',
    mockup: (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center"><UserCheck className="w-5 h-5 text-brand-600" /></div>
          <div><div className="font-semibold text-navy-900 text-sm">Maria Silva Santos</div><div className="text-xs text-slate-500">CPF: •••.456.789-••</div></div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 rounded-lg p-2.5"><span className="text-slate-400 block">Telefone</span><span className="text-navy-900 font-medium">(73) 9••••-••01</span></div>
          <div className="bg-slate-50 rounded-lg p-2.5"><span className="text-slate-400 block">Estado Civil</span><span className="text-navy-900 font-medium">Solteira</span></div>
          <div className="bg-slate-50 rounded-lg p-2.5 col-span-2"><span className="text-slate-400 block">Endereço</span><span className="text-navy-900 font-medium">Rua das Palmeiras, 123 — Ilhéus/BA</span></div>
        </div>
      </div>
    ),
  },
  {
    tab: 'Kit Jurídico',
    title: 'Kit jurídico selecionado',
    description: 'Escolha os documentos que compõem o pacote de contratação.',
    mockup: (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-brand-600" />
          <span className="font-semibold text-navy-900 text-sm">Kit Previdenciário</span>
          <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">4 documentos</span>
        </div>
        {['Contrato de Honorários', 'Procuração', 'Declaração de Hipossuficiência', 'Termo de Responsabilidade'].map((doc, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
            <span className="text-sm text-navy-900">{doc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    tab: 'Revisão',
    title: 'Documentos conferidos',
    description: 'Revise os dados e o conteúdo antes de gerar o link.',
    mockup: (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-navy-900 text-sm">Revisão do Pacote</span>
          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">Pendente de envio</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium text-navy-900">Maria Silva Santos</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Kit</span><span className="font-medium text-navy-900">Previdenciário</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Documentos</span><span className="font-medium text-navy-900">4 arquivos</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Criado em</span><span className="font-medium text-navy-900">06/08/2026</span></div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-brand-600 text-white text-center py-2 rounded-lg text-xs font-semibold">Gerar Link</div>
          <div className="flex-1 bg-white border border-slate-200 text-slate-600 text-center py-2 rounded-lg text-xs font-medium">Editar</div>
        </div>
      </div>
    ),
  },
  {
    tab: 'Assinatura',
    title: 'Cliente assina pelo celular',
    description: 'O cliente acessa o link no navegador do celular e segue as etapas apresentadas.',
    mockup: (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 max-w-[280px] mx-auto">
        <div className="bg-navy-900 text-white rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-300 mb-1">Escritório Rodrigues & Soares</div>
          <div className="font-semibold text-sm">Contrato de Honorários</div>
        </div>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
          <div className="text-xs text-slate-400 mb-2">Assinatura do cliente</div>
          <svg viewBox="0 0 200 60" className="w-full h-12"><path d="M20,40 Q40,10 60,35 T100,30 T140,35 T180,25" fill="none" stroke="#1E293B" strokeWidth="2" strokeLinecap="round" /></svg>
        </div>
        <div className="bg-success-50 text-success-700 text-xs p-2.5 rounded-lg text-center font-medium border border-success-200">
          ✓ Declaro que li e concordo com o conteúdo
        </div>
      </div>
    ),
  },
  {
    tab: 'Certificado',
    title: 'Certificado de evidências',
    description: 'Acesse as informações registradas durante a conclusão dos documentos.',
    mockup: (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-5 h-5 text-brand-600" />
          <span className="font-semibold text-navy-900 text-sm">Certificado de Evidências</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Código</span><span className="font-mono font-medium text-navy-900">AJ-7X2K-9M4P</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Assinado em</span><span className="font-medium text-success-700">06/08/2026 14:32</span></div>
          <div className="flex justify-between"><span className="text-slate-500">IP</span><span className="font-mono font-medium text-navy-900">187.•••.•••.42</span></div>
          <div className="flex items-start gap-1"><span className="text-slate-500 flex-shrink-0">Hash</span><span className="font-mono text-[10px] text-navy-900 break-all">a3f8c2...d91e4b</span></div>
        </div>
        <div className="flex items-center gap-3 mt-2 p-2.5 bg-brand-50 rounded-lg border border-brand-100">
          <div className="w-10 h-10 bg-white rounded border border-slate-200 flex items-center justify-center flex-shrink-0">
            <QrCode className="w-6 h-6 text-navy-900" />
          </div>
          <div className="text-xs"><span className="font-medium text-navy-900">QR Code de verificação</span><br /><span className="text-slate-500">Escaneie para conferir</span></div>
        </div>
      </div>
    ),
  },
];

/* ================================================================== */
/*  MAIN LANDING PAGE                                                  */
/* ================================================================== */
export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const toggleFaq = (index: number) => setOpenFaq(openFaq === index ? null : index);

  // Track scroll for header shadow
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const whatsappDefault = getWhatsAppLink(DEFAULT_WHATSAPP_MESSAGE);
  const whatsappSolo = getWhatsAppLink(SOLO_PLAN_WHATSAPP_MESSAGE);
  const whatsappEnterprise = getWhatsAppLink(ENTERPRISE_WHATSAPP_MESSAGE);

  const NAV_LINKS = [
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Diferenciais', href: '#diferenciais' },
    { label: 'Recursos', href: '#recursos' },
    { label: 'Segurança', href: '#seguranca' },
    { label: 'Planos', href: '#planos' },
    { label: 'Perguntas frequentes', href: '#faq' },
  ];

  const FAQ_ITEMS = [
    { q: 'O que é um pacote de assinatura?', a: 'É o conjunto de documentos relacionados à contratação de um cliente. Um pacote pode reunir contrato, procuração, declarações e outros documentos no mesmo fluxo.' },
    { q: 'Quantos pacotes posso testar gratuitamente?', a: 'O teste inclui cinco pacotes, que podem ser utilizados durante o período de até 30 dias.' },
    { q: 'Preciso cadastrar cartão de crédito?', a: 'Não. O teste gratuito não exige cartão.' },
    { q: 'Haverá cobrança automática?', a: 'Não. Nenhuma cobrança será realizada automaticamente ao final do teste.' },
    { q: 'Quanto custa depois do teste?', a: 'O Plano Solo custa R$ 39,90 por mês.' },
    { q: 'O cliente precisa criar uma conta?', a: 'Não. O cliente recebe o link e segue as etapas de assinatura pelo navegador do celular.' },
    { q: 'Posso enviar contrato e procuração juntos?', a: 'Sim. Diferentes documentos relacionados à contratação podem ser reunidos no mesmo pacote.' },
    { q: 'Para quem o AssinaJur foi desenvolvido?', a: 'Para advogados autônomos e escritórios que desejam organizar a preparação, o envio e a assinatura dos documentos de contratação.' },
    { q: 'Como funciona o suporte?', a: 'O suporte inicial é realizado pelos canais disponibilizados pelo AssinaJur, incluindo o WhatsApp comercial.' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b transition-all duration-200 ${scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label="AssinaJur — Página inicial">
            <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center font-bold text-white text-sm shadow-sm">
              AJ
            </div>
            <span className="text-xl font-extrabold text-navy-900 tracking-tight">AssinaJur</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-slate-600" aria-label="Navegação principal">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-navy-900 transition-colors py-1">{link.label}</a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-navy-900 px-3 py-2 transition-colors">
              Entrar
            </Link>
            <Link href="/register" className="text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">
              Testar gratuitamente
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-navy-900 transition-colors"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-white z-40 overflow-y-auto no-scrollbar">
            <nav className="flex flex-col p-6 space-y-1" aria-label="Navegação mobile">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className="text-base font-medium text-slate-700 hover:text-navy-900 hover:bg-slate-50 px-4 py-3 rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-slate-100 my-4" />
              <Link href="/login" onClick={closeMobileMenu} className="text-base font-medium text-slate-700 hover:text-navy-900 px-4 py-3 rounded-lg transition-colors">
                Entrar
              </Link>
              <Link href="/register" onClick={closeMobileMenu} className="text-base font-semibold bg-brand-600 text-white hover:bg-brand-700 px-4 py-3.5 rounded-lg text-center transition-colors mt-2">
                Testar gratuitamente
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ============================================================ */}
        {/*  HERO                                                         */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Content */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold mb-6">
                  <Scale className="w-3.5 h-3.5" />
                  Desenvolvido para escritórios de advocacia
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-extrabold text-navy-900 leading-[1.15] tracking-tight mb-5">
                  Contratação jurídica completa em um único link
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                  Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie todos os documentos juntos para assinatura pelo celular.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto text-base font-semibold bg-brand-600 text-white hover:bg-brand-700 px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Testar gratuitamente
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#demonstracao"
                    className="w-full sm:w-auto text-base font-medium text-slate-700 hover:text-navy-900 bg-white hover:bg-slate-50 border border-slate-200 px-7 py-3.5 rounded-xl transition-all text-center"
                  >
                    Ver como funciona
                  </a>
                </div>

                <div className="flex flex-col items-center lg:items-start gap-1.5">
                  <p className="text-sm text-slate-500 font-medium">
                    5 pacotes gratuitos • 30 dias • Sem cartão
                  </p>
                  <p className="text-xs text-slate-400">
                    Você não será cobrado automaticamente após o teste.
                  </p>
                </div>
              </div>

              {/* Right: Visual Composition */}
              <div className="relative hidden lg:block">
                <div className="relative">
                  {/* Main card - Document package */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-navy-900 text-sm">Pacote — Maria Silva Santos</div>
                        <div className="text-xs text-slate-500">Kit Previdenciário • 4 documentos</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'Contrato de Honorários', status: 'Assinado', color: 'success' },
                        { name: 'Procuração', status: 'Assinado', color: 'success' },
                        { name: 'Declaração de Hipossuficiência', status: 'Assinado', color: 'success' },
                        { name: 'Termo de Responsabilidade', status: 'Assinado', color: 'success' },
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-navy-900">{doc.name}</span>
                          </div>
                          <span className="text-[11px] font-medium text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200">
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Concluído em 06/08/2026</span>
                      <span className="flex items-center gap-1 text-brand-600 font-medium"><Award className="w-3.5 h-3.5" /> Certificado disponível</span>
                    </div>
                  </div>

                  {/* Floating card - Status notification */}
                  <div className="absolute -top-4 -right-4 bg-white rounded-xl border border-slate-200 shadow-md px-4 py-3 z-20 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-success-600" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-navy-900">Assinatura concluída</div>
                        <div className="text-[10px] text-slate-500">Há 2 minutos</div>
                      </div>
                    </div>
                  </div>

                  {/* Floating card - QR Code */}
                  <div className="absolute -bottom-3 -left-4 bg-white rounded-xl border border-slate-200 shadow-md px-4 py-3 z-20 animate-slide-in-right">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                        <QrCode className="w-5 h-5 text-navy-900" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-navy-900">AJ-7X2K-9M4P</div>
                        <div className="text-[10px] text-slate-500">Código de verificação</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  BENEFITS STRIP                                               */}
        {/* ============================================================ */}
        <section className="border-y border-slate-100 bg-white py-6 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Scale, text: 'Desenvolvido para advogados' },
              { icon: Layers, text: 'Vários documentos no mesmo pacote' },
              { icon: Smartphone, text: 'Assinatura pelo celular' },
              { icon: Award, text: 'Certificado de evidências' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 justify-center md:justify-start">
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4.5 h-4.5 text-brand-600 w-[18px] h-[18px]" />
                </div>
                <span className="text-sm font-medium text-slate-700">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  PROBLEMS SOLVED                                              */}
        {/* ============================================================ */}
        <AnimatedSection id="diferenciais" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Menos trabalho repetitivo.<br className="hidden sm:block" /> Mais agilidade na contratação.
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">
                O AssinaJur reúne em um único fluxo etapas que normalmente ficam espalhadas entre editores de texto, PDFs, mensagens e plataformas genéricas de assinatura.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: RefreshCw, title: 'Dados repetidos', desc: 'Cadastre o cliente uma única vez e reutilize as informações nos documentos da contratação.' },
                { icon: FolderOpen, title: 'Documentos separados', desc: 'Reúna contrato, procuração, declarações e termos no mesmo pacote jurídico.' },
                { icon: Clock, title: 'Processo demorado', desc: 'Prepare e encaminhe todos os documentos em um único fluxo.' },
                { icon: ClipboardList, title: 'Falta de organização', desc: 'Acompanhe o andamento e mantenha os documentos relacionados ao cliente organizados.' },
              ].map((item, i) => (
                <div key={i} className={`scroll-animate scroll-animate-delay-${i + 1} bg-slate-50 rounded-xl p-6 border border-slate-100 card-hover`}>
                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <h3 className="font-bold text-navy-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  COMPARISON                                                    */}
        {/* ============================================================ */}
        <AnimatedSection className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Muito além de um assinador de documentos
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">
                Plataformas genéricas normalmente começam com o PDF já preparado. O AssinaJur organiza a contratação desde o cadastro do cliente.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 scroll-animate">
              {/* Generic signer */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">Assinador convencional</div>
                <ul className="space-y-3.5">
                  {[
                    'Recebe o documento previamente preparado',
                    'Trabalha principalmente com PDFs isolados',
                    'Utiliza fluxo genérico',
                    'Exige preparação externa',
                    'Não é organizado por tipo de atendimento jurídico',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-slate-400 text-xs">—</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AssinaJur */}
              <div className="bg-white rounded-xl border-2 border-brand-200 p-6 sm:p-8 shadow-sm">
                <div className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-navy-900 flex items-center justify-center text-[10px] font-bold text-white">AJ</div>
                  AssinaJur
                </div>
                <ul className="space-y-3.5">
                  {[
                    'Cadastra o cliente uma única vez',
                    'Utiliza modelos e kits jurídicos',
                    'Reúne vários documentos no mesmo pacote',
                    'Foi desenvolvido para advogados',
                    'Integra cadastro, documentos, assinatura e evidências',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-navy-900 font-medium">
                      <CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  HOW IT WORKS (7 Steps)                                       */}
        {/* ============================================================ */}
        <AnimatedSection id="como-funciona" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Da abertura do atendimento à contratação assinada
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                { icon: UserCheck, step: '1', title: 'Cadastre o cliente', desc: 'Insira os dados necessários uma única vez para utilizá-los nos documentos do pacote.' },
                { icon: Layers, step: '2', title: 'Escolha o kit jurídico', desc: 'Selecione contrato, procuração, declarações e outros documentos disponíveis.' },
                { icon: Eye, step: '3', title: 'Confira os documentos', desc: 'Revise os dados e o conteúdo antes do envio.' },
                { icon: LinkIcon, step: '4', title: 'Gere o link', desc: 'Crie o acesso individual para o cliente.' },
                { icon: Send, step: '5', title: 'Compartilhe com o cliente', desc: 'Envie o link pelo canal de sua preferência.' },
                { icon: Smartphone, step: '6', title: 'O cliente realiza a assinatura', desc: 'O cliente acessa os documentos pelo navegador do celular e segue as etapas apresentadas.' },
                { icon: FileCheck, step: '7', title: 'Acesse os documentos concluídos', desc: 'Consulte o status e acesse os documentos e evidências disponíveis.' },
              ].map((item, i) => (
                <div key={i} className={`scroll-animate scroll-animate-delay-${Math.min(i + 1, 4)} bg-white rounded-xl border border-slate-200 p-5 card-hover relative ${i === 6 ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <item.icon className="w-4.5 h-4.5 text-slate-400 w-[18px] h-[18px]" />
                  </div>
                  <h3 className="font-bold text-navy-900 text-[15px] mb-1.5">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  FEATURES / RECURSOS                                          */}
        {/* ============================================================ */}
        <AnimatedSection id="recursos" className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Tudo organizado para a rotina do escritório
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Users, title: 'Cadastro centralizado de clientes', desc: 'Insira os dados do cliente uma vez e reutilize em todos os documentos.' },
                { icon: FileText, title: 'Modelos de documentos', desc: 'Crie modelos com tags de preenchimento automático.' },
                { icon: Layers, title: 'Kits jurídicos', desc: 'Agrupe diferentes modelos em pacotes organizados por tipo de atendimento.' },
                { icon: FileCheck, title: 'Geração de documentos', desc: 'Os documentos são gerados com os dados do cliente e do escritório.' },
                { icon: FolderOpen, title: 'Vários documentos em um pacote', desc: 'Contrato, procuração e declarações reunidos no mesmo link.' },
                { icon: Smartphone, title: 'Assinatura pelo celular', desc: 'O cliente assina pelo navegador do celular, sem criar conta.' },
                { icon: ClipboardList, title: 'Consulta do andamento', desc: 'Acompanhe o status de cada documento e pacote.' },
                { icon: Award, title: 'Certificado de evidências', desc: 'Acesse as informações registradas durante a conclusão.' },
                { icon: QrCode, title: 'QR Code de verificação', desc: 'Utilize o QR Code para conferir na página de verificação.' },
                { icon: Palette, title: 'Personalização do escritório', desc: 'Configure o nome, OAB, cores e mensagens do escritório.' },
              ].map((item, i) => (
                <div key={i} className={`scroll-animate scroll-animate-delay-${(i % 4) + 1} bg-white rounded-xl border border-slate-200 p-5 card-hover`}>
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-3">
                    <item.icon className="w-[18px] h-[18px] text-brand-600" />
                  </div>
                  <h3 className="font-bold text-navy-900 text-[15px] mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  OFFICE IDENTITY                                               */}
        {/* ============================================================ */}
        <AnimatedSection className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="scroll-animate">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mb-4">
                  Uma experiência profissional com a identidade do seu escritório
                </h2>
                <p className="text-slate-600 text-base leading-relaxed mb-6">
                  Apresente o processo de contratação com os dados e a identidade visual do escritório.
                </p>
                <ul className="space-y-3">
                  {[
                    'Nome do escritório e do advogado',
                    'Registro OAB',
                    'Cores personalizadas',
                    'Contatos e mensagem de apresentação',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="scroll-animate scroll-animate-delay-2">
                <div className="bg-white rounded-xl border border-slate-200 shadow-md p-5">
                  <div className="bg-navy-900 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">Rodrigues & Soares Advocacia</div>
                        <div className="text-[11px] text-slate-300">OAB/BA 12345 • Dr. Diego Rodrigues</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <Palette className="w-4 h-4 text-brand-600 mb-1.5" />
                      <span className="text-slate-500 block">Cor primária</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-4 rounded bg-navy-900 border border-slate-200" />
                        <span className="font-mono text-navy-900">#0B1D3D</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <MessageCircle className="w-4 h-4 text-brand-600 mb-1.5" />
                      <span className="text-slate-500 block">WhatsApp</span>
                      <span className="font-medium text-navy-900 mt-1 block">(73) 9••••-0201</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  SECURITY & EVIDENCE                                           */}
        {/* ============================================================ */}
        <AnimatedSection id="seguranca" className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Organização, rastreabilidade e evidências da assinatura
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">
                O AssinaJur registra informações relacionadas ao processo e permite consultar as evidências disponíveis nos documentos concluídos.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: ClipboardList, title: 'Registro das etapas', desc: 'Consulte os eventos importantes relacionados ao processo de assinatura.' },
                { icon: Award, title: 'Certificado de evidências', desc: 'Acesse as informações registradas durante a conclusão dos documentos.' },
                { icon: QrCode, title: 'Verificação por QR Code', desc: 'Utilize o QR Code para consultar a página de conferência.' },
                { icon: Lock, title: 'Controle de acesso', desc: 'Os documentos permanecem vinculados ao respectivo escritório e à contratação.' },
              ].map((item, i) => (
                <div key={i} className={`scroll-animate scroll-animate-delay-${i + 1} bg-white rounded-xl border border-slate-200 p-6 card-hover text-center`}>
                  <div className="w-12 h-12 rounded-xl bg-navy-900 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-navy-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  VISUAL DEMO (Tabs)                                            */}
        {/* ============================================================ */}
        <AnimatedSection id="demonstracao" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Veja o AssinaJur em ação
              </h2>
            </div>

            <div className="scroll-animate">
              {/* Tab buttons */}
              <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
                {DEMO_STEPS.map((step, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDemo(i)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeDemo === i
                      ? 'bg-white text-navy-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {step.tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                    Etapa {activeDemo + 1} de {DEMO_STEPS.length}
                  </div>
                  <h3 className="text-xl font-bold text-navy-900">{DEMO_STEPS[activeDemo].title}</h3>
                  <p className="text-slate-600 leading-relaxed">{DEMO_STEPS[activeDemo].description}</p>
                </div>
                <div className="transition-opacity duration-300">
                  {DEMO_STEPS[activeDemo].mockup}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  PRICING                                                       */}
        {/* ============================================================ */}
        <AnimatedSection id="planos" className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Escolha a opção ideal para o seu escritório
              </h2>
            </div>

            {!SHOW_LEGACY_PLANS && (
              <div className="space-y-10">
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch scroll-animate">
                  {/* Free Trial */}
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-navy-900 mb-1">Teste gratuito</h3>
                      <p className="text-sm text-slate-500 mb-6">Conheça as principais funções do AssinaJur antes de contratar.</p>

                      <div className="mb-6 pb-6 border-b border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-navy-900">R$ 0</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Até 30 dias para utilizar</p>
                      </div>

                      <ul className="space-y-3 text-sm text-slate-700 mb-6">
                        {[
                          'Cinco pacotes de assinatura',
                          'Até 30 dias para utilizar',
                          'Um usuário',
                          'Sem cartão de crédito',
                          'Sem cobrança automática',
                          'Acesso às funções disponibilizadas no teste',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2.5">
                            <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        Cada pacote pode reunir contrato, procuração, declarações e outros documentos relacionados à contratação de um cliente. O teste encerra ao utilizar os cinco pacotes ou completar os 30 dias.
                      </p>
                    </div>

                    <div>
                      <Link href="/register" className="w-full text-center py-3 px-4 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition-colors block text-sm">
                        Começar teste gratuito
                      </Link>
                      <p className="text-[11px] text-center text-slate-400 mt-2">
                        Você não será cobrado automaticamente após o teste.
                      </p>
                    </div>
                  </div>

                  {/* Solo Plan */}
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-brand-500 shadow-lg flex flex-col justify-between relative">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[11px] font-semibold px-4 py-1 rounded-full">
                      Recomendado
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-navy-900 mb-1 mt-1">Plano Solo</h3>
                      <p className="text-sm text-slate-500 mb-6">Para advogados autônomos e pequenos escritórios que desejam organizar a contratação dos clientes.</p>

                      <div className="mb-6 pb-6 border-b border-slate-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-navy-900">R$ 39,90</span>
                          <span className="text-sm font-medium text-slate-500">/mês</span>
                        </div>
                      </div>

                      <ul className="space-y-3 text-sm text-slate-700 mb-6">
                        {[
                          'Até 20 pacotes de assinatura por mês',
                          'Um usuário',
                          'Cadastro de clientes',
                          'Modelos de documentos',
                          'Kits jurídicos',
                          'Vários documentos no mesmo pacote',
                          'Assinatura pelo celular',
                          'Acompanhamento dos documentos',
                          'Certificado de evidências',
                          'QR Code de verificação',
                          'Suporte padrão',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2.5">
                            <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a
                      href={whatsappSolo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-3 px-4 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-all block text-sm shadow-sm"
                    >
                      Quero contratar
                    </a>
                  </div>
                </div>

                {/* Enterprise block */}
                <div className="max-w-4xl mx-auto scroll-animate">
                  <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                    <div>
                      <h3 className="text-lg font-bold text-navy-900 mb-1">Seu escritório precisa de mais pacotes ou usuários?</h3>
                      <p className="text-sm text-slate-600 max-w-lg">
                        Converse com nossa equipe para conhecer uma condição adequada ao volume e à estrutura do seu escritório.
                      </p>
                    </div>
                    <a
                      href={whatsappEnterprise}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full md:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 bg-success-600 hover:bg-success-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Falar com consultor
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  FAQ                                                           */}
        {/* ============================================================ */}
        <AnimatedSection id="faq" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">
                Perguntas frequentes
              </h2>
            </div>

            <div className="space-y-3 scroll-animate">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem
                  key={i}
                  question={item.q}
                  answer={item.a}
                  isOpen={openFaq === i}
                  onToggle={() => toggleFaq(i)}
                />
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ============================================================ */}
        {/*  FINAL CTA                                                     */}
        {/* ============================================================ */}
        <AnimatedSection className="py-20 sm:py-24 px-4 sm:px-6 gradient-cta">
          <div className="max-w-3xl mx-auto text-center scroll-animate">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-4">
              Simplifique a contratação dos clientes do seu escritório
            </h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Cadastre os dados uma única vez, prepare os documentos e encaminhe tudo para assinatura em um único fluxo.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Link
                href="/register"
                className="w-full sm:w-auto text-base font-semibold bg-white text-navy-900 hover:bg-slate-100 px-8 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Testar gratuitamente
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={whatsappDefault}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-base font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 px-8 py-3.5 rounded-xl transition-all text-center flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Falar com consultor
              </a>
            </div>

            <p className="text-sm text-slate-400">
              5 pacotes gratuitos • 30 dias • Sem cartão
            </p>
          </div>
        </AnimatedSection>
      </main>

      {/* ============================================================ */}
      {/*  FOOTER                                                        */}
      {/* ============================================================ */}
      <footer className="bg-navy-900 text-white py-14 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-sm">AJ</div>
                <span className="text-lg font-extrabold text-white tracking-tight">AssinaJur</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Plataforma de contratação e assinatura eletrônica desenvolvida para advogados e escritórios de advocacia.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Navegação</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a></li>
                <li><a href="#diferenciais" className="hover:text-white transition-colors">Diferenciais</a></li>
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#seguranca" className="hover:text-white transition-colors">Segurança</a></li>
                <li><a href="#planos" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Perguntas frequentes</a></li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Conta</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/login" className="hover:text-white transition-colors">Entrar</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Criar conta</Link></li>
                <li>
                  <a href={whatsappDefault} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" /> Falar com consultor
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Contact */}
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Legal e Contato</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
                <li className="pt-1">
                  <a href="https://wa.me/5573988250201" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    WhatsApp: (73) 98825-0201
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center text-xs text-slate-500">
            <p>© {new Date().getFullYear()} AssinaJur. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
