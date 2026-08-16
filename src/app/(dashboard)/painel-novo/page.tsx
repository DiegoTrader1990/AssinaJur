'use client';

/**
 * PROPOSTA DE PAINEL — rota paralela para avaliação.
 *
 * Fica dentro do grupo (dashboard) apenas para herdar o menu lateral real.
 * NÃO altera a Home: /dashboard continua exatamente como está. Esta tela só é
 * alcançável por /painel-novo.
 *
 * Hierarquia desenhada e aprovada na rodada de protótipo:
 *   saudação → fluxo rápido → indicadores → intimações/assinaturas + avisos
 *   → prazos + mapa → funil → ritmo + kits → rodapé
 *
 * Paleta dos gráficos validada por script (skill dataviz):
 *  - funil: rampa sequencial de uma hue só, L monotônica, ponta clara > 2:1
 *  - estados: crítico/atenção/bom aprovados em separação para daltonismo
 *  - teal no lugar de verde: verde x vermelho reprovava para deutan
 *
 * Regra de dado: nada é inventado. Onde a base ainda não existe (intimações do
 * DJEN), a tela diz o que falta em vez de mostrar exemplo.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import BrazilOperationsMap from '@/components/BrazilOperationsMap';
import {
  montarResumo,
  textoPrazo,
  type ResumoPainel,
} from '@/lib/lab/painelData';
import {
  derivarAssinaturasAndamento,
  derivarIndicadores,
  derivarKitsMaisUsados,
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

/* ─────────────────── Paleta validada — ver cabeçalho ─────────────────── */
const RAMPA_FUNIL = ['#9AAAC4', '#7386A8', '#4D688F', '#28456E', '#0A1F42'];

/* ─────────────────────────── Utilidades de texto ─────────────────────── */

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

function soDigitos(v?: string | null): string {
  return String(v || '').replace(/\D/g, '');
}

function formatarCpfCnpj(v?: string | null): string {
  const d = soDigitos(v);
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return String(v || '');
}

function formatarTelefone(v?: string | null): string {
  const d = soDigitos(v);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(v || '');
}

function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/* ─────────────────────────── Peças visuais ───────────────────────────── */

