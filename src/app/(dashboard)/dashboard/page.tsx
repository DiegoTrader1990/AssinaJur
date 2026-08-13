'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSignature,
  FolderPlus,
  Plus,
  Send,
  Sparkles,
  Folder,
  User,
  ShieldCheck,
  Zap,
  MessageSquare,
  AlertTriangle,
  FileText,
  Building2,
  Lock,
} from 'lucide-react';

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value)) : 'Sem prazo';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([userData, officeData, clientData, documentData, processData]) => {
        if (userData?.user) setCurrentUser(userData.user);
        if (officeData?.office) setOffice(officeData.office);
        setClients(clientData?.clients || []);
        setDocuments(documentData?.documents || []);
        setProcesses(processData?.processes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pendingDocuments = useMemo(
    () => documents.filter((document) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(document.status)),
    [documents],
  );
  const completedDocuments = useMemo(() => documents.filter((document) => document.status === 'CONCLUIDO'), [documents]);

  const totalProcessFiles = useMemo(() => {
    return processes.reduce((acc, p) => acc + (p.documents?.length || 0) + (p.attachments?.length || 0), 0);
  }, [processes]);

  const metricValue = (value: number) => (loading ? '—' : String(value).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-8 pb-12">
      {/* BANNER INSTITUCIONAL E DE BOAS-VINDAS EXECUTIVO */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#071B3A] via-[#0C2A54] to-[#071B3A] text-white p-7 lg:p-10 shadow-[0_20px_50px_rgba(7,27,58,0.22)] border border-slate-700/50">
        {/* Detalhes Visuais Gold Luxury */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#D4AF37] bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 rounded-full flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                {office?.name || 'Rodrigues & Soares Advocacia'}
              </span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Hash ICP-Brasil • Validade Jurídica
              </span>
            </div>

            <h1 className="font-heading text-2xl lg:text-3xl font-black tracking-tight text-white">
              Painel do Escritório • {currentUser?.name ? currentUser.name : 'Dr. Diego & Dra. Dominick'}
            </h1>
            <p className="text-xs lg:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bem-vindo ao AssinaJur. Gestão centralizada de assinaturas digitais, dossiês estilo Windows Explorer e formalização rápida de clientes.
            </p>
          </div>

          {/* AÇÕES DE DESTAQUE NA HEADER */}
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/kits/enviar"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#C59B27] px-5 py-3.5 text-xs font-black text-[#071B3A] shadow-md hover:brightness-110 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" /> Kit Jurídico Expresso
            </Link>
            <Link
              href="/documentos/novo"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 px-5 py-3.5 text-xs font-extrabold text-white transition-all backdrop-blur-md hover:scale-[1.02]"
            >
              <Send className="h-4 w-4 text-[#D4AF37]" /> Nova Assinatura
            </Link>
          </div>
        </div>

        {/* METRICAS OPERACIONAIS DIRETA */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 pt-7 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#D4AF37]">Clientes na Base</p>
            <p className="text-2xl lg:text-3xl font-black font-heading text-white mt-1">{metricValue(clients.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">cadastros do escritório</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Em Assinatura</p>
            <p className="text-2xl lg:text-3xl font-black font-heading text-amber-300 mt-1">{metricValue(pendingDocuments.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">aguardando clientes</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300">Dossiês de Processos</p>
            <p className="text-2xl lg:text-3xl font-black font-heading text-white mt-1">{metricValue(processes.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">{totalProcessFiles} arquivos organizados</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">Assinaturas Concluídas</p>
            <p className="text-2xl lg:text-3xl font-black font-heading text-emerald-400 mt-1">{metricValue(completedDocuments.length)}</p>
            <p className="text-[11px] text-slate-300 mt-0.5">com prova e audit trail</p>
          </div>
        </div>
      </section>

      {/* SEÇÃO 1: OS 4 PILARES DO SISTEMA (ATALHOS INTUITIVOS DE ALTA CLAREZA) */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">
            Central de Acesso Rápido
          </p>
          <h2 className="text-xl font-black font-heading text-[#071B3A] mt-0.5">
            O que você deseja fazer agora no escritório?
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: ENVIAR ASSINATURA */}
          <Link
            href="/documentos/novo"
            className="group bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 p-6 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs mb-4">
                <FileSignature className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-black text-[#071B3A] text-base group-hover:text-emerald-700 transition-colors">
                Nova Assinatura Digital
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Envie contratos e procurações diretamente para o WhatsApp do cliente para assinar no celular.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-emerald-700">
              <span>Iniciar Envio</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* CARD 2: PASTA DE PROCESSOS (WINDOWS EXPLORER) */}
          <Link
            href="/processos"
            className="group bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-400 p-6 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-xs mb-4">
                <Folder className="w-6 h-6 text-amber-600 fill-amber-500/30" />
              </div>
              <h3 className="font-heading font-black text-[#071B3A] text-base group-hover:text-amber-700 transition-colors">
                Dossiês &amp; Windows Explorer
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Organize pastas de processos estilo Windows, envie PDFs por drag &amp; drop e renomeie arquivos.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-amber-700">
              <span>Abrir Pastas 📁</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* CARD 3: KIT JURÍDICO EXPRESSO */}
          <Link
            href="/kits/enviar"
            className="group bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 p-6 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-xs mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-heading font-black text-[#071B3A] text-base group-hover:text-blue-700 transition-colors">
                Kit Jurídico Expresso
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Gere Procuração, Contrato de Honorários e Hipossuficiência em um único envio de 10 segundos.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-blue-700">
              <span>Preparar Kit ✨</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* CARD 4: NOVO CLIENTE */}
          <Link
            href="/clientes?novo=true"
            className="group bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-400 p-6 rounded-3xl transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-xs mb-4">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-heading font-black text-[#071B3A] text-base group-hover:text-indigo-700 transition-colors">
                Cadastrar Nova Cliente
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Adicione a cliente na base com dados completos de qualificação, CPF, endereço e representante.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-indigo-700">
              <span>Novo Cadastro</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* SEÇÃO 2: ASSINATURAS PENDENTES & DOSSIÊS ATIVOS (VISÃO EM TEMPO REAL) */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* COLUNA ESQUERDA: ASSINATURAS PENDENTES PARA COBRANÇA */}
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                  Acompanhamento de Formalizações
                </p>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Assinaturas Pendentes dos Clientes
                </h3>
              </div>
              <Link href="/documentos" className="text-xs font-bold text-blue-700 hover:underline">
                Ver todas ({pendingDocuments.length})
              </Link>
            </div>

            {pendingDocuments.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-2">
                {pendingDocuments.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <h4 className="text-xs font-extrabold text-[#071B3A] truncate">{doc.title}</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {doc.client?.name || 'Cliente pendente'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {(doc.client?.phone || doc.client?.whatsapp) && (
                        <a
                          href={`https://wa.me/55${(doc.client?.phone || doc.client?.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Olá! Lembrando da assinatura pendente do documento "${doc.title}". Link para assinar direto no celular: https://www.assinajur.com.br/assinar/${doc.token}`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                      <Link
                        href="/documentos"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#071B3A] rounded-xl text-xs font-bold"
                      >
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-[#071B3A]">Nenhuma assinatura pendente no momento.</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Todos os documentos enviados até agora foram concluídos pelos clientes com sucesso.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/documentos/novo"
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-xs font-extrabold text-[#071B3A] flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4 text-[#D4AF37]" /> Enviar Novo Documento para Assinatura
            </Link>
          </div>
        </div>

        {/* COLUNA DIREITA: DOSSIÊS DO WINDOWS EXPLORER */}
        <div className="bg-[#FBFCFE] border border-slate-200 rounded-[32px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#B68B1C]">
                  Windows Explorer
                </p>
                <h3 className="font-heading font-black text-[#071B3A] text-lg mt-0.5">
                  Dossiês Ativos de Processos
                </h3>
              </div>
              <Link href="/processos" className="text-xs font-bold text-blue-700 hover:underline">
                Abrir Central 📁
              </Link>
            </div>

            <div className="space-y-3 mt-4">
              {processes.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href="/processos"
                  className="group flex items-center justify-between bg-white border border-slate-200 hover:border-amber-400 p-3.5 rounded-2xl shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center shrink-0">
                      <Folder className="w-5.5 h-5.5 text-amber-600 fill-amber-500/30" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-[#071B3A] truncate">{p.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        {p.client?.name || 'Cliente'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full shrink-0">
                    {(p.documents?.length || 0) + (p.attachments?.length || 0)} PDFs
                  </span>
                </Link>
              ))}

              {!processes.length && (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Folder className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Nenhum processo ativo no momento.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 mt-4">
            <Link
              href="/processos"
              className="w-full py-3 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 rounded-2xl text-xs font-extrabold text-amber-900 flex items-center justify-center gap-2 transition-all"
            >
              <Folder className="w-4 h-4 text-amber-600 fill-amber-500/30" /> Navegar pelas Pastas dos Processos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
