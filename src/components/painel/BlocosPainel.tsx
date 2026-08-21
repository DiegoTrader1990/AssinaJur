'use client';

/**
 * BLOCOS DO PAINEL — peças compartilhadas entre a Home (/dashboard) e a
 * proposta em avaliação (/painel-novo).
 *
 * Motivo de existirem aqui e não dentro de uma das telas: as duas mostram
 * exatamente os mesmos blocos. Duplicar o código faria as versões divergirem
 * na primeira correção — foi assim que "Últimas atividades" acabou aparecendo
 * duas vezes com números diferentes.
 *
 * Nenhum bloco busca dados: todos recebem por props o que as telas já
 * carregaram. Assim o mesmo bloco serve à Home e ao laboratório sem repetir
 * requisição.
 *
 * Paleta dos gráficos validada por script (skill dataviz).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import NovoClienteModal from '@/components/clientes/NovoClienteModal';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  FileUp,
  Layers,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,

  QrCode,
  Scale,
  Search,
  Send,
  Shield,
  TrendingUp,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { type Aviso } from '@/lib/lab/painelData';
import {
  gravarAvisosManuais,
  iniciaisDe,
  lerAvisosManuais,
  ordenarAvisosManuais,
  textoAcompanhamento,
  textoDuracao,
  type AssinaturaAndamento,
  type AvisoManual,
  type IndicadoresPainel,
  type KitUsado,
} from '@/lib/lab/painelExtra';

const RAMPA = ['#9AAAC4', '#7386A8', '#4D688F', '#28456E', '#0A1F42'];

/* ─────────────────────────── Utilidades ──────────────────────────────── */

function soDigitos(v?: string | null): string {
  return String(v || '').replace(/\D/g, '');
}

export function formatarCpfCnpj(v?: string | null): string {
  const d = soDigitos(v);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return String(v || '');
}

