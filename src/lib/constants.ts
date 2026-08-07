/**
 * AssinaJur — Configurações Centrais de Contato, Links e Planos
 */

// WhatsApp comercial oficial do AssinaJur (73) 98825-0201
export const DEFAULT_WHATSAPP_NUMBER = '5573988250201';
export const COMMERCIAL_WHATSAPP = DEFAULT_WHATSAPP_NUMBER;
export const COMMERCIAL_WHATSAPP_FORMATTED = '(73) 98825-0201';
export const COMMERCIAL_WHATSAPP_INTL = '+55 73 98825-0201';

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_COMMERCIAL_WHATSAPP || DEFAULT_WHATSAPP_NUMBER;

export const DEFAULT_WHATSAPP_MESSAGE =
  'Olá! Gostaria de conhecer melhor o AssinaJur e saber como funciona para o meu escritório.';

export const SOLO_PLAN_WHATSAPP_MESSAGE =
  'Olá! Quero contratar o Plano Essencial do AssinaJur por R$ 39,90 mensais.';

export const PRO_PLAN_WHATSAPP_MESSAGE =
  'Olá! Quero conhecer o Plano Profissional do AssinaJur por R$ 69,90 mensais.';

export const OFFICE_PLAN_WHATSAPP_MESSAGE =
  'Olá! Quero conhecer o Plano Escritório do AssinaJur por R$ 99,90 mensais.';

export const ENTERPRISE_WHATSAPP_MESSAGE =
  'Olá! Gostaria de conhecer as opções do AssinaJur para um escritório com mais usuários ou maior volume de pacotes.';

/**
 * Retorna o link direto para o WhatsApp comercial do AssinaJur com a mensagem pré-configurada.
 */
export function getWhatsAppLink(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  const cleanNumber = WHATSAPP_NUMBER.replace(/\D/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export const SHOW_LEGACY_PLANS = false;
