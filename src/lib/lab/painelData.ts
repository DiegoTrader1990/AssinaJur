/**
 * LABORATÓRIO ASSINAJUR — Derivação de dados do painel proposto.
 *
 * Funções puras: recebem o que as APIs já devolvem hoje e produzem as listas
 * que o painel exibe. Ficam separadas da tela de propósito — assim a lógica
 * pode ser conferida e ajustada sem mexer em layout, e vice-versa.
 *
 * Nada aqui escreve, chama API ou depende de React.
 */

/* ─────────────────────────── Tipos de entrada ─────────────────────────── */

export interface ProcessoBruto {
  id: string;
  title?: string | null;
  legalArea?: string | null;
  status?: string | null;
  processNumber?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  client?: { id?: string; name?: string | null } | null;
}

export interface ClienteBruto {
  id: string;
  name?: string | null;
  cpfCnpj?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  legalArea?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt?: string | null;
}

export interface DocumentoBruto {
  id: string;
  title?: string | null;
  status?: string | null;
  clientId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  client?: { id?: string; name?: string | null } | null;
}

/* ─────────────────────────── Tipos de saída ───────────────────────────── */

export type UrgenciaPrazo = 'VENCIDO' | 'HOJE' | 'SEMANA' | 'ADIANTE';

export interface PrazoItem {
  id: string;
  titulo: string;
  cliente: string;
  clienteId: string;
  area: string;
  data: Date;
  diasRestantes: number;
  urgencia: UrgenciaPrazo;
  prioridadeAlta: boolean;
}

export interface CasoParado {
  id: string;
  titulo: string;
  cliente: string;
  clienteId: string;
  area: string;
  diasSemMovimento: number;
  ultimaAtividade: Date;
}

export interface PendenciaSua {
  id: string;
  cliente: string;
  clienteId: string;
  motivo: string;
  acao: string;
  destino: string;
  peso: number;
}

export interface EsperaTerceiro {
  id: string;
  cliente: string;
  clienteId: string;
  documento: string;
  diasEsperando: number;
  atrasado: boolean;
}

export interface ResumoPainel {
  prazos: PrazoItem[];
  vencidos: PrazoItem[];
  hoje: PrazoItem[];
  semana: PrazoItem[];
  temAlgumPrazoCadastrado: boolean;
  processosSemPrazo: number;
  parados: CasoParado[];
  pendenciasSuas: PendenciaSua[];
  esperandoTerceiros: EsperaTerceiro[];
  totalClientes: number;
  totalProcessos: number;
  fraseEstado: string;
}

/* ─────────────────────────── Utilidades ───────────────────────────────── */

const DIA_MS = 86_400_000;

/** Meia-noite local — evita que "hoje" mude conforme a hora do acesso. */
function inicioDoDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diferencaEmDias(alvo: Date, referencia: Date): number {
  return Math.round((inicioDoDia(alvo).getTime() - inicioDoDia(referencia).getTime()) / DIA_MS);
}

function dataValida(valor?: string | null): Date | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Documento ainda em circulação, aguardando assinatura. */
function aguardandoAssinatura(status?: string | null): boolean {
  return !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(String(status || '').toUpperCase());
}

export function rotuloUrgencia(u: UrgenciaPrazo): string {
  if (u === 'VENCIDO') return 'Vencido';
  if (u === 'HOJE') return 'Vence hoje';
  if (u === 'SEMANA') return 'Próximos 7 dias';
  return 'Mais adiante';
}

/** Texto humano para uma quantidade de dias em relação a hoje. */
export function textoPrazo(dias: number): string {
  if (dias < -1) return `${Math.abs(dias)} dias em atraso`;
  if (dias === -1) return 'venceu ontem';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return `em ${dias} dias`;
}

/* ─────────────────────────── Derivações ───────────────────────────────── */

