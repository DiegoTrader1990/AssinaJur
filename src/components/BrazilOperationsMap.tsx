'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Navigation, Radar, Users } from 'lucide-react';

const MARKERS: Record<string, { x: number; y: number }> = {
  AC: { x: 95, y: 262 }, AL: { x: 357, y: 262 }, AM: { x: 158, y: 145 }, AP: { x: 254, y: 95 }, BA: { x: 337, y: 255 },
  CE: { x: 352, y: 182 }, DF: { x: 285, y: 310 }, ES: { x: 348, y: 352 }, GO: { x: 278, y: 300 }, MA: { x: 302, y: 175 },
  MG: { x: 304, y: 350 }, MS: { x: 218, y: 348 }, MT: { x: 215, y: 265 }, PA: { x: 252, y: 167 }, PB: { x: 382, y: 213 },
  PE: { x: 368, y: 232 }, PI: { x: 318, y: 209 }, PR: { x: 260, y: 424 }, RJ: { x: 328, y: 392 }, RN: { x: 383, y: 185 },
  RO: { x: 142, y: 245 }, RR: { x: 164, y: 84 }, RS: { x: 251, y: 496 }, SC: { x: 263, y: 457 }, SE: { x: 353, y: 280 }, SP: { x: 281, y: 396 }, TO: { x: 270, y: 236 },
};

export default function BrazilOperationsMap() {
  const [summary, setSummary] = useState<any>(null);
  const [selectedUf, setSelectedUf] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients/geographic-summary')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        setSummary(data?.summary || null);
        if (data?.summary?.topStates?.[0]?.uf) setSelectedUf(data.summary.topStates[0].uf);
      })
      .catch(() => setSummary(null));
  }, []);

  const states = summary?.states || [];
  const selectedState = useMemo(() => states.find((state: any) => state.uf === selectedUf) || summary?.topStates?.[0], [states, selectedUf, summary]);
  const totalClients = summary?.totalClientsWithLocation || 0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_55px_-40px_rgba(15,23,42,.45)]">
      <div className="grid lg:grid-cols-[1.08fr_.92fr]">
        <div className="relative min-h-[390px] overflow-hidden bg-[#071b3a] px-6 py-6 sm:px-8">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.20) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#d4af37]/15 blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#e4c55b]">
                <Radar className="h-3.5 w-3.5" /> Inteligência territorial
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-white">Presença do escritório</h2>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-300">Acompanhe onde sua operação está ativa e concentre a próxima ação.</p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">Dados reais</span>
          </div>

          <div className="relative z-10 mx-auto mt-3 h-[286px] max-w-[395px]">
            <svg viewBox="0 0 440 540" className="h-full w-full drop-shadow-2xl" aria-label="Mapa do Brasil com presença do escritório">
              <defs>
                <linearGradient id="territory" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#17335c" /><stop offset="1" stopColor="#0b2446" /></linearGradient>
                <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <path d="M177 44 L226 58 L250 47 L270 73 L302 88 L314 119 L347 139 L374 181 L366 214 L386 237 L370 280 L353 293 L357 329 L336 351 L329 384 L305 402 L286 394 L274 417 L283 445 L269 480 L251 511 L233 495 L234 465 L218 439 L221 413 L196 391 L181 351 L157 321 L164 276 L142 254 L150 221 L127 197 L142 157 L134 121 L150 89 L166 76 Z" fill="url(#territory)" stroke="#5e789b" strokeWidth="2" />
              <path d="M167 91 C201 114 224 143 237 177 M147 222 C197 231 255 222 326 181 M165 277 C217 282 277 306 352 293 M186 351 C236 340 282 357 331 384 M220 415 C245 424 264 442 270 478" fill="none" stroke="#7890ad" strokeOpacity=".35" strokeWidth="1.2" strokeDasharray="5 6" />
              {summary?.topStates?.map((state: any) => {
                const marker = MARKERS[state.uf];
                if (!marker) return null;
                const active = selectedUf === state.uf;
                return <g key={state.uf} className="cursor-pointer" onClick={() => setSelectedUf(state.uf)}>
                  {active && <circle cx={marker.x} cy={marker.y} r="17" fill="#d4af37" opacity=".18" filter="url(#glow)" />}
                  <circle cx={marker.x} cy={marker.y} r={active ? 8 : 5.5} fill={active ? '#f7dc76' : '#d4af37'} stroke="#ffffff" strokeWidth="2" />
                  {active && <text x={marker.x} y={marker.y + 3.5} textAnchor="middle" className="fill-[#071b3a] text-[7px] font-black">{state.uf}</text>}
                </g>;
              })}
            </svg>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
            <div><p className="text-xl font-semibold text-white">{totalClients}</p><p className="text-[10px] text-slate-400">clientes localizados</p></div>
            <div><p className="text-xl font-semibold text-white">{summary?.totalCitiesCount || 0}</p><p className="text-[10px] text-slate-400">cidades atendidas</p></div>
            <div><p className="text-xl font-semibold text-white">{summary?.totalStatesCount || 0}</p><p className="text-[10px] text-slate-400">estados ativos</p></div>
          </div>
        </div>

        <div className="flex min-h-[390px] flex-col p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Foco territorial</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{selectedState?.name || 'Sua operação'}</h3></div>
            {selectedState?.uf && <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8f3df] text-xs font-black text-[#8a6818]">{selectedState.uf}</span>}
          </div>

          {selectedState ? <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><Users className="mb-3 h-4 w-4 text-[#b68b1c]" /><p className="text-2xl font-semibold text-slate-900">{selectedState.clientCount || 0}</p><p className="text-[11px] text-slate-500">clientes na região</p></div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><Navigation className="mb-3 h-4 w-4 text-[#0b1d3d]" /><p className="text-2xl font-semibold text-slate-900">{selectedState.processCount || 0}</p><p className="text-[11px] text-slate-500">dossiês em gestão</p></div>
            </div>
            <div className="mt-6"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">Cidades atendidas</p><div className="mt-3 flex flex-wrap gap-2">{(selectedState.cities || []).slice(0, 7).map((city: any) => <span key={city.name} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-700">{city.name}<b className="ml-1.5 text-slate-900">{city.clientCount}</b></span>)}</div></div>
          </> : <div className="my-auto text-center"><MapPin className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">Inclua cidade e UF nos cadastros para ativar este painel.</p></div>}

          <Link href="/clientes" className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5 text-xs font-semibold text-[#0b1d3d]">Ver todos os clientes <ArrowUpRight className="h-4 w-4 text-[#b68b1c]" /></Link>
        </div>
      </div>
    </section>
  );
}
