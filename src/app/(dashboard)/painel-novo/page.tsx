'use client';

/**
 * PROPOSTA DE PAINEL — rota paralela para avaliação.
 *
 * Fica dentro do grupo (dashboard) apenas para herdar o menu lateral real,
 * sem duplicar navegação. NÃO altera nenhum arquivo existente e NÃO aparece
 * no menu: só é alcançável pela URL /painel-novo. A Home real (/dashboard)
 * continua exatamente como está.
 *
 * Regra de segurança adotada: a caixa de envio faz upload dos arquivos e
 * entrega para o fluxo real (/documentos/novo), que já valida signatários e
 * dígito verificador de CPF. Nada de regra de negócio duplicada aqui.
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
} from 'lucide-react';
import BrazilOperationsMap from '@/components/BrazilOperationsMap';
import {
  montarResumo,
  textoPrazo,
  type ResumoPainel,
  type NivelAviso,
} from '@/lib/lab/painelData';

function saudacao(h: number): string {
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataCurta(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
}

/* ───────────────────────── Peças reutilizadas ───────────────────────── */

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
          <h2 className="text-[11px] font-black uppercase tracking-[.14em] text-slate-400">
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
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-5">
      <span className="mt-0.5 shrink-0 text-slate-300">{icone}</span>
      <div>
        <p className="text-sm font-bold text-slate-700">{titulo}</p>
        {texto && <p className="mt-0.5 text-xs leading-5 text-slate-500">{texto}</p>}
      </div>
    </div>
  );
}

