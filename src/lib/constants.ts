/**
 * AssinaJur — Configurações Centrais de Contato, Links e Planos
 */

// PREENCHA AQUI O NÚMERO DO WHATSAPP DO ASSINAJUR COM DDD (Ex: 5511999999999)
export const DEFAULT_WHATSAPP_NUMBER = '5511999999999';

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;

export const DEFAULT_WHATSAPP_MESSAGE =
  'Olá! Gostaria de conhecer melhor o AssinaJur e saber como funciona o sistema para escritórios de advocacia.';

/**
 * Retorna o link direto para o WhatsApp do AssinaJur com a mensagem pré-configurada.
 */
export function getWhatsAppLink(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  const cleanNumber = WHATSAPP_NUMBER.replace(/\D/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Controle de exibição dos planos na landing page.
 * 
 * false = Exibe a nova tabela comercial (Teste Gratuito + Plano Solo R$ 29,90 de Lançamento)
 * true  = Exibe os planos antigos (R$ 59 / R$ 149 / R$ 299)
 */
export const SHOW_LEGACY_PLANS = false;
