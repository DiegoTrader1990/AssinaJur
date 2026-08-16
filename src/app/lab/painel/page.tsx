'use client';

/**
 * LABORATÓRIO ASSINAJUR — Proposta de painel do advogado.
 *
 * Protótipo isolado. NÃO substitui e NÃO altera a Home real (/dashboard).
 * Consome os mesmos endpoints já existentes, SOMENTE LEITURA: nenhuma
 * escrita, nenhum efeito colateral. Toda ação leva para as telas atuais.
 *
 * A tese do desenho: a Home deve responder uma única pergunta —
 * "o que eu faço agora?". Por isso prazo vem primeiro (é o que gera dano),
 * depois a separação entre o que depende de você e o que depende de
 * terceiros, e só então o panorama do escritório.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FlaskConical,
  Clock3,
  ArrowRight,
  UserRound,
  MessageSquare,
  PauseCircle,
  CheckCircle2,
  Loader2,
  Info,
} from 'lucide-react';
import BrazilOperationsMap from '@/components/BrazilOperationsMap';
import { montarResumo, textoPrazo, type ResumoPainel } from '@/lib/lab/painelData';

const LAB_VERSION = 'painel v1 — proposta';

function saudacao(h: number): string {
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function dataCurta(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
}

/* ───────────────────────── Blocos de apoio ───────────────────────── */

/** Cabeçalho de seção: um único tamanho, sem caixa em volta. */
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

/** Estado vazio que explica, em vez de deixar um bloco morto na tela. */
function Vazio({ icone, titulo, texto }: { icone: React.ReactNode; titulo: string; texto?: string }) {
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

/* ───────────────────────────── Página ───────────────────────────── */

export default function PainelLabPage() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [resumo, setResumo] = useState<ResumoPainel | null>(null);

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
        setErro('Faça login no AssinaJur para ver o painel com os dados do seu escritório.');
        return;
      }

      const primeiro = String(me.user.name || '').trim().split(' ')[0] || '';
      setNome(primeiro.toLowerCase().startsWith('dr') ? primeiro : primeiro ? `Dr. ${primeiro}` : '');

      setResumo(
        montarResumo(
          {
            clientes: cli?.clients || [],
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

  if (carregando) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#B68B1C]" />
          <p className="text-xs font-semibold text-slate-500">Lendo a operação do escritório...</p>
        </div>
      </main>
    );
  }

  if (erro || !resumo) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">{erro || 'Sem dados para exibir.'}</p>
          <Link
            href="/login"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900 underline"
          >
            Ir para o login <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    );
  }

  const { vencidos, hoje, semana, parados, pendenciasSuas, esperandoTerceiros } = resumo;
  const prazosVisiveis = [...vencidos, ...hoje, ...semana];
  const tudoEmDia =
    prazosVisiveis.length === 0 && pendenciasSuas.length === 0 && esperandoTerceiros.length === 0;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-9 px-4 py-6 pb-20">
      {/* Marcação de ambiente de teste */}
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#D4AF37] bg-[#FFFBF0] px-3 py-2">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-[#B68B1C]" />
        <p className="text-[11px] font-bold text-[#071B3A]">
          Laboratório — proposta de painel.{' '}
          <span className="font-normal text-slate-500">
            Somente leitura. O painel real continua em /dashboard.
          </span>
        </p>
        <span className="ml-auto shrink-0 font-mono text-[9px] text-slate-400">{LAB_VERSION}</span>
      </div>

      {/* ───────── Saudação e estado em uma frase ───────── */}
      <header className="space-y-1.5">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#071B3A] lg:text-3xl">
          {saudacao(hora)}
          {nome ? `, ${nome}` : ''}
        </h1>
        <p
          className={`text-sm font-semibold ${
            vencidos.length > 0
              ? 'text-rose-700'
              : tudoEmDia
              ? 'text-emerald-700'
              : 'text-slate-600'
          }`}
        >
          {resumo.fraseEstado}
        </p>
      </header>

      {/* ───────── 1. PRAZOS ───────── */}
      <Secao
        titulo="Prazos"
        descricao="O que pode gerar perda de direito se passar."
        acao={{ texto: 'Ver processos', href: '/processos' }}
      >
        {!resumo.temAlgumPrazoCadastrado ? (
          <Vazio
            icone={<Info className="h-5 w-5" />}
            titulo="Nenhum processo tem prazo cadastrado"
            texto={`O sistema já tem o campo de prazo, mas ${resumo.processosSemPrazo} processo(s) estão sem data preenchida. Enquanto não houver prazo, este bloco não tem como avisar de nada.`}
          />
        ) : prazosVisiveis.length === 0 ? (
          <Vazio
            icone={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            titulo="Nenhum prazo nos próximos 7 dias"
            texto="Há prazos cadastrados, mas todos com folga."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
            {/* Contadores: números sem caixa, separados por fio */}
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
              {prazosVisiveis.slice(0, 6).map((p) => (
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
                      <p className="text-[10px] tabular-nums text-slate-400">{dataCurta(p.data)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {prazosVisiveis.length > 6 && (
              <Link
                href="/processos"
                className="block border-t border-slate-100 px-4 py-2.5 text-center text-[11px] font-bold text-[#B68B1C] hover:bg-slate-50"
              >
                Ver os outros {prazosVisiveis.length - 6}
              </Link>
            )}
          </div>
        )}
      </Secao>

      {/* ───────── 2. DEPENDE DE VOCÊ x AGUARDANDO TERCEIROS ───────── */}
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

      {/* ───────── 3. CASOS PARADOS ───────── */}
      <Secao
        titulo="Sem movimentação"
        descricao="Casos que sumiram do radar há mais de 15 dias."
      >
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

      {/* ───────── 4. PANORAMA ───────── */}
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

      {/* ───────── 5. MAPA (reaproveitado sem alteração) ───────── */}
      <Secao titulo="Território" descricao="Onde estão seus clientes e processos.">
        <BrazilOperationsMap />
      </Secao>

      <p className="pt-2 text-center text-[11px] text-slate-400">
        Protótipo somente leitura. Nenhum dado foi alterado.
      </p>
    </main>
  );
}
