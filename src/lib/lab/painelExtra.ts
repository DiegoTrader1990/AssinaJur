/**
 * LABORATÓRIO ASSINAJUR — Derivações complementares do painel proposto.
 *
 * Mesma regra do painelData.ts: funções puras, sem React, sem fetch, sem
 * escrita. Ficam num arquivo separado para não mexer no que já foi validado.
 *
 * Cobre o que a segunda rodada do painel pediu:
 *  - acompanhamento de assinatura (aba "Assinaturas")
 *  - kits mais usados de verdade, contados pelos documentos gerados
 *  - indicadores do topo (aguardando, assinados no mês, taxa de conclusão)
 *  - avisos manuais do advogado, com origem marcada na tela
 */

import type { DocumentoBruto } from './painelData';

/* ─────────────────────────── Entradas extras ──────────────────────────── */

export interface KitBruto {
  id: string;
  name?: string | null;
  category?: string | null;
  items?: unknown[] | null;
}

/* ─────────────────────────── Saídas ───────────────────────────────────── */

export type EstadoAssinatura = 'CONCLUIDO' | 'PARADO' | 'ANDAMENTO' | 'CANCELADO';

export interface AssinaturaAndamento {
  id: string;
  titulo: string;
  /** Quantos documentos entraram no mesmo envio (kit = várias peças). */
  pecas: number;
  cliente: string;
  clienteId: string;
  iniciais: string;
  assinados: number;
  total: number;
  estado: EstadoAssinatura;
  diasDesdeEnvio: number;
  temSelfie: boolean;
  temGeo: boolean;
  temDispositivo: boolean;
}

export interface KitUsado {
  id: string;
  nome: string;
  categoria: string;
  pecas: number;
  envios: number;
}

export interface IndicadoresPainel {
  aguardando: number;
  aguardandoParados: number;
  assinadosNoMes: number;
  variacaoMes: number | null;
  temHistoricoMesAnterior: boolean;
  taxaConclusao: number | null;
  totalAvaliadoTaxa: number;
  /** Minutos entre o envio e a primeira assinatura. null = base insuficiente. */
  tempoMedioMinutos: number | null;
}

/* ─────────────────────────── Utilidades ───────────────────────────────── */

const DIA_MS = 86_400_000;

function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dataValida(valor?: string | null): Date | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diasEntre(alvo: Date, referencia: Date): number {
  return Math.round((inicioDoDia(referencia).getTime() - inicioDoDia(alvo).getTime()) / DIA_MS);
}

