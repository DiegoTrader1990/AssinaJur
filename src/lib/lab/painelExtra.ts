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
 * Um documento vira uma linha da aba "Assinaturas". O que importa para o
 * advogado é: quantos já assinaram, há quanto tempo está fora e se as provas
 * (selfie, geolocalização, dispositivo) foram coletadas.
 *
 * `DIAS_PARADO` = 2. Abaixo disso o cliente ainda está dentro do tempo médio
 * de conclusão observado no próprio sistema; acima, é cobrança.
 */
export const DIAS_PARADO = 2;

export function derivarAssinaturasAndamento(
  documentos: DocumentoBruto[],
  agora: Date,
  limite = 6
): AssinaturaAndamento[] {
  const linhas: AssinaturaAndamento[] = [];

  documentos.forEach((d) => {
    const status = normalizar(d.status);
    if (status === 'RASCUNHO') return;

    const assinantes = Array.isArray(d.signers) ? d.signers : [];
    const total = assinantes.length;
    if (total === 0) return;

    const assinados = assinantes.filter((s) => normalizar(s?.status) === 'ASSINADO').length;
    const enviado = dataValida(d.createdAt);
    const dias = enviado ? diasEntre(enviado, agora) : 0;

    let estado: EstadoAssinatura = 'ANDAMENTO';
    if (status === 'CONCLUIDO') estado = 'CONCLUIDO';
    else if (status === 'CANCELADO' || status === 'EXPIRADO') estado = 'CANCELADO';
    else if (dias >= DIAS_PARADO) estado = 'PARADO';

    linhas.push({
      id: d.id,
      titulo: d.title || 'Documento sem título',
      cliente: d.client?.name || 'Cliente não vinculado',
      clienteId: d.client?.id || d.clientId || '',
      iniciais: iniciaisDe(d.client?.name || ''),
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

  const parados = emCirculacao.filter((d) => {
    const enviado = dataValida(d.createdAt);
    return enviado ? diasEntre(enviado, agora) >= DIAS_PARADO : false;
  });

  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

  const concluidos = documentos.filter((d) => normalizar(d.status) === 'CONCLUIDO');
  const dataConclusao = (d: DocumentoBruto) =>
    dataValida(d.completedAt) || dataValida(d.updatedAt) || dataValida(d.createdAt);

  const assinadosNoMes = concluidos.filter((d) => {
    const q = dataConclusao(d);
    return q ? q >= inicioMes : false;
  }).length;

  const assinadosMesAnterior = concluidos.filter((d) => {
    const q = dataConclusao(d);
    return q ? q >= inicioMesAnterior && q < inicioMes : false;
  }).length;

  // Taxa de conclusão só faz sentido sobre envios já encerrados.
  const encerrados = documentos.filter((d) => {
    const s = normalizar(d.status);
    return s === 'CONCLUIDO' || s === 'CANCELADO' || s === 'EXPIRADO';
  });

  return {
    aguardando: emCirculacao.length,
    aguardandoParados: parados.length,
    assinadosNoMes,
    variacaoMes: assinadosMesAnterior > 0 ? assinadosNoMes - assinadosMesAnterior : null,
    temHistoricoMesAnterior: assinadosMesAnterior > 0,
    taxaConclusao:
      encerrados.length >= 5
        ? Math.round((concluidos.length / encerrados.length) * 100)
        : null,
    totalAvaliadoTaxa: encerrados.length,
  };
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