/** Seletor de cliente compacto, com busca. */
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
          aberto ? 'border-[#071B3A]' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {selecionado ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-[#071B3A]">
              {selecionado.name}
            </span>
            <span className="block truncate text-[11px] text-slate-500">
              {selecionado.cpfCnpj || 'sem CPF'}
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
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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
                    <span className="block truncate text-xs font-bold text-[#071B3A]">
                      {c.name}
                    </span>
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
  { faixa: string; icone: React.ReactNode; rotulo: string; cor: string }
> = {
  CRITICO: {
    faixa: 'bg-rose-500',
    icone: <AlertOctagon className="h-3.5 w-3.5" />,
    rotulo: 'Crítico',
    cor: 'text-rose-700',
  },
  ATENCAO: {
    faixa: 'bg-amber-500',
    icone: <AlertTriangle className="h-3.5 w-3.5" />,
    rotulo: 'Atenção',
    cor: 'text-amber-700',
  },
  PENDENTE: {
    faixa: 'bg-slate-300',
    icone: <CircleDot className="h-3.5 w-3.5" />,
    rotulo: 'A fazer',
    cor: 'text-slate-600',
  },
};

/* ───────────────────────────── Página ───────────────────────────── */

export default function PainelNovoPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
  const [resumo, setResumo] = useState<ResumoPainel | null>(null);

  // Caixa de envio
  const [clienteEnvio, setClienteEnvio] = useState('');
  const [arquivos, setArquivos] = useState<{ id: string; nome: string }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [me, cli, doc, pro] = await Promise.all([
        fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
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

  const hora = useMemo(() => new Date().getHours(), []);

  /** Sobe os PDFs e devolve os ids, sem criar documento ainda. */
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

  /** Entrega para o fluxo real, que valida signatários e posiciona assinaturas. */
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

  const { avisos, vencidos, hoje, semana, parados, pendenciasSuas, esperandoTerceiros } = resumo;
  const prazosVisiveis = [...vencidos, ...hoje, ...semana];
  const criticos = avisos.filter((a) => a.nivel === 'CRITICO').length;

  return (
    <div className="space-y-9 pb-10">
      {/* Aviso de rota em avaliação */}
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#D4AF37] bg-[#FFFBF0] px-3 py-2">
        <p className="text-[11px] font-bold text-[#071B3A]">
          Proposta de painel em avaliação.{' '}
          <span className="font-normal text-slate-500">
            O painel atual segue intacto em <code className="font-mono">/dashboard</code>.
          </span>
        </p>
      </div>

      {/* ───────── Saudação ───────── */}
      <header className="space-y-1.5">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#071B3A] lg:text-3xl">
          {saudacao(hora)}
          {nome ? `, ${nome}` : ''}
        </h1>
        <p
          className={`text-sm font-semibold ${
            criticos > 0 ? 'text-rose-700' : avisos.length === 0 ? 'text-emerald-700' : 'text-slate-600'
          }`}
        >
          {resumo.fraseEstado}
        </p>
      </header>

      {/* ───────── 1. AVISOS + PRAZOS ───────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Central de avisos */}
        <div className="lg:col-span-5">
          <Secao titulo="Central de avisos" descricao="Tudo que exige ação, do mais grave ao menos.">
            {avisos.length === 0 ? (
              <Vazio
                icone={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                titulo="Nenhum aviso"
                texto="Nada exige sua atenção neste momento."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                  <Bell className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500">
                    {avisos.length} aviso{avisos.length > 1 ? 's' : ''}
                  </span>
                  {criticos > 0 && (
                    <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700">
                      {criticos} crítico{criticos > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto">
                  {avisos.slice(0, 12).map((a) => {
                    const e = ESTILO_AVISO[a.nivel];
                    return (
                      <li key={a.id}>
                        <Link
                          href={a.destino}
                          className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50/70"
                        >
                          <span className={`mt-1 h-8 w-1 shrink-0 rounded-full ${e.faixa}`} />
                          <span className="min-w-0 flex-1">
                            <span className={`flex items-center gap-1.5 text-xs font-extrabold ${e.cor}`}>
                              {e.icone} {a.titulo}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {a.detalhe}
                            </span>
                          </span>
                          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Secao>
        </div>

        {/* Prazos */}
        <div className="lg:col-span-7">
          <Secao
            titulo="Prazos"
            descricao="O que pode gerar perda de direito se passar."
            acao={{ texto: 'Ver processos', href: '/processos' }}
          >
            {!resumo.temAlgumPrazoCadastrado ? (
              <Vazio
                icone={<Info className="h-5 w-5" />}
                titulo="Nenhum processo tem prazo cadastrado"
                texto={`O campo de prazo existe, mas ${resumo.processosSemPrazo} processo(s) estão sem data. Enquanto não houver prazo preenchido, este bloco não tem como avisar de nada.`}
              />
            ) : prazosVisiveis.length === 0 ? (
              <Vazio
                icone={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                titulo="Nenhum prazo nos próximos 7 dias"
                texto="Há prazos cadastrados, mas todos com folga."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  {[
                    { n: vencidos.length, r: 'Vencidos', cor: 'text-rose-600' },
                    { n: hoje.length, r: 'Vencem hoje', cor: 'text-amber-600' },
                    { n: semana.length, r: 'Próximos 7 dias', cor: 'text-[#071B3A]' },
                  ].map((c) => (
                    <div key={c.r} className="px-4 py-3.5 text-center">
                      <p className={`text-2xl font-black tabular-nums ${c.cor}`}>{c.n}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70"
                      >
                        <span
                          className={`h-9 w-1 shrink-0 rounded-full ${
                            p.urgencia === 'VENCIDO'
                              ? 'bg-rose-500'
                              : p.urgencia === 'HOJE'
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#071B3A]">{p.cliente}</p>
                          <p className="truncate text-xs text-slate-500">{p.titulo}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-xs font-extrabold ${
                              p.urgencia === 'VENCIDO'
                                ? 'text-rose-600'
                                : p.urgencia === 'HOJE'
                                ? 'text-amber-600'
                                : 'text-slate-600'
                            }`}
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
              </div>
            )}
          </Secao>
        </div>
      </div>

      {/* ───────── 2. ENVIAR PARA ASSINATURA ───────── */}
      <Secao
        titulo="Enviar para assinatura"
        descricao="Um ou vários documentos de uma vez, ou um Kit Jurídico completo."
      >
        <div className="grid gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 lg:grid-cols-12 lg:p-5">
          {/* Cliente */}
          <div className="lg:col-span-3">
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Cliente
            </label>
            <SeletorCliente clientes={clientes} valor={clienteEnvio} aoMudar={setClienteEnvio} />
          </div>

          {/* Documentos */}
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
              className={`cursor-pointer rounded-xl border border-dashed px-3 py-3 text-center transition ${
                arrastando
                  ? 'border-[#B68B1C] bg-amber-50'
                  : arquivos.length > 0
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-slate-300 bg-slate-50/60 hover:border-[#B68B1C]'
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

            {erroEnvio && <p className="mt-1.5 text-[11px] font-semibold text-rose-700">{erroEnvio}</p>}
          </div>

          {/* Ações */}
          <div className="flex flex-col justify-end gap-2 lg:col-span-3">
            <button
              type="button"
              onClick={prosseguirEnvio}
              disabled={arquivos.length === 0 || enviando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B3A] py-2.5 text-xs font-extrabold text-white transition hover:bg-[#152a47] disabled:opacity-40"
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
      </Secao>

      {/* ───────── 3. DEPENDE DE VOCÊ x TERCEIROS ───────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Depende de você" descricao="Só anda se o escritório agir.">
          {pendenciasSuas.length === 0 ? (
            <Vazio
              icone={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              titulo="Nada parado do seu lado"
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
              {pendenciasSuas.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.destino}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70"
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
          )}
        </Secao>

        <Secao titulo="Aguardando terceiros" descricao="Depende do cliente responder.">
          {esperandoTerceiros.length === 0 ? (
            <Vazio
              icone={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              titulo="Nenhuma assinatura em aberto"
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
              {esperandoTerceiros.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      e.atrasado ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                    }`}
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
                    <span className="flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-emerald-700">
                      <MessageSquare className="h-3.5 w-3.5" /> Cobrar
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      {/* ───────── 4. SEM MOVIMENTAÇÃO ───────── */}
      <Secao titulo="Sem movimentação" descricao="Casos fora do radar há mais de 15 dias.">
        {parados.length === 0 ? (
          <Vazio
            icone={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            titulo="Todos os casos tiveram movimento recente"
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            {parados.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/processos?clienteId=${c.clienteId}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70"
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
        )}
      </Secao>

      {/* ───────── 5. PANORAMA ───────── */}
      <Secao titulo="Escritório" descricao="Panorama geral, sem urgência associada.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: resumo.totalClientes, r: 'clientes', href: '/clientes' },
            { n: resumo.totalProcessos, r: 'processos', href: '/processos' },
            { n: esperandoTerceiros.length, r: 'em assinatura', href: '/documentos' },
            { n: resumo.prazos.length, r: 'prazos ativos', href: '/processos' },
          ].map((c) => (
            <Link
              key={c.r}
              href={c.href}
              className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5 transition hover:border-slate-300"
            >
              <p className="text-xl font-black tabular-nums text-[#071B3A]">{c.n}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{c.r}</p>
            </Link>
          ))}
        </div>
      </Secao>

      {/* ───────── 6. TERRITÓRIO ───────── */}
      <Secao titulo="Território" descricao="Onde estão seus clientes e processos.">
        <BrazilOperationsMap />
      </Secao>
    </div>
  );
}
