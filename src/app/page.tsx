'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, FileCheck, Layers, Smartphone, CheckCircle, ArrowRight,
  UserCheck, Send, HelpCircle, ChevronDown, MessageCircle, Award,
  Menu, X, Scale, RefreshCw, Clock, FolderOpen, FileText, Users,
  QrCode, Palette, Eye, LinkIcon, ClipboardList, Building2,
  Lock, Star, Briefcase, Heart, ShoppingCart, Home, Landmark,
  ChevronRight, Minus
} from 'lucide-react';
import {
  getWhatsAppLink,
  SHOW_LEGACY_PLANS,
  DEFAULT_WHATSAPP_MESSAGE,
  SOLO_PLAN_WHATSAPP_MESSAGE,
  PRO_PLAN_WHATSAPP_MESSAGE,
  OFFICE_PLAN_WHATSAPP_MESSAGE,
} from '@/lib/constants';

/* ------------------------------------------------------------------ */
/*  Intersection Observer for scroll animations                        */
/* ------------------------------------------------------------------ */
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-visible'); }); },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const el = ref.current;
    if (el) {
      el.querySelectorAll('.scroll-animate').forEach((c) => observer.observe(c));
      if (el.classList.contains('scroll-animate')) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useScrollAnimation();
  return <div ref={ref} id={id} className={className}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
/* ------------------------------------------------------------------ */
function FaqItem({ question, answer, isOpen, onToggle }: { question: string; answer: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={onToggle} className="w-full p-5 sm:p-6 text-left font-semibold text-[15px] sm:text-base text-navy-900 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors" aria-expanded={isOpen}>
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 text-brand-600 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`} role="region">
        <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{answer}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Demo tabs data                                                     */
/* ------------------------------------------------------------------ */
const DEMO_STEPS = [
  {
    tab: 'Cadastro',
    title: 'Cliente cadastrado',
    description: 'Os dados ficam salvos para reutilização nos documentos do pacote.',
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
          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium border border-amber-200">Pendente</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium text-navy-900">Maria Silva Santos</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Kit</span><span className="font-medium text-navy-900">Previdenciário</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Documentos</span><span className="font-medium text-navy-900">4 arquivos</span></div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-brand-600 text-white text-center py-2 rounded-lg text-xs font-semibold">Gerar Link</div>
          <div className="flex-1 bg-white border border-slate-200 text-slate-600 text-center py-2 rounded-lg text-xs font-medium">Editar</div>
        </div>
      </div>
    ),
  },
  {
    tab: 'Link',
    title: 'Link gerado e compartilhado',
    description: 'O link pode ser copiado e enviado pelo canal de preferência do advogado.',
    mockup: (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <LinkIcon className="w-5 h-5 text-brand-600" />
          <span className="font-semibold text-navy-900 text-sm">Link de Assinatura</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 truncate flex-1 font-mono">assinajur.vercel.app/assinar/a7x2k...</span>
          <div className="bg-brand-600 text-white text-[10px] px-2.5 py-1 rounded font-medium flex-shrink-0">Copiar</div>
        </div>
        <div className="flex items-center gap-2 p-2.5 bg-success-50 rounded-lg border border-success-200">
          <CheckCircle className="w-4 h-4 text-success-600" />
          <span className="text-xs text-success-700 font-medium">Pronto para enviar ao cliente</span>
        </div>
      </div>
    ),
  },
  {
    tab: 'Assinatura',
    title: 'Cliente assina pelo celular',
    description: 'O cliente acessa o link pelo navegador do celular e segue as etapas.',
    mockup: (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3 max-w-[280px] mx-auto">
        <div className="bg-navy-900 text-white rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-300 mb-1">Rodrigues & Soares Advocacia</div>
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

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const whatsappDefault = getWhatsAppLink(DEFAULT_WHATSAPP_MESSAGE);
  const whatsappSolo = getWhatsAppLink(SOLO_PLAN_WHATSAPP_MESSAGE);
  const whatsappPro = getWhatsAppLink(PRO_PLAN_WHATSAPP_MESSAGE);
  const whatsappOffice = getWhatsAppLink(OFFICE_PLAN_WHATSAPP_MESSAGE);

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
    { q: 'O que acontece quando atinjo o limite do plano?', a: 'Você poderá contratar um plano com maior quantidade de pacotes. Não existe cobrança automática de excedentes.' },
    { q: 'Posso mudar de plano?', a: 'Sim. O escritório poderá solicitar a mudança para um plano com maior ou menor volume, observadas as condições comerciais vigentes.' },
    { q: 'Preciso cadastrar cartão no teste?', a: 'Não. O teste gratuito não exige cartão de crédito.' },
    { q: 'Existe cobrança automática após o teste?', a: 'Não. Nenhuma cobrança será realizada automaticamente ao final do teste.' },
    { q: 'O cliente precisa criar uma conta?', a: 'Não. O cliente recebe o link e segue as etapas de assinatura pelo navegador do celular.' },
    { q: 'Posso reunir contrato e procuração no mesmo pacote?', a: 'Sim. Os documentos relacionados à contratação podem ser reunidos no mesmo pacote.' },
    { q: 'Para quem o AssinaJur foi desenvolvido?', a: 'Para advogados autônomos e escritórios que desejam organizar a preparação, o envio e a assinatura dos documentos de contratação.' },
    { q: 'Como funciona o suporte?', a: 'O suporte é realizado pelos canais disponibilizados pelo AssinaJur, incluindo o WhatsApp comercial.' },
  ];

  const LEGAL_AREAS = [
    { icon: Landmark, name: 'Previdenciário' },
    { icon: Briefcase, name: 'Trabalhista' },
    { icon: Heart, name: 'Família' },
    { icon: ShoppingCart, name: 'Consumidor' },
    { icon: Scale, name: 'Cível' },
    { icon: Home, name: 'Imobiliário' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ============================================================ */}
      {/*  HEADER                                                       */}
      {/* ============================================================ */}
      <header className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b transition-all duration-200 ${scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" aria-label="AssinaJur — Página inicial">
            <div className="w-9 h-9 rounded-lg bg-navy-900 flex items-center justify-center font-bold text-white text-sm shadow-sm">AJ</div>
            <span className="text-xl font-extrabold text-navy-900 tracking-tight">AssinaJur</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-slate-600" aria-label="Navegação principal">
            {NAV_LINKS.map((l) => (<a key={l.href} href={l.href} className="hover:text-navy-900 transition-colors py-1">{l.label}</a>))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-navy-900 px-3 py-2 transition-colors">Entrar</Link>
            <Link href="/register" className="text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all">Testar gratuitamente</Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-600 hover:text-navy-900 transition-colors" aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-white z-40 overflow-y-auto no-scrollbar">
            <nav className="flex flex-col p-6 space-y-1" aria-label="Navegação mobile">
              {NAV_LINKS.map((l) => (<a key={l.href} href={l.href} onClick={closeMobileMenu} className="text-base font-medium text-slate-700 hover:text-navy-900 hover:bg-slate-50 px-4 py-3 rounded-lg transition-colors">{l.label}</a>))}
              <div className="border-t border-slate-100 my-4" />
              <Link href="/login" onClick={closeMobileMenu} className="text-base font-medium text-slate-700 hover:text-navy-900 px-4 py-3 rounded-lg transition-colors">Entrar</Link>
              <Link href="/register" onClick={closeMobileMenu} className="text-base font-semibold bg-brand-600 text-white hover:bg-brand-700 px-4 py-3.5 rounded-lg text-center transition-colors mt-2">Testar gratuitamente</Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* ============================================================ */}
        {/*  HERO                                                         */}
        {/* ============================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-semibold mb-6">
                <Scale className="w-3.5 h-3.5" />
                Desenvolvido para advogados e escritórios de advocacia
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-extrabold text-navy-900 leading-[1.15] tracking-tight mb-5">
                Contratação jurídica completa em um único link
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie todos os documentos juntos para assinatura pelo celular.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6">
                <Link href="/register" className="w-full sm:w-auto text-base font-semibold bg-brand-600 text-white hover:bg-brand-700 px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  Testar gratuitamente <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#demonstracao" className="w-full sm:w-auto text-base font-medium text-slate-700 hover:text-navy-900 bg-white hover:bg-slate-50 border border-slate-200 px-7 py-3.5 rounded-xl transition-all text-center">
                  Ver o AssinaJur em ação
                </a>
              </div>

              <div className="flex flex-col items-center lg:items-start gap-1.5">
                <p className="text-sm text-slate-500 font-medium">5 pacotes gratuitos • 30 dias • Sem cartão</p>
                <p className="text-xs text-slate-400">Sem cobrança automática ao final do teste.</p>
              </div>
            </div>

            {/* Hero visual composition */}
            <div className="relative hidden lg:block">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center"><Layers className="w-5 h-5 text-white" /></div>
                  <div><div className="font-bold text-navy-900 text-sm">Pacote — Maria Silva Santos</div><div className="text-xs text-slate-500">Kit Previdenciário • 4 documentos</div></div>
                </div>
                <div className="space-y-2">
                  {['Contrato de Honorários', 'Procuração', 'Declaração de Hipossuficiência', 'Termo de Responsabilidade'].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2.5"><FileText className="w-4 h-4 text-slate-400" /><span className="text-sm text-navy-900">{doc}</span></div>
                      <span className="text-[11px] font-medium text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200">Assinado</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Concluído em 06/08/2026</span>
                  <span className="flex items-center gap-1 text-brand-600 font-medium"><Award className="w-3.5 h-3.5" /> Certificado disponível</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-xl border border-slate-200 shadow-md px-4 py-3 z-20 animate-fade-in">
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-success-600" /></div><div><div className="text-xs font-semibold text-navy-900">Assinatura concluída</div><div className="text-[10px] text-slate-500">Há 2 minutos</div></div></div>
              </div>
              <div className="absolute -bottom-3 -left-4 bg-white rounded-xl border border-slate-200 shadow-md px-4 py-3 z-20 animate-slide-in-right">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200"><QrCode className="w-5 h-5 text-navy-900" /></div><div><div className="text-xs font-semibold text-navy-900">AJ-7X2K-9M4P</div><div className="text-[10px] text-slate-500">Código de verificação</div></div></div>
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
                <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0"><item.icon className="w-[18px] h-[18px] text-brand-600" /></div>
                <span className="text-sm font-medium text-slate-700">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================ */}
        {/*  COMPARISON                                                    */}
        {/* ============================================================ */}
        <Section id="diferenciais" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Muito além de um assinador de documentos</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">Plataformas convencionais normalmente começam com o PDF já preparado. O AssinaJur organiza a contratação desde o cadastro do cliente.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 scroll-animate">
              <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">Assinador convencional</div>
                <ul className="space-y-3.5">
                  {['Recebe o documento previamente preparado', 'Trabalha principalmente com arquivos isolados', 'Utiliza um fluxo genérico', 'Depende da preparação externa dos documentos', 'Não é organizado por tipo de atendimento jurídico'].map((t, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600"><div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Minus className="w-3 h-3 text-slate-400" /></div>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-xl border-2 border-brand-200 p-6 sm:p-8 shadow-sm">
                <div className="text-sm font-semibold text-brand-600 uppercase tracking-wider mb-5 flex items-center gap-2"><div className="w-5 h-5 rounded bg-navy-900 flex items-center justify-center text-[10px] font-bold text-white">AJ</div>AssinaJur</div>
                <ul className="space-y-3.5">
                  {['Cadastra o cliente uma única vez', 'Reutiliza os dados nos documentos', 'Utiliza modelos e kits jurídicos', 'Reúne vários documentos no mesmo pacote', 'Conecta cadastro, documentos, assinatura e evidências', 'Foi desenvolvido para a rotina da advocacia'].map((t, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-navy-900 font-medium"><CheckCircle className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  LEGAL AREAS & KITS                                            */}
        {/* ============================================================ */}
        <Section className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Organize seus kits por área jurídica</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">Crie seus próprios modelos e kits de documentos organizados por área de atuação do escritório.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10 scroll-animate">
              {LEGAL_AREAS.map((area, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 text-center card-hover">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center mx-auto mb-3"><area.icon className="w-5 h-5 text-brand-600" /></div>
                  <span className="text-sm font-semibold text-navy-900">{area.name}</span>
                </div>
              ))}
            </div>

            <div className="max-w-md mx-auto scroll-animate">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-brand-600" />
                  <span className="font-bold text-navy-900">Kit Previdenciário</span>
                  <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium ml-auto">Exemplo</span>
                </div>
                {['Contrato de Honorários', 'Procuração', 'Declaração de Hipossuficiência', 'Termo de Responsabilidade', 'Outros documentos selecionados pelo escritório'].map((doc, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
                    <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{doc}</span>
                  </div>
                ))}
                <p className="text-xs text-slate-500 mt-4 leading-relaxed">O escritório pode organizar seus próprios modelos e kits conforme a necessidade de cada área.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  HOW IT WORKS                                                  */}
        {/* ============================================================ */}
        <Section id="como-funciona" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Da abertura do atendimento à contratação assinada</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 scroll-animate">
              {[
                { icon: UserCheck, s: '1', t: 'Cadastre o cliente', d: 'Insira os dados uma única vez para utilizá-los nos documentos do pacote.' },
                { icon: Layers, s: '2', t: 'Escolha o kit jurídico', d: 'Selecione contrato, procuração, declarações e outros documentos.' },
                { icon: Eye, s: '3', t: 'Revise os documentos', d: 'Confira os dados e o conteúdo antes do envio.' },
                { icon: LinkIcon, s: '4', t: 'Gere o link', d: 'Crie o acesso individual para o cliente.' },
                { icon: Send, s: '5', t: 'Envie ao cliente', d: 'Compartilhe o link pelo canal de sua preferência.' },
                { icon: Smartphone, s: '6', t: 'O cliente assina', d: 'Acessa pelo navegador do celular e segue as etapas apresentadas.' },
                { icon: ClipboardList, s: '7', t: 'Acompanhe a conclusão', d: 'Consulte o status do pacote e dos documentos.' },
                { icon: Award, s: '8', t: 'Acesse as evidências', d: 'Consulte os documentos concluídos e o certificado disponível.' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 card-hover">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{item.s}</div>
                    <item.icon className="w-[18px] h-[18px] text-slate-400" />
                  </div>
                  <h3 className="font-bold text-navy-900 text-[15px] mb-1.5">{item.t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FEATURES                                                      */}
        {/* ============================================================ */}
        <Section id="recursos" className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Tudo organizado para a rotina do escritório</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 scroll-animate">
              {[
                { icon: Users, t: 'Cadastro centralizado de clientes', d: 'Insira os dados uma vez e reutilize em todos os documentos.' },
                { icon: FileText, t: 'Modelos de documentos', d: 'Crie modelos com tags de preenchimento automático.' },
                { icon: Layers, t: 'Kits jurídicos', d: 'Agrupe modelos em pacotes organizados por tipo de atendimento.' },
                { icon: FolderOpen, t: 'Vários documentos em um pacote', d: 'Contrato, procuração e declarações reunidos no mesmo link.' },
                { icon: Eye, t: 'Revisão antes do envio', d: 'Confira os dados e o conteúdo dos documentos gerados.' },
                { icon: LinkIcon, t: 'Geração de link', d: 'Crie um link individual para cada contratação.' },
                { icon: Smartphone, t: 'Assinatura pelo celular', d: 'O cliente assina pelo navegador do celular, sem criar conta.' },
                { icon: ClipboardList, t: 'Consulta do andamento', d: 'Acompanhe o status de cada documento e pacote.' },
                { icon: Award, t: 'Certificado de evidências', d: 'Acesse as informações registradas durante a conclusão.' },
                { icon: QrCode, t: 'QR Code de verificação', d: 'Utilize o QR Code para conferir na página de verificação.' },
                { icon: Palette, t: 'Personalização do escritório', d: 'Configure o nome, OAB, cores e mensagens do escritório.' },
                { icon: Building2, t: 'Identidade visual nas assinaturas', d: 'Apresente a contratação com os dados e identidade do escritório.' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 card-hover">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center mb-3"><item.icon className="w-[18px] h-[18px] text-brand-600" /></div>
                  <h3 className="font-bold text-navy-900 text-[15px] mb-1">{item.t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  SECURITY & EVIDENCE                                           */}
        {/* ============================================================ */}
        <Section id="seguranca" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Rastreabilidade em cada contratação</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">O AssinaJur organiza as etapas da contratação e apresenta as evidências disponíveis nos documentos concluídos.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 scroll-animate">
              {[
                { icon: ClipboardList, t: 'Registro das etapas', d: 'Consulte os eventos importantes relacionados ao processo de assinatura.' },
                { icon: Award, t: 'Certificado de evidências', d: 'Acesse as informações registradas durante a conclusão dos documentos.' },
                { icon: QrCode, t: 'Verificação por QR Code', d: 'Utilize o QR Code para consultar a página de conferência.' },
                { icon: Lock, t: 'Controle de acesso', d: 'Os documentos permanecem vinculados ao respectivo escritório e à contratação.' },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-xl border border-slate-100 p-6 card-hover text-center">
                  <div className="w-12 h-12 rounded-xl bg-navy-900 flex items-center justify-center mx-auto mb-4"><item.icon className="w-6 h-6 text-white" /></div>
                  <h3 className="font-bold text-navy-900 mb-2">{item.t}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  VISUAL DEMO                                                   */}
        {/* ============================================================ */}
        <Section id="demonstracao" className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Veja o AssinaJur em ação</h2>
            </div>
            <div className="scroll-animate">
              <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
                {DEMO_STEPS.map((step, i) => (
                  <button key={i} onClick={() => setActiveDemo(i)} className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeDemo === i ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{step.tab}</button>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">Etapa {activeDemo + 1} de {DEMO_STEPS.length}</div>
                  <h3 className="text-xl font-bold text-navy-900">{DEMO_STEPS[activeDemo].title}</h3>
                  <p className="text-slate-600 leading-relaxed">{DEMO_STEPS[activeDemo].description}</p>
                </div>
                <div className="transition-opacity duration-300">{DEMO_STEPS[activeDemo].mockup}</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  PRICING — 4 PLANS                                             */}
        {/* ============================================================ */}
        <Section id="planos" className="py-20 sm:py-24 px-4 sm:px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Escolha a opção ideal para o seu escritório</h2>
            </div>

            {!SHOW_LEGACY_PLANS && (
              <>
                {/* Plan cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16 scroll-animate">

                  {/* FREE TRIAL */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-navy-900 mb-1">Teste gratuito</h3>
                      <p className="text-sm text-slate-500 mb-5">Conheça as principais funções antes de contratar.</p>
                      <div className="mb-5 pb-5 border-b border-slate-100">
                        <span className="text-4xl font-extrabold text-navy-900">R$ 0</span>
                        <p className="text-xs text-slate-500 mt-1">Até 30 dias</p>
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-700 mb-5">
                        {['5 pacotes de assinatura', '30 dias para utilizar', '1 usuário', 'Sem cartão de crédito', 'Sem cobrança automática', 'Funções disponibilizadas no teste'].map((t, i) => (
                          <li key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" /><span>{t}</span></li>
                        ))}
                      </ul>
                      <p className="text-xs text-slate-500 leading-relaxed mb-5">Cada pacote pode reunir contrato, procuração, declarações e outros documentos. O teste encerra ao utilizar os 5 pacotes ou completar os 30 dias.</p>
                    </div>
                    <div>
                      <Link href="/register" className="w-full text-center py-3 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition-colors block text-sm">Começar teste gratuito</Link>
                      <p className="text-[11px] text-center text-slate-400 mt-2">Sem cobrança automática ao final do teste.</p>
                    </div>
                  </div>

                  {/* SOLO */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-navy-900 mb-1">Plano Solo</h3>
                      <p className="text-sm text-slate-500 mb-5">Para advogados autônomos que estão começando a organizar suas contratações.</p>
                      <div className="mb-5 pb-5 border-b border-slate-100">
                        <div className="flex items-baseline gap-1"><span className="text-4xl font-extrabold text-navy-900">R$ 39,90</span><span className="text-sm text-slate-500">/mês</span></div>
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-700 mb-5">
                        {['Até 20 pacotes por mês', '1 usuário', 'Cadastro de clientes', 'Modelos de documentos', 'Kits jurídicos', 'Vários documentos por pacote', 'Assinatura pelo celular', 'Acompanhamento', 'Certificado de evidências', 'Suporte pelo canal disponibilizado'].map((t, i) => (
                          <li key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" /><span>{t}</span></li>
                        ))}
                      </ul>
                    </div>
                    <a href={whatsappSolo} target="_blank" rel="noopener noreferrer" className="w-full text-center py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-all block text-sm">Escolher Plano Solo</a>
                  </div>

                  {/* PROFISSIONAL — highlighted */}
                  <div className="bg-white rounded-2xl border-2 border-brand-500 p-6 flex flex-col justify-between relative shadow-lg">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[11px] font-semibold px-4 py-1 rounded-full flex items-center gap-1"><Star className="w-3 h-3" /> Mais escolhido</div>
                    <div>
                      <h3 className="text-lg font-bold text-navy-900 mb-1 mt-1">Plano Profissional</h3>
                      <p className="text-sm text-slate-500 mb-5">Para advogados e pequenos escritórios com maior volume de contratações.</p>
                      <div className="mb-5 pb-5 border-b border-slate-100">
                        <div className="flex items-baseline gap-1"><span className="text-4xl font-extrabold text-navy-900">R$ 69,90</span><span className="text-sm text-slate-500">/mês</span></div>
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-700 mb-5">
                        {['Até 60 pacotes por mês', 'Até 3 usuários', 'Todos os recursos do Plano Solo', 'Identidade visual do escritório', 'Organização de equipe', 'Prioridade no suporte'].map((t, i) => (
                          <li key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" /><span>{t}</span></li>
                        ))}
                      </ul>
                    </div>
                    <a href={whatsappPro} target="_blank" rel="noopener noreferrer" className="w-full text-center py-3 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-all block text-sm shadow-sm">Escolher Plano Profissional</a>
                  </div>

                  {/* ESCRITÓRIO */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-navy-900 mb-1">Plano Escritório</h3>
                      <p className="text-sm text-slate-500 mb-5">Para escritórios com equipe e maior volume mensal.</p>
                      <div className="mb-5 pb-5 border-b border-slate-100">
                        <div className="flex items-baseline gap-1"><span className="text-4xl font-extrabold text-navy-900">R$ 99,90</span><span className="text-sm text-slate-500">/mês</span></div>
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-700 mb-5">
                        {['Até 150 pacotes por mês', 'Até 5 usuários', 'Todos os recursos do Plano Profissional', 'Permissões de equipe', 'Suporte comercial'].map((t, i) => (
                          <li key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" /><span>{t}</span></li>
                        ))}
                      </ul>
                    </div>
                    <a href={whatsappOffice} target="_blank" rel="noopener noreferrer" className="w-full text-center py-3 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition-all block text-sm">Falar sobre o Plano Escritório</a>
                  </div>
                </div>

                {/* Comparison table */}
                <div className="scroll-animate max-w-5xl mx-auto overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-navy-900">Recurso</th>
                        <th className="text-center py-3 px-3 font-semibold text-navy-900">Teste</th>
                        <th className="text-center py-3 px-3 font-semibold text-navy-900">Solo</th>
                        <th className="text-center py-3 px-3 font-semibold text-brand-600 bg-brand-50/50 rounded-t-lg">Profissional</th>
                        <th className="text-center py-3 px-3 font-semibold text-navy-900">Escritório</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      {[
                        { label: 'Pacotes por mês', v: ['5', '20', '60', '150'] },
                        { label: 'Usuários', v: ['1', '1', '3', '5'] },
                        { label: 'Cadastro de clientes', v: [true, true, true, true] },
                        { label: 'Modelos e kits jurídicos', v: [true, true, true, true] },
                        { label: 'Assinatura pelo celular', v: [true, true, true, true] },
                        { label: 'Certificado de evidências', v: [true, true, true, true] },
                        { label: 'QR Code de verificação', v: [true, true, true, true] },
                        { label: 'Identidade visual do escritório', v: [false, false, true, true] },
                        { label: 'Organização de equipe', v: [false, false, true, true] },
                        { label: 'Permissões de equipe', v: [false, false, false, true] },
                        { label: 'Preço', v: ['R$ 0', 'R$ 39,90', 'R$ 69,90', 'R$ 99,90'] },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 px-4 font-medium text-navy-900">{row.label}</td>
                          {row.v.map((val, j) => (
                            <td key={j} className={`text-center py-3 px-3 ${j === 2 ? 'bg-brand-50/30' : ''}`}>
                              {typeof val === 'boolean' ? (val ? <CheckCircle className="w-4 h-4 text-success-600 mx-auto" /> : <Minus className="w-4 h-4 text-slate-300 mx-auto" />) : <span className="font-medium text-navy-900">{val}</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FAQ                                                           */}
        {/* ============================================================ */}
        <Section id="faq" className="py-20 sm:py-24 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12 scroll-animate">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-navy-900 mb-4">Perguntas frequentes</h2>
            </div>
            <div className="space-y-3 scroll-animate">
              {FAQ_ITEMS.map((item, i) => (<FaqItem key={i} question={item.q} answer={item.a} isOpen={openFaq === i} onToggle={() => toggleFaq(i)} />))}
            </div>
          </div>
        </Section>

        {/* ============================================================ */}
        {/*  FINAL CTA                                                     */}
        {/* ============================================================ */}
        <Section className="py-20 sm:py-24 px-4 sm:px-6 gradient-cta">
          <div className="max-w-3xl mx-auto text-center scroll-animate">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-4">Transforme a contratação dos clientes do seu escritório</h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">Cadastre os dados uma única vez, organize os documentos e encaminhe tudo para assinatura em um único fluxo.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Link href="/register" className="w-full sm:w-auto text-base font-semibold bg-white text-navy-900 hover:bg-slate-100 px-8 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">Testar gratuitamente <ArrowRight className="w-4 h-4" /></Link>
              <a href={whatsappDefault} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-base font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 px-8 py-3.5 rounded-xl transition-all text-center flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4" /> Falar com consultor</a>
            </div>
            <p className="text-sm text-slate-400">5 pacotes gratuitos • 30 dias • Sem cartão</p>
          </div>
        </Section>
      </main>

      {/* ============================================================ */}
      {/*  FOOTER                                                        */}
      {/* ============================================================ */}
      <footer className="bg-navy-900 text-white py-14 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            <div className="sm:col-span-2 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-sm">AJ</div>
                <span className="text-lg font-extrabold text-white tracking-tight">AssinaJur</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">Plataforma de contratação e assinatura eletrônica desenvolvida para advogados e escritórios de advocacia.</p>
            </div>
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
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Conta</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/login" className="hover:text-white transition-colors">Entrar</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Criar conta</Link></li>
                <li><a href={whatsappDefault} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Falar com consultor</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm mb-4">Legal e Contato</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
                <li className="pt-1"><a href="https://wa.me/5573988250201" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp: (73) 98825-0201</a></li>
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