/** MG, GC, VF — duas letras a partir do nome, sem inventar quando falta. */
export function iniciaisDe(nome: string): string {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '--';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function normalizar(valor?: string | null): string {
  return String(valor || '').toUpperCase();
}

/* ───────────────────── Acompanhamento de assinatura ───────────────────── */

/**
 * Uma LINHA = um ENVIO, não um documento.
 *
 * Isto importa: um Kit Jurídico com 3 peças cria 3 documentos no banco, com o
 * mesmo `kitBatchId`. Listar documento por documento repetia o mesmo cliente
 * três vezes na tela e inflava a contagem — o advogado mandou uma coisa só.
 * Então agrupamos pelo lote e somamos os assinantes das peças.
 *
 * `DIAS_PARADO` = 2. Abaixo disso o cliente ainda está dentro do tempo médio
 * de conclusão observado no próprio sistema; acima, é cobrança.
 */
export const DIAS_PARADO = 2;

export function derivarAssinaturasAndamento(
  documentos: DocumentoBruto[],
  agora: Date,
  opcoes: { kits?: KitBruto[]; limite?: number } = {}
): AssinaturaAndamento[] {
  const { kits = [], limite = 6 } = opcoes;
  const nomeDoKit = new Map(kits.map((k) => [k.id, k.name || 'Kit Jurídico']));

  interface Acumulado {
    documentos: DocumentoBruto[];
    kitId?: string | null;
  }
  const lotes = new Map<string, Acumulado>();

  documentos.forEach((d) => {
    const status = normalizar(d.status);
    if (status === 'RASCUNHO') return;
    if (!Array.isArray(d.signers) || d.signers.length === 0) return;

    const chave = d.kitBatchId || d.id;
    if (!lotes.has(chave)) lotes.set(chave, { documentos: [], kitId: d.kitId || d.kit?.id });
    lotes.get(chave)!.documentos.push(d);
  });

  const linhas: AssinaturaAndamento[] = [];

  lotes.forEach((lote, chave) => {
    const docs = lote.documentos;
    const primeiro = docs[0];
    const assinantes = docs.flatMap((d) => (Array.isArray(d.signers) ? d.signers : []));
    const total = assinantes.length;
    if (total === 0) return;

    const assinados = assinantes.filter((s) => normalizar(s?.status) === 'ASSINADO').length;

    // O envio só está concluído quando TODAS as peças estão concluídas.
    const situacoes = docs.map((d) => normalizar(d.status));
    const todosConcluidos = situacoes.every((s) => s === 'CONCLUIDO');
    const todosEncerrados = situacoes.every(
      (s) => s === 'CONCLUIDO' || s === 'CANCELADO' || s === 'EXPIRADO'
    );

    const enviado = docs
      .map((d) => dataValida(d.createdAt))
      .filter((x): x is Date => Boolean(x))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const dias = enviado ? diasEntre(enviado, agora) : 0;

    let estado: EstadoAssinatura = 'ANDAMENTO';
    if (todosConcluidos) estado = 'CONCLUIDO';
    else if (todosEncerrados) estado = 'CANCELADO';
    else if (dias >= DIAS_PARADO) estado = 'PARADO';

    const kitId = lote.kitId;
    const titulo = kitId
      ? nomeDoKit.get(kitId) || 'Kit Jurídico'
      : docs.length > 1
        ? `${docs.length} documentos`
        : primeiro.title || 'Documento sem título';

    linhas.push({
      id: chave,
      titulo,
      pecas: docs.length,
      cliente: primeiro.client?.name || 'Cliente não vinculado',
      clienteId: primeiro.client?.id || primeiro.clientId || '',
      iniciais: iniciaisDe(primeiro.client?.name || ''),
      assinados,
      total,
      estado,
      diasDesdeEnvio: dias,
      temSelfie: assinantes.some((s) => Boolean(s?.selfieCenterImage)),
      temGeo: assinantes.some((s) => s?.geoLat != null && s?.geoLng != null),
      temDispositivo: assinantes.some((s) => Boolean(s?.ipAddress)),
    });
  });

  // Quem precisa de ação aparece primeiro; concluído fecha a lista.
  const ordem: Record<EstadoAssinatura, number> = {
    PARADO: 0,
    ANDAMENTO: 1,
    CONCLUIDO: 2,
    CANCELADO: 3,
  };
  return linhas
    .sort((a, b) => ordem[a.estado] - ordem[b.estado] || b.diasDesdeEnvio - a.diasDesdeEnvio)
    .slice(0, limite);
}

/* ───────────────────────── Kits mais usados ───────────────────────────── */

/**
 * Conta envios por kit olhando os documentos gerados. Kits sem nenhum envio
 * continuam na lista (com 0), porque o advogado precisa enxergar o que já
 * montou mesmo antes de usar — some só se o escritório não tiver kit nenhum.
 */
export function derivarKitsMaisUsados(
  kits: KitBruto[],
  documentos: DocumentoBruto[],
  limite = 4
): KitUsado[] {
  const envios = new Map<string, Set<string>>();

  documentos.forEach((d) => {
    const kitId = d.kitId || d.kit?.id;
    if (!kitId) return;
    // Um kit enviado gera vários documentos no mesmo lote: conta lote, não peça.
    const chaveLote = d.kitBatchId || d.id;
    if (!envios.has(kitId)) envios.set(kitId, new Set());
    envios.get(kitId)!.add(chaveLote);
  });

  return kits
    .map((k) => ({
      id: k.id,
      nome: k.name || 'Kit sem nome',
      categoria: k.category || 'Geral',
      pecas: Array.isArray(k.items) ? k.items.length : 0,
      envios: envios.get(k.id)?.size ?? 0,
    }))
    .sort((a, b) => b.envios - a.envios || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, limite);
}

/* ─────────────────────────── Indicadores ──────────────────────────────── */

/**
 * Os quatro números do topo. Cada um devolve `null` quando não há base
 * suficiente, para a tela mostrar um traço em vez de um número inventado —
 * um painel que mostra 0% de conclusão no primeiro dia mente para o advogado.
 */
export function derivarIndicadores(documentos: DocumentoBruto[], agora: Date): IndicadoresPainel {
  const emCirculacao = documentos.filter((d) => {
    const s = normalizar(d.status);
    return s !== 'RASCUNHO' && s !== 'CONCLUIDO' && s !== 'CANCELADO' && s !== 'EXPIRADO';
  });

  // Conta ENVIOS, não peças: um kit de 3 documentos é uma assinatura pendente,
  // senão o topo diz 6 e a lista logo abaixo mostra 2 — e o número perde a fé.
  const lotesEmCirculacao = new Set(emCirculacao.map((d) => d.kitBatchId || d.id));

  const parados = new Set(
    emCirculacao
      .filter((d) => {
        const enviado = dataValida(d.createdAt);
        return enviado ? diasEntre(enviado, agora) >= DIAS_PARADO : false;
      })
      .map((d) => d.kitBatchId || d.id)
  );

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

  const concluidos = documentos.filter((d) => normalizar(d.status) === 'CONCLUIDO');
  const dataConclusao = (d: DocumentoBruto) =>
    dataValida(d.completedAt) || dataValida(d.updatedAt) || dataValida(d.createdAt);

  const lote = (d: DocumentoBruto) => d.kitBatchId || d.id;

  const assinadosNoMes = new Set(
    concluidos
      .filter((d) => {
        const q = dataConclusao(d);
        return q ? q >= inicioMes : false;
      })
      .map(lote)
  ).size;

  const assinadosMesAnterior = new Set(
    concluidos
      .filter((d) => {
        const q = dataConclusao(d);
        return q ? q >= inicioMesAnterior && q < inicioMes : false;
      })
      .map(lote)
  ).size;

  // Taxa de conclusão só faz sentido sobre envios já encerrados.
  const encerrados = new Set(
    documentos
      .filter((d) => {
        const s = normalizar(d.status);
        return s === 'CONCLUIDO' || s === 'CANCELADO' || s === 'EXPIRADO';
      })
      .map(lote)
  );
  const concluidosLotes = new Set(concluidos.map(lote));

  // Quanto tempo o cliente leva para assinar depois que recebe o link. É a
  // métrica que o advogado usa para prometer prazo ao cliente — por isso só
  // aparece com pelo menos 3 assinaturas medidas.
  const duracoes: number[] = [];
  documentos.forEach((d) => {
    const envio = dataValida(d.createdAt);
    if (!envio || !Array.isArray(d.signers)) return;
    d.signers.forEach((s) => {
      const assinatura = dataValida(s?.signedAt);
      if (!assinatura) return;
      const minutos = (assinatura.getTime() - envio.getTime()) / 60_000;
      if (minutos >= 0 && minutos < 60 * 24 * 30) duracoes.push(minutos);
    });
  });
  duracoes.sort((a, b) => a - b);
  // Mediana, não média: uma assinatura esquecida por 3 dias distorce a média.
  const tempoMedioMinutos =
    duracoes.length >= 3 ? Math.round(duracoes[Math.floor(duracoes.length / 2)]) : null;

  return {
    aguardando: lotesEmCirculacao.size,
    aguardandoParados: parados.size,
    assinadosNoMes,
    variacaoMes: assinadosMesAnterior > 0 ? assinadosNoMes - assinadosMesAnterior : null,
    temHistoricoMesAnterior: assinadosMesAnterior > 0,
    taxaConclusao:
      encerrados.size >= 5 ? Math.round((concluidosLotes.size / encerrados.size) * 100) : null,
    totalAvaliadoTaxa: encerrados.size,
    tempoMedioMinutos,
  };
}

/** 47 -> "47 min"; 130 -> "2 h 10 min"; 1500 -> "1 dia". */
export function textoDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
  }
  const dias = Math.round(horas / 24);
  return `${dias} dia${dias === 1 ? '' : 's'}`;
}

