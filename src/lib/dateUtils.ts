/**
 * Utilitário para formatação de data e hora em Horário de Brasília — UTC−3
 * Mantém o armazenamento no banco em UTC e formata a exibição para o usuário.
 */

export function formatBrasiliaDateTime(
  dateInput: Date | string | number | null | undefined,
  includeSeconds: boolean = true
): string {
  if (!dateInput) return '—';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';

    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
    });

    const formatted = formatter.format(date);
    return `${formatted.replace(',', ' às')} (Horário de Brasília — UTC−3)`;
  } catch (err) {
    console.error('Erro ao formatar data de Brasília:', err);
    return String(dateInput);
  }
}

export function formatBrasiliaDateOnly(
  dateInput: Date | string | number | null | undefined
): string {
  if (!dateInput) return '—';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

export function formatBrasiliaTimeOnly(
  dateInput: Date | string | number | null | undefined
): string {
  if (!dateInput) return '—';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return String(dateInput);
  }
}
