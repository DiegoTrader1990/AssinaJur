'use client';

/**
 * PROPOSTA DE PAINEL — rota paralela para avaliação.
 *
 * Fica dentro do grupo (dashboard) apenas para herdar o menu lateral real.
 * NÃO altera nenhum arquivo existente e NÃO aparece no menu: só é alcançável
 * por /painel-novo. A Home real (/dashboard) continua intacta.
 *
 * Paleta dos gráficos validada por script (skill dataviz):
 *  - funil: rampa sequencial de uma hue só, L monotônica, ponta clara > 2:1
 *  - estados: crítico/atenção/bom aprovados em separação para daltonismo
 *  - teal no lugar de verde: verde x vermelho reprovava para deutan
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Clock3,
  ArrowRight,
  UserRound,
  MessageSquare,
  PauseCircle,
  CheckCircle2,
  Loader2,
  Info,
  FileUp,
  Layers,
  X,
  Search,
  ChevronDown,
  Send,
  AlertOctagon,
  AlertTriangle,
  CircleDot,
  Scale,
  Users,
  FileSignature,
  CalendarClock,
} from 'lucide-react';
import BrazilOperationsMap from '@/components/BrazilOperationsMap';
import {
  montarResumo,
  textoPrazo,
  type ResumoPainel,
  type NivelAviso,
} from '@/lib/lab/painelData';

/* Paleta validada — ver cabeçalho */
const RAMPA_FUNIL = ['#9AAAC4', '#7386A8', '#4D688F', '#28456E', '#0A1F42'];
const OURO = '#B68B1C';
const COR_CRITICO = '#E11D48';
const COR_ATENCAO = '#D97706';
const COR_BOM = '#0D9488';

