import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check, FileText, Layers, MoveUpRight, PenLine } from 'lucide-react';
import { COMMERCIAL_WHATSAPP_FORMATTED, getWhatsAppLink } from '@/lib/constants';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'AssinaJur — Documentos e assinaturas para a advocacia',
  description: 'Prepare documentos e kits jurídicos, envie para assinatura pelo celular e acompanhe cada etapa em um só lugar.',
};

const steps = [
  { number: '01', title: 'Prepare', text: 'Cadastre o cliente, escolha seus modelos e reúna os documentos em um kit.' },
  { number: '02', title: 'Envie', text: 'Revise o conteúdo, organize os participantes e compartilhe o link de assinatura.' },
  { number: '03', title: 'Acompanhe', text: 'Confira as evidências recebidas e acompanhe o andamento de cada envio.' },
];

export default function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#conteudo">Ir para o conteúdo</a>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="AssinaJur, início"><span className={styles.monogram}>AJ</span>AssinaJur</Link>
        <nav aria-label="Navegação principal" className={styles.nav}>
          <a className={styles.desktopLink} href="#como-funciona">Como funciona</a>
          <a className={styles.desktopLink} href="#duvidas">Dúvidas</a>
          <Link href="/login" className={styles.login}>Entrar <MoveUpRight size={15} aria-hidden="true" /></Link>
        </nav>
      </header>
      <main id="conteudo">
        <section className={styles.hero} aria-labelledby="titulo">
          <div className={styles.intro}>
            <p className={styles.eyebrow}>DOCUMENTOS E ASSINATURAS · ADVOCACIA</p>
            <h1 id="titulo">Seu escritório.<br />Seus documentos.<br /><em>Tudo no lugar.</em></h1>
            <p className={styles.lead}>Da preparação da procuração à coleta de assinaturas. Organize os documentos do cliente e acompanhe cada envio em um só lugar.</p>
            <div className={styles.actions}>
              <Link href="/register" className={styles.primary}>Conhecer na prática <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className={styles.textLink}>Conversar com a equipe</a>
            </div>
            <p className={styles.note}>O cliente acessa o link pelo navegador, sem instalar aplicativo.</p>
          </div>
          <figure className={styles.preview} aria-label="Exemplo ilustrativo de organização de um kit jurídico">
            <div className={styles.previewTop}><span><span className={styles.dot} /> ÁREA DO ESCRITÓRIO</span><span>AssinaJur</span></div>
            <div className={styles.previewBody}>
              <div className={styles.previewHeading}><div><p className={styles.smallLabel}>DOCUMENTOS DO CLIENTE</p><h2>Um envio. Tudo reunido.</h2></div><Layers size={25} strokeWidth={1.4} aria-hidden="true" /></div>
              <div className={styles.kitTitle}><span>Kit de contratação</span><span>03 documentos</span></div>
              {['Procuração', 'Contrato de honorários', 'Declaração de hipossuficiência'].map((title, i) => (
                <div className={styles.document} key={title}><span className={styles.documentIcon}><FileText size={20} strokeWidth={1.5} aria-hidden="true" /></span><div><strong>{title}</strong><span>Documento {String(i + 1).padStart(2, '0')}</span></div><Check size={16} className={styles.check} aria-hidden="true" /></div>
              ))}
              <div className={styles.review}><PenLine size={19} aria-hidden="true" /><div><strong>Pronto para a sua revisão</strong><p>Confira o conteúdo antes de enviar.</p></div></div>
            </div>
            <figcaption>Exemplo ilustrativo de um kit no AssinaJur</figcaption>
          </figure>
        </section>
        <div className={styles.documentTypes} aria-label="Tipos de documentos"><span>NA ROTINA DO ESCRITÓRIO</span><p>Procurações</p><span aria-hidden="true">/</span><p>Contratos</p><span aria-hidden="true">/</span><p>Declarações</p><span aria-hidden="true">/</span><p>Acordos</p></div>
        <section id="como-funciona" className={styles.workflow} aria-labelledby="fluxo-titulo">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>DO PRIMEIRO CADASTRO AO DOCUMENTO FINAL</p><h2 id="fluxo-titulo">Menos tarefas dispersas.<br />Mais clareza em cada etapa.</h2></div>
          <div className={styles.steps}>{steps.map(step => <article key={step.number}><span className={styles.stepNumber}>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
        </section>
        <section id="duvidas" className={styles.faq} aria-labelledby="duvidas-titulo">
          <div><p className={styles.eyebrow}>ANTES DE COMEÇAR</p><h2 id="duvidas-titulo">O essencial, <br />com transparência.</h2><a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className={styles.textLink}>Fale com nossa equipe <ArrowRight size={16} aria-hidden="true" /></a></div>
          <div className={styles.questions}>
            <details><summary>Como o cliente assina?<span aria-hidden="true">+</span></summary><p>Ele abre o link no celular ou computador, confere os documentos e segue as etapas de identificação e assinatura. As evidências ficam disponíveis para conferência pelo escritório.</p></details>
            <details><summary>Qual é a modalidade de assinatura?<span aria-hidden="true">+</span></summary><p>O fluxo atual utiliza assinatura eletrônica com registro de consentimento e evidências. Não é uma assinatura qualificada ICP-Brasil nem uma assinatura GOV.BR. A consulta pelo QR Code do AssinaJur não equivale à validação pelo ITI. Para uso judicial, confira as exigências aplicáveis ao caso.</p></details>
            <details><summary>Posso enviar um kit ou incluir outras pessoas?<span aria-hidden="true">+</span></summary><p>Sim. Você pode reunir documentos em um kit e configurar partes, testemunhas e assinantes a rogo, conforme a necessidade do documento. A definição dos papéis e a conferência dos poderes de representação cabem ao escritório.</p></details>
            <details><summary>Como conhecer os planos?<span aria-hidden="true">+</span></summary><p>Crie seu cadastro para conhecer a plataforma ou converse com a equipe pelo WhatsApp sobre os planos e as condições para o seu escritório.</p></details>
          </div>
        </section>
        <section className={styles.closing} aria-label="Comece a usar"><div><p className={styles.eyebrow}>ASSINAJUR</p><h2>Organize o próximo atendimento.</h2></div><Link href="/register" className={styles.lightButton}>Criar meu cadastro <ArrowRight size={18} aria-hidden="true" /></Link></section>
      </main>
      <footer className={styles.footer}><div><Link href="/" className={styles.footerBrand}>AssinaJur</Link><p>Documentos e assinaturas para a advocacia.</p></div><nav aria-label="Informações e contato"><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link><a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer">{COMMERCIAL_WHATSAPP_FORMATTED}</a></nav><span className={styles.copyright}>© {new Date().getFullYear()} AssinaJur</span></footer>
    </div>
  );
}
