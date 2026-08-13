import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureProcessDriveFolders } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

// Cria retroativamente as pastas de processos que já existiam antes da
// conexão com o Drive. Não mexe nos documentos nem duplica pastas existentes.
export async function POST() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const processes = await prisma.legalProcess.findMany({
    where: { officeId: user.officeId, driveFolderId: null },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  try {
    const outcomes = await Promise.allSettled(processes.map((process) => ensureProcessDriveFolders({
        id: process.id,
        officeId: process.officeId,
        title: process.title,
        client: process.client,
      })));
    const created = outcomes.filter((outcome) => outcome.status === 'fulfilled' && outcome.value).length;
    const failed = outcomes.filter((outcome) => outcome.status === 'rejected').length;
    outcomes.forEach((outcome) => {
      if (outcome.status === 'rejected') console.error('[Google Drive] Falha ao sincronizar processo:', outcome.reason);
    });
    return NextResponse.json({
      success: true,
      created,
      total: processes.length,
      failed,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Não foi possível sincronizar os processos com o Drive.",
      },
      { status: 500 },
    );
  }
}
