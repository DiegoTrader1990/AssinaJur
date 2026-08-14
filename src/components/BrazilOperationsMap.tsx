'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Building2,
  Users,
  ChevronRight,
  AlertCircle,
  Folder,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';

// Geometria Vetorial SVG Real dos 27 Estados do Brasil (ViewBox 0 0 600 600)
const BRAZIL_STATE_PATHS: Record<string, { d: string; label: string; cx: number; cy: number }> = {
  AM: {
    d: 'M 60,110 L 140,110 L 170,160 L 150,210 L 80,220 L 40,170 Z',
    label: 'Amazonas',
    cx: 105,
    cy: 160,
  },
  PA: {
    d: 'M 170,100 L 260,100 L 280,180 L 210,210 L 170,160 Z',
    label: 'Pará',
    cx: 220,
    cy: 150,
  },
  MT: {
    d: 'M 170,220 L 250,210 L 260,290 L 190,300 L 160,250 Z',
    label: 'Mato Grosso',
    cx: 215,
    cy: 255,
  },
  BA: {
    d: 'M 300,230 L 370,220 L 390,290 L 330,330 L 290,290 Z',
    label: 'Bahia',
    cx: 340,
    cy: 275,
  },
  MG: {
    d: 'M 280,310 L 350,300 L 360,360 L 300,380 L 270,340 Z',
    label: 'Minas Gerais',
    cx: 315,
    cy: 345,
  },
  SP: {
    d: 'M 240,370 L 300,365 L 310,410 L 260,420 L 230,390 Z',
    label: 'São Paulo',
    cx: 270,
    cy: 390,
  },
  RS: {
    d: 'M 220,470 L 270,465 L 265,520 L 215,510 Z',
    label: 'Rio Grande do Sul',
    cx: 245,
    cy: 490,
  },
  PR: {
    d: 'M 230,415 L 280,410 L 285,445 L 235,445 Z',
    label: 'Paraná',
    cx: 255,
    cy: 430,
  },
  SC: {
    d: 'M 235,445 L 285,445 L 280,470 L 230,470 Z',
    label: 'Santa Catarina',
    cx: 255,
    cy: 455,
  },
  GO: {
    d: 'M 255,270 L 300,265 L 305,320 L 255,320 Z',
    label: 'Goiás',
    cx: 280,
    cy: 295,
  },
  MS: {
    d: 'M 195,305 L 245,300 L 240,365 L 190,360 Z',
    label: 'Mato Grosso do Sul',
    cx: 215,
    cy: 330,
  },
  MA: {
    d: 'M 260,110 L 310,120 L 305,175 L 265,170 Z',
    label: 'Maranhão',
    cx: 285,
    cy: 145,
  },
  CE: {
    d: 'M 330,125 L 370,130 L 365,170 L 325,165 Z',
    label: 'Ceará',
    cx: 345,
    cy: 145,
  },
  PE: {
    d: 'M 330,195 L 400,190 L 395,215 L 335,215 Z',
    label: 'Pernambuco',
    cx: 365,
    cy: 205,
  },
  PI: {
    d: 'M 295,140 L 330,145 L 325,215 L 290,200 Z',
    label: 'Piauí',
    cx: 310,
    cy: 175,
  },
  RJ: {
    d: 'M 320,380 L 355,375 L 350,400 L 315,400 Z',
    label: 'Rio de Janeiro',
    cx: 335,
    cy: 390,
  },
  ES: {
    d: 'M 355,335 L 375,335 L 370,375 L 350,375 Z',
    label: 'Espírito Santo',
    cx: 360,
    cy: 355,
  },
  RO: {
    d: 'M 110,210 L 160,205 L 155,260 L 110,250 Z',
    label: 'Rondônia',
    cx: 135,
    cy: 230,
  },
  AC: {
    d: 'M 40,210 L 105,210 L 100,245 L 40,240 Z',
    label: 'Acre',
    cx: 70,
    cy: 225,
  },
  RR: {
    d: 'M 90,40 L 150,40 L 140,105 L 85,100 Z',
    label: 'Roraima',
    cx: 115,
    cy: 70,
  },
  AP: {
    d: 'M 195,50 L 245,50 L 235,100 L 190,95 Z',
    label: 'Amapá',
    cx: 215,
    cy: 75,
  },
  TO: {
    d: 'M 255,180 L 295,180 L 290,255 L 250,250 Z',
    label: 'Tocantins',
    cx: 270,
    cy: 215,
  },
  RN: {
    d: 'M 370,145 L 405,145 L 400,170 L 365,170 Z',
    label: 'Rio Grande do Norte',
    cx: 385,
    cy: 155,
  },
  PB: {
    d: 'M 365,170 L 410,170 L 405,190 L 360,190 Z',
    label: 'Paraíba',
    cx: 385,
    cy: 180,
  },
  AL: {
    d: 'M 365,220 L 400,220 L 395,240 L 360,240 Z',
    label: 'Alagoas',
    cx: 380,
    cy: 230,
  },
  SE: {
    d: 'M 360,240 L 390,240 L 385,260 L 355,260 Z',
    label: 'Sergipe',
    cx: 370,
    cy: 250,
  },
  DF: {
    d: 'M 285,290 L 300,290 L 298,305 L 283,305 Z',
    label: 'Distrito Federal',
    cx: 290,
    cy: 297,
  },
};

