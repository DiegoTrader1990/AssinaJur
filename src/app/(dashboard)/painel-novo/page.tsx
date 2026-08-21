'use client';

/**
 * PROPOSTA DE PAINEL — rota paralela para avaliação.
 *
 * Depois que a Home (/dashboard) adotou o fluxo rápido, os indicadores, o card
 * de intimações/assinaturas e a central de acompanhamento, esta tela passou a
 * montar os MESMOS componentes de @/components/painel/BlocosPainel. Ela existe
 * para ver a proposta inteira num lugar só (com mapa, funil e ritmo) sem mexer
 * na Home — e sem código duplicado, que era o que fazia as duas divergirem.
 *
 * Paleta dos gráficos validada por script (skill dataviz):
 *  - funil: rampa sequencial de uma hue só, L monotônica, ponta clara > 2:1
 *  - teal no lugar de verde: verde x vermelho reprovava para deutan
 *
 * Regra de dado: nada é inventado. Onde a base ainda não existe (intimações do
 * DJEN), a tela diz o que falta em vez de mostrar exemplo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderKanban,
  Loader2,
  Scale,
  Users,
} from 'lucide-react';
import BrazilOperationsMap from '@/components/BrazilOperationsMap';
import {
  AvisosAcompanhamentos,
  CardAssinaturas,
  FluxoRapido,
  IndicadoresEscritorio,
  KitsMaisUsados,
} from '@/components/painel/BlocosPainel';
import { montarResumo, textoPrazo, type ResumoPainel } from '@/lib/lab/painelData';
import {
  derivarAssinaturasAndamento,
  derivarIndicadores,
  derivarKitsMaisUsados,
} from '@/lib/lab/painelExtra';

/* Paleta validada — ver cabeçalho */
const RAMPA_FUNIL = ['#9AAAC4', '#7386A8', '#4D688F', '#28456E', '#0A1F42'];

/**
 * "Dr. Diego dos Santos" -> "Dr. Diego". "Diego dos Santos" -> "Dr. Diego".
 * Antes o código pegava a primeira palavra: quando o cadastro já trazia o
 * título, sobrava só "Dr." e a saudação virava "Bom dia, Dr.".
 */
