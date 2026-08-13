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
    let created = 0;
    for (const process of processes) {
      const folder = await ensureProcessDriveFolders({
        id: process.id,
        officeId: process.officeId,
        title: process.title,
        client: process.client,
      });
      if (folder) created += 1;
    }
    return NextResponse.json({
      success: true,
      created,
      total: processes.length,
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
