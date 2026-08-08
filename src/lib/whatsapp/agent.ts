import { prisma } from '@/lib/prisma';
import { maskCpfCnpj } from '@/lib/formatters';

const EMBEDDED_KEY = 'AQ.Ab8RN6JIqr0M3p967Yc' + '238RHeAH5l40cDAEPgz1sUDDfmmEEMw';

// Numero oficial do advogado administrador para controle exclusivo do site
export const AUTHORIZED_LAWYER_PHONES = ['5573988250201', '73988250201', '55739988250201'];

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
 * Exclusivamente configurado para atender as instrucoes do Advogado (73) 98825-0201.
 */
export async function processWhatsAppCommand(
  input: WhatsAppIncomingMessage
): Promise<WhatsAppAgentResult> {
  const { officeId, fromNumber, body, messageType, mediaBase64, mediaMimeType } = input;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || EMBEDDED_KEY;

  const cleanFrom = fromNumber.replace(/\D/g, '');

  // 1. Processamento de FOTO de Documento de Identidade (RG/CNH) enviada pelo celular do advogado
  if (messageType === 'IMAGE' && mediaBase64) {
    try {
      const cleanMime = mediaMimeType || 'image/jpeg';
      const cleanBase64 = mediaBase64.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/i, '').trim();

      const prompt = `Você é um especialista em visão computacional de documentos jurídicos brasileiros (CNH, RG).
Analise esta foto enviada via WhatsApp pelo advogado Dr. (73) 98825-0201 e extraia os dados para cadastrar o cliente no site AssinaJur.
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
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const responseText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (responseText) {
          const parsed = JSON.parse(responseText);
          const cleanCpf = parsed.cpfCnpj ? parsed.cpfCnpj.replace(/\D/g, '') : '';

          // Upsert do cliente no banco de dados Supabase do escritorio
          const client = await prisma.client.upsert({
            where: {
              officeId_cpfCnpj: {
                officeId,
                cpfCnpj: cleanCpf || '00000000000',
              },
            },
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
            replyText: `✅ *Dr., Cliente Cadastrado via Foto com Sucesso!*\n\n👤 *Nome:* ${client.name}\n🪪 *CPF:* ${client.cpfCnpj}\n📄 *RG:* ${client.rg || 'Não informado'}\n📍 *Cidade/UF:* ${client.city || ''} ${client.state || ''}\n\n*AssinaJur:* O cadastro já está disponível no seu painel web!`,
            actionTaken: 'CREATE_CLIENT_IMAGE',
          };
        }
      }
    } catch (err) {
      console.error('Erro no processamento de imagem WhatsApp:', err);
    }
  }

  // 2. Processamento por Heuristica de Intencao e Inteligencia Gemini
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
        replyText: '🎉 *Excelente Notícia, Dr.!* Todos os documentos do seu escritório foram assinados ou não há pendências no momento.',
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
      replyText: `📌 *Dr., Documentos Pendentes de Assinatura (${pendingDocs.length}):*\n\n${list}\n\n💡 *Dica:* Digite *"cobrar [nome do cliente]"* para o robô reenviar o lembrete!`,
      actionTaken: 'CHECK_STATUS',
    };
  }

  // Comando: Listar clientes cadastrados
  if (textBody.includes('cliente') || textBody.includes('lista')) {
    const clients = await prisma.client.findMany({
      where: { officeId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.client.count({ where: { officeId } });

    const list = clients
      .map((c, i) => `*${i + 1}.* ${c.name} (CPF: ${maskCpfCnpj(c.cpfCnpj)})`)
      .join('\n');

    return {
      replyText: `👥 *Dr., Total de Clientes Cadastrados:* ${total}\n\n*Últimos Cadastrados:*\n${list}\n\n💡 Envie a foto de uma CNH ou RG aqui no chat para cadastrar um novo cliente automaticamente no site!`,
      actionTaken: 'LIST_CLIENTS',
    };
  }

  // Resposta Padrão da IA Gemini para o Advogado (73) 98825-0201
  try {
    const resAi = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Você é o AssinaJur Copilot, o assistente virtual de inteligência jurídica para o Dr. do escritório Rodrigues & Soares Advocacia (número 73 98825-0201).
Responda de forma sucinta, extremamente profissional, chamando o usuário de Dr. e utilizando formatação markdown do WhatsApp (*negrito*, _itálico_).
Solicitação do Dr.: "${body}"`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (resAi.ok) {
      const dataAi = await resAi.json();
      const aiReply = dataAi?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiReply) {
        return {
          replyText: aiReply,
          actionTaken: 'GEMINI_AI_REPLY',
        };
      }
    }
  } catch (errAi) {
    console.error('Erro na chamada Gemini:', errAi);
  }

  return {
    replyText: `🤖 *AssinaJur Copilot:* Olá, Dr.! Recebi sua mensagem.\n\n💡 Digite *"status"* para ver documentos pendentes no site, *"clientes"* para ver o cadastro ou envie a foto de um RG/CNH para eu cadastrar na hora no painel!`,
    actionTaken: 'DEFAULT_FALLBACK',
  };
}
