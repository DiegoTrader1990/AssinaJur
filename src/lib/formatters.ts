/**
 * Utilitários de Máscara de Formatação para o AssinaJur
 */

// Máscara de CPF / CNPJ dinâmica (Ex: 000.000.000-00 ou 00.000.000/0001-00)
export function maskCpfCnpj(value: string | null | undefined): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// Máscara de Telefone / WhatsApp (Ex: (11) 99999-9999 ou (11) 3333-4444)
export function maskPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

// Máscara de CEP (Ex: 00000-000)
export function maskCep(value: string | null | undefined): string {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}