export function derivarPrazos(processos: ProcessoBruto[], agora: Date): PrazoItem[] {
  const itens: PrazoItem[] = [];

  processos.forEach((p) => {
    const data = dataValida(p.dueDate);
    if (!data) return;

    const dias = diferencaEmDias(data, agora);
    let urgencia: UrgenciaPrazo = 'ADIANTE';
    if (dias < 0) urgencia = 'VENCIDO';
    else if (dias === 0) urgencia = 'HOJE';
    else if (dias <= 7) urgencia = 'SEMANA';

    itens.push({
      id: p.id,
      titulo: p.title || 'Processo sem título',
      cliente: p.client?.name || 'Cliente não vinculado',
      clienteId: p.client?.id || '',
      area: p.legalArea || 'Geral',
      data,
      diasRestantes: dias,
      urgencia,
      prioridadeAlta: String(p.priority || '').toUpperCase() === 'ALTA',
    });
  });

  return itens.sort((a, b) => a.data.getTime() - b.data.getTime());
}

export function derivarParados(
  processos: ProcessoBruto[],
  agora: Date,
  diasLimite = 15
): CasoParado[] {
  const parados: CasoParado[] = [];

  processos.forEach((p) => {
    // Processo concluído não precisa de movimentação.
    if (String(p.status || '').toUpperCase() === 'CONCLUIDO') return;

    const ultima = dataValida(p.lastActivityAt) || dataValida(p.createdAt);
    if (!ultima) return;

    const dias = Math.abs(diferencaEmDias(ultima, agora));
    if (dias < diasLimite) return;

    parados.push({
      id: p.id,
      titulo: p.title || 'Processo sem título',
      cliente: p.client?.name || 'Cliente não vinculado',
      clienteId: p.client?.id || '',
      area: p.legalArea || 'Geral',
      diasSemMovimento: dias,
      ultimaAtividade: ultima,
    });
  });

  return parados.sort((a, b) => b.diasSemMovimento - a.diasSemMovimento);
}

export function derivarEsperandoTerceiros(
  documentos: DocumentoBruto[],
  agora: Date
): EsperaTerceiro[] {
  const esperas: EsperaTerceiro[] = [];

  documentos.forEach((d) => {
    if (!aguardandoAssinatura(d.status)) return;

    const enviado = dataValida(d.createdAt);
    if (!enviado) return;

    const dias = Math.abs(diferencaEmDias(enviado, agora));

    esperas.push({
      id: d.id,
      cliente: d.client?.name || 'Cliente',
      clienteId: d.clientId || d.client?.id || '',
      documento: d.title || 'Documento',
      diasEsperando: dias,
      // A partir de 2 dias parados, vale uma cobrança.
      atrasado: dias >= 2,
    });
  });

  return esperas.sort((a, b) => b.diasEsperando - a.diasEsperando);
}

/**
 * O que depende exclusivamente do escritório para andar.
 * Peso menor = mais urgente (usado para ordenar).
 */
export function derivarPendenciasSuas(
  clientes: ClienteBruto[],
  documentos: DocumentoBruto[],
  processos: ProcessoBruto[]
): PendenciaSua[] {
  const pendencias: PendenciaSua[] = [];

  clientes.forEach((c) => {
    const docsDoCliente = documentos.filter(
      (d) => d.clientId === c.id || d.client?.id === c.id
    );
    const processosDoCliente = processos.filter((p) => p.client?.id === c.id);
    const assinados = docsDoCliente.filter(
      (d) => String(d.status || '').toUpperCase() === 'CONCLUIDO'
    );
    const emCirculacao = docsDoCliente.some((d) => aguardandoAssinatura(d.status));

    const nome = c.name || 'Cliente sem nome';
    const semCpf = !c.cpfCnpj;
    const semTelefone = !c.phone && !c.whatsapp;

    // 1. Kit assinado e nenhum processo aberto: o caso travou no escritório.
    if (assinados.length > 0 && !emCirculacao && processosDoCliente.length === 0) {
      pendencias.push({
        id: `${c.id}-processo`,
        cliente: nome,
        clienteId: c.id,
        motivo: 'Documentos assinados, processo ainda não aberto',
        acao: 'Abrir processo',
        destino: `/processos?clienteId=${c.id}`,
        peso: 1,
      });
      return;
    }

    // 2. Cadastro incompleto impede gerar peças corretamente.
    if (semCpf || semTelefone) {
      const falta = semCpf && semTelefone ? 'CPF e telefone' : semCpf ? 'CPF' : 'telefone';
      pendencias.push({
        id: `${c.id}-cadastro`,
        cliente: nome,
        clienteId: c.id,
        motivo: `Cadastro sem ${falta}`,
        acao: 'Completar cadastro',
        destino: `/clientes?q=${encodeURIComponent(nome)}`,
        peso: 2,
      });
      return;
    }

    // 3. Qualificação completa e nenhum documento gerado ainda.
    if (docsDoCliente.length === 0) {
      pendencias.push({
        id: `${c.id}-kit`,
        cliente: nome,
        clienteId: c.id,
        motivo: 'Cadastro completo, nenhum documento gerado',
        acao: 'Gerar Kit Jurídico',
        destino: `/kits/enviar?clienteId=${c.id}`,
        peso: 3,
      });
    }
  });

  return pendencias.sort((a, b) => a.peso - b.peso);
}

