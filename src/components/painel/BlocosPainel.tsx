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
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  FileUp,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  QrCode,
  Scale,
  Search,
  Send,
  Shield,
  TrendingUp,
  UserRound,
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
}: {
  clientes: ClientePainel[];
  kits: KitPainel[];
  processos: any[];
  documentos: any[];
  kitPreferidoId?: string;
  tempoMedioMinutos: number | null;
}) {
  const router = useRouter();

  const [modo, setModo] = useState<'DOC' | 'KIT'>('DOC');
  const [clienteId, setClienteId] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState('');
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

  const clientesFiltrados = useMemo(() => {
    const alvo = busca.trim().toLowerCase();
    const base = alvo
      ? clientes.filter(
          (c) =>
            String(c.name || '').toLowerCase().includes(alvo) ||
            soDigitos(c.cpfCnpj).includes(soDigitos(alvo)) ||
            soDigitos(c.phone).includes(soDigitos(alvo))
        )
      : clientes;
    return base.slice(0, 8);
  }, [clientes, busca]);

  const clientesRecentes = useMemo(() => {
    const ultimo = new Map<string, number>();
    documentos.forEach((d) => {
      const id = d.clientId || d.client?.id;
      if (!id) return;
      const t = new Date(d.createdAt || 0).getTime();
      if (!ultimo.has(id) || t > (ultimo.get(id) as number)) ultimo.set(id, t);
    });
    return clientes
      .filter((c) => ultimo.has(c.id))
      .sort((a, b) => (ultimo.get(b.id) || 0) - (ultimo.get(a.id) || 0))
      .slice(0, 3);
  }, [clientes, documentos]);

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

  function seguir() {
    if (!podeEnviar) return;
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
          <div className="flex flex-1 flex-col rounded-xl bg-white p-2">
            <button
              type="button"
              onClick={() => setBuscaAberta((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left hover:bg-slate-50"
            >
              {clienteEscolhido ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#071B3A] text-[12px] font-black text-[#D4AF37]">
                  {iniciaisDe(clienteEscolhido.name || '')}
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <UserRound className="h-4 w-4 text-slate-400" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[13px] ${
                    clienteEscolhido ? 'font-bold text-[#071B3A]' : 'font-semibold text-slate-400'
                  }`}
                >
                  {clienteEscolhido?.name || 'Selecionar cliente'}
                </span>
                <span className="block truncate text-[10.5px] text-slate-500">
                  {clienteEscolhido
                    ? [
                        formatarCpfCnpj(clienteEscolhido.cpfCnpj),
                        formatarTelefone(clienteEscolhido.phone),
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'sem CPF e telefone cadastrados'
                    : 'buscar por nome, CPF ou telefone'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            {buscaAberta && (
              <div className="mt-1.5 rounded-lg border border-slate-200 bg-white p-1.5">
                <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    autoFocus
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="nome, CPF ou telefone"
                    className="w-full bg-transparent text-[12px] text-slate-700 outline-none"
                  />
                </div>
                <div className="mt-1 max-h-44 overflow-y-auto">
                  {clientesFiltrados.length === 0 && (
                    <p className="px-2 py-2 text-[11px] text-slate-400">Nenhum cliente encontrado.</p>
                  )}
                  {clientesFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClienteId(c.id);
                        setBuscaAberta(false);
                        setBusca('');
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-black text-slate-600">
                        {iniciaisDe(c.name || '')}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-700">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatarCpfCnpj(c.cpfCnpj)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!buscaAberta && clienteEscolhido && (
              <>
                <div className="mt-1.5 flex items-center gap-1.5 px-1.5">
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
            )}

            {!buscaAberta && !clienteEscolhido && clientesRecentes.length > 0 && (
              <div className="mt-2 border-t border-slate-100 pt-2">
                <p className="mb-1 px-1.5 text-[9.5px] font-black uppercase tracking-[.14em] text-slate-400">
                  Atendidos recentemente
                </p>
                {clientesRecentes.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClienteId(c.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-slate-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                      {iniciaisDe(c.name || '')}
                    </span>
                    <span className="flex-1 truncate text-[12px] font-semibold text-slate-700">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto flex gap-1.5 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setBuscaAberta(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 hover:bg-slate-100"
              >
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[11px] font-bold text-slate-600">
                  {clienteEscolhido ? 'Trocar cliente' : 'Buscar'}
                </span>
              </button>
              <Link
                href="/clientes?novo=1"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#071B3A] py-2 hover:bg-[#122c52]"
              >
                <Plus className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span className="text-[11px] font-bold text-white">Cadastrar</span>
              </Link>
            </div>
          </div>
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

            <button
              type="button"
              onClick={seguir}
              disabled={!podeEnviar}
              className={`flex w-full flex-1 flex-col items-center justify-center gap-1 rounded-xl ${
                podeEnviar
                  ? 'bg-gradient-to-br from-[#E0BD48] to-[#B68B1C] text-[#071B3A] shadow-[0_8px_20px_-8px_rgba(212,175,55,.7)]'
                  : 'cursor-not-allowed border border-white/15 bg-white/10 text-slate-400'
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
              <span className="text-[10px] font-bold opacity-70">
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
    </div>
  );
}

/* ═══════════════════════════ 2. INDICADORES ════════════════════════════ */

/**
 * Cinco números. Cada um mostra "—" quando não há base suficiente: um painel
 * que exibe 0% de conclusão no primeiro dia mente para o advogado.
 */
export function IndicadoresEscritorio({
  indicadores,
  vencidos,
  prazosHoje,
  temAlgumPrazoCadastrado,
  processosSemPrazo,
}: {
  indicadores: IndicadoresPainel;
  vencidos: number;
  prazosHoje: number;
  temAlgumPrazoCadastrado: boolean;
  processosSemPrazo: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Cartao className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold text-slate-500">Aguardando assinatura</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
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
            <span className="text-slate-400">nenhuma parada</span>
          )}
        </p>
      </Cartao>

      <Cartao className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold text-slate-500">Assinados no mês</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
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
            <span className="text-slate-400">primeiro mês de histórico</span>
          )}
        </p>
      </Cartao>

      <Cartao className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold text-slate-500">Prazos críticos</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          </span>
        </div>
        <p
          className={`mt-2.5 text-[30px] font-black leading-none ${
            vencidos + prazosHoje > 0 ? 'text-rose-600' : 'text-[#071B3A]'
          }`}
        >
          {temAlgumPrazoCadastrado ? vencidos + prazosHoje : '—'}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {temAlgumPrazoCadastrado
            ? `${vencidos} vencido${vencidos === 1 ? '' : 's'} · ${prazosHoje} vence${prazosHoje === 1 ? '' : 'm'} hoje`
            : `${processosSemPrazo} processo(s) sem data`}
        </p>
      </Cartao>

      <Cartao className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold text-slate-500">Tempo até assinar</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
            <Send className="h-3.5 w-3.5 text-indigo-600" />
          </span>
        </div>
        <p className="mt-2.5 text-[30px] font-black leading-none text-[#071B3A]">
          {indicadores.tempoMedioMinutos !== null
            ? textoDuracao(indicadores.tempoMedioMinutos)
            : '—'}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {indicadores.tempoMedioMinutos !== null
            ? 'do envio à assinatura, mediana'
            : 'precisa de 3 assinaturas medidas'}
        </p>
      </Cartao>

      <Cartao className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-bold text-slate-500">Taxa de conclusão</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
          </span>
        </div>
        <p className="mt-2.5 text-[30px] font-black leading-none text-[#071B3A]">
          {indicadores.taxaConclusao !== null ? `${indicadores.taxaConclusao}%` : '—'}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400">
          {indicadores.taxaConclusao !== null
            ? 'dos envios são assinados'
            : `precisa de 5 envios encerrados (tem ${indicadores.totalAvaliadoTaxa})`}
        </p>
      </Cartao>
    </div>
  );
}

/* ═════════════════ 3. INTIMAÇÕES / ASSINATURAS (abas) ══════════════════ */

/**
 * Uma linha = um ENVIO. Um kit de 3 peças aparece uma vez, não três — a
 * agregação acontece em painelExtra.derivarAssinaturasAndamento.
 *
 * A aba Intimações fica visível mas vazia de propósito: o DJEN ainda não está
 * conectado, e encher a tela com exemplo faria o advogado confiar em dado que
 * não existe.
 */
export function CardIntimacoesAssinaturas({
  assinaturas,
  className = '',
}: {
  assinaturas: AssinaturaAndamento[];
  className?: string;
}) {
  const [aba, setAba] = useState<'INT' | 'ASS'>('ASS');

  return (
    <Cartao className={`flex flex-col ${className}`}>
      <div className="border-b border-slate-100 px-4 pt-3">
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setAba('INT')}
              className={`flex items-center gap-1.5 border-b-2 px-0.5 pb-2 text-[12px] ${
                aba === 'INT'
                  ? 'border-[#B68B1C] font-extrabold text-[#071B3A]'
                  : 'border-transparent font-bold text-slate-400 hover:text-slate-600'
              }`}
            >
              Intimações
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                em breve
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAba('ASS')}
              className={`flex items-center gap-1.5 border-b-2 px-0.5 pb-2 text-[12px] ${
                aba === 'ASS'
                  ? 'border-[#B68B1C] font-extrabold text-[#071B3A]'
                  : 'border-transparent font-bold text-slate-400 hover:text-slate-600'
              }`}
            >
              Assinaturas
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                  aba === 'ASS' ? 'bg-[#B68B1C] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {assinaturas.length}
              </span>
            </button>
          </div>
          <Link href="/documentos" className="pb-2 text-[10px] font-bold text-[#B68B1C]">
            Ver todas
          </Link>
        </div>
      </div>

      {aba === 'INT' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Scale className="h-4 w-4 text-slate-400" />
          </span>
          <p className="text-[12px] font-extrabold text-[#071B3A]">
            Intimações do DJEN ainda não conectadas
          </p>
          <p className="max-w-xs text-[10.5px] leading-relaxed text-slate-500">
            O Diário de Justiça Eletrônico Nacional publica por número de OAB. Informando a OAB do
            escritório, cada publicação aparece aqui já vinculada ao cliente pelo número do processo.
          </p>
          <Link
            href="/configuracoes"
            className="rounded-lg bg-[#071B3A] px-3 py-1.5 text-[11px] font-bold text-white"
          >
            Informar OAB
          </Link>
        </div>
      ) : (
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {assinaturas.length === 0 && (
            <p className="px-5 py-8 text-center text-[11px] text-slate-400">
              Nenhum envio em circulação. Use o fluxo rápido acima.
            </p>
          )}
          {assinaturas.map((a) => (
            <div key={a.id} className="px-4 py-2.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                  {a.iniciais}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[12px] font-bold text-[#071B3A]">{a.cliente}</p>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                        a.estado === 'CONCLUIDO'
                          ? 'bg-teal-50 text-teal-700'
                          : a.estado === 'PARADO'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {a.assinados} de {a.total}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
                    {a.titulo}
                    {a.pecas > 1 ? ` · ${a.pecas} peças` : ''} ·{' '}
                    {a.estado === 'CONCLUIDO' ? (
                      'concluído'
                    ) : a.estado === 'PARADO' ? (
                      <span className="font-bold text-rose-600">
                        parada há {a.diasDesdeEnvio} dias
                      </span>
                    ) : (
                      `há ${a.diasDesdeEnvio} dia(s)`
                    )}
                  </p>
                  <div className="mt-1.5 flex gap-[3px]">
                    {Array.from({ length: a.total }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < a.assinados ? 'bg-teal-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <Link
                  href="/documentos"
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
                    a.estado === 'CONCLUIDO'
                      ? 'border border-slate-200 text-slate-700'
                      : 'bg-teal-600 text-white'
                  }`}
                >
                  {a.estado === 'CONCLUIDO' ? 'Baixar' : 'Cobrar'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Cartao>
  );
}

/* ═══════════════ 4. AVISOS E ACOMPANHAMENTOS (por caso) ════════════════ */

/**
 * Duas origens, marcadas na tela: VOCÊ (escrito à mão, ex. "atualizar o
 * CadÚnico") e SISTEMA (derivado dos dados). O advogado precisa saber quem
 * afirmou o quê antes de agir.
 *
 * Os avisos manuais ficam no navegador. Não é o destino final — quando virar
 * tabela no banco, só a leitura/gravação muda, o bloco continua igual.
 */
export function AvisosAcompanhamentos({
  avisosSistema,
  clientes,
  titulo = 'Avisos e acompanhamentos',
  subtitulo = 'O que você anotou e o que o sistema achou',
  className = '',
}: {
  avisosSistema: Aviso[];
  clientes: ClientePainel[];
  titulo?: string;
  subtitulo?: string;
  className?: string;
}) {
  const [avisosManuais, setAvisosManuais] = useState<AvisoManual[]>([]);
  const [form, setForm] = useState(false);
  const [novo, setNovo] = useState({
    titulo: '',
    clienteId: '',
    detalhe: '',
    acompanharEm: hojeIso(),
  });
  const agora = useMemo(() => new Date(), []);

  useEffect(() => {
    setAvisosManuais(ordenarAvisosManuais(lerAvisosManuais()));
  }, []);

  function salvar() {
    const t = novo.titulo.trim();
    if (!t) return;
    const cli = clientes.find((c) => c.id === novo.clienteId);
    const lista = ordenarAvisosManuais([
      ...avisosManuais,
      {
        id: `m-${Date.now()}`,
        titulo: t,
        cliente: cli?.name || '',
        clienteId: novo.clienteId,
        detalhe: novo.detalhe.trim(),
        acompanharEm: novo.acompanharEm,
        criadoEm: new Date().toISOString(),
      },
    ]);
    setAvisosManuais(lista);
    gravarAvisosManuais(lista);
    setNovo({ titulo: '', clienteId: '', detalhe: '', acompanharEm: hojeIso() });
    setForm(false);
  }

  function remover(id: string) {
    const lista = avisosManuais.filter((a) => a.id !== id);
    setAvisosManuais(lista);
    gravarAvisosManuais(lista);
  }

  const total = avisosManuais.length + avisosSistema.length;

  return (
    <Cartao className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-[12px] font-black uppercase tracking-wide text-[#0B192C]">
            {titulo}
          </h3>
          <p className="mt-0.5 truncate text-[9.5px] font-medium text-slate-400">
            {subtitulo}
            {total > 0 ? ` · ${total}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600 transition hover:bg-[#071B3A] hover:text-white"
        >
          <Plus className="h-3 w-3" />
          Novo aviso
        </button>
      </div>

      {form && (
        <div className="space-y-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <input
            value={novo.titulo}
            onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
            placeholder="Ex.: atualizar o CadÚnico"
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#B68B1C]"
          />
          <div className="flex gap-2">
            <select
              value={novo.clienteId}
              onChange={(e) => setNovo({ ...novo, clienteId: e.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] outline-none focus:border-[#B68B1C]"
            >
              <option value="">Cliente (opcional)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={novo.acompanharEm}
              onChange={(e) => setNovo({ ...novo, acompanharEm: e.target.value })}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11.5px] outline-none focus:border-[#B68B1C]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setForm(false)}
              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={!novo.titulo.trim()}
              className="rounded-lg bg-[#071B3A] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {avisosManuais.map((a) => {
          const q = textoAcompanhamento(a.acompanharEm, agora);
          return (
            <div key={a.id} className="flex items-start gap-2 px-4 py-2 hover:bg-slate-50/70">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 rounded bg-[#071B3A] px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wide text-[#D4AF37]">
                    você
                  </span>
                  <p className="truncate text-[11.5px] font-extrabold text-[#071B3A]">{a.titulo}</p>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {[a.cliente, a.detalhe].filter(Boolean).join(' · ') || 'sem cliente vinculado'}
                </p>
                <p
                  className={`mt-0.5 text-[10px] font-bold ${
                    q.atrasado ? 'text-rose-600' : 'text-slate-500'
                  }`}
                >
                  {q.texto}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remover(a.id)}
                className="shrink-0 text-[10px] font-extrabold text-slate-300 hover:text-rose-600"
              >
                Concluir
              </button>
            </div>
          );
        })}

        {avisosSistema.map((a) => (
          <div key={a.id} className="flex items-start gap-2 px-4 py-2 hover:bg-slate-50/70">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wide text-slate-500">
                  sistema
                </span>
                <p className="truncate text-[11.5px] font-extrabold text-[#071B3A]">{a.titulo}</p>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">{a.detalhe}</p>
              <p
                className={`mt-0.5 text-[10px] font-bold ${
                  a.nivel === 'CRITICO'
                    ? 'text-rose-600'
                    : a.nivel === 'ATENCAO'
                      ? 'text-amber-600'
                      : 'text-slate-500'
                }`}
              >
                {a.nivel === 'CRITICO'
                  ? 'resolver hoje'
                  : a.nivel === 'ATENCAO'
                    ? 'acompanhar'
                    : 'pendente'}
              </p>
            </div>
            <Link href={a.destino} className="shrink-0 text-[10px] font-extrabold text-[#B68B1C]">
              {a.acao}
            </Link>
          </div>
        ))}

        {total === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
            <CheckCircle2 className="h-6 w-6 text-teal-500" />
            <p className="mt-2 text-[11px] font-bold text-teal-900">Nada pendente.</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Use “Novo aviso” para anotar o que precisa acompanhar.
            </p>
          </div>
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