function saudacao(h: number): string {
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataCurta(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
}

function dataExtensa(d: Date): string {
  const t = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ─────────────────────────── Peças ─────────────────────────── */

function Secao({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: { texto: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[.14em] text-slate-500">
            {titulo}
          </h2>
          {descricao && <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>}
        </div>
        {acao && (
          <Link
            href={acao.href}
            className="shrink-0 text-[11px] font-bold text-[#B68B1C] hover:underline"
          >
            {acao.texto}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Superfície padrão: sombra suave em vez de borda dura. */
function Painel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_2px_rgba(7,27,58,.04),0_8px_24px_-12px_rgba(7,27,58,.14)] ${className}`}
    >
      {children}
    </div>
  );
}

function Vazio({
  icone,
  titulo,
  texto,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto?: string;
}) {
  return (
    <Painel>
      <div className="flex items-start gap-3 px-4 py-5">
        <span className="mt-0.5 shrink-0 text-slate-300">{icone}</span>
        <div>
          <p className="text-sm font-bold text-slate-700">{titulo}</p>
          {texto && <p className="mt-0.5 text-xs leading-5 text-slate-500">{texto}</p>}
        </div>
      </div>
    </Painel>
  );
}

/** Indicador: rótulo, valor grande (figuras proporcionais) e contexto. */
function Indicador({
  rotulo,
  valor,
  contexto,
  icone,
  href,
  destaque,
}: {
  rotulo: string;
  valor: number;
  contexto: string;
  icone: React.ReactNode;
  href: string;
  destaque?: string;
}) {
  return (
    <Link href={href} className="group block">
      <Painel className="h-full px-4 py-4 transition group-hover:border-slate-300 group-hover:shadow-[0_2px_4px_rgba(7,27,58,.06),0_12px_28px_-12px_rgba(7,27,58,.2)]">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold text-slate-500">{rotulo}</p>
          <span className="shrink-0 text-slate-300 transition group-hover:text-[#B68B1C]">
            {icone}
          </span>
        </div>
        <p
          className="mt-2 text-3xl font-black leading-none"
          style={{ color: destaque || '#071B3A' }}
        >
          {valor}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400">{contexto}</p>
      </Painel>
    </Link>
  );
}

function SeletorCliente({
  clientes,
  valor,
  aoMudar,
}: {
  clientes: any[];
  valor: string;
  aoMudar: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes.slice(0, 40);
    return clientes
      .filter(
        (c) =>
          String(c.name || '').toLowerCase().includes(q) ||
          String(c.cpfCnpj || '').includes(q) ||
          String(c.phone || '').includes(q)
      )
      .slice(0, 40);
  }, [clientes, busca]);

  const selecionado = clientes.find((c) => c.id === valor);

  return (
    <div ref={caixaRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left transition ${
          aberto ? 'border-[#071B3A] ring-2 ring-[#071B3A]/10' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selecionado ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#071B3A] text-[11px] font-black text-[#D4AF37]">
              {String(selecionado.name || '?').charAt(0)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#071B3A]">
                {selecionado.name}
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                {selecionado.cpfCnpj || 'sem CPF'}
              </span>
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-slate-400">
            <Search className="h-3.5 w-3.5" />
            <span className="text-sm font-medium">Selecionar cliente</span>
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF ou telefone"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#071B3A]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                Nenhum cliente encontrado.
              </p>
            ) : (
              filtrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    aoMudar(c.id);
                    setAberto(false);
                    setBusca('');
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50 ${
                    valor === c.id ? 'bg-amber-50/60' : ''
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
                    {String(c.name || '?').charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-[#071B3A]">{c.name}</span>
                    <span className="block truncate text-[10px] text-slate-500">
                      {c.cpfCnpj || 'sem CPF'}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ESTILO_AVISO: Record<
  NivelAviso,
  { cor: string; icone: React.ReactNode; rotulo: string; fundo: string }
> = {
  CRITICO: {
    cor: COR_CRITICO,
    icone: <AlertOctagon className="h-3.5 w-3.5" />,
    rotulo: 'Crítico',
    fundo: 'bg-rose-50',
  },
  ATENCAO: {
    cor: COR_ATENCAO,
    icone: <AlertTriangle className="h-3.5 w-3.5" />,
    rotulo: 'Atenção',
    fundo: 'bg-amber-50',
  },
  PENDENTE: {
    cor: '#64748B',
    icone: <CircleDot className="h-3.5 w-3.5" />,
    rotulo: 'A fazer',
    fundo: 'bg-slate-100',
  },
};

/* ───────────────────────────── Página ───────────────────────────── */

export default function PainelNovoPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [escritorio, setEscritorio] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
  const [resumo, setResumo] = useState<ResumoPainel | null>(null);

  const [clienteEnvio, setClienteEnvio] = useState('');
  const [arquivos, setArquivos] = useState<{ id: string; nome: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [colunaAtiva, setColunaAtiva] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [me, esc, cli, doc, pro] = await Promise.all([
        fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (!me?.user) {
        setErro('Sessão expirada. Entre novamente para ver o painel.');
        return;
      }

      const primeiro = String(me.user.name || '').trim().split(' ')[0] || '';
      setNome(primeiro.toLowerCase().startsWith('dr') ? primeiro : primeiro ? `Dr. ${primeiro}` : '');
      setEscritorio(esc?.office?.name || '');

      const listaClientes = cli?.clients || [];
      setClientes(listaClientes);
      setResumo(
        montarResumo(
          {
            clientes: listaClientes,
            documentos: doc?.documents || [],
            processos: pro?.processes || [],
          },
          new Date()
        )
      );
    } catch {
      setErro('Não foi possível carregar os dados do escritório.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const agora = useMemo(() => new Date(), []);

  const subirArquivos = useCallback(async (lista: FileList) => {
    setErroEnvio('');
    const pdfs = Array.from(lista).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      setErroEnvio('Envie arquivos em formato PDF.');
      return;
    }
    setEnviando(true);
    try {
      const novos: { id: string; nome: string }[] = [];
      for (const arquivo of pdfs) {
        const fd = new FormData();
        fd.append('file', arquivo);
        const r = await fetch('/api/documents/upload', { method: 'POST', body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Falha ao enviar o arquivo.');
        novos.push({ id: d.file.id, nome: d.file.name || arquivo.name });
      }
      setArquivos((prev) => [...prev, ...novos]);
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : 'Falha ao enviar o arquivo.');
    } finally {
      setEnviando(false);
    }
  }, []);

  const prosseguirEnvio = useCallback(() => {
    if (arquivos.length === 0) return;
    const params = new URLSearchParams({
      files: arquivos.map((a) => a.id).join(','),
      source: 'dashboard',
    });
    if (clienteEnvio) params.set('clientId', clienteEnvio);
    router.push(`/documentos/novo?${params.toString()}`);
  }, [arquivos, clienteEnvio, router]);

  if (carregando) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#B68B1C]" />
          <p className="text-xs font-semibold text-slate-500">Lendo a operação do escritório...</p>
        </div>
      </div>
    );
  }

  if (erro || !resumo) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-bold text-amber-900">{erro || 'Sem dados para exibir.'}</p>
      </div>
    );
  }

  const { avisos, funil, assinaturasPorDia, vencidos, hoje, semana, parados, pendenciasSuas, esperandoTerceiros } =
    resumo;
  const prazosVisiveis = [...vencidos, ...hoje, ...semana];
  const criticos = avisos.filter((a) => a.nivel === 'CRITICO').length;

  const totalFunil = funil.reduce((a, f) => a + f.quantidade, 0);
  const maxSerie = Math.max(1, ...assinaturasPorDia.map((p) => p.quantidade));
  const totalSerie = assinaturasPorDia.reduce((a, p) => a + p.quantidade, 0);
  const indiceMax = assinaturasPorDia.findIndex((p) => p.quantidade === maxSerie);

  return (
    <div className="space-y-8 pb-10">
      {/* ───────── FAIXA DE DESTAQUE ───────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071B3A] via-[#0B2247] to-[#123061] px-6 py-6 shadow-[0_10px_40px_-16px_rgba(7,27,58,.6)] lg:px-8 lg:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#D4AF37]">
              {escritorio || 'Painel do escritório'}
            </p>
            <h1 className="mt-1.5 font-heading text-2xl font-extrabold tracking-tight text-white lg:text-[27px]">
              {saudacao(agora.getHours())}
              {nome ? `, ${nome}` : ''}
            </h1>
            <p className="mt-1 text-xs text-slate-300">{dataExtensa(agora)}</p>

            {/* Figura principal — única da tela */}
            <div className="mt-5 flex items-end gap-4">
              <p className="text-[56px] font-black leading-[0.85] text-white">{avisos.length}</p>
              <div className="pb-1.5">
                <p className="text-sm font-bold text-white">
                  {avisos.length === 0
                    ? 'nada exige ação'
                    : `${avisos.length === 1 ? 'item exige' : 'itens exigem'} sua ação`}
                </p>
                {criticos > 0 && (
                  <p
                    className="mt-0.5 flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: '#FDA4AF' }}
                  >
                    <AlertOctagon className="h-3.5 w-3.5" /> {criticos} crítico
                    {criticos > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/clientes?novo=true"
              className="rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B68B1C] px-4 py-2.5 text-xs font-extrabold text-[#071B3A] shadow-lg transition hover:brightness-105"
            >
              Novo atendimento
            </Link>
            <Link
              href="/kits/enviar"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Enviar Kit
            </Link>
          </div>
        </div>
      </div>

      {/* ───────── INDICADORES ───────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Clientes"
          valor={resumo.totalClientes}
          contexto="cadastrados no escritório"
          icone={<Users className="h-4 w-4" />}
          href="/clientes"
        />
        <Indicador
          rotulo="Processos"
          valor={resumo.totalProcessos}
          contexto="em acompanhamento"
          icone={<Scale className="h-4 w-4" />}
          href="/processos"
        />
        <Indicador
          rotulo="Em assinatura"
          valor={esperandoTerceiros.length}
          contexto={`${esperandoTerceiros.filter((e) => e.atrasado).length} parada(s)`}
          icone={<FileSignature className="h-4 w-4" />}
          href="/documentos"
          destaque={esperandoTerceiros.some((e) => e.atrasado) ? COR_ATENCAO : undefined}
        />
        <Indicador
          rotulo="Prazos críticos"
          valor={vencidos.length + hoje.length}
          contexto="vencidos ou vencendo hoje"
          icone={<CalendarClock className="h-4 w-4" />}
          href="/processos"
          destaque={vencidos.length + hoje.length > 0 ? COR_CRITICO : undefined}
        />
      </div>

      {/* ───────── AVISOS + PRAZOS ───────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Secao titulo="Central de avisos" descricao="Do mais grave ao menos grave.">
            {avisos.length === 0 ? (
              <Vazio
                icone={<CheckCircle2 className="h-5 w-5" style={{ color: COR_BOM }} />}
                titulo="Nenhum aviso"
                texto="Nada exige sua atenção neste momento."
              />
            ) : (
              <Painel className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                  <Bell className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500">
                    {avisos.length} aviso{avisos.length > 1 ? 's' : ''}
                  </span>
                </div>
                <ul className="max-h-[24rem] divide-y divide-slate-100 overflow-y-auto">
                  {avisos.slice(0, 12).map((a) => {
                    const e = ESTILO_AVISO[a.nivel];
                    return (
                      <li key={a.id}>
                        <Link
                          href={a.destino}
                          className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50/80"
                        >
                          <span
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${e.fundo}`}
                            style={{ color: e.cor }}
                          >
                            {e.icone}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-[#071B3A]">
                                {a.titulo}
                              </span>
                              <span
                                className="rounded-full px-1.5 py-px text-[9px] font-black uppercase tracking-wide"
                                style={{ color: e.cor, backgroundColor: `${e.cor}14` }}
                              >
                                {e.rotulo}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {a.detalhe}
                            </span>
                          </span>
                          <ArrowRight className="mt-1.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Painel>
            )}
          </Secao>
        </div>

        <div className="lg:col-span-7">
          <Secao
            titulo="Prazos"
            descricao="O que pode gerar perda de direito."
            acao={{ texto: 'Ver processos', href: '/processos' }}
          >
            {!resumo.temAlgumPrazoCadastrado ? (
              <Vazio
                icone={<Info className="h-5 w-5" />}
                titulo="Nenhum processo tem prazo cadastrado"
                texto={`O campo existe, mas ${resumo.processosSemPrazo} processo(s) estão sem data. Sem prazo preenchido, este bloco não tem como avisar de nada.`}
              />
            ) : prazosVisiveis.length === 0 ? (
              <Vazio
                icone={<CheckCircle2 className="h-5 w-5" style={{ color: COR_BOM }} />}
                titulo="Nenhum prazo nos próximos 7 dias"
                texto="Há prazos cadastrados, mas todos com folga."
              />
            ) : (
              <Painel className="overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  {[
                    { n: vencidos.length, r: 'Vencidos', cor: COR_CRITICO },
                    { n: hoje.length, r: 'Vencem hoje', cor: COR_ATENCAO },
                    { n: semana.length, r: 'Próximos 7 dias', cor: '#071B3A' },
                  ].map((c) => (
                    <div key={c.r} className="px-4 py-4 text-center">
                      <p className="text-3xl font-black leading-none" style={{ color: c.cor }}>
                        {c.n}
                      </p>
                      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {c.r}
                      </p>
                    </div>
                  ))}
                </div>
                <ul className="divide-y divide-slate-100">
                  {prazosVisiveis.slice(0, 5).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/processos?clienteId=${p.clienteId}`}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/80"
                      >
                        <span
                          className="h-9 w-1 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              p.urgencia === 'VENCIDO'
                                ? COR_CRITICO
                                : p.urgencia === 'HOJE'
                                ? COR_ATENCAO
                                : '#CBD5E1',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#071B3A]">{p.cliente}</p>
                          <p className="truncate text-xs text-slate-500">{p.titulo}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className="text-xs font-extrabold"
                            style={{
                              color:
                                p.urgencia === 'VENCIDO'
                                  ? COR_CRITICO
                                  : p.urgencia === 'HOJE'
                                  ? COR_ATENCAO
                                  : '#475569',
                            }}
                          >
                            {textoPrazo(p.diasRestantes)}
                          </p>
                          <p className="text-[10px] tabular-nums text-slate-400">
                            {dataCurta(p.data)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Painel>
            )}
          </Secao>
        </div>
      </div>

      {/* ───────── FUNIL + SÉRIE ───────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Funil: barra empilhada, rampa sequencial, folga de 2px entre segmentos */}
        <div className="lg:col-span-7">
          <Secao titulo="Funil do escritório" descricao="Onde cada cliente está no fluxo.">
            <Painel className="px-4 py-4 lg:px-5">
              {totalFunil === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Nenhum cliente cadastrado ainda.
                </p>
              ) : (
                <>
                  <div className="flex h-6 w-full gap-[2px] overflow-hidden rounded-md">
                    {funil.map((f, i) =>
                      f.quantidade === 0 ? null : (
                        <div
                          key={f.chave}
                          title={`${f.rotulo}: ${f.quantidade}`}
                          style={{
                            width: `${(f.quantidade / totalFunil) * 100}%`,
                            backgroundColor: RAMPA_FUNIL[i],
                          }}
                          className="flex items-center justify-center"
                        >
                          {/* Rótulo interno apenas quando cabe com folga */}
                          {(f.quantidade / totalFunil) * 100 >= 12 && (
                            <span
                              className="text-[10px] font-black"
                              style={{ color: i >= 3 ? '#FFFFFF' : '#071B3A' }}
                            >
                              {f.quantidade}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  {/* Legenda: identidade nunca só pela cor */}
                  <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    {funil.map((f, i) => (
                      <li key={f.chave} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: RAMPA_FUNIL[i] }}
                        />
                        <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                          {f.rotulo}
                        </span>
                        <span className="shrink-0 text-[11px] font-black tabular-nums text-[#071B3A]">
                          {f.quantidade}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Painel>
          </Secao>
        </div>

        {/* Série: colunas, hue única, rótulo só no pico */}
        <div className="lg:col-span-5">
          <Secao titulo="Assinaturas concluídas" descricao="Últimos 14 dias.">
            <Painel className="px-4 py-4 lg:px-5">
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black leading-none text-[#071B3A]">{totalSerie}</p>
                <p className="text-[11px] text-slate-500">no período</p>
              </div>

              <div className="relative mt-4 h-24">
                {/* Linha de base — fio de 1px, recessiva */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200" />
                <div className="flex h-full items-end gap-[3px]">
                  {assinaturasPorDia.map((p, i) => (
                    <div
                      key={p.rotulo}
                      className="group relative flex h-full flex-1 items-end"
                      onMouseEnter={() => setColunaAtiva(i)}
                      onMouseLeave={() => setColunaAtiva(null)}
                    >
                      <div
                        className="w-full rounded-t transition-opacity"
                        style={{
                          height: `${Math.max(p.quantidade === 0 ? 2 : 8, (p.quantidade / maxSerie) * 100)}%`,
                          backgroundColor: p.quantidade === 0 ? '#E2E8F0' : OURO,
                          opacity: colunaAtiva === null || colunaAtiva === i ? 1 : 0.45,
                          maxWidth: '24px',
                          marginInline: 'auto',
                        }}
                      />
                      {/* Rótulo direto apenas no pico */}
                      {i === indiceMax && maxSerie > 0 && (
                        <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600">
                          {maxSerie}
                        </span>
                      )}
                      {colunaAtiva === i && (
                        <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#071B3A] px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                          {p.rotulo}: {p.quantidade}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-slate-400">
                <span>{assinaturasPorDia[0]?.rotulo}</span>
                <span>{assinaturasPorDia[assinaturasPorDia.length - 1]?.rotulo}</span>
              </div>
            </Painel>
          </Secao>
        </div>
      </div>

      {/* ───────── ENVIAR PARA ASSINATURA ───────── */}
      <Secao
        titulo="Enviar para assinatura"
        descricao="Um ou vários documentos de uma vez, ou um Kit Jurídico completo."
      >
        <Painel className="p-4 lg:p-5">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Cliente
              </label>
              <SeletorCliente clientes={clientes} valor={clienteEnvio} aoMudar={setClienteEnvio} />
            </div>

            <div className="lg:col-span-6">
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Documentos
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastando(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setArrastando(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastando(false);
                  if (e.dataTransfer.files?.length) void subirArquivos(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border border-dashed px-3 py-3.5 text-center transition ${
                  arrastando
                    ? 'border-[#B68B1C] bg-amber-50'
                    : arquivos.length > 0
                    ? 'border-teal-300 bg-teal-50/40'
                    : 'border-slate-300 bg-slate-50/70 hover:border-[#B68B1C] hover:bg-amber-50/40'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) void subirArquivos(e.target.files);
                  }}
                />
                {enviando ? (
                  <span className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando arquivos...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    <FileUp className="h-3.5 w-3.5 text-[#B68B1C]" />
                    Arraste PDFs aqui ou clique para selecionar
                  </span>
                )}
              </div>

              {arquivos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {arquivos.map((a, i) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                    >
                      <span className="text-[10px] font-black tabular-nums text-slate-400">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-700">
                        {a.nome}
                      </span>
                      <button
                        type="button"
                        onClick={() => setArquivos((prev) => prev.filter((x) => x.id !== a.id))}
                        className="shrink-0 text-slate-400 hover:text-rose-600"
                        aria-label={`Remover ${a.nome}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {erroEnvio && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-700">{erroEnvio}</p>
              )}
            </div>

            <div className="flex flex-col justify-end gap-2 lg:col-span-3">
              <button
                type="button"
                onClick={prosseguirEnvio}
                disabled={arquivos.length === 0 || enviando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B3A] py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#152a47] disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5 text-[#D4AF37]" />
                {arquivos.length > 1 ? `Preparar ${arquivos.length} documentos` : 'Preparar envio'}
              </button>
              <Link
                href="/kits/enviar"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Layers className="h-3.5 w-3.5 text-[#B68B1C]" /> Enviar Kit Jurídico
              </Link>
              <p className="text-center text-[10px] leading-4 text-slate-400">
                A conferência de signatários acontece na próxima tela.
              </p>
            </div>
          </div>
        </Painel>
      </Secao>

      {/* ───────── DEPENDE DE VOCÊ x TERCEIROS ───────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Depende de você" descricao="Só anda se o escritório agir.">
          {pendenciasSuas.length === 0 ? (
            <Vazio
              icone={<CheckCircle2 className="h-5 w-5" style={{ color: COR_BOM }} />}
              titulo="Nada parado do seu lado"
            />
          ) : (
            <Painel className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {pendenciasSuas.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={p.destino}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/80"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#071B3A]">{p.cliente}</p>
                        <p className="truncate text-xs text-slate-500">{p.motivo}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-extrabold text-[#B68B1C]">
                        {p.acao}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Painel>
          )}
        </Secao>

        <Secao titulo="Aguardando terceiros" descricao="Depende do cliente responder.">
          {esperandoTerceiros.length === 0 ? (
            <Vazio
              icone={<CheckCircle2 className="h-5 w-5" style={{ color: COR_BOM }} />}
              titulo="Nenhuma assinatura em aberto"
            />
          ) : (
            <Painel className="overflow-hidden">
              <ul className="divide-y divide-slate-100">
                {esperandoTerceiros.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: e.atrasado ? '#FEF3C7' : '#F1F5F9',
                        color: e.atrasado ? COR_ATENCAO : '#94A3B8',
                      }}
                    >
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#071B3A]">{e.cliente}</p>
                      <p className="truncate text-xs text-slate-500">
                        {e.documento} ·{' '}
                        {e.diasEsperando === 0 ? 'enviado hoje' : `há ${e.diasEsperando} dia(s)`}
                      </p>
                    </div>
                    {e.atrasado && (
                      <span
                        className="flex shrink-0 items-center gap-1 text-[11px] font-extrabold"
                        style={{ color: COR_BOM }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Cobrar
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Painel>
          )}
        </Secao>
      </div>

      {/* ───────── SEM MOVIMENTAÇÃO ───────── */}
      <Secao titulo="Sem movimentação" descricao="Casos fora do radar há mais de 15 dias.">
        {parados.length === 0 ? (
          <Vazio
            icone={<CheckCircle2 className="h-5 w-5" style={{ color: COR_BOM }} />}
            titulo="Todos os casos tiveram movimento recente"
          />
        ) : (
          <Painel className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {parados.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/processos?clienteId=${c.clienteId}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/80"
                  >
                    <PauseCircle className="h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#071B3A]">{c.cliente}</p>
                      <p className="truncate text-xs text-slate-500">{c.titulo}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-slate-400">
                      {c.diasSemMovimento} dias
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Painel>
        )}
      </Secao>

      {/* ───────── TERRITÓRIO ───────── */}
      <Secao titulo="Território" descricao="Onde estão seus clientes e processos.">
        <BrazilOperationsMap />
      </Secao>

      <p className="text-center text-[11px] text-slate-400">
        Proposta em avaliação · a Home atual segue intacta em /dashboard
      </p>
    </div>
  );
}
