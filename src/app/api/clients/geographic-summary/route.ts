import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Tabela de normalização de UFs Brasileiras
const UF_MAP: Record<string, { uf: string; name: string }> = {
  AC: { uf: 'AC', name: 'Acre' },
  AL: { uf: 'AL', name: 'Alagoas' },
  AP: { uf: 'AP', name: 'Amapá' },
  AM: { uf: 'AM', name: 'Amazonas' },
  BA: { uf: 'BA', name: 'Bahia' },
  CE: { uf: 'CE', name: 'Ceará' },
  DF: { uf: 'DF', name: 'Distrito Federal' },
  ES: { uf: 'ES', name: 'Espírito Santo' },
  GO: { uf: 'GO', name: 'Goiás' },
  MA: { uf: 'MA', name: 'Maranhão' },
  MT: { uf: 'MT', name: 'Mato Grosso' },
  MS: { uf: 'MS', name: 'Mato Grosso do Sul' },
  MG: { uf: 'MG', name: 'Minas Gerais' },
  PA: { uf: 'PA', name: 'Pará' },
  PB: { uf: 'PB', name: 'Paraíba' },
  PR: { uf: 'PR', name: 'Paraná' },
  PE: { uf: 'PE', name: 'Pernambuco' },
  PI: { uf: 'PI', name: 'Piauí' },
  RJ: { uf: 'RJ', name: 'Rio de Janeiro' },
  RN: { uf: 'RN', name: 'Rio Grande do Norte' },
  RS: { uf: 'RS', name: 'Rio Grande do Sul' },
  RO: { uf: 'RO', name: 'Rondônia' },
  RR: { uf: 'RR', name: 'Roraima' },
  SC: { uf: 'SC', name: 'Santa Catarina' },
  SP: { uf: 'SP', name: 'São Paulo' },
  SE: { uf: 'SE', name: 'Sergipe' },
  TO: { uf: 'TO', name: 'Tocantins' },
};

function normalizeUf(input?: string | null): { uf: string; name: string } | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim().toUpperCase();

  if (UF_MAP[clean]) return UF_MAP[clean];

  for (const [code, info] of Object.entries(UF_MAP)) {
    if (info.name.toUpperCase() === clean || clean.includes(info.name.toUpperCase())) {
      return info;
    }
  }

  if (clean.length === 2 && /^[A-Z]{2}$/.test(clean)) {
    return { uf: clean, name: clean };
  }

  return null;
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      where: { officeId: user.officeId },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        legalArea: true,
        createdAt: true,
        processes: {
          select: { id: true, title: true, processNumber: true },
        },
        documents: {
          select: { id: true, status: true },
        },
      },
    });

    const stateAggregation: Record<
      string,
      {
        uf: string;
        name: string;
        clientCount: number;
        processCount: number;
        cities: Record<string, { name: string; clientCount: number; processCount: number }>;
        clientList: { id: string; name: string; city: string; legalArea: string; processCount: number }[];
      }
    > = {};

    let totalClientsWithLocation = 0;
    let totalClientsWithoutLocation = 0;

    clients.forEach((client) => {
      const norm = normalizeUf(client.state);
      if (!norm) {
        totalClientsWithoutLocation++;
        return;
      }

      totalClientsWithLocation++;
      const uf = norm.uf;
      const rawCity = client.city?.trim() || 'Cidade Não Especificada';
      const formattedCity = rawCity.charAt(0).toUpperCase() + rawCity.slice(1).toLowerCase();

      if (!stateAggregation[uf]) {
        stateAggregation[uf] = {
          uf: norm.uf,
          name: norm.name,
          clientCount: 0,
          processCount: 0,
          cities: {},
          clientList: [],
        };
      }

      stateAggregation[uf].clientCount++;
      stateAggregation[uf].processCount += client.processes.length;

      if (!stateAggregation[uf].cities[formattedCity]) {
        stateAggregation[uf].cities[formattedCity] = {
          name: formattedCity,
          clientCount: 0,
          processCount: 0,
        };
      }
      stateAggregation[uf].cities[formattedCity].clientCount++;
      stateAggregation[uf].cities[formattedCity].processCount += client.processes.length;

      stateAggregation[uf].clientList.push({
        id: client.id,
        name: client.name,
        city: formattedCity,
        legalArea: client.legalArea || 'Previdenciário',
        processCount: client.processes.length,
      });
    });

    const statesList = Object.values(stateAggregation)
      .map((st) => ({
        uf: st.uf,
        name: st.name,
        clientCount: st.clientCount,
        processCount: st.processCount,
        cityCount: Object.keys(st.cities).length,
        cities: Object.values(st.cities).sort((a, b) => b.clientCount - a.clientCount),
        clients: st.clientList,
      }))
      .sort((a, b) => b.clientCount - a.clientCount);

    const totalCitiesCount = new Set(
      clients
        .filter((c) => normalizeUf(c.state) && c.city?.trim())
        .map((c) => `${normalizeUf(c.state)?.uf}-${c.city?.trim().toLowerCase()}`)
    ).size;

    return NextResponse.json({
      success: true,
      summary: {
        totalClientsWithLocation,
        totalClientsWithoutLocation,
        totalStatesCount: statesList.length,
        totalCitiesCount,
        topStates: statesList.slice(0, 5),
        states: statesList,
      },
    });
  } catch (error: any) {
    console.error('Erro na API de resumo geográfico:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
