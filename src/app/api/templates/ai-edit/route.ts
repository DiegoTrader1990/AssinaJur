import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

const systemPrompt = `Você é um assistente especialista em redação e formatação de modelos de documentos jurídicos brasileiros para o sistema AssinaJur.
Você receberá o conteúdo HTML atual de um modelo e uma instrução de alteração do advogado.

SUA MISSÃO PRINCIPAL:
1. Retorne APENAS o código HTML resultante da alteração, sem explicações, sem texto introdutório e sem blocos markdown de código (NÃO use \`\`\`html ou \`\`\`).
2. Se o usuário pedir para remover dados pessoais, anonimizar, limpar dados ou transformar um documento específico em modelo reutilizável, substitua dados reais pelas variáveis de preenchimento automático do AssinaJur:
   - Nomes de clientes -> {{cliente_nome}}
   - CPF -> {{cliente_cpf}}
   - RG -> {{cliente_rg}}
   - Nacionalidade -> {{cliente_nacionalidade}}
   - Telefone/WhatsApp -> {{cliente_telefone}}
   - Endereço -> {{cliente_endereco}}
   - Estado Civil -> {{cliente_estado_civil}}
   - Profissão -> {{cliente_profissao}}
   - Nome do Advogado -> {{advogado_nome}}
   - OAB do Advogado -> {{advogado_oab}}
   - Nome do Escritório -> {{escritorio_nome}}
   - Valor de Honorarios -> {{valor_honorarios}}
   - Porcentagem / Percentual de Êxito -> {{percentual_exito}}
   - Cidade -> {{cidade}}
   - Data -> {{data_atual}}
3. Se o documento já possuir variáveis {{nome_da_variavel}}, PRESERVE-AS exatamente como estão, a menos que o comando peça para alterá-las.
4. Mantenha a mesma estrutura e formatação HTML original (tags <strong>, <h1>, <h2>, <p>, <ul>, <li>, etc).
5. Mantenha o tom estritamente formal e jurídico da advocacia brasileira.`;

// Chama o Gemini (Google AI, gratuito) tentando alguns modelos em sequência.
async function callGemini(apiKey: string, userPrompt: string): Promise<{ text: string; error: string }> {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
  let lastError = '';
  for (const modelName of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );
      if (response.ok) {
        const json = await response.json();
        const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) return { text: candidateText, error: '' };
      } else {
        lastError = await response.text();
        console.warn(`[AI Edit] Gemini ${modelName} retornou erro:`, lastError);
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[AI Edit] Falha ao chamar Gemini ${modelName}:`, lastError);
    }
  }
  return { text: '', error: lastError };
}

// Reserva gratuita (Groq Cloud, API compatível com OpenAI) para quando o Gemini
// estiver indisponível/sem cota - o escritório já usa essa mesma chave no
// agente de WhatsApp, então reaproveitamos o mesmo provedor aqui.
async function callGroq(apiKey: string, userPrompt: string): Promise<{ text: string; error: string }> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (response.ok) {
      const json = await response.json();
      const candidateText = json?.choices?.[0]?.message?.content;
      if (candidateText) return { text: candidateText, error: '' };
      return { text: '', error: 'Groq não retornou conteúdo.' };
    }
    const errorText = await response.text();
    console.warn('[AI Edit] Groq retornou erro:', errorText);
    return { text: '', error: errorText };
  } catch (err: any) {
    console.warn('[AI Edit] Falha ao chamar Groq:', err?.message || err);
    return { text: '', error: err?.message || String(err) };
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Rate limiting awareness: log warning if too many requests but continue working
    const now = Date.now();
    let userRate = rateLimits.get(user.id);
    if (!userRate || now > userRate.resetAt) {
      userRate = { count: 0, resetAt: now + 60000 };
    }
    userRate.count += 1;
    rateLimits.set(user.id, userRate);

    if (userRate.count > 10) {
      console.warn(`[AI Edit] Rate limit warning: Usuário ${user.id} está enviando requisições em excesso.`);
    }

    const body = await req.json();
    const { contentHtml, command } = body;

    if (!contentHtml || !command) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros contentHtml e command são obrigatórios' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!geminiKey && !groqKey) {
      console.error('[AI Edit] Nenhuma API key de IA configurada (GEMINI_API_KEY/GOOGLE_AI_KEY nem GROQ_API_KEY).');
      return NextResponse.json(
        { success: false, error: 'Serviço de IA não configurado no servidor' },
        { status: 500 }
      );
    }

    const userPrompt = `Comando de modificação: ${command}\n\nConteúdo HTML atual:\n${contentHtml}`;

    // Gemini é o principal; se falhar ou não estiver configurado, tentamos o
    // Groq (também gratuito) como reserva, para o recurso continuar funcionando
    // mesmo se um dos dois provedores estiver fora do ar ou sem cota no momento.
    let aiResult = '';
    let usedProvider = '';
    let lastError = '';

    if (geminiKey) {
      const geminiResponse = await callGemini(geminiKey, userPrompt);
      if (geminiResponse.text) {
        aiResult = geminiResponse.text;
        usedProvider = 'gemini';
      } else {
        lastError = geminiResponse.error;
      }
    }

    if (!aiResult && groqKey) {
      const groqResponse = await callGroq(groqKey, userPrompt);
      if (groqResponse.text) {
        aiResult = groqResponse.text;
        usedProvider = 'groq';
      } else if (groqResponse.error) {
        lastError = groqResponse.error;
      }
    }

    if (!aiResult) {
      console.error('[AI Edit] Nenhum provedor de IA respondeu com sucesso. Último erro:', lastError);
      return NextResponse.json(
        { success: false, error: 'O serviço de IA está indisponível no momento. Tente novamente em instantes.' },
        { status: 502 }
      );
    }

    // Limpar blocos de código markdown se houver
    aiResult = aiResult.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();

    // Validate if tags are missing
    const originalTags: string[] = (contentHtml.match(/\{\{[a-zA-Z_]+\}\}/g) as string[]) || [];
    const resultTags: string[] = (aiResult.match(/\{\{[a-zA-Z_]+\}\}/g) as string[]) || [];
    const missingTags = originalTags.filter((t) => !resultTags.includes(t));

    const warnings: string[] = [];
    if (missingTags.length > 0) {
      const uniqueMissing = Array.from(new Set(missingTags));
      for (const tag of uniqueMissing) {
        warnings.push(`Tag ${tag} foi removida pela IA`);
      }
    }

    return NextResponse.json({
      success: true,
      contentHtml: aiResult,
      html: aiResult,
      provider: usedProvider,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  } catch (error) {
    console.error('[AI Edit] Erro interno:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
