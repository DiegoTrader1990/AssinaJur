'use client';

import { useEffect, useRef, useState } from 'react';
import { isWitnessStamp, type SignerStamp, type StampParticipant } from '@/lib/signer-stamps';

export default function SignerStampEditor({ source, participants, value, onChange }: {
  source: string | File; participants: StampParticipant[]; value: SignerStamp[]; onChange: (value: SignerStamp[]) => void;
}) {
  const focusStamp = useRef<number | null>(null);
  const [placementNotice, setPlacementNotice] = useState('');
  const [zoom, setZoom] = useState(100);
  const [showParticipants, setShowParticipants] = useState(false);
  const [selected, setSelected] = useState(participants[0]?.signatureOrder || 1);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<null | { order: number; dx: number; dy: number }>(null);
  const resize = useRef<null | { order: number; pointerId: number; startX: number; startY: number; box: SignerStamp }>(null);
  const chosen = participants.find((p) => p.signatureOrder === selected) || participants[0];
  const box = value.find((s) => s.order === chosen?.signatureOrder);
  useEffect(() => {
    let cancelled = false;
    let task: any;
    let render: any;
    setBusy(true); setError('');
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const bytes = source instanceof File ? await source.arrayBuffer() : await fetch(source).then((r) => { if (!r.ok) throw new Error(); return r.arrayBuffer(); });
        if (cancelled) return;
        task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
        const pdf = await task.promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);
        const safePage = Math.min(pageNumber, pdf.numPages);
        if (safePage !== pageNumber) { setPageNumber(safePage); return; }
        const page = await pdf.getPage(safePage);
        const viewport = page.getViewport({ scale: 1.4 });
        const element = canvas.current;
        if (!element || cancelled) return;
        element.width = viewport.width; element.height = viewport.height;
        render = page.render({ canvasContext: element.getContext('2d')!, viewport });
        await render.promise;
      } catch { if (!cancelled) setError('Não foi possível carregar a página. Feche e abra novamente a prévia.'); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; render?.cancel(); void task?.destroy(); };
  }, [source, pageNumber]);
  useEffect(() => {
    if (busy || focusStamp.current === null) return;
    const element = surface.current?.querySelector<HTMLElement>(`[data-stamp-order="${focusStamp.current}"]`);
    if (element) { element.scrollIntoView({ block: 'nearest', inline: 'nearest' }); element.focus({ preventScroll: true }); focusStamp.current = null; }
  }, [busy, value, pageNumber, selected]);
  const selectParticipant = (person: StampParticipant) => {
    setSelected(person.signatureOrder);
    const existing = value.find(s => s.order === person.signatureOrder);
    focusStamp.current = person.signatureOrder;
    if (existing) { setPageNumber(existing.page); setPlacementNotice(''); return; }
    if (busy || error) return;
    const width = 0.38, height = 0.11;
    const candidates = [0.72, 0.56, 0.40, 0.24, 0.08].flatMap(y => [0.08, 0.54].map(x => ({ x, y })));
    const free = candidates.find(p => !value.some(s => s.page === pageNumber && p.x < s.x + s.width && p.x + width > s.x && p.y < s.y + s.height && p.y + height > s.y));
    const point = free || candidates[0];
    onChange([...value, { order: person.signatureOrder, page: pageNumber, ...point, width, height }]);
    setPlacementNotice(`Selo de ${person.name} adicionado. Arraste para uma área livre e confira se não cobre o texto${free ? '.' : ' ou outro selo.'}`);
  };
  const update = (next: SignerStamp) => onChange([...value.filter((s) => s.order !== next.order), next]);
  const addAt = (x: number, y: number) => {
    if (!chosen || busy) return;
    const width = box?.width || 0.38, height = box?.height || 0.11;
    update({ order: chosen.signatureOrder, page: pageNumber, x: Math.max(0, Math.min(1 - width, x)), y: Math.max(0, Math.min(1 - height, y)), width, height });
  };
  const controlClass = 'h-10 min-w-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600';
  return <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
    <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 lg:self-start">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Participantes <span className="text-slate-400">({participants.length})</span></h3>
        <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-700 lg:hidden" aria-expanded={showParticipants} onClick={() => setShowParticipants(v => !v)}>{showParticipants ? 'Recolher' : 'Mostrar'}</button>
      </div>
      <div className={`${showParticipants ? 'block' : 'hidden'} mt-3 space-y-2 lg:block lg:max-h-[450px] lg:overflow-auto`} aria-label="Participantes dos selos">{participants.map(person => {
        const position = value.find(s => s.order === person.signatureOrder);
        const active = chosen?.signatureOrder === person.signatureOrder;
        return <button type="button" key={person.signatureOrder} aria-pressed={active}
          className={`w-full rounded-xl border p-3 text-left transition-colors ${active ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-slate-200 bg-white hover:border-blue-300'}`}
          disabled={busy || Boolean(error)} onClick={() => selectParticipant(person)}>
          <span className="block break-words text-xs font-bold text-slate-900">{person.name}</span>
          <span className="mt-1 block text-[11px] text-slate-500">{isWitnessStamp(person.role) ? 'Testemunha' : person.role === 'CLIENTE' || person.role === 'PARTE' ? 'Parte' : person.role.replace(/_/g, ' ')}</span>
          <span className={`mt-2 inline-block rounded-md px-2 py-1 text-[10px] font-semibold ${position ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{position ? `Posicionado · página ${position.page}` : 'Clique para adicionar selo'}</span>
        </button>;
      })}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Clique na pessoa para mostrar seu selo no PDF. QR e dados definitivos entram após a assinatura.</p>
    </aside>
    <section className="min-w-0 space-y-3" aria-label="Revisão do PDF e selos">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <nav className="flex items-center gap-2" aria-label="Páginas do PDF">
          <button type="button" className={controlClass} aria-label="Página anterior" title="Página anterior" disabled={busy || pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>←</button>
          <span className="min-w-[100px] text-center text-xs font-semibold text-slate-700" aria-live="polite">Página {pageNumber} de {pageCount}</span>
          <button type="button" className={controlClass} aria-label="Próxima página" title="Próxima página" disabled={busy || pageNumber >= pageCount} onClick={() => setPageNumber(p => p + 1)}>→</button>
        </nav>
        <div className="flex items-center gap-1" aria-label="Zoom do PDF">
          <button type="button" className={controlClass} aria-label="Diminuir zoom" disabled={zoom <= 100} onClick={() => setZoom(z => z - 25)}>−</button>
          <button type="button" className="h-10 min-w-16 rounded-lg px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" title="Ajustar à largura" aria-label="Ajustar PDF à largura" onClick={() => setZoom(100)}>{zoom}%</button>
          <button type="button" className={controlClass} aria-label="Aumentar zoom" disabled={zoom >= 200} onClick={() => setZoom(z => z + 25)}>+</button>
        </div>
      </div>
      <p className="text-xs text-slate-600">Arraste para mover. Puxe o canto para redimensionar.</p>
      {placementNotice && <p role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">{placementNotice}</p>}
      {!box && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>{chosen?.name}</strong>: clique no cartão do participante para mostrar o selo no PDF. Sem selo na página, a identificação permanece na folha de assinaturas.</p>}
      {box && <details className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <summary className="cursor-pointer py-1 text-xs font-semibold text-slate-700">Ajuste fino do selo · {chosen?.name}</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-600"><span className="flex justify-between">Largura <span>{Math.round(box.width * 100)}% da página</span></span><input className="mt-2 w-full accent-blue-700" aria-label="Largura do selo selecionado" type="range" min="22" max="65" value={Math.round(box.width * 100)} onChange={e => { const width = Number(e.target.value) / 100; update({ ...box, width, x: Math.min(box.x, 1 - width) }); }} /></label>
          <label className="text-xs text-slate-600"><span className="flex justify-between">Altura <span>{Math.round(box.height * 100)}% da página</span></span><input className="mt-2 w-full accent-blue-700" aria-label="Altura do selo selecionado" type="range" min="7" max="25" value={Math.round(box.height * 100)} onChange={e => { const height = Number(e.target.value) / 100; update({ ...box, height, y: Math.min(box.y, 1 - height) }); }} /></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => update({ ...box, width: 0.38, height: 0.11, x: Math.min(box.x, 0.62), y: Math.min(box.y, 0.89) })}>Restaurar tamanho</button>
          <button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => onChange(value.filter(s => s.order !== chosen.signatureOrder))}>Usar somente a folha</button>
        </div>
      </details>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="max-h-[65vh] overflow-auto rounded-xl border border-slate-300 bg-slate-200 p-2 sm:p-4">
        <div style={{ width: `${zoom}%` }}>
          <div ref={surface} className="relative mx-auto bg-white shadow-md touch-none" onPointerDown={(e) => { if (e.target !== e.currentTarget && e.target !== canvas.current) return; const r = e.currentTarget.getBoundingClientRect(); addAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }}>
        <canvas ref={canvas} className="block w-full h-auto" />
        {value.filter((s) => s.page === pageNumber).map((s) => {
          const person = participants.find((p) => p.signatureOrder === s.order); if (!person) return null;
          return <div key={s.order} data-stamp-order={s.order} tabIndex={0} role="button" aria-label={`Selo de ${person.name}`} className={`absolute border-2 cursor-move p-1 overflow-hidden text-[9px] ${chosen?.signatureOrder === s.order ? 'border-blue-700 bg-blue-50/80 z-20' : 'border-slate-400 bg-white/70 z-10'}`}
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.width * 100}%`, height: `${s.height * 100}%` }}
            onPointerDown={(e) => { e.stopPropagation(); setSelected(s.order); const r = surface.current!.getBoundingClientRect(); drag.current = { order: s.order, dx: (e.clientX - r.left) / r.width - s.x, dy: (e.clientY - r.top) / r.height - s.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (drag.current?.order !== s.order) return; const r = surface.current!.getBoundingClientRect(); update({ ...s, x: Math.max(0, Math.min(1 - s.width, (e.clientX - r.left) / r.width - drag.current.dx)), y: Math.max(0, Math.min(1 - s.height, (e.clientY - r.top) / r.height - drag.current.dy)) }); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            onKeyDown={(e) => { const delta = { ArrowLeft: [-0.005, 0], ArrowRight: [0.005, 0], ArrowUp: [0, -0.005], ArrowDown: [0, 0.005] }[e.key]; if (!delta) return; e.preventDefault(); update({ ...s, x: Math.max(0, Math.min(1 - s.width, s.x + delta[0])), y: Math.max(0, Math.min(1 - s.height, s.y + delta[1])) }); }}>
            <button type="button" aria-label={`Redimensionar selo de ${person.name}`} title="Arraste para redimensionar; use as setas para ajuste fino"
              className="absolute bottom-0 right-0 h-6 w-6 cursor-nwse-resize touch-none bg-blue-700 text-white rounded-tl text-base"
              onPointerDown={(e) => { e.stopPropagation(); setSelected(s.order); drag.current = null; resize.current = { order: s.order, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, box: { ...s } }; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => { e.stopPropagation(); const action = resize.current; if (!action || action.order !== s.order || action.pointerId !== e.pointerId) return; const r = surface.current!.getBoundingClientRect(); update({ ...action.box, width: Math.max(0.22, Math.min(0.65, 1 - action.box.x, action.box.width + (e.clientX - action.startX) / r.width)), height: Math.max(0.07, Math.min(0.25, 1 - action.box.y, action.box.height + (e.clientY - action.startY) / r.height)) }); }}
              onPointerUp={(e) => { e.stopPropagation(); resize.current = null; }} onPointerCancel={(e) => { e.stopPropagation(); resize.current = null; }} onLostPointerCapture={() => { resize.current = null; }}
              onKeyDown={(e) => { e.stopPropagation(); const delta = { ArrowLeft: [-0.005, 0], ArrowRight: [0.005, 0], ArrowUp: [0, -0.005], ArrowDown: [0, 0.005] }[e.key]; if (!delta) return; e.preventDefault(); update({ ...s, width: Math.max(0.22, Math.min(0.65, 1 - s.x, s.width + delta[0])), height: Math.max(0.07, Math.min(0.25, 1 - s.y, s.height + delta[1])) }); }}>↘</button>
            <span className="block font-bold text-blue-800">PRÉVIA DO SELO</span><strong className="block">{person.name}</strong><span>{isWitnessStamp(person.role) ? 'TESTEMUNHA · QR' : 'ASSINATURA ELETRÔNICA · QR'}</span><span className="block">CPF: {person.cpf}</span><span className="block">Horário e código após a assinatura</span>
          </div>;
        })}
        {busy && <div className="absolute inset-0 bg-white/80 flex items-center justify-center">Carregando página…</div>}
      </div>
        </div>
      </div>
    </section>
  </div>;
}
