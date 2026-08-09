'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Layers,
  Smartphone,
  Eye,
  FileText,
  Users,
  Clock,
  Copy,
  Award,
  Shield,
  QrCode,
  Scale,
  Building2,
  Briefcase,
  Home,
  Building,
  Menu,
  X,
  Check,
  Lock,
  Link2,
  PenTool,
  UserCheck,
  Camera,
  Monitor,
  Search,
  Key,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import {
  COMMERCIAL_WHATSAPP_FORMATTED,
  getWhatsAppLink,
  SOLO_PLAN_WHATSAPP_MESSAGE,
  PRO_PLAN_WHATSAPP_MESSAGE,
  OFFICE_PLAN_WHATSAPP_MESSAGE,
  ENTERPRISE_WHATSAPP_MESSAGE
} from '@/lib/constants';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Scroll detection for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Body scroll lock for mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleDropdownEnter = (dropdown: string) => setActiveDropdown(dropdown);
  const handleDropdownLeave = () => setActiveDropdown(null);

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-body selection:bg-brand-500/30">
      
      {/* ═══ 1. HEADER ═══ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300 ${
          scrolled ? 'glass-navy shadow-soft' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 z-50 relative group">
            <div className="w-10 h-10 bg-white text-navy-900 rounded-xl flex items-center justify-center font-heading font-extrabold text-lg shadow-elevated group-hover:bg-brand-100 transition-colors">
              AJ
            </div>
            <span className="font-heading font-extrabold text-xl text-white transition-colors duration-300">
              AssinaJur
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8 h-full">
            <div
              className="relative h-full flex items-center"
              onMouseEnter={() => handleDropdownEnter('produto')}
              onMouseLeave={handleDropdownLeave}
            >
              <button className="font-semibold flex items-center gap-1 transition-colors text-slate-200 hover:text-white">
                Produto
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'produto' ? 'rotate-180' : ''}`} />
              </button>
              
              {/* ═══ 2. MEGA MENU 'PRODUTO' ═══ */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 transition-all duration-300 pointer-events-none origin-top ${activeDropdown === 'produto' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95'}`}>
                <div className="bg-white rounded-3xl shadow-elevated max-w-4xl w-[800px] p-8 grid grid-cols-3 gap-8 relative border border-surface-200 before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-white">
                  
                  <div className="space-y-6">
                    <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-muted mb-4 border-b pb-2">Assinaturas</h3>
                    <Link href="#assinatura" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <FileCheck2 className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Assinatura eletrônica</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Colha assinaturas com validade jurídica pelo celular</div>
                      </div>
                    </Link>
                    <Link href="#pacotes" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <Layers className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Pacotes de documentos</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Contrato, procuração e declarações em um único envio</div>
                      </div>
                    </Link>
                    <Link href="#mobile" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <Smartphone className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Assinatura pelo celular</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Fluxo otimizado para telas de smartphones</div>
                      </div>
                    </Link>
                    <Link href="#prova-presenca" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <Eye className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Prova de presença</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Registros faciais guiados durante a assinatura</div>
                      </div>
                    </Link>
                  </div>

                  <div className="space-y-6">
                    <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-muted mb-4 border-b pb-2">Gestão</h3>
                    <Link href="#gestao" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <FileText className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Gestão de documentos</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Organize e acompanhe o status de cada envio</div>
                      </div>
                    </Link>
                    <Link href="#clientes" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <Users className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Clientes</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Cadastro único reutilizável em qualquer documento</div>
                      </div>
                    </Link>
                    <Link href="#acompanhamento" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <Clock className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Acompanhamento</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Saiba quem assinou, quem está pendente</div>
                      </div>
                    </Link>
                    <Link href="#modelos" className="group flex gap-4 hover:bg-surface-50 p-2 -m-2 rounded-xl transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                        <Copy className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Modelos</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Crie modelos reutilizáveis para agilizar</div>
                      </div>
                    </Link>
                  </div>

                  <div className="space-y-6 bg-surface-50 -my-8 -mr-8 p-8 rounded-r-3xl">
                    <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-muted mb-4 border-b border-surface-200 pb-2">Evidências</h3>
                    <Link href="#certificado" className="group flex gap-4 hover:bg-white p-2 -m-2 rounded-xl transition-colors shadow-none hover:shadow-soft">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:bg-brand-50 transition-colors shadow-sm">
                        <Award className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Certificado de evidências</div>
                        <div className="text-caption text-muted mt-1 leading-snug">PDF com fotos, hashes e QR Code</div>
                      </div>
                    </Link>
                    <Link href="#trilha" className="group flex gap-4 hover:bg-white p-2 -m-2 rounded-xl transition-colors shadow-none hover:shadow-soft">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:bg-brand-50 transition-colors shadow-sm">
                        <Shield className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Trilha de autenticidade</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Registro completo de cada etapa</div>
                      </div>
                    </Link>
                    <Link href="#validacao" className="group flex gap-4 hover:bg-white p-2 -m-2 rounded-xl transition-colors shadow-none hover:shadow-soft">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 group-hover:bg-brand-50 transition-colors shadow-sm">
                        <QrCode className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-navy-900 text-sm">Validação por QR Code</div>
                        <div className="text-caption text-muted mt-1 leading-snug">Consulta pública de autenticidade</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative h-full flex items-center"
              onMouseEnter={() => handleDropdownEnter('solucoes')}
              onMouseLeave={handleDropdownLeave}
            >
              <button className="font-semibold flex items-center gap-1 transition-colors text-slate-200 hover:text-white">
                Soluções
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'solucoes' ? 'rotate-180' : ''}`} />
              </button>
              
              {/* ═══ 3. SOLUTIONS MENU ═══ */}
              <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 transition-all duration-300 pointer-events-none origin-top ${activeDropdown === 'solucoes' ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95'}`}>
                <div className="bg-white rounded-3xl shadow-elevated max-w-sm w-[360px] p-4 relative border border-surface-200 before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-white flex flex-col gap-1">
                  
                  <Link href="#advogados" className="group flex gap-4 hover:bg-surface-50 p-3 rounded-xl transition-colors items-center">
                    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors text-muted">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-navy-900 text-sm">Para advogados</div>
                    </div>
                  </Link>
                  
                  <Link href="#escritorios" className="group flex gap-4 hover:bg-surface-50 p-3 rounded-xl transition-colors items-center">
                    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors text-muted">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-navy-900 text-sm">Para escritórios de advocacia</div>
                    </div>
                  </Link>

                  <Link href="#departamentos" className="group flex gap-4 hover:bg-surface-50 p-3 rounded-xl transition-colors items-center">
                    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors text-muted">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-navy-900 text-sm">Para departamentos jurídicos</div>
                    </div>
                  </Link>

                  <Link href="#imobiliarias" className="group flex gap-4 hover:bg-surface-50 p-3 rounded-xl transition-colors items-center">
                    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors text-muted">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-navy-900 text-sm">Para imobiliárias</div>
                    </div>
                  </Link>

                  <Link href="#empresas" className="group flex gap-4 hover:bg-surface-50 p-3 rounded-xl transition-colors items-center">
                    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors text-muted">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-navy-900 text-sm">Para empresas</div>
                    </div>
                  </Link>

                </div>
              </div>
            </div>

            <Link href="#seguranca" className="font-semibold transition-colors text-slate-200 hover:text-white">Segurança</Link>
            <Link href="#precos" className="font-semibold transition-colors text-slate-200 hover:text-white">Preços</Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/login" className="font-semibold transition-colors text-slate-200 hover:text-white">
              Entrar
            </Link>
            <Link href="/register" className="btn-primary">
              Testar grátis
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -mr-2 rounded-lg transition-colors text-white hover:bg-white/10"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* ═══ 4. MOBILE MENU ═══ */}
      <div 
        className={`fixed inset-0 bg-navy-900 z-[60] text-white flex flex-col transition-transform duration-500 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-[72px] px-4 flex items-center justify-between border-b border-white/10">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-navy-900 rounded-xl flex items-center justify-center font-heading font-extrabold text-lg">
              AJ
            </div>
            <span className="font-heading font-extrabold text-xl">
              AssinaJur
            </span>
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 -mr-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <nav className="flex flex-col gap-6 text-lg font-semibold">
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'mob-produto' ? null : 'mob-produto')}
                className="flex items-center justify-between py-2 border-b border-white/5"
              >
                Produto
                <ChevronDown className={`w-5 h-5 transition-transform ${activeDropdown === 'mob-produto' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'mob-produto' && (
                <div className="pl-4 flex flex-col gap-4 text-base text-slate-300 font-medium">
                  <Link href="#assinatura" onClick={() => setMobileMenuOpen(false)}>Assinatura eletrônica</Link>
                  <Link href="#pacotes" onClick={() => setMobileMenuOpen(false)}>Pacotes de documentos</Link>
                  <Link href="#prova-presenca" onClick={() => setMobileMenuOpen(false)}>Prova de presença</Link>
                  <Link href="#gestao" onClick={() => setMobileMenuOpen(false)}>Gestão de documentos</Link>
                  <Link href="#certificado" onClick={() => setMobileMenuOpen(false)}>Certificado de evidências</Link>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'mob-solucoes' ? null : 'mob-solucoes')}
                className="flex items-center justify-between py-2 border-b border-white/5"
              >
                Soluções
                <ChevronDown className={`w-5 h-5 transition-transform ${activeDropdown === 'mob-solucoes' ? 'rotate-180' : ''}`} />
              </button>
              {activeDropdown === 'mob-solucoes' && (
                <div className="pl-4 flex flex-col gap-4 text-base text-slate-300 font-medium">
                  <Link href="#advogados" onClick={() => setMobileMenuOpen(false)}>Para advogados</Link>
                  <Link href="#escritorios" onClick={() => setMobileMenuOpen(false)}>Para escritórios</Link>
                  <Link href="#departamentos" onClick={() => setMobileMenuOpen(false)}>Para departamentos jurídicos</Link>
                </div>
              )}
            </div>

            <Link href="#seguranca" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-white/5">Segurança</Link>
            <Link href="#precos" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-white/5">Preços</Link>
          </nav>

          <div className="mt-auto flex flex-col gap-4 pt-6 border-t border-white/10">
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)} 
              className="text-center font-semibold py-3"
            >
              Entrar
            </Link>
            <Link 
              href="/register" 
              onClick={() => setMobileMenuOpen(false)} 
              className="btn-primary w-full justify-center bg-brand-500 hover:bg-brand-400"
            >
              Testar grátis
            </Link>
          </div>
        </div>
      </div>

      <main>
        {/* ═══ 5. HERO SECTION ═══ */}
        <section className="relative bg-[#06152f] pt-24 lg:pt-32 pb-20 lg:pb-28 overflow-hidden">
          <div className="absolute inset-0 hero-grid opacity-[0.08]"></div>
          <div className="absolute -top-40 right-0 w-[760px] h-[760px] bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-52 left-1/4 w-[620px] h-[620px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-[.92fr_1.08fr] gap-14 lg:gap-12 items-center">
              
              {/* Left Column */}
              <div className="flex flex-col items-start gap-6 pt-10">
                <div className="text-overline bg-white/10 text-brand-200 border border-white/10 rounded-full px-4 py-1.5 font-bold tracking-widest backdrop-blur-sm scroll-reveal animate-slide-in-down">
                  ASSINATURA ELETRÔNICA PARA O JURÍDICO
                </div>
                
                <h1 className="font-heading text-white leading-[1.05] scroll-reveal text-[42px] md:text-[52px] lg:text-[66px] tracking-[-0.035em]">
                  Documentos jurídicos prontos para <span className="text-brand-400">assinar.</span>
                </h1>
                
                <p className="text-slate-300 max-w-xl scroll-reveal text-[17px] lg:text-[19px] leading-relaxed">
                  Cadastre o cliente uma vez, monte contratos e procurações, envie por um único link e acompanhe tudo até a evidência final.
                </p>
                
                <div className="flex flex-wrap items-center gap-4 pt-4 scroll-reveal">
                  <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-base px-6 py-3.5 shadow-lg shadow-brand-900/30 transition-colors">
                    Testar o AssinaJur <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                  <Link href="#plataforma" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-base px-6 py-3.5 transition-colors">
                    Ver como funciona
                  </Link>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-caption text-slate-300 font-medium scroll-reveal">
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success-500" /> Sem cartão de crédito</div>
                  <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-success-500" /> 5 pacotes gratuitos</div>
                </div>
              </div>

              {/* Product-first interface */}
              <div className="relative mt-8 lg:mt-0 scroll-reveal">
                <div className="rounded-[1.75rem] border border-white/15 bg-white/[0.07] p-2.5 shadow-2xl shadow-black/30 backdrop-blur">
                  <div className="overflow-hidden rounded-[1.3rem] bg-[#f7f9fc] border border-white/10">
                    <div className="h-11 bg-white border-b border-slate-200 flex items-center gap-2 px-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      <div className="ml-3 h-6 flex-1 max-w-[340px] rounded-md bg-slate-100 px-3 flex items-center text-[9px] font-mono text-slate-400">app.assinajur.com.br/dashboard</div>
                    </div>
                    <div className="grid sm:grid-cols-[150px_1fr] min-h-[430px]">
                      <div className="hidden sm:block bg-[#081d3d] p-4 text-white">
                        <div className="flex items-center gap-2 font-heading font-bold mb-8"><span className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center text-[10px]">AJ</span> AssinaJur</div>
                        {['Visão geral', 'Documentos', 'Clientes', 'WhatsApp IA', 'Modelos'].map((item, index) => (
                          <div key={item} className={`rounded-lg px-3 py-2.5 mb-1 text-[11px] font-semibold ${index === 0 ? 'bg-white/10 text-white' : 'text-slate-400'}`}>{item}</div>
                        ))}
                      </div>
                      <div className="p-5 sm:p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div><div className="text-[10px] font-bold tracking-widest text-brand-600 uppercase">Painel do escritório</div><h3 className="font-heading font-extrabold text-navy-900 text-xl mt-1">Acompanhe sua operação</h3></div>
                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[9px] font-bold">ATIVO</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 mb-5">
                          <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[9px] text-slate-500">Clientes</div><strong className="text-lg text-navy-900">87</strong></div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[9px] text-slate-500">Pendentes</div><strong className="text-lg text-amber-500">12</strong></div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[9px] text-slate-500">Concluídos</div><strong className="text-lg text-emerald-600">142</strong></div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <div className="grid grid-cols-[1fr_90px] bg-slate-50 px-4 py-2.5 text-[9px] uppercase font-bold tracking-wider text-slate-400"><span>Documento</span><span>Status</span></div>
                          <div className="grid grid-cols-[1fr_90px] items-center px-4 py-3 border-t border-slate-100"><span className="text-[11px] font-bold text-navy-900">Procuração previdenciária</span><span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-1 text-center">Concluído</span></div>
                          <div className="grid grid-cols-[1fr_90px] items-center px-4 py-3 border-t border-slate-100"><span className="text-[11px] font-bold text-navy-900">Contrato de honorários</span><span className="text-[9px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-1 text-center">Pendente</span></div>
                          <div className="grid grid-cols-[1fr_90px] items-center px-4 py-3 border-t border-slate-100"><span className="text-[11px] font-bold text-navy-900">Declaração de hipossuficiência</span><span className="text-[9px] font-bold text-blue-700 bg-blue-50 rounded-full px-2 py-1 text-center">Enviado</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -left-4 -bottom-5 rounded-2xl border border-white/10 bg-[#10284d] px-4 py-3 shadow-xl flex items-center gap-3 text-white"><Check className="w-5 h-5 text-emerald-400" /><div><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Automação</div><div className="text-xs font-bold">Documento assinado</div></div></div>
                <div className="absolute -right-3 top-20 rounded-2xl border border-white/10 bg-white px-4 py-3 shadow-xl hidden sm:flex items-center gap-3"><Shield className="w-5 h-5 text-brand-600" /><div><div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Segurança</div><div className="text-xs font-bold text-navy-900">Evidências vinculadas</div></div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 6. TRUST BAR ═══ */}
        <section className="bg-white border-y border-surface-200 py-12 scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-caption text-muted text-center font-semibold mb-8 uppercase tracking-widest">
              Uma plataforma criada para documentos que exigem confiança.
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-surface-100">
              <div className="flex flex-col items-center text-center px-4">
                <Shield className="w-8 h-8 text-brand-600 mb-3" />
                <div className="font-bold text-navy-900 mb-1">Lei 14.063/2020</div>
                <div className="text-caption text-muted">Assinatura eletrônica</div>
              </div>
              <div className="flex flex-col items-center text-center px-4">
                <Lock className="w-8 h-8 text-brand-600 mb-3" />
                <div className="font-bold text-navy-900 mb-1">SHA-256</div>
                <div className="text-caption text-muted">Integridade documental</div>
              </div>
              <div className="flex flex-col items-center text-center px-4">
                <Eye className="w-8 h-8 text-brand-600 mb-3" />
                <div className="font-bold text-navy-900 mb-1">3 registros faciais</div>
                <div className="text-caption text-muted">Prova de presença</div>
              </div>
              <div className="flex flex-col items-center text-center px-4">
                <QrCode className="w-8 h-8 text-brand-600 mb-3" />
                <div className="font-bold text-navy-900 mb-1">QR Code</div>
                <div className="text-caption text-muted">Validação independente</div>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT DIFFERENTIATORS */}
        <section className="py-24 bg-white scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <div className="text-overline text-brand-700 font-bold tracking-widest mb-4">MAIS DO QUE COLETAR ASSINATURAS</div>
              <h2 className="text-h2 font-heading text-navy-900 mb-5">Uma operação jurídica inteira, conectada.</h2>
              <p className="text-body-lg text-muted">Menos troca de telas, menos cadastro repetido e mais controle sobre cada documento enviado.</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 rounded-[2rem] bg-[#071b3a] text-white p-7 sm:p-9 overflow-hidden relative min-h-[470px]">
                <div className="absolute -right-24 -top-24 w-72 h-72 bg-brand-500/25 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex items-center justify-between mb-8">
                  <div><div className="text-[10px] uppercase tracking-[0.2em] text-brand-300 font-bold">Exclusivo AssinaJur</div><h3 className="font-heading text-2xl font-bold mt-2">Controle pelo WhatsApp</h3></div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center"><Smartphone className="w-5 h-5" /></div>
                </div>
                <div className="relative z-10 rounded-2xl bg-[#e9e5dc] p-4 sm:p-5 max-w-xl mx-auto shadow-2xl">
                  <div className="flex items-center gap-3 pb-3 border-b border-black/10"><div className="w-9 h-9 rounded-full bg-[#071b3a] text-white flex items-center justify-center text-[10px] font-bold">AJ</div><div><div className="text-xs font-bold text-slate-900">AssinaJur — Assistente</div><div className="text-[10px] text-emerald-700">online</div></div></div>
                  <div className="py-4 space-y-3 text-[11px] leading-relaxed">
                    <div className="ml-auto max-w-[78%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-3 text-slate-800 shadow-sm">Cadastre a cliente Maria Silva com o documento que enviei.</div>
                    <div className="max-w-[86%] rounded-xl rounded-tl-sm bg-white p-3 text-slate-800 shadow-sm"><strong>Dados identificados.</strong><br />Nome, CPF, RG e nascimento estão prontos para conferência.</div>
                    <div className="ml-auto max-w-[55%] rounded-xl rounded-tr-sm bg-[#d9fdd3] p-3 text-slate-800 shadow-sm">Confirmar cadastro.</div>
                    <div className="max-w-[86%] rounded-xl rounded-tl-sm bg-white p-3 text-slate-800 shadow-sm"><span className="text-emerald-600 font-bold">✓ Cliente cadastrada</span><br />A ficha já está disponível no painel.</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-[2rem] border border-surface-200 bg-surface-50 p-7 sm:p-9 min-h-[470px]">
                <div className="flex items-start justify-between mb-7"><div><div className="text-[10px] uppercase tracking-[0.2em] text-brand-600 font-bold">Clientes</div><h3 className="font-heading text-2xl font-bold text-navy-900 mt-2">Cadastro vivo e reutilizável</h3></div><Users className="w-7 h-7 text-brand-600" /></div>
                <p className="text-sm text-muted leading-relaxed mb-7">Atualize dados, consulte a ficha e reaproveite as informações em novos documentos.</p>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  {[['MS','Maria Silva','Previdenciário'],['CA','Carlos Almeida','Trabalhista'],['AF','Ana Ferreira','Cível']].map(([initials,name,area], index) => (
                    <div key={name} className={`flex items-center gap-3 p-4 ${index ? 'border-t border-slate-100' : ''}`}><div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center text-[10px] font-bold">{initials}</div><div className="flex-1"><div className="text-xs font-bold text-navy-900">{name}</div><div className="text-[10px] text-slate-400">{area}</div></div><span className="text-[10px] font-bold text-brand-600">Abrir ficha</span></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-xl bg-brand-600 text-white p-4"><strong className="block text-xl">1 vez</strong><span className="text-[10px] text-brand-100">para cadastrar</span></div><div className="rounded-xl bg-navy-900 text-white p-4"><strong className="block text-xl">∞</strong><span className="text-[10px] text-slate-300">para reutilizar</span></div></div>
              </div>

              <div className="lg:col-span-4 rounded-[1.75rem] border border-surface-200 p-7"><Layers className="w-7 h-7 text-brand-600 mb-5" /><h3 className="font-heading text-xl font-bold text-navy-900">Kits em um único link</h3><p className="text-sm text-muted mt-2 leading-relaxed">Contrato, procuração e declarações enviados juntos para o cliente.</p></div>
              <div className="lg:col-span-4 rounded-[1.75rem] border border-surface-200 p-7"><Eye className="w-7 h-7 text-brand-600 mb-5" /><h3 className="font-heading text-xl font-bold text-navy-900">Acompanhamento claro</h3><p className="text-sm text-muted mt-2 leading-relaxed">Veja o que foi enviado, aberto, assinado ou ainda está pendente.</p></div>
              <div className="lg:col-span-4 rounded-[1.75rem] border border-surface-200 p-7"><Shield className="w-7 h-7 text-brand-600 mb-5" /><h3 className="font-heading text-xl font-bold text-navy-900">Evidências vinculadas</h3><p className="text-sm text-muted mt-2 leading-relaxed">Fotos, contexto técnico, hash e validação reunidos no documento final.</p></div>
            </div>
          </div>
        </section>

        {/* ═══ 7. PLATFORM SECTION ═══ */}
        <section id="plataforma" className="py-24 bg-surface-50 scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-h2 font-heading text-navy-900 mb-4">Do envio à evidência final, sem sair do AssinaJur</h2>
            </div>
            
            <div className="max-w-5xl mx-auto mockup-browser bg-white rounded-2xl shadow-elevated border border-surface-200 overflow-hidden mb-16">
              <div className="mockup-browser-bar bg-surface-100 flex items-center px-4 py-3 border-b border-surface-200 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
              </div>
              <div className="flex h-[480px]">
                {/* Sidebar */}
                <div className="w-64 border-r border-surface-100 p-4 bg-surface-50 hidden md:flex flex-col gap-2">
                  <div className="flex items-center gap-3 px-3 py-2 bg-brand-50 text-brand-700 rounded-lg font-semibold text-sm">
                    <FileText className="w-4 h-4" /> Documentos
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-muted hover:bg-surface-100 rounded-lg font-medium text-sm transition-colors">
                    <Users className="w-4 h-4" /> Clientes
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-muted hover:bg-surface-100 rounded-lg font-medium text-sm transition-colors">
                    <Layers className="w-4 h-4" /> Kits
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 text-muted hover:bg-surface-100 rounded-lg font-medium text-sm transition-colors">
                    <Copy className="w-4 h-4" /> Modelos
                  </div>
                </div>
                {/* Main Content */}
                <div className="flex-1 bg-white p-6 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-heading font-bold text-xl text-navy-900">Documentos Recentes</h3>
                    <button className="btn-primary text-sm py-2">Novo Envio</button>
                  </div>
                  <div className="border border-surface-100 rounded-xl overflow-hidden flex-1">
                    <div className="grid grid-cols-4 p-4 border-b border-surface-100 bg-surface-50 text-xs font-semibold text-muted uppercase tracking-wider">
                      <div className="col-span-2">Documento</div>
                      <div>Cliente</div>
                      <div>Status</div>
                    </div>
                    <div className="grid grid-cols-4 p-4 border-b border-surface-50 items-center hover:bg-surface-50 transition-colors">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><Layers className="w-4 h-4" /></div>
                        <span className="font-semibold text-navy-900 text-sm">Kit Compra e Venda Lote 42</span>
                      </div>
                      <div className="text-sm text-muted">Roberto Almeida</div>
                      <div><span className="px-2.5 py-1 bg-success-50 text-success-700 text-xs font-bold rounded-full">Concluído</span></div>
                    </div>
                    <div className="grid grid-cols-4 p-4 border-b border-surface-50 items-center hover:bg-surface-50 transition-colors">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><FileText className="w-4 h-4" /></div>
                        <span className="font-semibold text-navy-900 text-sm">Procuração Ad Judicia</span>
                      </div>
                      <div className="text-sm text-muted">Maria Silva</div>
                      <div><span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">Pendente</span></div>
                    </div>
                    <div className="grid grid-cols-4 p-4 border-b border-surface-50 items-center hover:bg-surface-50 transition-colors">
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><Layers className="w-4 h-4" /></div>
                        <span className="font-semibold text-navy-900 text-sm">Contrato de Honorários</span>
                      </div>
                      <div className="text-sm text-muted">Empresa XYZ Ltda</div>
                      <div><span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-full">Enviado</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <div className="card-base flex items-start gap-4 p-6 bg-white">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl shrink-0"><Layers className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-navy-900 mb-2">Pacotes</h4>
                  <p className="text-muted text-sm leading-relaxed">Contrato, procuração e declaração em um único envio. Facilite a vida do seu cliente enviando tudo de uma vez.</p>
                </div>
              </div>
              <div className="card-base flex items-start gap-4 p-6 bg-white">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl shrink-0"><Clock className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-navy-900 mb-2">Acompanhamento</h4>
                  <p className="text-muted text-sm leading-relaxed">Saiba quem abriu, assinou ou ainda está pendente. Tenha controle total sobre o andamento dos seus envios.</p>
                </div>
              </div>
              <div className="card-base flex items-start gap-4 p-6 bg-white">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl shrink-0"><Eye className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-navy-900 mb-2">Prova de presença</h4>
                  <p className="text-muted text-sm leading-relaxed">Capturas orientadas durante o fluxo garantem que a pessoa que assina é realmente quem diz ser.</p>
                </div>
              </div>
              <div className="card-base flex items-start gap-4 p-6 bg-white">
                <div className="p-3 bg-brand-50 text-brand-600 rounded-xl shrink-0"><Award className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-navy-900 mb-2">Certificado</h4>
                  <p className="text-muted text-sm leading-relaxed">Evidências reunidas automaticamente no final, gerando um PDF único e robusto para reforçar a comprovação da assinatura.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 8. SINGLE LINK FLOW SECTION ═══ */}
        <section className="py-24 bg-white scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-h2 font-heading text-navy-900 mb-2">Não é só assinar um PDF.</h2>
              <p className="text-h2 font-heading text-gradient bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">É fechar o fluxo jurídico.</p>
            </div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 max-w-5xl mx-auto before:hidden md:before:block before:absolute before:top-1/2 before:-translate-y-1/2 before:left-0 before:right-0 before:h-1 before:bg-surface-200 before:-z-10">
              
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-3 relative bg-white p-2">
                <div className="w-12 h-12 rounded-full bg-navy-900 text-white flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-navy-900">Cliente</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-3 relative bg-white p-2">
                <div className="w-12 h-12 rounded-full bg-surface-100 text-muted flex items-center justify-center border border-surface-200">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-navy-900">Cadastro único</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-3 relative bg-white p-2">
                <div className="w-12 h-12 rounded-full bg-surface-100 text-muted flex items-center justify-center border border-surface-200">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-navy-900 text-center max-w-[100px]">Documentos do pacote</span>
              </div>

              {/* Step 4 - Highlight */}
              <div className="flex flex-col items-center gap-4 relative bg-white p-2 z-10 scale-110">
                <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full"></div>
                <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-glow-blue relative ring-4 ring-white">
                  <Link2 className="w-7 h-7" />
                </div>
                <span className="text-sm font-extrabold text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">Um único link</span>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center gap-3 relative bg-white p-2">
                <div className="w-12 h-12 rounded-full bg-surface-100 text-muted flex items-center justify-center border border-surface-200">
                  <PenTool className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-navy-900 text-center max-w-[100px]">Identificação + Assinatura</span>
              </div>

              {/* Step 6 */}
              <div className="flex flex-col items-center gap-3 relative bg-white p-2">
                <div className="w-12 h-12 rounded-full bg-surface-100 text-muted flex items-center justify-center border border-surface-200">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-navy-900 text-center max-w-[100px]">Certificado + Evidências</span>
              </div>

            </div>
          </div>
        </section>

        {/* ═══ 9. DARK EVIDENCE SECTION ═══ */}
        <section className="bg-navy-900 py-24 text-white overflow-hidden scroll-reveal relative">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h2 className="text-h2 font-heading text-white mb-16 text-center lg:text-left">Evidências que acompanham cada assinatura</h2>
            
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              {/* Left - Certificate Preview */}
              <div className="bg-white text-navy-900 rounded-xl p-8 shadow-2xl relative rotate-1 hover:rotate-0 transition-transform duration-500 max-w-md mx-auto lg:mx-0">
                <div className="absolute inset-0 bg-gradient-to-br from-white to-surface-50 rounded-xl pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <h3 className="font-heading font-extrabold tracking-widest text-lg border-b-2 border-navy-900 inline-block pb-1 mb-2">CERTIFICADO DE EVIDÊNCIAS</h3>
                    <div className="font-mono text-xs text-muted">AJ-8F92-K3D1</div>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between border-b border-dashed border-surface-200 pb-2">
                      <span className="text-xs font-bold text-muted uppercase">Signatário</span>
                      <span className="text-sm font-semibold">Roberto Almeida</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-surface-200 pb-2">
                      <span className="text-xs font-bold text-muted uppercase">CPF</span>
                      <span className="text-sm font-semibold font-mono">***.456.789-**</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-surface-200 pb-2">
                      <span className="text-xs font-bold text-muted uppercase">Data</span>
                      <span className="text-sm font-semibold">06/08/2026 14:32</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-surface-200 pb-2">
                      <span className="text-xs font-bold text-muted uppercase">Hash (SHA-256)</span>
                      <span className="text-[10px] font-mono text-muted bg-surface-100 px-1 rounded truncate max-w-[120px]">a2c4e6f8...9b1d3</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-surface-100 aspect-[3/4] rounded-lg border border-surface-200 flex flex-col items-center justify-center p-2 relative overflow-hidden">
                       <UserCheck className="w-6 h-6 text-muted/50 absolute z-0" />
                       <div className="mt-auto text-[8px] font-bold uppercase text-navy-900 bg-white/80 px-1 rounded w-full text-center z-10 backdrop-blur-sm">Frontal</div>
                    </div>
                    <div className="bg-surface-100 aspect-[3/4] rounded-lg border border-surface-200 flex flex-col items-center justify-center p-2 relative overflow-hidden">
                       <UserCheck className="w-6 h-6 text-muted/50 absolute z-0" />
                       <div className="mt-auto text-[8px] font-bold uppercase text-navy-900 bg-white/80 px-1 rounded w-full text-center z-10 backdrop-blur-sm">Esquerdo</div>
                    </div>
                    <div className="bg-surface-100 aspect-[3/4] rounded-lg border border-surface-200 flex flex-col items-center justify-center p-2 relative overflow-hidden">
                       <UserCheck className="w-6 h-6 text-muted/50 absolute z-0" />
                       <div className="mt-auto text-[8px] font-bold uppercase text-navy-900 bg-white/80 px-1 rounded w-full text-center z-10 backdrop-blur-sm">Direito</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="text-[9px] text-muted font-medium">
                      AssinaJur • Horário de Brasília — UTC−3<br/>
                      Página 1 de 1
                    </div>
                    <div className="w-16 h-16 bg-white border-2 border-navy-900 rounded p-1 flex items-center justify-center">
                      <QrCode className="w-full h-full text-navy-900" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Evidence List */}
              <div className="flex flex-col gap-8">
                <div className="flex gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                    <UserCheck className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">IDENTIFICAÇÃO</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">CPF, data, hora e informações precisas fornecidas pelo signatário no momento da assinatura.</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                    <Camera className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">PROVA DE PRESENÇA</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Registros fotográficos orientados durante a assinatura, capturando múltiplos ângulos faciais.</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                    <Monitor className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">CONTEXTO TÉCNICO</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Registro de IP, tipo de dispositivo, navegador e geolocalização (quando autorizada pelo usuário).</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                    <Lock className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">INTEGRIDADE</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Criptografia com hash SHA-256 e código único de autenticidade protegendo contra adulterações.</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/5">
                    <QrCode className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">VALIDAÇÃO</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">QR Code impresso e link direto para consulta pública do documento a qualquer momento.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══ 10. PROOF OF PRESENCE SECTION ═══ */}
        <section id="prova-presenca" className="py-24 bg-surface-50 scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              
              <div>
                <h2 className="text-h2 font-heading text-navy-900 mb-6">Identificação guiada, sem complicar a experiência</h2>
                <p className="text-body-lg text-muted mb-8">
                  Nossa experiência de registros fotográficos orientados ajuda a demonstrar a participação do signatário e vincula as evidências coletadas ao documento final.
                </p>
                <ul className="space-y-4 text-navy-900 font-medium">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success-500 mt-0.5 shrink-0" />
                    <span>O cliente recebe instruções claras na tela para cada etapa.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success-500 mt-0.5 shrink-0" />
                    <span>Realiza os movimentos faciais guiados pela câmera do celular.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success-500 mt-0.5 shrink-0" />
                    <span>As evidências são imediatamente vinculadas ao documento assinado.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success-500 mt-0.5 shrink-0" />
                    <span>Tudo acontece diretamente pelo navegador, sem instalar nada.</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-center relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl"></div>
                <div className="mockup-phone w-[280px] h-[580px] bg-white rounded-[2.5rem] shadow-2xl border-[6px] border-navy-900 overflow-hidden flex flex-col relative z-10">
                  {/* Status bar */}
                  <div className="bg-navy-900 text-white text-xs py-1.5 px-6 flex justify-between font-medium">
                    <span>14:30</span>
                    <div className="flex gap-1.5 items-center">
                      <div className="w-3 h-3 rounded-full border border-white/50"></div>
                      <div className="w-4 h-2.5 bg-white rounded-sm"></div>
                    </div>
                  </div>
                  {/* App Header */}
                  <div className="bg-white px-4 py-4 border-b border-surface-100 flex items-center justify-center relative">
                    <span className="text-xs font-bold text-navy-900">Prova de Presença — Etapa 2 de 4</span>
                  </div>
                  {/* Camera Area */}
                  <div className="flex-1 bg-surface-100 p-4 flex flex-col gap-4 relative overflow-hidden">
                    <div className="flex-1 bg-navy-800 rounded-2xl relative overflow-hidden flex items-center justify-center border-4 border-navy-900/10">
                      {/* Fake video feed overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
                      <UserCheck className="w-32 h-32 text-white/20 z-0" />
                      
                      {/* Face outline guide */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-white/50 rounded-[3rem] z-20"></div>
                      
                      {/* Instruction overlay */}
                      <div className="absolute bottom-6 left-0 right-0 text-center z-30 px-4">
                        <div className="bg-navy-900/80 backdrop-blur text-white text-sm font-bold py-2 px-4 rounded-full inline-block shadow-lg">
                          Vire lentamente para a esquerda
                        </div>
                      </div>
                    </div>

                    {/* Thumbnails */}
                    <div className="grid grid-cols-3 gap-2 h-20 shrink-0">
                      <div className="bg-white rounded-xl border-2 border-success-500 flex flex-col items-center justify-center relative overflow-hidden">
                        <UserCheck className="w-8 h-8 text-muted/30" />
                        <div className="absolute bottom-1 bg-success-500 text-white text-[9px] font-bold px-1.5 rounded-full flex items-center gap-0.5">
                          Frontal <Check className="w-2 h-2" />
                        </div>
                      </div>
                      <div className="bg-brand-50 rounded-xl border-2 border-brand-500 flex flex-col items-center justify-center relative">
                        <UserCheck className="w-8 h-8 text-brand-300" />
                        <div className="absolute bottom-1 bg-brand-500 text-white text-[9px] font-bold px-1.5 rounded-full">Esquerdo</div>
                      </div>
                      <div className="bg-white rounded-xl border border-surface-200 flex flex-col items-center justify-center opacity-50">
                        <UserCheck className="w-8 h-8 text-muted/30" />
                        <div className="absolute bottom-1 bg-surface-200 text-muted text-[9px] font-bold px-1.5 rounded-full">Direito</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ═══ 11. DASHBOARD MANAGEMENT SECTION ═══ */}
        <section id="gestao" className="py-24 bg-white scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-h2 font-heading text-navy-900 mb-16">Acompanhe tudo em um único painel</h2>
            
            <div className="mockup-browser bg-white rounded-2xl shadow-elevated border border-surface-200 overflow-hidden max-w-6xl mx-auto">
              <div className="mockup-browser-bar bg-surface-100 flex items-center px-4 py-3 border-b border-surface-200 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
              </div>
              <div className="bg-surface-50 p-8 text-left">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h3 className="font-heading font-bold text-2xl text-navy-900">Olá, Dr. Roberto 👋</h3>
                    <p className="text-muted mt-1">Aqui está o resumo do seu escritório hoje, 06 de Agosto.</p>
                  </div>
                  <button className="btn-primary">Novo Pacote</button>
                </div>

                <div className="grid grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex flex-col gap-2">
                    <div className="text-sm font-semibold text-muted flex items-center gap-2"><FileText className="w-4 h-4" /> Documentos</div>
                    <div className="text-3xl font-bold text-navy-900">142</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex flex-col gap-2">
                    <div className="text-sm font-semibold text-muted flex items-center gap-2"><Users className="w-4 h-4" /> Clientes</div>
                    <div className="text-3xl font-bold text-navy-900">87</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex flex-col gap-2">
                    <div className="text-sm font-semibold text-muted flex items-center gap-2"><Layers className="w-4 h-4" /> Pacotes Mês</div>
                    <div className="text-3xl font-bold text-brand-600">45/60</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-surface-200 shadow-sm flex flex-col gap-2">
                    <div className="text-sm font-semibold text-muted flex items-center gap-2"><Clock className="w-4 h-4" /> Pendentes</div>
                    <div className="text-3xl font-bold text-amber-500">12</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-surface-100 flex justify-between items-center bg-surface-50">
                    <h4 className="font-bold text-navy-900">Envios Recentes</h4>
                    <span className="text-brand-600 text-sm font-semibold cursor-pointer">Ver todos</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-surface-50/50 text-muted border-b border-surface-100">
                      <tr>
                        <th className="text-left font-semibold py-3 px-5">Título / Referência</th>
                        <th className="text-left font-semibold py-3 px-5">Cliente principal</th>
                        <th className="text-left font-semibold py-3 px-5">Data de Envio</th>
                        <th className="text-left font-semibold py-3 px-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      <tr className="hover:bg-surface-50 transition-colors">
                        <td className="py-4 px-5 font-medium text-navy-900 flex items-center gap-3"><Layers className="w-4 h-4 text-brand-500"/> Acordo Extrajudicial - Processo X</td>
                        <td className="py-4 px-5 text-muted">Carlos Eduardo Alves</td>
                        <td className="py-4 px-5 text-muted">Hoje, 10:45</td>
                        <td className="py-4 px-5"><span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200/50">Pendente (1/2)</span></td>
                      </tr>
                      <tr className="hover:bg-surface-50 transition-colors">
                        <td className="py-4 px-5 font-medium text-navy-900 flex items-center gap-3"><FileText className="w-4 h-4 text-brand-500"/> Contrato de Prestação de Serviços</td>
                        <td className="py-4 px-5 text-muted">Empresa Alfa Ltda</td>
                        <td className="py-4 px-5 text-muted">Ontem, 16:20</td>
                        <td className="py-4 px-5"><span className="px-2.5 py-1 bg-success-50 text-success-700 text-xs font-bold rounded-full border border-success-200/50">Concluído</span></td>
                      </tr>
                      <tr className="hover:bg-surface-50 transition-colors">
                        <td className="py-4 px-5 font-medium text-navy-900 flex items-center gap-3"><Layers className="w-4 h-4 text-brand-500"/> Kit Inicial Trabalhista</td>
                        <td className="py-4 px-5 text-muted">Juliana Santos</td>
                        <td className="py-4 px-5 text-muted">04/08/2026</td>
                        <td className="py-4 px-5"><span className="px-2.5 py-1 bg-success-50 text-success-700 text-xs font-bold rounded-full border border-success-200/50">Concluído</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 12. MOBILE EXPERIENCE SECTION ═══ */}
        <section id="mobile" className="py-24 bg-surface-50 overflow-hidden scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
            <div className="text-overline text-brand-700 font-bold tracking-widest mb-4">SIMPLES PARA QUEM ASSINA</div>
            <h2 className="text-h2 font-heading text-navy-900 mb-5">Um link. Cinco etapas. Nenhum aplicativo.</h2>
            <p className="text-body-lg text-muted max-w-2xl mx-auto">
              O cliente recebe, visualiza, confirma sua presença, assina e conclui tudo diretamente pelo navegador do celular.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm font-semibold text-navy-900 mt-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-white border border-surface-200 px-4 py-2"><Check className="w-4 h-4 text-success-500" /> Sem aplicativo</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white border border-surface-200 px-4 py-2"><Check className="w-4 h-4 text-success-500" /> Fluxo guiado</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white border border-surface-200 px-4 py-2"><Check className="w-4 h-4 text-success-500" /> Confirmação imediata</span>
            </div>
          </div>

          <div className="flex justify-start md:justify-center gap-4 md:gap-8 overflow-x-auto pb-8 px-4 sm:px-6 lg:px-8 snap-x snap-mandatory hide-scrollbar">
            
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-4 shrink-0 snap-center">
              <div className="w-[200px] h-[400px] bg-white rounded-[2rem] shadow-card border-4 border-surface-200 overflow-hidden relative">
                <div className="bg-[#075E54] text-white p-3 font-semibold text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><UserCheck className="w-3 h-3" /></div>
                  Dr. Roberto
                </div>
                <div className="bg-[#E5DDD5] h-full p-3 flex flex-col gap-2">
                  <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm text-xs max-w-[85%]">
                    Olá! O Dr. Roberto enviou um pacote de documentos para sua assinatura via AssinaJur.
                  </div>
                  <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm text-xs max-w-[85%] text-brand-600 underline">
                    https://assinajur.com/link-seguro-123
                  </div>
                </div>
              </div>
              <span className="font-semibold text-navy-900 text-sm">1. Recebe o link</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-4 shrink-0 snap-center relative">
              <ArrowRight className="absolute -left-6 top-[200px] text-surface-300 hidden md:block" />
              <div className="w-[200px] h-[400px] bg-white rounded-[2rem] shadow-card border-4 border-surface-200 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-surface-100 flex justify-center"><div className="w-6 h-6 bg-brand-600 text-white rounded font-bold text-[10px] flex items-center justify-center">AJ</div></div>
                <div className="p-4 flex-1 flex flex-col">
                  <h4 className="font-bold text-sm mb-2">Contrato de Honorários</h4>
                  <div className="flex-1 bg-surface-50 border border-surface-200 rounded p-2 overflow-hidden relative">
                    <div className="w-full h-1 bg-surface-200 rounded mb-2"></div>
                    <div className="w-3/4 h-1 bg-surface-200 rounded mb-2"></div>
                    <div className="w-full h-1 bg-surface-200 rounded mb-2"></div>
                    <div className="w-5/6 h-1 bg-surface-200 rounded mb-2"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
                  </div>
                  <div className="mt-3 bg-brand-600 text-white text-xs text-center py-2 rounded-lg font-semibold">Li e concordo</div>
                </div>
              </div>
              <span className="font-semibold text-navy-900 text-sm">2. Visualiza</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-4 shrink-0 snap-center relative">
              <ArrowRight className="absolute -left-6 top-[200px] text-surface-300 hidden md:block" />
              <div className="w-[200px] h-[400px] bg-white rounded-[2rem] shadow-card border-4 border-surface-200 overflow-hidden flex flex-col">
                <div className="p-3 bg-surface-50 border-b border-surface-100 text-center font-bold text-[10px]">Prova de Presença</div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex-1 bg-navy-800 rounded-xl relative flex items-center justify-center">
                    <div className="w-20 h-28 border border-dashed border-white/50 rounded-[2rem]"></div>
                  </div>
                  <div className="bg-brand-600 text-white text-xs text-center py-2 rounded-lg font-semibold flex items-center justify-center gap-1"><Camera className="w-3 h-3"/> Capturar</div>
                </div>
              </div>
              <span className="font-semibold text-navy-900 text-sm">3. Prova de presença</span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-4 shrink-0 snap-center relative">
              <ArrowRight className="absolute -left-6 top-[200px] text-surface-300 hidden md:block" />
              <div className="w-[200px] h-[400px] bg-white rounded-[2rem] shadow-card border-4 border-surface-200 overflow-hidden flex flex-col">
                <div className="p-3 bg-surface-50 border-b border-surface-100 text-center font-bold text-[10px]">Assinatura</div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-xs text-center mb-4 text-muted">Desenhe sua assinatura abaixo</div>
                  <div className="flex-1 bg-surface-50 border border-dashed border-surface-300 rounded-xl flex items-center justify-center relative">
                    <span className="font-signature text-2xl text-navy-900 transform -rotate-6">R. Almeida</span>
                  </div>
                  <div className="mt-4 bg-brand-600 text-white text-xs text-center py-2 rounded-lg font-semibold">Finalizar</div>
                </div>
              </div>
              <span className="font-semibold text-navy-900 text-sm">4. Assina</span>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center gap-4 shrink-0 snap-center relative">
              <ArrowRight className="absolute -left-6 top-[200px] text-surface-300 hidden md:block" />
              <div className="w-[200px] h-[400px] bg-white rounded-[2rem] shadow-card border-4 border-surface-200 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-success-500" />
                </div>
                <h4 className="font-bold text-navy-900 mb-2">Assinatura Concluída!</h4>
                <p className="text-[10px] text-muted">O documento foi assinado com sucesso. Uma cópia será enviada para o seu email.</p>
              </div>
              <span className="font-semibold text-navy-900 text-sm">5. Confirmação</span>
            </div>

          </div>
        </section>

        {/* ═══ 13. DIFFERENTIALS SECTION ═══ */}
        <section className="py-24 bg-white scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-h2 font-heading text-navy-900 mb-16 text-center max-w-3xl mx-auto">Tudo o que seu escritório precisa em uma única plataforma</h2>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Category 1: Envio & Organização */}
              <div className="bg-surface-50 rounded-3xl p-8 border border-surface-200 hover:border-brand-300 transition-colors">
                <h3 className="font-heading font-bold text-xl text-navy-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600"><Layers className="w-5 h-5"/></div>
                  Envio & Organização
                </h3>
                <ul className="space-y-5">
                  <li className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-brand-700"/></div>
                    <div>
                      <h4 className="font-semibold text-navy-900">Vários documentos num pacote</h4>
                      <p className="text-sm text-muted">Agrupe contrato, procuração e anexos em um só link.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-brand-700"/></div>
                    <div>
                      <h4 className="font-semibold text-navy-900">Cadastro único do cliente</h4>
                      <p className="text-sm text-muted">Cadastre uma vez, reutilize em todos os documentos futuros.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3 h-3 text-brand-700"/></div>
                    <div>
                      <h4 className="font-semibold text-navy-900">Modelos reutilizáveis</h4>
                      <p className="text-sm text-muted">Salve seus textos padrão e gere documentos em segundos.</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Category 2: Identificação & Presença (Dark) */}
              <div className="card-navy rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="font-heading font-bold text-xl text-white mb-8 flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-white/10 rounded-lg text-brand-400"><UserCheck className="w-5 h-5"/></div>
                  Identificação & Presença
                </h3>
                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <Camera className="w-6 h-6 text-brand-400 mb-3" />
                    <h4 className="font-semibold text-white text-sm mb-1">Prova de presença</h4>
                    <p className="text-xs text-slate-400">Captura de 3 ângulos faciais</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <PenTool className="w-6 h-6 text-brand-400 mb-3" />
                    <h4 className="font-semibold text-white text-sm mb-1">Assinatura gráfica</h4>
                    <p className="text-xs text-slate-400">Desenho da rubrica na tela</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <Monitor className="w-6 h-6 text-brand-400 mb-3" />
                    <h4 className="font-semibold text-white text-sm mb-1">Geolocalização</h4>
                    <p className="text-xs text-slate-400">Localização informada pelo dispositivo, quando autorizada</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <Lock className="w-6 h-6 text-brand-400 mb-3" />
                    <h4 className="font-semibold text-white text-sm mb-1">IP e Dispositivo</h4>
                    <p className="text-xs text-slate-400">Dados do aparelho utilizado</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Category 3: Segurança */}
              <div className="lg:col-span-2 bg-surface-50 rounded-3xl p-8 border border-surface-200">
                <h3 className="font-heading font-bold text-xl text-navy-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600"><Shield className="w-5 h-5"/></div>
                  Segurança & Integridade
                </h3>
                <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-surface-100">
                    <Lock className="w-5 h-5 text-brand-600 shrink-0" />
                    <span className="font-semibold text-sm">Hash SHA-256</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-surface-100">
                    <Search className="w-5 h-5 text-brand-600 shrink-0" />
                    <span className="font-semibold text-sm">Trilha de eventos</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-surface-100">
                    <QrCode className="w-5 h-5 text-brand-600 shrink-0" />
                    <span className="font-semibold text-sm">QR Code de validação</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-surface-100">
                    <FileCheck2 className="w-5 h-5 text-brand-600 shrink-0" />
                    <span className="font-semibold text-sm">Página pública de verificação</span>
                  </div>
                </div>
              </div>

              {/* Category 4: Experiência */}
              <div className="bg-surface-50 rounded-3xl p-8 border border-surface-200">
                <h3 className="font-heading font-bold text-xl text-navy-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600"><Building2 className="w-5 h-5"/></div>
                  Experiência
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm font-semibold text-navy-900">
                     <div className="w-2 h-2 rounded-full bg-brand-500"></div> Identidade visual do escritório
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-navy-900">
                     <div className="w-2 h-2 rounded-full bg-brand-500"></div> Gestão de equipe
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-navy-900">
                     <div className="w-2 h-2 rounded-full bg-brand-500"></div> Acompanhamento em tempo real
                  </li>
                  <li className="flex items-center gap-3 text-sm font-semibold text-navy-900">
                     <div className="w-2 h-2 rounded-full bg-brand-500"></div> Certificado de evidências unificado
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </section>

        {/* ═══ 14. SECURITY SECTION ═══ */}
        <section id="seguranca" className="py-24 bg-surface-50 scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-h2 font-heading text-navy-900 mb-16 text-center">Segurança em cada etapa do documento</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="card-surface p-6">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2">Integridade</h3>
                <p className="text-sm text-muted">Hash SHA-256 gerado e vinculado matematicamente ao documento original, garantindo que o conteúdo não foi alterado após a assinatura.</p>
              </div>
              
              <div className="card-surface p-6">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2">Rastreabilidade</h3>
                <p className="text-sm text-muted">Trilha completa de eventos registrando IP, tipo de dispositivo, navegador e horário exato de cada interação com o documento.</p>
              </div>

              <div className="card-surface p-6">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2">Identificação</h3>
                <p className="text-sm text-muted">Vinculação direta do CPF informado com a prova de presença facial do signatário no momento exato da assinatura eletrônica.</p>
              </div>

              <div className="card-surface p-6">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2">Evidências</h3>
                <p className="text-sm text-muted">Captura de fotos em proporção 4:3, registro de geolocalização e captura da assinatura gráfica para compor o lastro probatório.</p>
              </div>

              <div className="card-surface p-6">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2">Validação</h3>
                <p className="text-sm text-muted">QR Code impresso no certificado e página pública de consulta para verificação independente da autenticidade por terceiros.</p>
              </div>

              <div className="card-surface p-6">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-navy-900 mb-2">Controle de acesso</h3>
                <p className="text-sm text-muted">Geração de links únicos e criptografados com tokens temporários por documento, restritos apenas às partes envolvidas no processo.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 15. PRICING SECTION ═══ */}
        <section id="precos" className="py-24 bg-white scroll-reveal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-h2 font-heading text-navy-900 mb-4">Escolha o plano ideal para seu escritório</h2>
              <p className="text-body-sm text-muted max-w-2xl mx-auto">Valores acessíveis sem taxas escondidas, sem multa de fidelidade e sem cobrança automática. Teste antes e escolha com tranquilidade.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
              
              {/* Essencial */}
              <div className="card-base p-8 flex flex-col h-full bg-white">
                <h3 className="font-bold text-navy-900 text-lg mb-2">Essencial</h3>
                <p className="text-sm text-muted mb-6 h-10">Para advogados autônomos que estão iniciando a digitalização.</p>
                <div className="mb-6">
                  <span className="text-3xl font-heading font-extrabold text-navy-900">R$ 39,90</span><span className="text-muted">/mês</span>
                </div>
                <Link href={getWhatsAppLink(SOLO_PLAN_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="block text-center w-full py-3 px-4 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition-colors mb-8">
                  Contratar Essencial
                </Link>
                <ul className="space-y-4 text-sm font-medium flex-1">
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> 30 documentos/mês</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> 1 Usuário</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> Cadastro de Clientes</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> Prova de presença</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> Certificado de Evidências</li>
                </ul>
              </div>

              {/* Profissional (Highlighted) */}
              <div className="card-base p-8 flex flex-col h-full bg-white ring-2 ring-brand-600 relative lg:scale-105 shadow-xl z-10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-overline px-4 py-1 rounded-full whitespace-nowrap">Recomendado</div>
                <h3 className="font-bold text-navy-900 text-lg mb-2">Profissional</h3>
                <p className="text-sm text-muted mb-6 h-10">Para advogados e pequenos escritórios com maior fluxo.</p>
                <div className="mb-6">
                  <span className="text-3xl font-heading font-extrabold text-brand-600">R$ 69,90</span><span className="text-muted">/mês</span>
                </div>
                <Link href={getWhatsAppLink(PRO_PLAN_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center py-3 mb-8">
                  Contratar Profissional
                </Link>
                <ul className="space-y-4 text-sm font-medium flex-1">
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-600 shrink-0"/> 60 documentos/mês</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-600 shrink-0"/> Até 3 Usuários</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-600 shrink-0"/> Todos os recursos Essencial</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-600 shrink-0"/> Marca do escritório</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-600 shrink-0"/> Suporte prioritário</li>
                </ul>
              </div>

              {/* Escritório */}
              <div className="card-base p-8 flex flex-col h-full bg-white">
                <h3 className="font-bold text-navy-900 text-lg mb-2">Escritório</h3>
                <p className="text-sm text-muted mb-6 h-10">Para escritórios em crescimento com equipes.</p>
                <div className="mb-6">
                  <span className="text-3xl font-heading font-extrabold text-navy-900">R$ 99,90</span><span className="text-muted">/mês</span>
                </div>
                <Link href={getWhatsAppLink(OFFICE_PLAN_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="block text-center w-full py-3 px-4 bg-surface-100 text-navy-900 font-semibold rounded-xl hover:bg-surface-200 transition-colors mb-8">
                  Contratar Escritório
                </Link>
                <ul className="space-y-4 text-sm font-medium flex-1">
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> 150 documentos/mês</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> Até 5 Usuários</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> Todos do Profissional</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> Gestão de permissões</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-success-500 shrink-0"/> Suporte Comercial dedicado</li>
                </ul>
              </div>

              {/* Sob Medida */}
              <div className="card-navy p-8 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl pointer-events-none"></div>
                <h3 className="font-bold text-white text-lg mb-2 relative z-10">Sob Medida</h3>
                <p className="text-sm text-slate-400 mb-6 h-10 relative z-10">Para bancadas jurídicas ou demandas volumosas.</p>
                <div className="mb-6 relative z-10">
                  <span className="text-2xl font-heading font-bold text-white">Consulte-nos</span>
                </div>
                <Link href={getWhatsAppLink(ENTERPRISE_WHATSAPP_MESSAGE)} target="_blank" rel="noopener noreferrer" className="block text-center w-full py-3 px-4 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors mb-8 relative z-10">
                  Falar com consultor
                </Link>
                <ul className="space-y-4 text-sm font-medium flex-1 text-slate-300 relative z-10">
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-400 shrink-0"/> Pacotes personalizados</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-400 shrink-0"/> Múltiplas filiais / OABs</li>
                  <li className="flex items-center gap-3"><Check className="w-4 h-4 text-brand-400 shrink-0"/> Atendimento consultivo</li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* ═══ 16. FAQ ACCORDION ═══ */}
        <section id="faq" className="py-24 bg-surface-50 scroll-reveal">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-h2 font-heading text-navy-900 mb-12 text-center">Perguntas frequentes</h2>
            
            <div className="space-y-4">
              {[
                { q: 'A assinatura tem validade jurídica?', a: 'Sim. Respaldada pela MP 2.200-2/2001 (Art. 10, §2º) e Lei 14.063/2020, com registro de IP, geolocalização, prova de presença e hash SHA-256.' },
                { q: 'O cliente precisa instalar aplicativo?', a: 'Não. Todo o fluxo acontece no navegador do celular ou computador através de um link seguro.' },
                { q: 'Funciona pelo celular?', a: 'Sim. Otimizado para Android (Chrome) e iPhone (Safari).' },
                { q: 'Posso enviar vários documentos juntos?', a: 'Sim. Reúna contrato, procuração e declarações em um único pacote enviado por um link só.' },
                { q: 'Como funciona a prova de presença?', a: 'A câmera guia o cliente para 3 fotos (frontal, perfil esquerdo, perfil direito) na proporção 4:3 com detecção facial.' },
                { q: 'Como validar o documento?', a: 'Escaneie o QR Code do certificado ou acesse a página pública de verificação no site.' },
                { q: 'O certificado acompanha o PDF?', a: 'Sim. As evidências (fotos, hashes, QR Code) são compiladas no final do PDF.' },
                { q: 'Posso personalizar com minha marca?', a: 'Sim. Configure nome, contato e identidade visual do escritório no plano Profissional ou superior.' },
                { q: 'Como funciona o teste gratuito?', a: 'Cadastre-se sem cartão de crédito e receba 5 pacotes gratuitos para usar em até 30 dias.' },
                { q: 'Existe cobrança automática?', a: 'Não. Após o teste você escolhe um plano. Sem cobrança automática ou multas.' }
              ].map((faq, idx) => (
                <div key={idx} className="card-base bg-white overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none"
                  >
                    <span className="font-bold text-navy-900">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-muted transition-transform duration-300 shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  <div 
                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out border-surface-100 ${openFaq === idx ? 'max-h-40 pb-5 border-t pt-4 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="text-muted text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 17. CTA FINAL ═══ */}
        <section className="gradient-cta py-20 scroll-reveal">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-h2 font-heading text-white mb-6">Sua rotina jurídica pode ser mais simples.</h2>
            <p className="text-body text-slate-300 mb-10 max-w-2xl mx-auto">Comece agora com 5 pacotes gratuitos e descubra como o AssinaJur pode organizar seu escritório.</p>
            
            <div className="flex flex-col items-center gap-4">
              <Link href="/register" className="btn-primary bg-white text-navy-900 hover:bg-slate-100 hover:text-navy-900 px-8 py-4 text-lg">
                Começar gratuitamente
              </Link>
              <div className="text-caption text-slate-400 font-medium">
                Sem cartão • 5 pacotes gratuitos • 30 dias para testar
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ═══ 18. FOOTER ═══ */}
      <footer className="bg-navy-900 text-white pt-16 pb-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-16">
            
            <div className="col-span-2 md:col-span-1 lg:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-6 inline-flex">
                <div className="w-10 h-10 bg-white text-navy-900 rounded-xl flex items-center justify-center font-heading font-extrabold text-lg">
                  AJ
                </div>
                <span className="font-heading font-extrabold text-xl">
                  AssinaJur
                </span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
                Plataforma completa de assinatura eletrônica e gestão de documentos para o mercado jurídico brasileiro.
              </p>
              <div className="text-white font-semibold text-sm">
                WhatsApp: {COMMERCIAL_WHATSAPP_FORMATTED}
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-slate-300">Produto</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="#assinatura" className="hover:text-white transition-colors">Assinaturas</Link></li>
                <li><Link href="#pacotes" className="hover:text-white transition-colors">Pacotes</Link></li>
                <li><Link href="#prova-presenca" className="hover:text-white transition-colors">Prova de presença</Link></li>
                <li><Link href="#certificado" className="hover:text-white transition-colors">Certificado</Link></li>
                <li><Link href="#validacao" className="hover:text-white transition-colors">Validação</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-slate-300">Soluções</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><Link href="#advogados" className="hover:text-white transition-colors">Advogados</Link></li>
                <li><Link href="#escritorios" className="hover:text-white transition-colors">Escritórios</Link></li>
                <li><Link href="#departamentos" className="hover:text-white transition-colors">Jurídico empresarial</Link></li>
                <li><Link href="#imobiliarias" className="hover:text-white transition-colors">Imobiliárias</Link></li>
                <li><Link href="#empresas" className="hover:text-white transition-colors">Empresas</Link></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-2 lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-8">
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-slate-300">Empresa</h4>
                <ul className="space-y-4 text-sm text-slate-400">
                  <li><Link href="#sobre" className="hover:text-white transition-colors">Sobre</Link></li>
                  <li><Link href="#seguranca" className="hover:text-white transition-colors">Segurança</Link></li>
                  <li><Link href="#precos" className="hover:text-white transition-colors">Preços</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-6 text-sm uppercase tracking-wider text-slate-300">Legal & Suporte</h4>
                <ul className="space-y-4 text-sm text-slate-400">
                  <li><Link href="/termos" className="hover:text-white transition-colors">Termos de uso</Link></li>
                  <li><Link href="/privacidade" className="hover:text-white transition-colors">Política de privacidade</Link></li>
                  <li><Link href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</Link></li>
                </ul>
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-white/10 text-center flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-caption text-slate-500">
              © 2026 AssinaJur. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