/* ─────────────────────── Avisos escritos por você ─────────────────────── */

export interface AvisoManual {
  id: string;
  titulo: string;
  cliente: string;
  clienteId: string;
  detalhe: string;
  /** ISO (yyyy-mm-dd). Vazio = sem data para acompanhar. */
  acompanharEm: string;
  criadoEm: string;
}

const CHAVE_AVISOS = 'assinajur.painel-novo.avisos';

/** Leitura tolerante: qualquer conteúdo estranho vira lista vazia. */
export function lerAvisosManuais(): AvisoManual[] {
  if (typeof window === 'undefined') return [];
  try {
    const cru = window.localStorage.getItem(CHAVE_AVISOS);
    if (!cru) return [];
    const dados = JSON.parse(cru);
    if (!Array.isArray(dados)) return [];
    return dados.filter((a) => a && typeof a.id === 'string' && typeof a.titulo === 'string');
  } catch {
    return [];
  }
}

export function gravarAvisosManuais(avisos: AvisoManual[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAVE_AVISOS, JSON.stringify(avisos));
  } catch {
    /* cota cheia ou modo privativo: o painel continua funcionando sem persistir */
  }
}

/** Ordena por data de acompanhamento; sem data vai para o fim. */
export function ordenarAvisosManuais(avisos: AvisoManual[]): AvisoManual[] {
  return [...avisos].sort((a, b) => {
    if (!a.acompanharEm && !b.acompanharEm) return 0;
    if (!a.acompanharEm) return 1;
    if (!b.acompanharEm) return -1;
    return a.acompanharEm.localeCompare(b.acompanharEm);
  });
}

/** "acompanhar hoje", "acompanhar em 3 dias", "atrasado há 2 dias". */
export function textoAcompanhamento(iso: string, agora: Date): { texto: string; atrasado: boolean } {
  if (!iso) return { texto: 'sem data definida', atrasado: false };
  const alvo = dataValida(iso);
  if (!alvo) return { texto: 'sem data definida', atrasado: false };
  const dias = -diasEntre(alvo, agora);
  if (dias < 0) return { texto: `atrasado há ${Math.abs(dias)} dia(s)`, atrasado: true };
  if (dias === 0) return { texto: 'acompanhar hoje', atrasado: true };
  if (dias === 1) return { texto: 'acompanhar amanhã', atrasado: false };
  return { texto: `acompanhar em ${dias} dias`, atrasado: false };
}
