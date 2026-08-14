'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import brazilMap from '@svg-maps/brazil';
import { AlertCircle, ChevronRight, MapPinned, RefreshCw, UsersRound, BriefcaseBusiness } from 'lucide-react';

type City = { name: string; clientCount: number; processCount: number };
type StateSummary = {
  uf: string;
  name: string;
  clientCount: number;
  processCount: number;
  cityCount: number;
  cities: City[];
};

type GeographicSummary = {
  totalClientsWithLocation: number;
  totalClientsWithoutLocation: number;
  totalStatesCount: number;
  totalCitiesCount: number;
  totalProcessCount: number;
  topStates: StateSummary[];
  states: StateSummary[];
};

const UF_BY_LOCATION_ID: Record<string, string> = {
  ac: 'AC', al: 'AL', ap: 'AP', am: 'AM', ba: 'BA', ce: 'CE', df: 'DF', es: 'ES', go: 'GO',
  ma: 'MA', mt: 'MT', ms: 'MS', mg: 'MG', pa: 'PA', pb: 'PB', pr: 'PR', pe: 'PE', pi: 'PI',
  rj: 'RJ', rn: 'RN', rs: 'RS', ro: 'RO', rr: 'RR', sc: 'SC', sp: 'SP', se: 'SE', to: 'TO',
};

type Mode = 'CLIENTS' | 'PROCESSES';

function metricFor(state: StateSummary | null | undefined, mode: Mode) {
  return mode === 'CLIENTS' ? state?.clientCount || 0 : state?.processCount || 0;
}