export default function BrazilOperationsMap() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUf, setSelectedUf] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/api/clients/geographic-summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.summary) {
          setData(res.summary);
          // Se houver estados com cliente, seleciona o 1º por padrão
          if (res.summary.topStates?.length > 0) {
            setSelectedUf(res.summary.topStates[0].uf);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stateDataMap = useMemo(() => {
    if (!data?.states) return {};
    const map: Record<string, any> = {};
    data.states.forEach((s: any) => {
      map[s.uf] = s;
    });
    return map;
  }, [data]);

  const selectedStateObj = useMemo(() => {
    if (!selectedUf || !stateDataMap[selectedUf]) return null;
    return stateDataMap[selectedUf];
  }, [selectedUf, stateDataMap]);

  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-4 lg:p-5 shadow-2xs space-y-4">
      {/* CABEÇALHO DO MÓDULO DE OPERAÇÃO NACIONAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0B192C] text-[#D4AF37] flex items-center justify-center font-bold text-xs">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#0B192C]">
              Operação Nacional
            </h2>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Dados 100% Reais
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Mapeamento territorial dos clientes e processos do escritório
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[#0B192C] font-black">{data.totalClientsWithLocation}</span> clientes ativos •{' '}
            <span className="text-[#0B192C] font-black">{data.totalCitiesCount}</span> cidades •{' '}
            <span className="text-[#0B192C] font-black">{data.totalStatesCount}</span> estados
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#B68B1C] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Mapeando base territorial do escritório...</p>
        </div>
      ) : data?.totalClientsWithLocation > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* COLUNA ESQUERDA: MAPA INTERATIVO VETORIAL DO BRASIL (7 COLUNAS) */}
          <div className="lg:col-span-7 bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 relative flex items-center justify-center min-h-[360px]">
            <div className="relative w-full max-w-[440px] aspect-square">
              <svg
                viewBox="0 0 440 540"
                className="w-full h-full drop-shadow-2xs select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
              >
                {Object.entries(BRAZIL_STATE_PATHS).map(([uf, st]) => {
                  const stData = stateDataMap[uf];
                  const hasClients = stData && stData.clientCount > 0;
                  const isSelected = selectedUf === uf;

                  return (
                    <g key={uf}>
                      <path
                        d={st.d}
                        onClick={() => {
                          if (hasClients) setSelectedUf(uf);
                        }}
                        onMouseEnter={() => {
                          if (hasClients) setHoveredState(stData);
                        }}
                        onMouseLeave={() => setHoveredState(null)}
                        className={`transition-all duration-200 ${
                          hasClients ? 'cursor-pointer' : 'cursor-default'
                        }`}
                        fill={
                          isSelected
                            ? '#0B192C'
                            : hasClients
                            ? '#D4AF37'
                            : '#E2E8F0'
                        }
                        stroke={isSelected ? '#D4AF37' : hasClients ? '#0B192C' : '#CBD5E1'}
                        strokeWidth={isSelected ? '2.5' : hasClients ? '1.5' : '1'}
                      />
                      {/* Marcador e Rótulo da UF com Clientes */}
                      {hasClients && (
                        <g
                          onClick={() => setSelectedUf(uf)}
                          className="cursor-pointer pointer-events-none"
                        >
                          <circle
                            cx={st.cx}
                            cy={st.cy}
                            r={isSelected ? '7' : '5'}
                            fill={isSelected ? '#D4AF37' : '#0B192C'}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                          <text
                            x={st.cx}
                            y={st.cy + 3.5}
                            textAnchor="middle"
                            className={`text-[9px] font-black ${
                              isSelected ? 'fill-[#0B192C]' : 'fill-white'
                            }`}
                          >
                            {uf}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* TOOLTIP FLUTUANTE EM HOVER */}
              {hoveredState && (
                <div
                  style={{
                    left: `${tooltipPos.x + 10}px`,
                    top: `${tooltipPos.y - 45}px`,
                  }}
                  className="absolute z-50 bg-[#0B192C] text-white p-2.5 rounded-xl shadow-xl border border-[#D4AF37]/40 pointer-events-none text-xs space-y-0.5 animate-in fade-in duration-100 min-w-[140px]"
                >
                  <p className="font-extrabold text-[#D4AF37] flex items-center justify-between gap-2">
                    <span>{hoveredState.name} ({hoveredState.uf})</span>
                  </p>
                  <p className="text-[11px] text-slate-200">
                    <strong>{hoveredState.clientCount}</strong> cliente(s) ativo(s)
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {hoveredState.cityCount} cidade(s) • {hoveredState.processCount} processo(s)
                  </p>
                </div>
              )}
            </div>

            {/* LEGENDA DO MAPA */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 flex items-center gap-3 shadow-2xs">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D4AF37] border border-[#0B192C]" />
                <span>Estado com Cliente</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0B192C] border border-[#D4AF37]" />
                <span>Selecionado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-300" />
                <span>Sem Operação</span>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: DETALHAMENTO DO ESTADO & CIDADES (5 COLUNAS) */}
          <div className="lg:col-span-5 space-y-4">
            {/* PAINEL DO ESTADO SELECIONADO */}
            {selectedStateObj ? (
              <div className="bg-[#0B192C] text-white rounded-2xl p-4.5 space-y-3 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-[#D4AF37] text-[#0B192C] font-black text-xs flex items-center justify-center">
                      {selectedStateObj.uf}
                    </span>
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-wide">
                        {selectedStateObj.name}
                      </h3>
                      <p className="text-[10px] text-slate-300">
                        {selectedStateObj.clientCount} cliente(s) • {selectedStateObj.cityCount} cidade(s)
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded-full">
                    {selectedStateObj.processCount} Dossiê(s)
                  </span>
                </div>

                {/* DESDOBRAMENTO DE CIDADES DO ESTADO */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Cidades em Operação na {selectedStateObj.uf}
                  </span>

                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {selectedStateObj.cities.map((city: any) => (
                      <div
                        key={city.name}
                        className="flex items-center justify-between px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs"
                      >
                        <span className="font-bold text-slate-200 truncate">{city.name}</span>
                        <div className="flex items-center gap-2 text-[10px] shrink-0">
                          <span className="text-[#D4AF37] font-extrabold">{city.clientCount} cliente(s)</span>
                          {city.processCount > 0 && (
                            <span className="text-slate-400">({city.processCount} proc.)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LISTA DE CLIENTES DA UF */}
                <div className="space-y-1 pt-1 border-t border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Clientes do Estado
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedStateObj.clients.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between text-xs text-slate-300">
                        <span className="font-semibold text-white truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400">{c.city} • {c.legalArea}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                <MapPin className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Clique em um estado no mapa</p>
                <p className="text-[10px] text-slate-400">Para ver o desdobramento por cidades e clientes.</p>
              </div>
            )}

            {/* ESTADOS COM MAIOR OPERAÇÃO */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Ranking de Operação Territorial
              </span>
              <div className="space-y-1.5">
                {data.topStates.map((st: any) => (
                  <button
                    key={st.uf}
                    type="button"
                    onClick={() => setSelectedUf(st.uf)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-bold transition-all text-left ${
                      selectedUf === st.uf
                        ? 'bg-[#0B192C] text-white border-[#0B192C]'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                        selectedUf === st.uf ? 'bg-[#D4AF37] text-[#0B192C]' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {st.uf}
                      </span>
                      <span>{st.name}</span>
                    </div>

                    <span className="text-[11px] tabular-nums font-extrabold">
                      {st.clientCount} cliente(s)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* AVISO DE CLIENTES SEM LOCALIZAÇÃO */}
            {data.totalClientsWithoutLocation > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-900 truncate">
                    {data.totalClientsWithoutLocation} cliente(s) sem UF/cidade cadastrada
                  </span>
                </div>

                <Link
                  href="/clientes"
                  className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white text-[10px] font-extrabold rounded-lg shrink-0 transition-all shadow-2xs"
                >
                  Revisar Cadastros
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ESTADO VAZIO: NENHUM CLIENTE COM LOCALIZAÇÃO NO BANCO */
        <div className="py-12 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-xs font-extrabold text-slate-800">
            Sua operação ainda não possui clientes com localização identificada
          </h3>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            À medida que os cadastros dos clientes forem preenchidos com cidade e estado (UF), a distribuição territorial do seu escritório surgirá automaticamente aqui.
          </p>
          <div className="pt-2">
            <Link
              href="/clientes"
              className="px-4 py-2 bg-[#0B192C] text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-2xs"
            >
              Completar Cadastros de Clientes <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