/** Frase única de estado, exibida sob a saudação. */
export function montarFraseEstado(params: {
  vencidos: number;
  hoje: number;
  semana: number;
  esperandoAtrasados: number;
  pendenciasSuas: number;
  parados: number;
}): string {
  const partes: string[] = [];

  if (params.vencidos > 0) {
    partes.push(`${params.vencidos} prazo${params.vencidos > 1 ? 's' : ''} vencido${params.vencidos > 1 ? 's' : ''}`);
  }
  if (params.hoje > 0) {
    partes.push(`${params.hoje} vence${params.hoje > 1 ? 'm' : ''} hoje`);
  }
  if (params.semana > 0) {
    partes.push(`${params.semana} nos próximos 7 dias`);
  }
  if (params.pendenciasSuas > 0) {
    partes.push(`${params.pendenciasSuas} aguardando você`);
  }
  if (params.esperandoAtrasados > 0) {
    partes.push(`${params.esperandoAtrasados} assinatura${params.esperandoAtrasados > 1 ? 's' : ''} parada${params.esperandoAtrasados > 1 ? 's' : ''}`);
  }
  if (params.parados > 0) {
    partes.push(`${params.parados} caso${params.parados > 1 ? 's' : ''} sem movimento`);
  }

  if (partes.length === 0) return 'Nada exige sua atenção agora.';
  return partes.join(' · ');
}

/** Ponto de entrada único usado pela tela. */
export function montarResumo(
  entrada: { processos: ProcessoBruto[]; clientes: ClienteBruto[]; documentos: DocumentoBruto[] },
  agora: Date
): ResumoPainel {
  const prazos = derivarPrazos(entrada.processos, agora);
  const vencidos = prazos.filter((p) => p.urgencia === 'VENCIDO');
  const hoje = prazos.filter((p) => p.urgencia === 'HOJE');
  const semana = prazos.filter((p) => p.urgencia === 'SEMANA');

  const parados = derivarParados(entrada.processos, agora);
  const pendenciasSuas = derivarPendenciasSuas(
    entrada.clientes,
    entrada.documentos,
    entrada.processos
  );
  const esperandoTerceiros = derivarEsperandoTerceiros(entrada.documentos, agora);

  return {
    prazos,
    vencidos,
    hoje,
    semana,
    temAlgumPrazoCadastrado: prazos.length > 0,
    processosSemPrazo: entrada.processos.filter((p) => !dataValida(p.dueDate)).length,
    parados,
    pendenciasSuas,
    esperandoTerceiros,
    totalClientes: entrada.clientes.length,
    totalProcessos: entrada.processos.length,
    fraseEstado: montarFraseEstado({
      vencidos: vencidos.length,
      hoje: hoje.length,
      semana: semana.length,
      esperandoAtrasados: esperandoTerceiros.filter((e) => e.atrasado).length,
      pendenciasSuas: pendenciasSuas.length,
      parados: parados.length,
    }),
  };
}
