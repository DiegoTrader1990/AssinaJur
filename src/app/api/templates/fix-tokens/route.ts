import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';
import { ensureClientQualificationTokens, removeDuplicateParagraphs } from '@/lib/kitTemplateNormalization';

export const dynamic = 'force-dynamic';

/**
 * Correção em lote: reescreve a qualificação inicial (CONTRATANTE:/OUTORGANTE:/
 * DECLARANTE:) e o rodapé de assinatura (cidade, data, nome) de todos os
 * modelos do escritório para usar as variáveis dinâmicas ({{cliente_nome}},
 * {{cidade}}, {{data_atual}} etc.), em vez do texto fixo que alguns modelos
 * acumularam depois que a formatação do editor (negrito/fonte) apagava essas
 * variáveis ao salvar. Usa exatamente a mesma função (ensureClientQualificationTokens)
 * já usada com sucesso na revisão de kits, então o padrão fica idêntico em
 * todo o sistema.
 */
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const templates = await prisma.template.findMany({
      where: { officeId: user.officeId, active: true }, // TENANT ISOLATION
    });

    const updated: string[] = [];
    for (const template of templates) {
      const fixedHtml = removeDuplicateParagraphs(ensureClientQualificationTokens(template.contentHtml, template.title, template.documentType));
      if (fixedHtml !== template.contentHtml) {
        await prisma.template.update({
          where: { id: template.id },
          data: { contentHtml: fixedHtml },
        });
        updated.push(template.title);
      }
    }

    if (updated.length > 0) {
      await logAuditEvent({
        officeId: user.officeId,
        userId: user.id,
        eventType: 'TEMPLATE_TOKENS_FIXED',
        description: `Variáveis dinâmicas (nome, cidade, data etc.) reinseridas automaticamente em ${updated.length} modelo(s): ${updated.join(', ')}.`,
      });
    }

    return NextResponse.json({ success: true, checked: templates.length, updatedCount: updated.length, updatedTitles: updated });
  } catch (error: any) {
    console.error('Erro ao padronizar variáveis dos modelos:', error);
    return NextResponse.json({ error: 'Erro ao padronizar variáveis dos modelos.' }, { status: 500 });
  }
}