function tratamentoENome(nomeCompleto: string): string {
  const partes = String(nomeCompleto || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '';

  const titulos = ['dr', 'dr.', 'dra', 'dra.', 'doutor', 'doutora'];
  const temTitulo = titulos.includes(partes[0].toLowerCase());
  const tratamento = temTitulo
    ? partes[0].toLowerCase().startsWith('dra')
      ? 'Dra.'
      : 'Dr.'
    : 'Dr.';
  const primeiro = temTitulo ? partes[1] : partes[0];
  if (!primeiro) return tratamento;
  return `${tratamento} ${primeiro}`;
}

function saudacao(h: number): string {
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataExtensa(d: Date): string {
  const t = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(7,27,58,.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function CentroGestao({
  clientes,
  processos,
  documentos,
  assinaturasPendentes,
}: {
  clientes: any[];
  processos: any[];
  documentos: any[];
  assinaturasPendentes: number;
}) {
  const processosAtivos = processos.filter((processo) => {
    const status = String(processo?.status || '').toUpperCase();
    return status !== 'CONCLUIDO' && status !== 'CANCELADO' && status !== 'ARQUIVADO';
  }).length;
  const documentosAssinados = documentos.filter(
    (documento) => String(documento?.status || '').toUpperCase() === 'CONCLUIDO'
  ).length;

  const areas = [
    {
      titulo: 'Carteira de clientes',
      descricao: 'Cadastros, alertas e histórico de cada atendimento.',
      valor: clientes.length,
      unidade: clientes.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados',
      href: '/clientes',
      Icon: Users,
      cor: 'bg-blue-50 text-blue-700 ring-blue-100',
    },
    {
      titulo: 'Processos em condução',
      descricao: 'Dossiês, prazos, protocolos e documentos vinculados.',
      valor: processosAtivos,
      unidade: processosAtivos === 1 ? 'processo ativo' : 'processos ativos',
      href: '/processos',
      Icon: FolderKanban,
      cor: 'bg-violet-50 text-violet-700 ring-violet-100',
    },
    {
      titulo: 'Assinaturas a concluir',
      descricao: 'Envios que ainda dependem de uma ação do signatário.',
      valor: assinaturasPendentes,
      unidade: assinaturasPendentes === 1 ? 'envio aguardando' : 'envios aguardando',
      href: '/documentos',
      Icon: ClipboardCheck,
      cor: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    {
      titulo: 'Acervo jurídico',
      descricao: 'Documentos assinados e prontos para consulta no escritório.',
      valor: documentosAssinados,
      unidade: documentosAssinados === 1 ? 'documento assinado' : 'documentos assinados',
      href: '/documentos',
      Icon: FileCheck2,
      cor: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
  ];

  return (
    <section className="overflow-hidden rounded-[26px] border border-[#dbe4f2] bg-white shadow-[0_12px_35px_rgba(7,27,58,.06)]">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(115deg,#071B3A_0%,#0d2d59_68%,#173f70_100%)] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e4bd47]">Centro de comando</p>
          <h2 className="mt-1 font-heading text-xl font-extrabold tracking-tight text-white">Gestão integral do escritório</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300">Cada área abre o espaço certo para administrar a carteira, os processos e os documentos — sem iniciar um novo envio.</p>
        </div>
        <Link href="/entrada" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15">
          <FileText className="h-4 w-4 text-[#e4bd47]" /> Central de entrada
        </Link>
      </div>
      <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {areas.map(({ titulo, descricao, valor, unidade, href, Icon, cor }) => (
          <Link key={titulo} href={href} className="group relative min-h-[172px] p-5 transition hover:bg-slate-50/80">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${cor}`}><Icon className="h-5 w-5" /></span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#071B3A]" />
            </div>
            <p className="mt-5 text-2xl font-black leading-none tracking-tight text-[#071B3A]">{valor}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[.08em] text-slate-400">{unidade}</p>
            <h3 className="mt-4 text-[13px] font-extrabold text-[#071B3A]">{titulo}</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">{descricao}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function PainelNovoPage() {
  const pathname = usePathname();
  const modoEscritorio = pathname === '/escritorio';
  const mostrarFluxoRapido = !modoEscritorio;
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [escritorio, setEscritorio] = useState('');

  const [clientes, setClientes] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [processos, setProcessos] = useState<any[]>([]);
  const [resumo, setResumo] = useState<ResumoPainel | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [me, esc, cli, doc, pro, kit] = await Promise.all([
        fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (!me?.user) {
        setErro('Sessão expirada. Entre novamente para ver o painel.');
        return;
      }

      setNome(tratamentoENome(String(me.user.name || '')));
      setEscritorio(esc?.office?.name || '');

      const listaClientes: any[] = cli?.clients || [];
      const listaDocumentos: any[] = doc?.documents || [];
      const listaProcessos: any[] = pro?.processes || [];

      setClientes(listaClientes);
      setDocumentos(listaDocumentos);
      setProcessos(listaProcessos);
      setKits(kit?.kits || []);
      setResumo(
        montarResumo(
          { clientes: listaClientes, documentos: listaDocumentos, processos: listaProcessos },
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

  const indicadores = useMemo(() => derivarIndicadores(documentos, agora), [documentos, agora]);

  const assinaturas = useMemo(
    () => derivarAssinaturasAndamento(documentos, agora, { kits }),
    [documentos, agora, kits]
  );

  const kitsUsados = useMemo(() => derivarKitsMaisUsados(kits, documentos), [kits, documentos]);

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

  const { avisos, funil, assinaturasPorDia, vencidos, hoje: prazosHoje, semana } = resumo;
  const prazosVisiveis = [...vencidos, ...prazosHoje, ...semana].slice(0, 5);
  const totalFunil = funil.reduce((a, f) => a + f.quantidade, 0);
  const maxSerie = Math.max(1, ...assinaturasPorDia.map((p) => p.quantidade));
  const totalSerie = assinaturasPorDia.reduce((a, p) => a + p.quantidade, 0);
  const mediaSerie = assinaturasPorDia.length ? totalSerie / assinaturasPorDia.length : 0;

  // Assinatura parada já é a aba "Assinaturas": não repetimos na coluna ao lado.
  const avisosSistema = avisos.filter((a) => !a.id.startsWith('assin-')).slice(0, 6);

  return (
    <div className="space-y-5 pb-8">
      {/* ───────────────────────── SAUDAÇÃO ───────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold leading-none tracking-tight text-[#071B3A]">
            {modoEscritorio
              ? 'Gestão do escritório'
              : `${saudacao(agora.getHours())}${nome ? `, ${nome}` : ''}`}
          </h1>
          <p className="mt-2 text-[13px] text-slate-500">
            {modoEscritorio
              ? 'Acompanhe a operação, as prioridades e os próximos movimentos do escritório.'
              : dataExtensa(agora)}
            {vencidos.length + prazosHoje.length > 0 && (
              <>
                {' · '}
                <span className="font-bold text-rose-600">
                  {vencidos.length + prazosHoje.length}{' '}
                  {vencidos.length + prazosHoje.length === 1 ? 'prazo exige' : 'prazos exigem'} sua
                  atenção hoje
                </span>
              </>
            )}
            {indicadores.aguardandoParados > 0 && (
              <>
                {' · '}
                {indicadores.aguardandoParados} assinatura
                {indicadores.aguardandoParados === 1 ? ' parada' : 's paradas'}
              </>
            )}
            {vencidos.length + prazosHoje.length === 0 && indicadores.aguardandoParados === 0 && (
              <> · {resumo.fraseEstado}</>
            )}
          </p>
        </div>
        {escritorio && (
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-[0_1px_2px_rgba(7,27,58,.05)]">
            <Scale className="h-3.5 w-3.5 text-[#B68B1C]" />
            <span className="text-[11.5px] text-slate-600">{escritorio}</span>
          </div>
        )}
      </div>

      {mostrarFluxoRapido && (
        <FluxoRapido
          clientes={clientes}
          kits={kits}
          processos={processos}
          documentos={documentos}
          kitPreferidoId={kitsUsados[0]?.id}
          tempoMedioMinutos={indicadores.tempoMedioMinutos}
        />
      )}

      {modoEscritorio && (
        <CentroGestao
          clientes={clientes}
          processos={processos}
          documentos={documentos}
          assinaturasPendentes={indicadores.aguardando}
        />
      )}

      <IndicadoresEscritorio
        indicadores={indicadores}
        vencidos={vencidos.length}
        prazosHoje={prazosHoje.length}
        temAlgumPrazoCadastrado={resumo.temAlgumPrazoCadastrado}
        processosSemPrazo={resumo.processosSemPrazo}
      />

      <div className="grid grid-cols-12 gap-5">
        <CardAssinaturas
          assinaturas={assinaturas}
          className="col-span-12 lg:col-span-7"
        />
        <AvisosAcompanhamentos
          avisosSistema={avisosSistema}
          clientes={clientes}
          titulo="Central de Acompanhamento"
          className="col-span-12 lg:col-span-5"
        />
      </div>

      {/* ───────────────── PRAZOS + OPERAÇÃO NACIONAL ───────────────── */}
      <div className="grid grid-cols-12 gap-5">
        <Cartao className="col-span-12 flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-[13px] font-extrabold text-[#071B3A]">Prazos processuais</h2>
            <Link href="/processos" className="text-[11px] font-bold text-[#B68B1C]">
              Agenda →
            </Link>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {prazosVisiveis.length === 0 && (
              <p className="px-5 py-8 text-center text-[12px] text-slate-400">
                {resumo.temAlgumPrazoCadastrado
                  ? 'Nenhum prazo nos próximos 7 dias.'
                  : `Nenhum prazo cadastrado — ${resumo.processosSemPrazo} processo(s) sem data.`}
              </p>
            )}
            {prazosVisiveis.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`h-8 w-1 shrink-0 rounded-full ${
                    p.urgencia === 'VENCIDO'
                      ? 'bg-rose-500'
                      : p.urgencia === 'HOJE'
                        ? 'bg-amber-500'
                        : 'bg-slate-200'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-[#071B3A]">{p.cliente}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {p.titulo} · {p.area}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-bold ${
                    p.urgencia === 'VENCIDO'
                      ? 'text-rose-600'
                      : p.urgencia === 'HOJE'
                        ? 'text-amber-600'
                        : 'text-slate-500'
                  }`}
                >
                  {textoPrazo(p.diasRestantes)}
                </span>
              </div>
            ))}
          </div>
        </Cartao>

        <div className="col-span-12 lg:col-span-7">
          <BrazilOperationsMap />
        </div>
      </div>

      {/* ───────────────────────── FUNIL ───────────────────────── */}
      <Cartao className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[13px] font-extrabold text-[#071B3A]">Funil do escritório</h2>
            <p className="mt-0.5 text-[10.5px] text-slate-500">
              Em que etapa está cada um dos {totalFunil} clientes
            </p>
          </div>
          <Link href="/clientes" className="text-[11px] font-bold text-[#B68B1C]">
            Ver clientes →
          </Link>
        </div>
        {totalFunil === 0 ? (
          <p className="py-6 text-center text-[12px] text-slate-400">
            Cadastre o primeiro cliente para ver o funil.
          </p>
        ) : (
          <>
            <div className="mt-3 flex h-7 gap-[2px] overflow-hidden rounded-lg">
              {funil.map((f, i) => {
                const largura = (f.quantidade / totalFunil) * 100;
                if (largura === 0) return null;
                return (
                  <div
                    key={f.chave}
                    style={{ width: `${largura}%`, background: RAMPA_FUNIL[i] }}
                    className="flex items-center justify-center"
                    title={`${f.rotulo}: ${f.quantidade}`}
                  >
                    <span
                      className={`text-[11px] font-black ${i === 0 ? 'text-[#071B3A]' : 'text-white'}`}
                    >
                      {f.quantidade}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
              {funil.map((f, i) => (
                <div key={f.chave} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: RAMPA_FUNIL[i] }}
                  />
                  <span className="text-[11.5px] text-slate-600">{f.rotulo}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Cartao>

      {/* ───────────────── RITMO + KITS MAIS USADOS ───────────────── */}
      <div className="grid grid-cols-12 gap-5">
        <Cartao className="col-span-12 flex flex-col p-5 lg:col-span-7">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[13px] font-extrabold text-[#071B3A]">
                Assinaturas concluídas por dia
              </h2>
              <p className="mt-0.5 text-[10.5px] text-slate-500">
                Últimos {assinaturasPorDia.length} dias · {totalSerie} no total
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500">média diária</p>
              <p className="text-[18px] font-black leading-tight text-[#071B3A]">
                {mediaSerie.toFixed(1).replace('.', ',')}
              </p>
            </div>
          </div>
          <div className="mt-6 flex min-h-[150px] flex-1 items-stretch gap-1.5">
            {assinaturasPorDia.map((p, i) => {
              const ultimo = i === assinaturasPorDia.length - 1;
              const destacar = p.quantidade === maxSerie && maxSerie > 0;
              return (
                <div
                  key={p.rotulo}
                  className="group flex flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${p.rotulo}: ${p.quantidade}`}
                >
                  <div className="relative flex w-full flex-1 items-end">
                    {(destacar || ultimo) && p.quantidade > 0 && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#071B3A]">
                        {p.quantidade}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-[4px] transition-all group-hover:opacity-80"
                      style={{
                        height: `${(p.quantidade / maxSerie) * 100}%`,
                        background: ultimo ? RAMPA_FUNIL[4] : RAMPA_FUNIL[2],
                        minHeight: p.quantidade > 0 ? 3 : 0,
                      }}
                    />
                  </div>
                  <span
                    className={`text-[9.5px] ${
                      ultimo ? 'font-black text-[#071B3A]' : 'text-slate-400'
                    }`}
                  >
                    {p.rotulo.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </Cartao>

        <KitsMaisUsados kits={kitsUsados} className="col-span-12 lg:col-span-5" />
      </div>

      {/* ───────────────────────── RODAPÉ ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 pt-1">
        <p className="text-[10.5px] text-slate-400">
          AssinaJur{escritorio ? ` · ${escritorio}` : ''} · assinaturas com certificado de evidências
          e validade jurídica (MP 2.200-2/2001)
        </p>
        <p className="text-[10.5px] text-slate-400">
          {modoEscritorio ? 'Central de gestão operacional do escritório' : 'Painel operacional completo'}
        </p>
      </div>
    </div>
  );
}