function plural(value: number, singular: string, pluralWord = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralWord}`;
}

export default function BrazilOperationsMap() {
  const [data, setData] = useState<GeographicSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('CLIENTS');
  const [selectedUf, setSelectedUf] = useState<string | null>(null);
  const [hoveredUf, setHoveredUf] = useState<string | null>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const [labelPositions, setLabelPositions] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});

  useEffect(() => {
    fetch('/api/clients/geographic-summary')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        const summary = res?.summary as GeographicSummary | undefined;
        if (!summary) return;
        setData(summary);
        setSelectedUf(summary.topStates?.[0]?.uf || null);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const stateByUf = useMemo(() => {
    return Object.fromEntries((data?.states || []).map((state) => [state.uf, state]));
  }, [data]);

  const activeStates = useMemo(
    () => [...(data?.states || [])]
      .filter((state) => metricFor(state, mode) > 0)
      .sort((a, b) => metricFor(b, mode) - metricFor(a, mode)),
    [data, mode]
  );

  const selectedState = selectedUf ? stateByUf[selectedUf] : null;
  const selectedMetric = metricFor(selectedState, mode);
  const maxMetric = Math.max(1, ...activeStates.map((state) => metricFor(state, mode)));

  const selectMode = (nextMode: Mode) => {
    setMode(nextMode);
    const current = selectedUf ? stateByUf[selectedUf] : undefined;
    if (!current || metricFor(current, nextMode) === 0) {
      setSelectedUf((data?.states || []).find((state) => metricFor(state, nextMode) > 0)?.uf || null);
    }
  };

  useLayoutEffect(() => {
    if (!data) return;
    const positions: Record<string, { x: number; y: number; width: number; height: number }> = {};
    Object.entries(pathRefs.current).forEach(([uf, path]) => {
      if (!path) return;
      const box = path.getBBox();
      positions[uf] = { x: box.x + box.width / 2, y: box.y + box.height / 2, width: box.width, height: box.height };
    });
    setLabelPositions(positions);
  }, [data]);

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-42px_rgba(11,25,44,0.5)] lg:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#071B3A] text-[#E0BD48]">
              <MapPinned className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9E7515]">Inteligência territorial</span>
          </div>
          <h2 className="text-xl font-black tracking-[-0.025em] text-[#071B3A]">Operação Nacional</h2>
          <p className="mt-1 text-xs font-medium text-slate-500">Distribuição territorial dos clientes e processos do escritório.</p>
        </div>

        {data && (
          <p className="text-xs font-bold text-slate-500 lg:text-right">
            <span className="text-[#071B3A]">{plural(data.totalClientsWithLocation, 'cliente')}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-[#071B3A]">{plural(data.totalCitiesCount, 'cidade')}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-[#071B3A]">{plural(data.totalStatesCount, 'estado')}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="text-[#071B3A]">{plural(data.totalProcessCount, 'processo')}</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
          <RefreshCw className="h-5 w-5 animate-spin text-[#B68B1C]" />
          <p className="text-xs font-bold text-slate-500">Organizando a visão territorial do escritório…</p>
        </div>
      ) : !data?.totalClientsWithLocation ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl bg-slate-50 px-5 text-center">
          <MapPinned className="h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-sm font-black text-[#071B3A]">Nenhum cliente com localização válida encontrado.</h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">Ao completar cidade e UF nos cadastros, a operação aparecerá automaticamente no mapa.</p>
          <Link href="/clientes" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#071B3A] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#102D55]">
            Revisar cadastros <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => selectMode('CLIENTS')} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-extrabold transition ${mode === 'CLIENTS' ? 'bg-white text-[#071B3A] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                <UsersRound className="h-3.5 w-3.5" /> Clientes
              </button>
              <button type="button" onClick={() => selectMode('PROCESSES')} disabled={data.totalProcessCount === 0} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40 ${mode === 'PROCESSES' ? 'bg-white text-[#071B3A] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                <BriefcaseBusiness className="h-3.5 w-3.5" /> Processos
              </button>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">Clique em um estado para detalhar a operação.</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
            <div className="lg:col-span-3">
              <div className="relative mx-auto max-w-[510px] overflow-hidden rounded-2xl border border-slate-200/80 bg-[radial-gradient(circle_at_30%_25%,#ffffff_0%,#f8fafc_46%,#edf2f7_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-5">
                <div className="pointer-events-none absolute -left-20 top-1/3 h-40 w-40 rounded-full bg-[#D4AF37]/10 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 bottom-0 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
                <svg viewBox={brazilMap.viewBox} className="h-auto w-full" aria-label="Mapa do Brasil por estados">
                  {brazilMap.locations.map((location) => {
                    const uf = UF_BY_LOCATION_ID[location.id];
                    const state = stateByUf[uf];
                    const metric = metricFor(state, mode);
                    const active = metric > 0;
                    const selected = selectedUf === uf;
                    const hovered = hoveredUf === uf;
                    const intensity = active ? Math.max(0.28, metric / maxMetric) : 0;
                    const fill = selected ? '#071B3A' : active ? `rgba(180, 134, 29, ${0.28 + intensity * 0.58})` : '#E8EDF3';
                    return (
                      <path
                        key={location.id}
                        ref={(node) => { pathRefs.current[uf] = node; }}
                        d={location.path}
                        fill={fill}
                        stroke={selected ? '#E0BD48' : active ? '#A77815' : '#D9E1EA'}
                        strokeWidth={selected ? 2.4 : 1}
                        onMouseEnter={() => active && setHoveredUf(uf)}
                        onMouseLeave={() => setHoveredUf(null)}
                        onClick={() => active && setSelectedUf(uf)}
                        className={active ? 'cursor-pointer transition-[fill,stroke] duration-150' : 'transition-colors duration-150'}
                      >
                        <title>{state ? `${state.name}: ${plural(metric, mode === 'CLIENTS' ? 'cliente' : 'processo')}` : location.name}</title>
                      </path>
                    );
                  })}
                  {brazilMap.locations.map((location) => {
                    const uf = UF_BY_LOCATION_ID[location.id];
                    const state = stateByUf[uf];
                    const position = labelPositions[uf];
                    const metric = metricFor(state, mode);
                    if (!state || !position || metric === 0 || position.width < 18 || position.height < 14) return null;
                    const selected = selectedUf === uf;
                    return (
                      <text
                        key={`label-${uf}`}
                        x={position.x}
                        y={position.y + 2.5}
                        textAnchor="middle"
                        className={`pointer-events-none select-none text-[8px] font-black ${selected ? 'fill-[#E0BD48]' : 'fill-[#071B3A]'}`}
                      >
                        {uf} {metric}
                      </text>
                    );
                  })}
                </svg>

                {hoveredUf && stateByUf[hoveredUf] && (
                  <div className="pointer-events-none absolute left-5 top-5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
                    <p className="text-xs font-black text-[#071B3A]">{stateByUf[hoveredUf].name}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      {plural(stateByUf[hoveredUf].clientCount, 'cliente')} · {plural(stateByUf[hoveredUf].processCount, 'processo')} · {plural(stateByUf[hoveredUf].cityCount, 'cidade')}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-semibold text-slate-500">
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#E8EDF3] ring-1 ring-slate-300" /> Sem operação</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#B6861D]" /> Operação ativa</span>
                <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#071B3A]" /> Selecionado</span>
              </div>
            </div>

            <aside className="lg:col-span-2">
              {selectedState && selectedMetric > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_-26px_rgba(11,25,44,0.8)]">
                  <div className="bg-[#071B3A] px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#E0BD48]">Painel territorial</div>
                  <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9E7515]">Estado selecionado</p>
                      <h3 className="mt-1 text-lg font-black text-[#071B3A]">{selectedState.name}</h3>
                    </div>
                    <span className="rounded-lg bg-[#071B3A] px-2.5 py-1.5 text-xs font-black text-[#E0BD48]">{selectedState.uf}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3.5 text-center">
                    <div><p className="text-base font-black text-[#071B3A]">{selectedState.clientCount}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">clientes</p></div>
                    <div><p className="text-base font-black text-[#071B3A]">{selectedState.processCount}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">processos</p></div>
                    <div><p className="text-base font-black text-[#071B3A]">{selectedState.cityCount}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">cidades</p></div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Principais cidades</p>
                    <div className="mt-2 divide-y divide-slate-100">
                      {selectedState.cities.slice(0, 5).map((city) => (
                        <div key={city.name} className="flex items-center justify-between py-2 text-xs">
                          <span className="font-bold text-slate-700">{city.name}</span>
                          <span className="font-extrabold text-[#071B3A]">{mode === 'CLIENTS' ? plural(city.clientCount, 'cliente') : plural(city.processCount, 'processo')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link href="/clientes" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-[11px] font-extrabold text-[#071B3A] transition hover:bg-slate-50">Ver clientes</Link>
                    <Link href="/processos" className="flex-1 rounded-xl bg-[#071B3A] px-3 py-2 text-center text-[11px] font-extrabold text-white transition hover:bg-[#102D55]">Ver processos</Link>
                  </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <MapPinned className="mx-auto h-5 w-5 text-slate-300" />
                  <p className="mt-2 text-xs font-bold text-slate-600">Nenhum {mode === 'CLIENTS' ? 'cliente' : 'processo'} com localização disponível.</p>
                </div>
              )}

              {activeStates.length > 1 && (
                <div className="mt-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">Maior operação</p>
                  <ol className="mt-2 space-y-1">
                    {activeStates.slice(0, 4).map((state, index) => (
                      <li key={state.uf}>
                        <button type="button" onClick={() => setSelectedUf(state.uf)} className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition ${selectedUf === state.uf ? 'bg-[#071B3A]/5 text-[#071B3A]' : 'text-slate-600 hover:bg-slate-50'}`}>
                          <span className="flex min-w-0 items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-black text-slate-500">{index + 1}</span><span className="truncate font-bold">{state.name}</span></span>
                          <span className="font-black text-[#071B3A]">{metricFor(state, mode)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {data.totalClientsWithoutLocation > 0 && (
                <Link href="/clientes" className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  {plural(data.totalClientsWithoutLocation, 'cliente')} sem localização definida
                  <ChevronRight className="ml-auto h-3.5 w-3.5" />
                </Link>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