export function formatarTelefone(v?: string | null): string {
  const d = soDigitos(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(v || '');
}

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
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

function PassoRotulo({ numero, texto }: { numero: number; texto: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-black text-[#071B3A]">
        {numero}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-300">
        {texto}
      </span>
    </div>
  );
}

/* ═══════════════════════════ 1. FLUXO RÁPIDO ═══════════════════════════ */

export interface ClientePainel {
  id: string;
  name?: string | null;
  cpfCnpj?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

export interface KitPainel {
  id: string;
  name?: string | null;
  items?: { id: string; template?: { title?: string | null } | null }[] | null;
}

/**
 * Os três passos do envio: quem assina, o que assina, e para onde vai.
 * A escolha entre "Meus documentos" e "Kit Jurídico" fica dentro do passo 2,
 * em dois cartões sempre visíveis — não num alternador escondido no topo.
 */
export function FluxoRapido({
  clientes,
  kits,
  processos,
  documentos,
  kitPreferidoId,
  tempoMedioMinutos,
  onClientCreated,
}: {
  clientes: ClientePainel[];
  kits: KitPainel[];
  processos: any[];
  documentos: any[];
  kitPreferidoId?: string;
  tempoMedioMinutos: number | null;
  /** Chamado apos cadastrar um cliente pela caixa rapida, para o pai atualizar sua lista. */
  onClientCreated?: (client: any) => void;
}) {
  const router = useRouter();

  const [modo, setModo] = useState<'DOC' | 'KIT'>('DOC');
  const [clienteId, setClienteId] = useState('');
  const [busca, setBusca] = useState('');
  const [piscarCliente, setPiscarCliente] = useState(false);
  const [todosAbertos, setTodosAbertos] = useState(false);
  const [buscaTodos, setBuscaTodos] = useState('');
  const [novoClienteAberto, setNovoClienteAberto] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  /** Depois de cadastrar pela caixa rapida, o cliente ja fica selecionado no passo 1 —
   * e o ponto todo de nao levar o advogado pra outra tela: cadastrou, ja pode continuar
   * escolhendo o que vai ser assinado, sem precisar buscar o cliente que acabou de criar. */
  const aoCadastrarCliente = (client: any) => {
    setNovoClienteAberto(false);
    onClientCreated?.(client);
    if (client?.id) setClienteId(client.id);
    setTodosAbertos(false);
  };

  /** Esc fecha a lista completa sem tirar o advogado da página. */
  useEffect(() => {
    if (!todosAbertos) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTodosAbertos(false);
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [todosAbertos]);
  const [arquivos, setArquivos] = useState<{ id: string; nome: string }[]>([]);
  const [kitId, setKitId] = useState('');
  const [listaKitAberta, setListaKitAberta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Entrar no modo Kit já traz o kit mais usado escolhido. */
  useEffect(() => {
    if (modo !== 'KIT' || kitId) return;
    const preferido = kitPreferidoId || kits[0]?.id;
    if (preferido) setKitId(preferido);
  }, [modo, kitId, kitPreferidoId, kits]);

  const clienteEscolhido = useMemo(
    () => clientes.find((c) => c.id === clienteId) || null,
    [clientes, clienteId]
  );
  const kitEscolhido = useMemo(() => kits.find((k) => k.id === kitId) || null, [kits, kitId]);

  /** Quem o escritório atendeu por último aparece primeiro — é quem ele repete. */
  const ultimoEnvioPorCliente = useMemo(() => {
    const ultimo = new Map<string, number>();
    documentos.forEach((d) => {
      const id = d.clientId || d.client?.id;
      if (!id) return;
      const t = new Date(d.createdAt || 0).getTime();
      if (!ultimo.has(id) || t > (ultimo.get(id) as number)) ultimo.set(id, t);
    });
    return ultimo;
  }, [documentos]);

  /**
   * A lista já vem montada e visível: o advogado não precisa clicar para
   * descobrir que existe uma lista. Recentes no topo, resto em ordem
   * alfabética, e a busca filtra tudo.
   */
  const clientesOrdenados = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    const base = alvo
      ? clientes.filter(
          (c) =>
            String(c.name || '').toLowerCase().includes(alvo) ||
            soDigitos(c.cpfCnpj).includes(soDigitos(alvo)) ||
            soDigitos(c.phone).includes(soDigitos(alvo))
        )
      : clientes;

    return [...base].sort((a, b) => {
      const ta = ultimoEnvioPorCliente.get(a.id) || 0;
      const tb = ultimoEnvioPorCliente.get(b.id) || 0;
      if (ta !== tb) return tb - ta;
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }, [clientes, busca, ultimoEnvioPorCliente]);

  /**
   * O passo 1 mostra só os três últimos atendidos. A lista inteira só rola numa
   * caixa por cima da página — despejar 40 clientes aqui empurrava os passos 2
   * e 3 para fora da primeira tela.
   */
  const VISIVEIS = 3;
  const clientesVisiveis = clientesOrdenados.slice(0, VISIVEIS);

  const clientesModal = useMemo(() => {
    const alvo = buscaTodos.trim().toLowerCase();
    if (!alvo) return clientesOrdenados;
    return clientesOrdenados.filter(
      (c) =>
        String(c.name || '').toLowerCase().includes(alvo) ||
        soDigitos(c.cpfCnpj).includes(soDigitos(alvo)) ||
        soDigitos(c.phone).includes(soDigitos(alvo))
    );
  }, [clientesOrdenados, buscaTodos]);

  function escolher(id: string) {
    setClienteId(id);
    setBusca('');
    setBuscaTodos('');
    setTodosAbertos(false);
  }

  const processoDoCliente = useMemo(() => {
    if (!clienteId) return null;
    return processos.find((p) => p.client?.id === clienteId || p.clientId === clienteId) || null;
  }, [processos, clienteId]);

  const cadastroCompleto = Boolean(
    clienteEscolhido?.cpfCnpj && (clienteEscolhido?.phone || clienteEscolhido?.whatsapp)
  );
  const canalCliente =
    formatarTelefone(clienteEscolhido?.whatsapp || clienteEscolhido?.phone) ||
    clienteEscolhido?.email ||
    '';

  const podeEnviar = Boolean(clienteId) && (modo === 'DOC' ? arquivos.length > 0 : Boolean(kitId));
  const faltaPara = !clienteId
    ? 'escolha o cliente no passo 1'
    : modo === 'KIT'
      ? 'escolha o Kit'
      : 'escolha os documentos';

  async function subirArquivos(lista: FileList) {
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
  }

  /**
   * O botão fica sempre dourado — é a ação principal da tela e some visualmente
   * quando apagado. Se faltar alguma peça, em vez de não fazer nada ele leva o
   * advogado ao passo que falta: foca a busca de cliente, abre o seletor de
   * arquivos ou a lista de kits.
   */
  function seguir() {
    if (!clienteId) {
      setPiscarCliente(true);
      buscaRef.current?.focus();
      window.setTimeout(() => setPiscarCliente(false), 1200);
      return;
    }
    if (modo === 'DOC' && arquivos.length === 0) {
      inputRef.current?.click();
      return;
    }
    if (modo === 'KIT' && !kitId) {
      setListaKitAberta(true);
      return;
    }
    if (modo === 'KIT') {
      const p = new URLSearchParams({ kitId });
      if (clienteId) p.set('clientId', clienteId);
      router.push(`/kits/enviar?${p.toString()}`);
      return;
    }
    const p = new URLSearchParams({
      files: arquivos.map((a) => a.id).join(','),
      source: 'dashboard',
    });
    if (clienteId) p.set('clientId', clienteId);
    router.push(`/documentos/novo?${p.toString()}`);
  }

  const opcoesModo = [
    { chave: 'DOC' as const, Icone: FileUp, titulo: 'Meus documentos', sub: 'PDFs do meu computador' },
    { chave: 'KIT' as const, Icone: Shield, titulo: 'Kit Jurídico', sub: 'peças já preenchidas' },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#071B3A] via-[#0B2247] to-[#16386E] px-5 py-4 shadow-[0_14px_44px_-18px_rgba(7,27,58,.6)] lg:px-6">
      <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#D4AF37]">
            Fluxo rápido
          </p>
          <h2 className="mt-1 text-[19px] font-extrabold tracking-tight text-white">
            Enviar para assinatura
          </h2>
        </div>
        <p className="shrink-0 text-[11px] text-slate-300">3 passos · leva menos de 1 minuto</p>
      </div>

      <div className="relative mt-3.5 grid grid-cols-12 items-stretch gap-3">
        {/* 1. Cliente */}
        <div className="col-span-12 flex flex-col lg:col-span-4">
          <PassoRotulo numero={1} texto="Cliente" />
          <div
            className={`flex flex-1 flex-col rounded-xl bg-white p-2 transition ${
              piscarCliente ? 'ring-2 ring-[#D4AF37]' : ''
            }`}
          >
            {clienteEscolhido ? (
              <>
                <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#071B3A] text-[12px] font-black text-[#D4AF37]">
                    {iniciaisDe(clienteEscolhido.name || '')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-[#071B3A]">
                      {clienteEscolhido.name}
                    </span>
                    <span className="block truncate text-[10.5px] text-slate-500">
                      {[
                        formatarCpfCnpj(clienteEscolhido.cpfCnpj),
                        formatarTelefone(clienteEscolhido.phone),
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'sem CPF e telefone cadastrados'}
                    </span>
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-1.5 px-1.5">
                  {cadastroCompleto ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-teal-600" />
                      <span className="text-[10.5px] text-slate-500">
                        Cadastro completo · pronto para assinar
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                      <span className="text-[10.5px] text-amber-700">
                        Falta {clienteEscolhido.cpfCnpj ? 'telefone' : 'CPF'} no cadastro
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-1.5 space-y-1 border-t border-slate-100 px-1.5 pt-1.5">
                  {canalCliente && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-teal-600" />
                      <span className="truncate text-[11px] text-slate-600">
                        Recebe em {canalCliente}
                      </span>
                    </div>
                  )}
                  {processoDoCliente && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate text-[11px] text-slate-600">
                        {processoDoCliente.title || 'Processo'}
                        {processoDoCliente.processNumber ? ` · ${processoDoCliente.processNumber}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    ref={buscaRef}
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="buscar por nome, CPF ou telefone"
                    className="w-full bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  {busca && (
                    <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca">
                      <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>

                <div className="mt-1.5 flex-1">
                  {clientes.length === 0 ? (
                    <p className="px-2 py-4 text-center text-[11px] text-slate-400">
                      Nenhum cliente cadastrado ainda.
                    </p>
                  ) : clientesVisiveis.length === 0 ? (
                    <p className="px-2 py-4 text-center text-[11px] text-slate-400">
                      Nenhum cliente encontrado para “{busca}”.
                    </p>
                  ) : (
                    <>
                      <p className="mb-0.5 px-1.5 text-[9.5px] font-black uppercase tracking-[.14em] text-slate-400">
                        {busca ? 'Resultados' : 'Atendidos recentemente'}
                      </p>
                      {clientesVisiveis.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => escolher(c.id)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-50"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                            {iniciaisDe(c.name || '')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-semibold text-slate-700">
                              {c.name}
                            </span>
                            {c.cpfCnpj && (
                              <span className="block truncate text-[10px] text-slate-400">
                                {formatarCpfCnpj(c.cpfCnpj)}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>

              </>
            )}

            {/* Sempre dois botões lado a lado, nunca empilhados. */}
            <div className="mt-auto flex gap-1.5 border-t border-slate-100 pt-2">
              {clienteEscolhido ? (
                <button
                  type="button"
                  onClick={() => {
                    setClienteId('');
                    setBusca('');
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 hover:bg-slate-100"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="text-[11px] font-bold text-slate-600">Trocar cliente</span>
                </button>
              ) : (
                clientes.length > VISIVEIS && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaTodos(busca);
                      setTodosAbertos(true);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 hover:bg-slate-100"
                  >
                    <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="text-[11px] font-bold text-slate-600">
                      Ver todos ({clientes.length})
                    </span>
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setNovoClienteAberto(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#071B3A] py-2 hover:bg-[#122c52]"
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                <span className="text-[11px] font-bold text-white">Cadastrar</span>
              </button>
            </div>
          </div>

          {/* Lista completa por cima da página — sem trocar de tela. */}
          {todosAbertos && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B3A]/50 p-4 backdrop-blur-[2px]"
              onClick={() => setTodosAbertos(false)}
              role="presentation"
            >
              <div
                className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Todos os clientes"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div>
                    <h3 className="text-[13px] font-extrabold text-[#071B3A]">Todos os clientes</h3>
                    <p className="mt-0.5 text-[10.5px] text-slate-500">
                      {clientesModal.length} de {clientes.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTodosAbertos(false)}
                    className="rounded-lg p-1.5 hover:bg-slate-100"
                    aria-label="Fechar"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>

                <div className="border-b border-slate-100 px-4 py-2.5">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      autoFocus
                      value={buscaTodos}
                      onChange={(e) => setBuscaTodos(e.target.value)}
                      placeholder="buscar por nome, CPF ou telefone"
                      className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                    />
                    {buscaTodos && (
                      <button type="button" onClick={() => setBuscaTodos('')} aria-label="Limpar">
                        <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                  {clientesModal.length === 0 && (
                    <p className="px-4 py-10 text-center text-[12px] text-slate-400">
                      Nenhum cliente encontrado.
                    </p>
                  )}
                  {clientesModal.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => escolher(c.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
                        {iniciaisDe(c.name || '')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-[#071B3A]">
                          {c.name}
                        </span>
                        <span className="block truncate text-[10.5px] text-slate-500">
                          {[formatarCpfCnpj(c.cpfCnpj), formatarTelefone(c.phone)]
                            .filter(Boolean)
                            .join(' · ') || 'sem CPF e telefone cadastrados'}
                        </span>
                      </span>
                      {ultimoEnvioPorCliente.has(c.id) && (
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                          recente
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setNovoClienteAberto(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#071B3A] py-2.5 text-[12px] font-bold text-white hover:bg-[#122c52]"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
                    Cadastrar novo cliente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. O que vai ser assinado */}
        <div className="col-span-12 flex flex-col lg:col-span-5">
          <PassoRotulo numero={2} texto="O que vai ser assinado" />
          <div className="flex flex-1 flex-col rounded-xl bg-white p-2">
            <div className="grid grid-cols-2 gap-2">
              {opcoesModo.map(({ chave, Icone, titulo, sub }) => {
                const sel = modo === chave;
                return (
                  <button
                    key={chave}
                    type="button"
                    onClick={() => setModo(chave)}
                    aria-pressed={sel}
                    className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition ${
                      sel
                        ? 'border-2 border-[#071B3A] bg-white shadow-[0_2px_8px_-2px_rgba(7,27,58,.18)]'
                        : 'border border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        sel
                          ? 'bg-[#071B3A] text-[#D4AF37]'
                          : 'border border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      <Icone className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-[12.5px] leading-tight ${
                          sel ? 'font-extrabold text-[#071B3A]' : 'font-bold text-slate-600'
                        }`}
                      >
                        {titulo}
                      </span>
                      <span
                        className={`mt-0.5 block text-[10.5px] leading-tight ${
                          sel ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {sub}
                      </span>
                    </span>
                    {sel && (
                      <span className="absolute -right-2 -top-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#071B3A] text-[#D4AF37] ring-2 ring-white">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="my-2 h-px bg-slate-100" />

            {modo === 'DOC' ? (
              <div className="flex flex-1 flex-col gap-1.5">
                {arquivos.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-2.5 py-1.5"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="flex-1 truncate text-[12px] font-semibold text-slate-700">
                      {a.nome}
                    </span>
                    <button
                      type="button"
                      onClick={() => setArquivos((p) => p.filter((x) => x.id !== a.id))}
                      aria-label={`Remover ${a.nome}`}
                    >
                      <X className="h-3.5 w-3.5 shrink-0 text-slate-300 hover:text-slate-500" />
                    </button>
                  </div>
                ))}

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastando(true);
                  }}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastando(false);
                    if (e.dataTransfer.files?.length) void subirArquivos(e.dataTransfer.files);
                  }}
                  className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 transition ${
                    arrastando ? 'border-[#B68B1C] bg-amber-50/60' : 'border-slate-300 bg-slate-50/60'
                  } ${arquivos.length > 0 ? 'py-2' : 'py-3'}`}
                >
                  {arquivos.length === 0 ? (
                    <>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white">
                        <FileUp className="h-5 w-5 text-[#B68B1C]" />
                      </span>
                      <p className="text-[13px] font-bold text-[#071B3A]">Arraste os PDFs para cá</p>
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={enviando}
                        className="flex items-center gap-1.5 rounded-lg bg-[#071B3A] px-3.5 py-2 text-[11.5px] font-bold text-white disabled:opacity-60"
                      >
                        {enviando ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" />
                        ) : (
                          <FileUp className="h-3.5 w-3.5 text-[#D4AF37]" />
                        )}
                        Procurar no computador
                      </button>
                      <p className="text-[10.5px] text-slate-400">PDF · vários arquivos de uma vez</p>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={enviando}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 disabled:opacity-60"
                    >
                      {enviando ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileUp className="h-3.5 w-3.5" />
                      )}
                      arraste mais PDFs ou procure no computador
                    </button>
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) void subirArquivos(e.target.files);
                    e.target.value = '';
                  }}
                />
                {erroEnvio && <p className="text-[10.5px] font-bold text-rose-600">{erroEnvio}</p>}
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-1.5">
                {kits.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-4 text-center">
                    <Layers className="h-5 w-5 text-slate-400" />
                    <p className="text-[12px] font-bold text-[#071B3A]">
                      Você ainda não montou um Kit
                    </p>
                    <Link
                      href="/kits"
                      className="rounded-lg bg-[#071B3A] px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      Criar meu primeiro Kit
                    </Link>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setListaKitAberta((v) => !v)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${
                        kitEscolhido
                          ? 'border-2 border-[#D4AF37] bg-amber-50/50'
                          : 'border border-slate-200 bg-slate-50'
                      }`}
                    >
                      <Shield
                        className={`h-4 w-4 shrink-0 ${
                          kitEscolhido ? 'text-[#B68B1C]' : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`flex-1 truncate text-[12px] ${
                          kitEscolhido ? 'font-bold text-[#071B3A]' : 'font-semibold text-slate-500'
                        }`}
                      >
                        {kitEscolhido?.name || 'Escolher um Kit Jurídico'}
                      </span>
                      {kitEscolhido ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#B68B1C]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                    </button>

                    {listaKitAberta && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-1">
                        {kits.map((k) => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => {
                              setKitId(k.id);
                              setListaKitAberta(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50"
                          >
                            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-700">
                              {k.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {k.items?.length ?? 0} peças
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {kitEscolhido && !listaKitAberta && (
                      <>
                        <div className="space-y-1 px-2.5">
                          {(kitEscolhido.items || []).map((it) => (
                            <div key={it.id} className="flex items-center gap-2">
                              <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                              <span className="truncate text-[11px] text-slate-600">
                                {it.template?.title || 'Peça do kit'}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setListaKitAberta(true)}
                          className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2"
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-500">trocar de Kit</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Envio */}
        <div className="col-span-12 flex flex-col lg:col-span-3">
          <PassoRotulo numero={3} texto="Envio" />
          <div className="flex flex-1 flex-col gap-2">
            <div
              className={`space-y-0.5 rounded-xl px-3 py-2 ${
                clienteEscolhido
                  ? 'border border-white/15 bg-white/[.08]'
                  : 'border border-white/10 bg-white/5'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">
                Vai para
              </p>
              <p
                className={`truncate text-[12px] font-bold ${
                  clienteEscolhido ? 'text-white' : 'text-slate-400'
                }`}
              >
                {clienteEscolhido?.name || 'nenhum cliente escolhido'}
              </p>
              <p className="truncate text-[10.5px] text-slate-300">
                {clienteEscolhido ? canalCliente || 'sem canal cadastrado' : 'escolha no passo 1'}
              </p>
            </div>

            {/*
              Dourado só quando dá para enviar de verdade. Apagado, o botão
              ainda é clicável de propósito: em vez de não fazer nada, leva o
              advogado ao passo que falta (ver `seguir`).
            */}
            <button
              type="button"
              onClick={seguir}
              className={`flex w-full flex-1 flex-col items-center justify-center gap-1 rounded-xl transition ${
                podeEnviar
                  ? 'bg-gradient-to-br from-[#E0BD48] to-[#B68B1C] text-[#071B3A] shadow-[0_8px_20px_-8px_rgba(212,175,55,.7)] hover:from-[#E8C85C]'
                  : 'border border-white/15 bg-white/10 text-slate-400 hover:bg-white/[.14]'
              }`}
            >
              <Send className={`h-5 w-5 ${podeEnviar ? '' : 'opacity-50'}`} />
              <span className="text-[13px] font-extrabold leading-none">
                {modo === 'KIT'
                  ? 'Gerar e enviar Kit'
                  : arquivos.length > 0
                    ? `Enviar ${arquivos.length} ${arquivos.length === 1 ? 'documento' : 'documentos'}`
                    : 'Enviar para assinatura'}
              </span>
              <span className="text-[10px] font-bold opacity-80">
                {podeEnviar ? 'revisar assinantes' : faltaPara}
              </span>
            </button>

            <Link
              href="/documentos"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 py-2 text-[11.5px] font-bold text-white"
            >
              <QrCode className="h-3.5 w-3.5" />
              Assinar aqui por QR
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-4 border-t border-white/10 pt-2.5">
        <span className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
          <Shield className="h-3 w-3 text-[#D4AF37]" />
          Certificado de evidências
        </span>
        <span className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
          <UserRound className="h-3 w-3 text-[#D4AF37]" />
          Selfie e prova de presença
        </span>
        <span className="flex items-center gap-1.5 text-[10.5px] text-slate-300">
          <CheckCircle2 className="h-3 w-3 text-[#D4AF37]" />
          Assinatura a rogo com testemunhas
        </span>
        {tempoMedioMinutos !== null && (
          <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-slate-400">
            <Clock3 className="h-3 w-3" />
            seus clientes assinam em{' '}
            <strong className="font-black text-white">{textoDuracao(tempoMedioMinutos)}</strong> em
            média
          </span>
        )}
      </div>

      <NovoClienteModal
        open={novoClienteAberto}
        editingClient={null}
        onClose={() => setNovoClienteAberto(false)}
        onSaved={aoCadastrarCliente}
      />
    </div>
  );
}

/* ═══════════════════════════ 2. INDICADORES OPERACIONAIS ════════════════════════════ */


/**
 * Cinco indicadores exclusivamente OPERACIONAIS.
 * Métricas de vaidade ("Tempo até assinar", "Taxa de conclusão: 100%") foram removidas.
 * Todos os 5 cards são clicáveis para filtrar/navegar direto para os registros.
 */
export function IndicadoresEscritorio({
  indicadores,
  documentosAPrepararCount = 0,
  pendenciasCount = 0,
  vencidasCount = 0,
  hojeCount = 0,
  prazosSeteDiasCount = 0,
  temAlgumPrazoCadastrado = false,
  vencidos = 0,
  prazosHoje = 0,
  processosSemPrazo = 0,
  onCardClick,
}: {
  indicadores: IndicadoresPainel;
  documentosAPrepararCount?: number;
  pendenciasCount?: number;
  vencidasCount?: number;
  hojeCount?: number;
  prazosSeteDiasCount?: number;
  temAlgumPrazoCadastrado?: boolean;
  vencidos?: number;
  prazosHoje?: number;
  processosSemPrazo?: number;
  onCardClick?: (tipo: 'AGUARDANDO' | 'PREPARAR' | 'PENDENCIAS' | 'PRAZOS' | 'CONCLUIDOS') => void;
}) {
  const totalVencidos = vencidasCount || vencidos;
  const totalHoje = hojeCount || prazosHoje;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {/* CARD 1 — AGUARDANDO ASSINATURA */}
      <button
        type="button"
        onClick={() => onCardClick?.('AGUARDANDO')}
        className="group text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
      >
        <Cartao className="p-4 transition-all duration-150 group-hover:border-[#071B3A] group-hover:shadow-md">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-[#071B3A]">
              Aguardando assinatura
            </p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 group-hover:bg-amber-100 transition-colors">
              <Clock3 className="h-3.5 w-3.5 text-amber-600" />
            </span>
          </div>
          <p className="mt-2.5 text-[30px] font-black leading-none text-[#071B3A]">
            {indicadores.aguardando}
          </p>
          <p className="mt-1.5 text-[11px]">
            {indicadores.aguardandoParados > 0 ? (
              <>
                <span className="font-bold text-amber-600">
                  {indicadores.aguardandoParados} parada{indicadores.aguardandoParados === 1 ? '' : 's'}
                </span>{' '}
                <span className="text-slate-400">há mais de 2 dias</span>
              </>
            ) : (
              <span className="text-slate-400">todas dentro do prazo</span>
            )}
          </p>
        </Cartao>
      </button>

      {/* CARD 2 — DOCUMENTOS A PREPARAR */}
      <button
        type="button"
        onClick={() => onCardClick?.('PREPARAR')}
        className="group text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
      >
        <Cartao className="p-4 transition-all duration-150 group-hover:border-[#071B3A] group-hover:shadow-md">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-[#071B3A]">
              Documentos a preparar
            </p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
            </span>
          </div>
          <p className="mt-2.5 text-[30px] font-black leading-none text-[#071B3A]">
            {documentosAPrepararCount}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {documentosAPrepararCount > 0 ? (
              <span className="font-bold text-blue-600">clientes sem documentos gerados</span>
            ) : (
              'nenhum documento pendente'
            )}
          </p>
        </Cartao>
      </button>

      {/* CARD 3 — AÇÕES / PENDÊNCIAS */}
      <button
        type="button"
        onClick={() => onCardClick?.('PENDENCIAS')}
        className="group text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
      >
        <Cartao className="p-4 transition-all duration-150 group-hover:border-[#071B3A] group-hover:shadow-md">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-[#071B3A]">
              Ações / Pendências
            </p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 group-hover:bg-rose-100 transition-colors">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            </span>
          </div>
          <p
            className={`mt-2.5 text-[30px] font-black leading-none ${
              totalVencidos + totalHoje > 0 ? 'text-rose-600' : 'text-[#071B3A]'
            }`}
          >
            {pendenciasCount}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {totalVencidos > 0 || totalHoje > 0 ? (
              <>
                <span className="font-bold text-rose-600">{totalVencidos} vencidas</span>
                <span className="text-slate-400"> · {totalHoje} para hoje</span>
              </>
            ) : pendenciasCount > 0 ? (
              `${pendenciasCount} pendência(s) em dia`
            ) : (
              'nenhuma pendência aberta'
            )}
          </p>

        </Cartao>
      </button>

      {/* CARD 4 — PRAZOS PRÓXIMOS */}
      <button
        type="button"
        onClick={() => onCardClick?.('PRAZOS')}
        className="group text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
      >
        <Cartao className="p-4 transition-all duration-150 group-hover:border-[#071B3A] group-hover:shadow-md">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-[#071B3A]">
              Prazos próximos
            </p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
              <Scale className="h-3.5 w-3.5 text-indigo-600" />
            </span>
          </div>
          <p className="mt-2.5 text-[30px] font-black leading-none text-[#071B3A]">
            {temAlgumPrazoCadastrado ? prazosSeteDiasCount : '—'}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {temAlgumPrazoCadastrado ? (
              prazosSeteDiasCount > 0 ? (
                <span className="font-bold text-indigo-600">nos próximos 7 dias</span>
              ) : (
                'nenhum nos próx. 7 dias'
              )
            ) : (
              'nenhum prazo cadastrado'
            )}
          </p>
        </Cartao>
      </button>

      {/* CARD 5 — CONCLUÍDOS */}
      <button
        type="button"
        onClick={() => onCardClick?.('CONCLUIDOS')}
        className="group text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
      >
        <Cartao className="p-4 transition-all duration-150 group-hover:border-[#071B3A] group-hover:shadow-md">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-[#071B3A]">
              Concluídos
            </p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 group-hover:bg-teal-100 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
            </span>
          </div>
          <p className="mt-2.5 text-[30px] font-black leading-none text-[#071B3A]">
            {indicadores.assinadosNoMes}
          </p>
          <p className="mt-1.5 text-[11px]">
            {indicadores.variacaoMes !== null ? (
              <>
                <span
                  className={`font-bold ${
                    indicadores.variacaoMes >= 0 ? 'text-teal-600' : 'text-amber-600'
                  }`}
                >
                  {indicadores.variacaoMes >= 0 ? '+' : ''}
                  {indicadores.variacaoMes}
                </span>{' '}
                <span className="text-slate-400">vs. mês anterior</span>
              </>
            ) : (
              <span className="text-slate-400">neste mês</span>
            )}
          </p>
        </Cartao>
      </button>
    </div>
  );
}

/* ═════════════════════════ 3. ASSINATURAS EM ANDAMENTO ══════════════════════════════ */

/**
 * Especializada exclusivamente no fluxo de assinaturas.
 * Prioriza envios pendentes e parciais (0 de 6, 4 de 6).
 * Inclui barras de progresso reais, identificação de quem falta assinar e menu contextual `...`.
 */
export function CardAssinaturas({
  assinaturas,
  className = '',
  onCobrar,
  onCopiarLink,
  onVerDocumento,
  onVerCliente,
}: {
  assinaturas: AssinaturaAndamento[];
  className?: string;
  onCobrar?: (ass: AssinaturaAndamento) => void;
  onCopiarLink?: (ass: AssinaturaAndamento) => void;
  onVerDocumento?: (ass: AssinaturaAndamento) => void;
  onVerCliente?: (clienteId: string) => void;
}) {
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);

  const pendentes = useMemo(
    () => assinaturas.filter((a) => a.estado !== 'CONCLUIDO'),
    [assinaturas]
  );
  const concluidas = useMemo(
    () => assinaturas.filter((a) => a.estado === 'CONCLUIDO'),
    [assinaturas]
  );

  return (
    <Cartao className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-black uppercase tracking-wide text-[#0B192C]">
            Assinaturas em Andamento
          </h3>
          <span className="rounded-full bg-[#B68B1C] px-2 py-0.5 text-[10px] font-black text-white">
            {pendentes.length}
          </span>
        </div>
        <Link href="/documentos" className="text-[11px] font-bold text-[#B68B1C] hover:underline">
          Ver todas
        </Link>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {pendentes.length === 0 ? (
          <div className="px-5 py-8 text-center space-y-2">
            <CheckCircle2 className="h-7 w-7 text-teal-500 mx-auto" />
            <p className="text-[12px] font-extrabold text-slate-800">
              Nenhuma assinatura aguardando
            </p>
            <p className="text-[11px] text-slate-400">
              Use o fluxo rápido no topo para enviar documentos.
            </p>
          </div>
        ) : (
          pendentes.map((a) => {
            const faltamCount = Math.max(0, a.total - a.assinados);
            const percentual = Math.round((a.assinados / Math.max(1, a.total)) * 100);

            return (
              <div key={a.id} className="relative px-4 py-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#071B3A] text-[11px] font-black text-[#D4AF37]">
                    {a.iniciais}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => a.clienteId && onVerCliente?.(a.clienteId)}
                        className="truncate text-[12.5px] font-extrabold text-[#071B3A] hover:text-[#B68B1C] text-left"
                      >
                        {a.cliente}
                      </button>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                          a.estado === 'PARADO'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {a.assinados} de {a.total} ({percentual}%)
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[11px] text-slate-600 font-medium">
                      {a.titulo}
                      {a.pecas > 1 ? ` · ${a.pecas} peças` : ''}
                    </p>

                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        {a.estado === 'PARADO' ? (
                          <span className="font-bold text-rose-600">
                            parada há {a.diasDesdeEnvio} dias
                          </span>
                        ) : (
                          `enviado há ${a.diasDesdeEnvio} dia(s)`
                        )}
                      </span>
                      {faltamCount > 0 && (
                        <span className="font-bold text-slate-500">
                          {faltamCount === 1 ? 'falta 1 assinatura' : `faltam ${faltamCount} assinaturas`}
                        </span>
                      )}
                    </div>

                    {/* Barra de progresso real */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          a.estado === 'PARADO' ? 'bg-rose-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="relative shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onCobrar?.(a)}
                      className="rounded-lg bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 text-[10.5px] font-extrabold text-white transition-colors"
                    >
                      Cobrar
                    </button>

                    {/* Botão Context Menu (...) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMenuAbertoId(menuAbertoId === a.id ? null : a.id)}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                        aria-label="Mais opções"
                      >
                        ⋯
                      </button>

                      {menuAbertoId === a.id && (
                        <div className="absolute right-0 z-30 mt-1 w-40 rounded-xl bg-white p-1 shadow-lg border border-slate-200 text-[11px] font-semibold text-slate-700">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuAbertoId(null);
                              onVerDocumento?.(a);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400" /> Abrir documento
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuAbertoId(null);
                              onCopiarLink?.(a);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-400" /> Copiar link
                          </button>
                          {a.clienteId && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAbertoId(null);
                                onVerCliente?.(a.clienteId);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
                            >
                              <UserRound className="w-3.5 h-3.5 text-slate-400" /> Ver cliente
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ÁREA INFERIOR SECUNDÁRIA — Concluídas Recentemente */}
      {concluidas.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-2.5">
          <button
            type="button"
            onClick={() => setMostrarConcluidas((v) => !v)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 px-1"
          >
            <span>Ver {concluidas.length} concluída(s) recentemente</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mostrarConcluidas ? 'rotate-180' : ''}`} />
          </button>

          {mostrarConcluidas && (
            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto divide-y divide-slate-100 pt-1">
              {concluidas.map((c) => (
                <div key={c.id} className="pt-1.5 flex items-center justify-between text-[11px]">
                  <span className="truncate font-semibold text-slate-800">{c.cliente} — {c.titulo}</span>
                  <span className="shrink-0 text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                    Concluído
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Cartao>
  );
}

/* ═══════════════ 4. CENTRAL DE ACOMPANHAMENTO (QUEUE OPERACIONAL) ═══════════════ */

export interface ItemCentralAcompanhamento {
  id: string;
  tipoResponsabilidade: 'NOS' | 'CLIENTE' | 'TERCEIRO' | 'FUTURO';
  rotuloResponsabilidade: string;
  cliente: string;
  clienteId?: string;
  titulo: string;
  detalhe: string;
  badgeData?: string;
  urgente?: boolean;
  acaoLabel: string;
  onAcao?: () => void;
}

/**
 * Central de Acompanhamento operando como Fila de Gestão do Escritório.
 * Organizada em 4 Abas Operacionais:
 *  - PARA FAZER (depende de nós)
 *  - AGUARDANDO (depende de cliente, órgão ou terceiro)
 *  - EM BREVE (prazos e acompanhamentos futuros)
 *  - CONCLUÍDOS (histórico recente)
 */
export function AvisosAcompanhamentos({
  avisosSistema,
  clientes,
  pendencies = [],
  titulo = 'Central de Acompanhamento',
  subtitulo = 'O que está acontecendo e qual é o próximo passo',
  className = '',
  onNovaPendencia,
  onVerCliente,
}: {
  avisosSistema: Aviso[];
  clientes: ClientePainel[];
  pendencies?: any[];
  titulo?: string;
  subtitulo?: string;
  className?: string;
  onNovaPendencia?: () => void;
  onVerCliente?: (clienteId: string) => void;
}) {
  const [aba, setAba] = useState<'FAZER' | 'AGUARDANDO' | 'EM_BREVE' | 'CONCLUIDOS'>('FAZER');

  // Transforma pendências do banco + avisos de sistema no modelo operacional
  const itensParaFazer = useMemo(() => {
    const itens: ItemCentralAcompanhamento[] = [];

    // Pendências manuais sem resolução
    pendencies
      .filter((p) => !p.resolvedAt)
      .forEach((p) => {
        itens.push({
          id: p.id,
          tipoResponsabilidade: 'NOS',
          rotuloResponsabilidade: 'DEPENDE DE NÓS',
          cliente: p.client?.name || 'Escritório',
          clienteId: p.clientId || '',
          titulo: p.description,
          detalhe: p.priority === 'URGENTE' ? 'Prioridade urgente' : 'Ação pendente do escritório',

          urgente: p.priority === 'URGENTE' || p.priority === 'ALTA',
          acaoLabel: 'Concluir',
        });
      });

    // Avisos de sistema que exigem ação do escritório (ex: abrir processo, completar cadastro)
    avisosSistema.forEach((a) => {
      itens.push({
        id: a.id,
        tipoResponsabilidade: 'NOS',
        rotuloResponsabilidade: 'DEPENDE DE NÓS',
        cliente: a.titulo,
        titulo: a.detalhe,
        detalhe: 'Identificado pelo sistema',
        urgente: a.nivel === 'CRITICO',
        acaoLabel: a.acao || 'Ver',
      });
    });

    return itens;
  }, [pendencies, avisosSistema]);

  const itensAguardando = useMemo(() => {
    const itens: ItemCentralAcompanhamento[] = [];
    // Serão alimentados via documentos/assinaturas pendentes do escritório
    return itens;
  }, []);

  const itensConcluidos = useMemo<ItemCentralAcompanhamento[]>(() => {
    return pendencies
      .filter((p) => Boolean(p.resolvedAt))
      .map((p) => ({
        id: p.id,
        tipoResponsabilidade: 'NOS' as const,
        rotuloResponsabilidade: 'CONCLUÍDO',
        cliente: p.client?.name || 'Escritório',
        clienteId: p.clientId || '',
        titulo: p.description,
        detalhe: `Resolvido em ${p.resolvedAt ? new Date(p.resolvedAt).toLocaleDateString('pt-BR') : ''}`,
        acaoLabel: 'Resolvido',
      }));
  }, [pendencies]);


  const itensExibidos = useMemo(() => {
    if (aba === 'FAZER') return itensParaFazer;
    if (aba === 'AGUARDANDO') return itensAguardando;
    if (aba === 'CONCLUIDOS') return itensConcluidos;
    return [];
  }, [aba, itensParaFazer, itensAguardando, itensConcluidos]);

  return (
    <Cartao className={`flex flex-col ${className}`}>
      <div className="border-b border-slate-100 px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[12px] font-black uppercase tracking-wide text-[#0B192C]">
              {titulo}
            </h3>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{subtitulo}</p>
          </div>
          <button
            type="button"
            onClick={() => onNovaPendencia?.()}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#071B3A] hover:bg-[#122c52] px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
            Novo aviso
          </button>
        </div>

        {/* Abas Operacionais */}
        <div className="mt-3 flex items-center gap-3 border-b border-slate-100 text-[11.5px] font-bold">
          <button
            type="button"
            onClick={() => setAba('FAZER')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              aba === 'FAZER'
                ? 'border-[#B68B1C] text-[#071B3A] font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Para Fazer
            <span
              className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-black ${
                aba === 'FAZER' ? 'bg-[#071B3A] text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {itensParaFazer.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAba('AGUARDANDO')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              aba === 'AGUARDANDO'
                ? 'border-[#B68B1C] text-[#071B3A] font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Aguardando
          </button>

          <button
            type="button"
            onClick={() => setAba('EM_BREVE')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              aba === 'EM_BREVE'
                ? 'border-[#B68B1C] text-[#071B3A] font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Em Breve
          </button>

          <button
            type="button"
            onClick={() => setAba('CONCLUIDOS')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              aba === 'CONCLUIDOS'
                ? 'border-[#B68B1C] text-[#071B3A] font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Concluídos
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9.5px] font-black text-slate-500">
              {itensConcluidos.length}
            </span>
          </button>
        </div>
      </div>

      {/* Fila de Itens */}
      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {itensExibidos.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center space-y-1">
            <CheckCircle2 className="h-6 w-6 text-teal-500" />
            <p className="text-[11.5px] font-bold text-slate-800">
              {aba === 'FAZER'
                ? 'Tudo em dia nesta fila.'
                : aba === 'AGUARDANDO'
                ? 'Nenhum item aguardando terceiro.'
                : aba === 'EM_BREVE'
                ? 'Nenhum acompanhamento futuro agendado.'
                : 'Nenhum item concluído recentemente.'}
            </p>
            <p className="text-[10.5px] text-slate-400">
              Use o botão "+ Novo aviso" para registrar pendências do escritório.
            </p>
          </div>
        ) : (
          itensExibidos.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-slate-50/70 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wide ${
                      item.tipoResponsabilidade === 'NOS'
                        ? 'bg-[#071B3A] text-white'
                        : item.tipoResponsabilidade === 'CLIENTE'
                        ? 'bg-amber-100 text-amber-800'
                        : item.tipoResponsabilidade === 'TERCEIRO'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {item.rotuloResponsabilidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => item.clienteId && onVerCliente?.(item.clienteId)}
                    className="truncate text-[12px] font-extrabold text-[#071B3A] hover:text-[#B68B1C] text-left"
                  >
                    {item.cliente}
                  </button>
                </div>

                <p className="mt-0.5 text-[11px] font-semibold text-slate-700 leading-snug">
                  {item.titulo}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400 truncate">
                  {item.detalhe}
                </p>
              </div>

              <button
                type="button"
                onClick={() => item.onAcao?.()}
                className="shrink-0 text-[10.5px] font-bold text-[#B68B1C] hover:underline pt-0.5"
              >
                {item.acaoLabel}
              </button>
            </div>
          ))
        )}
      </div>
    </Cartao>
  );
}

/* ═════════════════════ 5. KITS MAIS USADOS (extra) ═════════════════════ */

export function KitsMaisUsados({
  kits,
  aoUsar,
  className = '',
}: {
  kits: KitUsado[];
  aoUsar?: (id: string) => void;
  className?: string;
}) {
  const maxEnvios = Math.max(1, ...kits.map((k) => k.envios));
  return (
    <Cartao className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div>
          <h2 className="text-[13px] font-extrabold text-[#071B3A]">Seus Kits mais usados</h2>
          <p className="mt-0.5 text-[10.5px] text-slate-500">Envie em um clique</p>
        </div>
        <Link href="/kits" className="text-[11px] font-bold text-[#B68B1C]">
          Todos →
        </Link>
      </div>
      <div className="flex-1 divide-y divide-slate-100">
        {kits.length === 0 && (
          <p className="px-5 py-8 text-center text-[12px] text-slate-400">
            Nenhum kit montado ainda.
          </p>
        )}
        {kits.map((k) => (
          <div key={k.id} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-[#071B3A]">{k.nome}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(k.envios / maxEnvios) * 100}%`, background: RAMPA[3] }}
                  />
                </div>
                <span className="shrink-0 text-[10.5px] text-slate-500">
                  {k.envios} envio{k.envios === 1 ? '' : 's'} · {k.pecas} peças
                </span>
              </div>
            </div>
            {aoUsar ? (
              <button
                type="button"
                onClick={() => aoUsar(k.id)}
                className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition group-hover:bg-[#071B3A] group-hover:text-white"
              >
                Usar
              </button>
            ) : (
              <Link
                href={`/kits/enviar?kitId=${k.id}`}
                className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition group-hover:bg-[#071B3A] group-hover:text-white"
              >
                Usar
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-5 py-3">
        <Link
          href="/kits"
          className="block w-full rounded-lg border border-dashed border-slate-300 py-2.5 text-center text-[11.5px] font-bold text-slate-500 transition hover:border-[#B68B1C] hover:text-[#B68B1C]"
        >
          + Criar novo Kit
        </Link>
      </div>
    </Cartao>
  );
}

