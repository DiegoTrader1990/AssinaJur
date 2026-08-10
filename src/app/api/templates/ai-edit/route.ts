import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      console.error('[AI Edit] API key não configurada.');
      return NextResponse.json(
        { success: false, error: 'Serviço de IA não configurado no servidor' },
        { status: 500 }
      );
    }

    const systemPrompt = `Você é um editor especializado em documentos jurídicos para escritórios de advocacia brasileiros.
Você receberá o conteúdo HTML atual de um modelo de documento jurídico e um comando de modificação.
Você deve retornar APENAS o HTML modificado, sem explicações adicionais e sem blocos markdown de código (como \`\`\`html).
CRÍTICO: NUNCA remova, modifique ou adicione variáveis de modelo no formato {{nome_da_variavel}}. Esses são espaços reservados para preenchimento automático e devem ser preservados exatamente como aparecem.
Mantenha a mesma estrutura HTML e formatação original.
Mantenha o documento em linguagem jurídica formal em português do Brasil.
Se o comando pedir para alterar porcentagens, valores ou cláusulas, aplique a alteração de forma precisa.`;

    const userPrompt = `Comando de modificação: ${command}\n\nConteúdo HTML atual:\n${contentHtml}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI Edit] Erro na API do Gemini:', errText);
      return NextResponse.json(
        { success: false, error: 'Falha na comunicação com o serviço de IA' },
        { status: 502 }
      );
    }

    const json = await response.json();
    let aiResult = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResult) {
      return NextResponse.json(
        { success: false, error: 'A IA não retornou o conteúdo esperado' },
        { status: 500 }
      );
    }

    // Clean up possible markdown code block wrapping
    aiResult = aiResult.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();

    // Validate if tags are missing
    const originalTags = contentHtml.match(/\{\{[a-zA-Z_]+\}\}/g) || [];
    const resultTags = aiResult.match(/\{\{[a-zA-Z_]+\}\}/g) || [];
    const missingTags = originalTags.filter((t: string) => !resultTags.includes(t));

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