function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(7,27,58,.05)] ${className}`}
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

/** As duas formas de trabalhar, lado a lado e sempre visíveis. */
function EscolhaModo({
  ativo,
  aoTrocar,
}: {
  ativo: 'DOC' | 'KIT';
  aoTrocar: (m: 'DOC' | 'KIT') => void;
}) {
  const opcoes = [
    { chave: 'DOC' as const, Icone: FileUp, titulo: 'Meus documentos', sub: 'PDFs do meu computador' },
    { chave: 'KIT' as const, Icone: Shield, titulo: 'Kit Jurídico', sub: 'peças já preenchidas' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {opcoes.map(({ chave, Icone, titulo, sub }) => {
          const sel = ativo === chave;
          return (
            <button
              key={chave}
              type="button"
              onClick={() => aoTrocar(chave)}
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
    </>
  );
}

/* ─────────────────────────── Tela ────────────────────────────────────── */

interface ClienteLista {
  id: string;
  name?: string | null;
  cpfCnpj?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

interface KitLista {
  id: string;
  name?: string | null;
  category?: string | null;
  items?: { id: string; template?: { title?: string | null } | null }[] | null;
}

export default function PainelNovoPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [escritorio, setEscritorio] = useState('');

  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [kits, setKits] = useState<KitLista[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [processos, setProcessos] = useState<any[]>([]);
  const [resumo, setResumo] = useState<ResumoPainel | null>(null);

  /* fluxo rápido */
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

  /* card com abas */
  const [aba, setAba] = useState<'INT' | 'ASS'>('ASS');

  /* avisos escritos pelo advogado */
  const [avisosManuais, setAvisosManuais] = useState<AvisoManual[]>([]);
  const [formAviso, setFormAviso] = useState(false);
  const [novoAviso, setNovoAviso] = useState({
    titulo: '',
    clienteId: '',
    detalhe: '',
    acompanharEm: hoje(),
  });

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

      const listaClientes: ClienteLista[] = cli?.clients || [];
      const listaDocumentos: any[] = doc?.documents || [];
      const listaProcessos: any[] = pro?.processes || [];

      setClientes(listaClientes);
      setDocumentos(listaDocumentos);
      setProcessos(listaProcessos);
      setKits(kit?.kits || []);
      setResumo(
        montarResumo(
          {
            clientes: listaClientes as any,
            documentos: listaDocumentos,
            processos: listaProcessos,
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

  useEffect(() => {
    setAvisosManuais(ordenarAvisosManuais(lerAvisosManuais()));
  }, []);

  const agora = useMemo(() => new Date(), []);

  /* ─────────── derivações ─────────── */

  const indicadores: IndicadoresPainel = useMemo(
    () => derivarIndicadores(documentos, agora),
    [documentos, agora]
  );

  const assinaturas: AssinaturaAndamento[] = useMemo(
    () => derivarAssinaturasAndamento(documentos, agora, { kits: kits as any }),
    [documentos, agora, kits]
  );

  const kitsUsados: KitUsado[] = useMemo(
    () => derivarKitsMaisUsados(kits as any, documentos),
    [kits, documentos]
  );

  /**
   * Ao entrar no modo Kit, já vem um kit escolhido — o mais usado do escritório.
   * O advogado troca em um clique, mas não encara uma caixa vazia perguntando
   * "qual kit?" quando 9 em cada 10 vezes a resposta é sempre a mesma.
   */
  useEffect(() => {
    if (modo !== 'KIT' || kitId) return;
    const preferido = kitsUsados[0]?.id || kits[0]?.id;
    if (preferido) setKitId(preferido);
  }, [modo, kitId, kitsUsados, kits]);

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

  /** Clientes com documento mais recente primeiro — atalho do estado inicial. */
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

  // Os dois caminhos exigem cliente: sem ele não há para quem enviar nem como
  // preencher as peças do kit.
  const podeEnviar = Boolean(clienteId) && (modo === 'DOC' ? arquivos.length > 0 : Boolean(kitId));

  const faltaPara = !clienteId
    ? 'escolha o cliente no passo 1'
    : modo === 'KIT'
      ? 'escolha o Kit'
      : 'escolha os documentos';

  /* ─────────── ações do fluxo rápido ─────────── */

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

  const seguir = useCallback(() => {
    if (modo === 'KIT') {
      if (!kitId) return;
      const p = new URLSearchParams({ kitId });
      if (clienteId) p.set('clientId', clienteId);
      router.push(`/kits/enviar?${p.toString()}`);
      return;
    }
    if (arquivos.length === 0) return;
    const p = new URLSearchParams({
      files: arquivos.map((a) => a.id).join(','),
      source: 'dashboard',
    });
    if (clienteId) p.set('clientId', clienteId);
    router.push(`/documentos/novo?${p.toString()}`);
  }, [modo, kitId, arquivos, clienteId, router]);

  /* ─────────── avisos manuais ─────────── */

  const salvarAviso = useCallback(() => {
    const titulo = novoAviso.titulo.trim();
    if (!titulo) return;
    const cli = clientes.find((c) => c.id === novoAviso.clienteId);
    const item: AvisoManual = {
      id: `m-${Date.now()}`,
      titulo,
      cliente: cli?.name || '',
      clienteId: novoAviso.clienteId,
      detalhe: novoAviso.detalhe.trim(),
      acompanharEm: novoAviso.acompanharEm,
      criadoEm: new Date().toISOString(),
    };
    const lista = ordenarAvisosManuais([...avisosManuais, item]);
    setAvisosManuais(lista);
    gravarAvisosManuais(lista);
    setNovoAviso({ titulo: '', clienteId: '', detalhe: '', acompanharEm: hoje() });
    setFormAviso(false);
  }, [novoAviso, clientes, avisosManuais]);

  const removerAviso = useCallback(
    (id: string) => {
      const lista = avisosManuais.filter((a) => a.id !== id);
      setAvisosManuais(lista);
      gravarAvisosManuais(lista);
    },
    [avisosManuais]
  );

  /* ─────────── carregando / erro ─────────── */

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
  const mediaSerie = assinaturasPorDia.length
    ? totalSerie / assinaturasPorDia.length
    : 0;
  // Assinatura parada já é a aba "Assinaturas", com barra de progresso e botão
  // de cobrar. Repetir aqui enchia a coluna com a mesma linha três vezes.
  const avisosSistema = avisos.filter((a) => !a.id.startsWith('assin-')).slice(0, 5);
  const totalAvisos = avisosManuais.length + avisosSistema.length;

  return (
    <div className="space-y-5 pb-8">
      {/* ───────────────────────── SAUDAÇÃO ───────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-extrabold leading-none tracking-tight text-[#071B3A]">
            {saudacao(agora.getHours())}
            {nome ? `, ${nome}` : ''}
          </h1>
          <p className="mt-2 text-[13px] text-slate-500">
            {dataExtensa(agora)}
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
              <> · {indicadores.aguardandoParados} assinaturas paradas</>
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

      {/* ───────────────────────── FLUXO RÁPIDO ───────────────────────── */}
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
          {/* ── 1. Cliente ── */}
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
                      ? [formatarCpfCnpj(clienteEscolhido.cpfCnpj), formatarTelefone(clienteEscolhido.phone)]
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
                      <p className="px-2 py-2 text-[11px] text-slate-400">
                        Nenhum cliente encontrado.
                      </p>
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
                          {processoDoCliente.processNumber
                            ? ` · ${processoDoCliente.processNumber}`
                            : ''}
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

          {/* ── 2. O que vai ser assinado ── */}
          <div className="col-span-12 flex flex-col lg:col-span-5">
            <PassoRotulo numero={2} texto="O que vai ser assinado" />
            <div className="flex flex-1 flex-col rounded-xl bg-white p-2">
              <EscolhaModo ativo={modo} aoTrocar={setModo} />

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
                    className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-3 transition ${
                      arrastando ? 'border-[#B68B1C] bg-amber-50/60' : 'border-slate-300 bg-slate-50/60'
                    } ${arquivos.length > 0 ? 'py-2' : ''}`}
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
                        <p className="text-[10.5px] text-slate-400">
                          PDF · vários arquivos de uma vez
                        </p>
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
                                {(k.items?.length ?? 0)} peças
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {kitEscolhido && !listaKitAberta && (
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
                      )}

                      {kitEscolhido && !listaKitAberta && (
                        <button
                          type="button"
                          onClick={() => setListaKitAberta(true)}
                          className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2"
                        >
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-500">trocar de Kit</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Envio ── */}
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
          {indicadores.tempoMedioMinutos !== null && (
            <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-slate-400">
              <Clock3 className="h-3 w-3" />
              seus clientes assinam em{' '}
              <strong className="font-black text-white">
                {textoDuracao(indicadores.tempoMedioMinutos)}
              </strong>{' '}
              em média
            </span>
          )}
        </div>
      </div>

      {/* ───────────────────────── INDICADORES ───────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cartao className="p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold text-slate-500">Aguardando assinatura</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
              <Clock3 className="h-3.5 w-3.5 text-amber-600" />
            </span>
          </div>
          <p className="mt-2.5 text-[32px] font-black leading-none text-[#071B3A]">
            {indicadores.aguardando}
          </p>
          <p className="mt-1.5 text-[11px]">
            {indicadores.aguardandoParados > 0 ? (
              <>
                <span className="font-bold text-amber-600">
                  {indicadores.aguardandoParados} paradas
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
          <p className="mt-2.5 text-[32px] font-black leading-none text-[#071B3A]">
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
            className={`mt-2.5 text-[32px] font-black leading-none ${
              vencidos.length + prazosHoje.length > 0 ? 'text-rose-600' : 'text-[#071B3A]'
            }`}
          >
            {resumo.temAlgumPrazoCadastrado ? vencidos.length + prazosHoje.length : '—'}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {resumo.temAlgumPrazoCadastrado
              ? `${vencidos.length} vencido${vencidos.length === 1 ? '' : 's'} · ${prazosHoje.length} vence${prazosHoje.length === 1 ? '' : 'm'} hoje`
              : `${resumo.processosSemPrazo} processo(s) ainda sem data`}
          </p>
        </Cartao>

        <Cartao className="p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold text-slate-500">Taxa de conclusão</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
              <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
            </span>
          </div>
          <p className="mt-2.5 text-[32px] font-black leading-none text-[#071B3A]">
            {indicadores.taxaConclusao !== null ? `${indicadores.taxaConclusao}%` : '—'}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {indicadores.taxaConclusao !== null
              ? 'dos envios são assinados'
              : `precisa de 5 envios encerrados (tem ${indicadores.totalAvaliadoTaxa})`}
          </p>
        </Cartao>
      </div>

      {/* ─────────── INTIMAÇÕES / ASSINATURAS + AVISOS ─────────── */}
      <div className="grid grid-cols-12 gap-5">
        <Cartao className="col-span-12 flex flex-col lg:col-span-7">
          <div className="border-b border-slate-100 px-5 pt-3.5">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setAba('INT')}
                  className={`flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-[12.5px] ${
                    aba === 'INT'
                      ? 'border-[#B68B1C] font-extrabold text-[#071B3A]'
                      : 'border-transparent font-bold text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Intimações
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-slate-500">
                    em breve
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAba('ASS')}
                  className={`flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-[12.5px] ${
                    aba === 'ASS'
                      ? 'border-[#B68B1C] font-extrabold text-[#071B3A]'
                      : 'border-transparent font-bold text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Assinaturas
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-black ${
                      aba === 'ASS' ? 'bg-[#B68B1C] text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {assinaturas.length}
                  </span>
                </button>
              </div>
              <Link href="/documentos" className="pb-2.5 text-[11px] font-bold text-[#B68B1C]">
                Ver todas →
              </Link>
            </div>
          </div>

          {aba === 'INT' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Scale className="h-5 w-5 text-slate-400" />
              </span>
              <div>
                <p className="text-[13px] font-extrabold text-[#071B3A]">
                  Intimações do DJEN ainda não conectadas
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-[11.5px] leading-relaxed text-slate-500">
                  O Diário de Justiça Eletrônico Nacional publica as intimações por número de OAB. Ao
                  informar a OAB do escritório, esta aba passa a mostrar cada publicação já vinculada
                  ao cliente pelo número do processo, com um clique para virar prazo.
                </p>
              </div>
              <Link
                href="/configuracoes"
                className="rounded-lg bg-[#071B3A] px-3.5 py-2 text-[11.5px] font-bold text-white"
              >
                Informar OAB nas configurações
              </Link>
              <p className="text-[10.5px] text-slate-400">
                integração em desenvolvimento · nenhum dado de exemplo é exibido aqui
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assinaturas.length === 0 && (
                <p className="px-5 py-8 text-center text-[12px] text-slate-400">
                  Nenhum documento em circulação. Use o fluxo rápido acima para enviar o primeiro.
                </p>
              )}
              {assinaturas.map((a) => (
                <div key={a.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
                      {a.iniciais}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-bold text-[#071B3A]">{a.cliente}</p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
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
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {a.titulo}
                        {a.pecas > 1 ? ` · ${a.pecas} peças` : ''} ·{' '}
                        {a.estado === 'CONCLUIDO' ? (
                          'concluído'
                        ) : a.estado === 'PARADO' ? (
                          <span className="font-bold text-rose-600">
                            parada há {a.diasDesdeEnvio} dias
                          </span>
                        ) : (
                          `enviado há ${a.diasDesdeEnvio} dia(s)`
                        )}
                      </p>
                      <div className="mt-2 flex gap-[3px]">
                        {Array.from({ length: a.total }).map((_, i) => (
                          <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${
                              i < a.assinados ? 'bg-teal-500' : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      {(a.temSelfie || a.temGeo || a.temDispositivo) && (
                        <div className="mt-2 flex flex-wrap items-center gap-2.5">
                          {a.temSelfie && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <CheckCircle2 className="h-3 w-3 text-teal-600" />
                              Selfie
                            </span>
                          )}
                          {a.temGeo && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <CheckCircle2 className="h-3 w-3 text-teal-600" />
                              Geolocalização
                            </span>
                          )}
                          {a.temDispositivo && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <CheckCircle2 className="h-3 w-3 text-teal-600" />
                              IP e dispositivo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/documentos"
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
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

        {/* ── Avisos e acompanhamentos ── */}
        <Cartao className="col-span-12 flex flex-col lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div>
              <h2 className="text-[13px] font-extrabold text-[#071B3A]">
                Avisos e acompanhamentos
              </h2>
              <p className="mt-0.5 text-[10.5px] text-slate-500">
                O que você anotou e o que o sistema achou
                {totalAvisos > 0 ? ` · ${totalAvisos}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormAviso((v) => !v)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-[#071B3A] hover:text-white"
            >
              <Plus className="h-3 w-3" />
              Novo aviso
            </button>
          </div>

          {formAviso && (
            <div className="space-y-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <input
                value={novoAviso.titulo}
                onChange={(e) => setNovoAviso({ ...novoAviso, titulo: e.target.value })}
                placeholder="Ex.: atualizar o CadÚnico"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#B68B1C]"
              />
              <div className="flex gap-2">
                <select
                  value={novoAviso.clienteId}
                  onChange={(e) => setNovoAviso({ ...novoAviso, clienteId: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#B68B1C]"
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
                  value={novoAviso.acompanharEm}
                  onChange={(e) => setNovoAviso({ ...novoAviso, acompanharEm: e.target.value })}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#B68B1C]"
                />
              </div>
              <input
                value={novoAviso.detalhe}
                onChange={(e) => setNovoAviso({ ...novoAviso, detalhe: e.target.value })}
                placeholder="Detalhe (opcional)"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#B68B1C]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormAviso(false)}
                  className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarAviso}
                  disabled={!novoAviso.titulo.trim()}
                  className="rounded-lg bg-[#071B3A] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
                >
                  Salvar aviso
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 divide-y divide-slate-100">
            {avisosManuais.map((a) => {
              const q = textoAcompanhamento(a.acompanharEm, agora);
              return (
                <div key={a.id} className="group flex items-start gap-2.5 px-5 py-2.5 hover:bg-slate-50/70">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-[#071B3A] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#D4AF37]">
                        você
                      </span>
                      <p className="truncate text-[12.5px] font-bold text-[#071B3A]">{a.titulo}</p>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {[a.cliente, a.detalhe].filter(Boolean).join(' · ') || 'sem cliente vinculado'}
                    </p>
                    <p
                      className={`mt-1 text-[10.5px] font-bold ${
                        q.atrasado ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {q.texto}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerAviso(a.id)}
                    className="mt-1 shrink-0 text-[11px] font-extrabold text-slate-300 hover:text-rose-600"
                    aria-label={`Concluir aviso ${a.titulo}`}
                  >
                    Concluir
                  </button>
                </div>
              );
            })}

            {avisosSistema.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 px-5 py-2.5 hover:bg-slate-50/70">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                      sistema
                    </span>
                    <p className="truncate text-[12.5px] font-bold text-[#071B3A]">{a.titulo}</p>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{a.detalhe}</p>
                  <p
                    className={`mt-1 text-[10.5px] font-bold ${
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
                <Link
                  href={a.destino}
                  className="mt-1 shrink-0 text-[11px] font-extrabold text-[#B68B1C]"
                >
                  {a.acao}
                </Link>
              </div>
            ))}

            {totalAvisos === 0 && (
              <p className="px-5 py-8 text-center text-[12px] text-slate-400">
                Nada pendente. Use “Novo aviso” para anotar o que precisa acompanhar.
              </p>
            )}
          </div>
        </Cartao>
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

        <Cartao className="col-span-12 flex flex-col lg:col-span-5">
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
            {kitsUsados.length === 0 && (
              <p className="px-5 py-8 text-center text-[12px] text-slate-400">
                Nenhum kit montado ainda.
              </p>
            )}
            {kitsUsados.map((k) => {
              const maxEnvios = Math.max(1, ...kitsUsados.map((x) => x.envios));
              return (
                <div key={k.id} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-[#071B3A]">{k.nome}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(k.envios / maxEnvios) * 100}%`,
                            background: RAMPA_FUNIL[3],
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-[10.5px] text-slate-500">
                        {k.envios} envio{k.envios === 1 ? '' : 's'} · {k.pecas} peças
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModo('KIT');
                      setKitId(k.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition group-hover:bg-[#071B3A] group-hover:text-white"
                  >
                    Usar
                  </button>
                </div>
              );
            })}
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
      </div>

      {/* ───────────────────────── RODAPÉ ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 pt-1">
        <p className="text-[10.5px] text-slate-400">
          AssinaJur{escritorio ? ` · ${escritorio}` : ''} · assinaturas com certificado de evidências
          e validade jurídica (MP 2.200-2/2001)
        </p>
        <p className="text-[10.5px] text-slate-400">
          Proposta em avaliação · a Home atual segue intacta em{' '}
          <Link href="/dashboard" className="font-bold text-[#B68B1C]">
            /dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
