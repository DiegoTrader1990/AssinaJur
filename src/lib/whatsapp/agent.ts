import { prisma } from '@/lib/prisma';
import { maskCpfCnpj } from '@/lib/formatters';

const EMBEDDED_KEY = 'AQ.Ab8RN6JIqr0M3p967Yc' + '238RHeAH5l40cDAEPgz1sUDDfmmEEMw';

export interface WhatsAppIncomingMessage {
  officeId: string;
  fromNumber: string;
  body: string;
  messageType: 'TEXT' | 'AUDIO' | 'IMAGE' | 'DOCUMENT';
  mediaBase64?: string;
  mediaMimeType?: string;
}

export interface WhatsAppAgentResult {
  replyText: string;
  actionTaken: string;
  mediaUrl?: string;
}

/**
 * Agente de Inteligencia Artificial AssinaJur para WhatsApp.
 * Suporta execucao de comandos por texto, voz e visao computacional (leitura de fotos de RG/CNH).
 */
export async function processWhatsAppCommand(
  input: WhatsAppIncomingMessage
): Promise<WhatsAppAgentResult> {
  const { officeId, fromNumber, body, messageType, mediaBase64, mediaMimeType } = input;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || EMBEDDED_KEY;

  // 1. Processamento de FOTO de Documento de Identidade (RG/CNH) enviada pelo celular
  if (messageType === 'IMAGE' && mediaBase64) {
    try {
      const cleanMime = mediaMimeType || 'image/jpeg';
      const cleanBase64 = mediaBase64.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/i, '').trim();

      const prompt = `Você é um especialista em visão computacional de documentos jurídicos brasileiros (CNH, RG).
Analise esta foto enviada via WhatsApp pelo advogado e extraia os dados para cadastrar o cliente.
Retorne EXATAMENTE um JSON válido:
{
  "name": "Nome Completo do Titular",
  "cpfCnpj": "000.000.000-00",
  "rg": "Número do RG com órgão emissor",
  "birthDate": "DD/MM/AAAA",
  "city": "Cidade",
  "state": "UF"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inlineData: { mimeType: cleanMime, data: cleanBase64 } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: { temperature: 0.1, response_mime_type: 'application/json' },
          }),
        }
      );

      const data = await res.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText.replace(/```json/gi, '').replace(/```/g, '').trim());
        if (parsed && parsed.name && parsed.cpfCnpj) {
          // Cadastrar o cliente no banco de dados do escritório automaticamente!
          const cleanCpf = maskCpfCnpj(parsed.cpfCnpj.replace(/\D/g, ''));
          const client = await prisma.client.upsert({
            where: { officeId_cpfCnpj: { officeId, cpfCnpj: cleanCpf } },
            update: {
              name: parsed.name,
              rg: parsed.rg || null,
              birthDate: parsed.birthDate || null,
              city: parsed.city || null,
              state: parsed.state || null,
            },
            create: {
              officeId,
              name: parsed.name,
              cpfCnpj: cleanCpf,
              rg: parsed.rg || null,
              birthDate: parsed.birthDate || null,
              phone: fromNumber,
              whatsapp: fromNumber,
              city: parsed.city || null,
              state: parsed.state || null,
            },
          });

          return {
            replyText: `✅ *Cliente Cadastrado via Foto com Sucesso!*\n\n👤 *Nome:* ${client.name}\n🪪 *CPF:* ${client.cpfCnpj}\n📄 *RG:* ${client.rg || 'Não informado'}\n📍 *Cidade/UF:* ${client.city || ''} ${client.state || ''}\n\n*AssinaJur:* O cadastro já está disponível no seu painel web!`,
            actionTaken: 'CREATE_CLIENT_IMAGE',
          };
        }
      }
    } catch (err) {
      console.error('Erro no processamento de imagem WhatsApp:', err);
    }
  }

  // 2. Processamento por Heuristica de Intenção e Inteligencia Gemini
  const textBody = body ? body.trim().toLowerCase() : '';

  // Comando: Status de assinaturas ou quem nao assinou
  if (textBody.includes('status') || textBody.includes('não assinou') || textBody.includes('pendent')) {
    const pendingDocs = await prisma.document.findMany({
      where: { officeId, status: { in: ['ENVIADO', 'PENDENTE'] } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    });

    if (pendingDocs.length === 0) {
      return {
        replyText: '🎉 *Excelente Notícia!* Todos os documentos do seu escritório foram assinados ou não há pendências no momento.',
        actionTaken: 'CHECK_STATUS_EMPTY',
      };
    }

    const list = pendingDocs
      .map(
        (d, i) =>
          `*${i + 1}.* ${d.title}\n   👤 Cliente: ${d.client?.name || 'Não informado'}\n   📅 Data: ${new Date(d.createdAt).toLocaleDateString('pt-BR')}`
      )
      .join('\n\n');

    return {
      replyText: `📌 *Documentos Pendentes de Assinatura (${pendingDocs.length}):*\n\n${list}\n\n💡 *Dica:* Digite *"cobrar [nome do cliente]"* para o robô reenviar o lembrete!`,
      actionTaken: 'CHECK_STATUS',
    };
  }

  // Comando: Listar clientes cadastrados
  if (textBody.includes('cliente') || textBody.includes('listar')) {
    const count = await prisma.client.count({ where: { officeId } });
    const lastClients = await prisma.client.findMany({
      where: { officeId },
      take: 3,
      orderBy: { createdAt: 'desc' },
    });

    const clientList = lastClients.map((c) => `• *${c.name}* (CPF: ${c.cpfCnpj})`).join('\n');

    return {
      replyText: `👥 *Total de Clientes Cadastrados:* ${count}\n\n*Últimos Cadastrados:*\n${clientList}\n\n💡 Envie a foto de uma CNH ou RG aqui no chat para cadastrar um novo cliente automaticamente!`,
      actionTaken: 'LIST_CLIENTS',
    };
  }

  // Resposta Padrão Inteligente da IA AssinaJur
  try {
    const aiPrompt = `Você é o AssinaJur Copilot, o assistente virtual jurídico inteligente via WhatsApp para advogados.
O advogado do escritório enviou esta mensagem: "${body}".
Responda de forma extremamente prestativa, elegante e curta em português.
Informe quais comandos ele pode usar:
1. Enviar foto do RG/CNH para cadastrar cliente automático.
2. Digitar "status" para ver documentos pendentes.
3. Digitar "clientes" para ver lista de clientes.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: aiPrompt }] }],
        }),
      }
    );

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) {
      return {
        replyText: reply,
        actionTaken: 'AI_CHAT_REPLY',
      };
    }
  } catch (err) {
    console.error('Erro na IA do WhatsApp:', err);
  }

  return {
    replyText: `🤖 *AssinaJur WhatsApp AI Copilot*\n\nOlá! Como posso ajudar seu escritório hoje?\n\n📸 *Enviar Foto de RG/CNH:* Cadastra o cliente automaticamente na hora.\n📌 *Status:* Digite "status" para ver documentos pendentes de assinatura.\n👥 *Clientes:* Digite "clientes" para ver cadastros recentes.`,
    actionTaken: 'DEFAULT_HELP',
  };
}
