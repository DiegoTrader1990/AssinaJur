'use client';

import { useEffect, useRef, useState } from 'react';
import { isWitnessStamp, type SignerStamp, type StampParticipant } from '@/lib/signer-stamps';

export default function SignerStampEditor({ source, participants, value, onChange }: {
  source: string | File; participants: StampParticipant[]; value: SignerStamp[]; onChange: (value: SignerStamp[]) => void;
}) {
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
  const update = (next: SignerStamp) => onChange([...value.filter((s) => s.order !== next.order), next]);
  const addAt = (x: number, y: number) => {
    if (!chosen || busy) return;
    const width = box?.width || 0.38, height = box?.height || 0.11;
    update({ order: chosen.signatureOrder, page: pageNumber, x: Math.max(0, Math.min(1 - width, x)), y: Math.max(0, Math.min(1 - height, y)), width, height });
  };
  return <div className="space-y-3">
    <p className="text-sm text-slate-700">Selecione um nome e clique em uma área livre da página para colocar seu selo. Arraste o selo para mover ou segure o canto inferior direito para aumentar e diminuir. Quem ficar sem posição será identificado na Folha de Assinaturas.</p>
    <div className="flex flex-wrap gap-2" aria-label="Participantes dos selos">{participants.map((person) => <button type="button" key={person.signatureOrder} aria-pressed={chosen?.signatureOrder === person.signatureOrder}
      className={`rounded-lg border px-3 py-2 text-xs ${chosen?.signatureOrder === person.signatureOrder ? 'bg-blue-700 text-white' : 'bg-white text-slate-800'}`}
      onClick={() => { setSelected(person.signatureOrder); const position = value.find((s) => s.order === person.signatureOrder); if (position) setPageNumber(position.page); }}>
      {person.name} · {isWitnessStamp(person.role) ? 'Testemunha' : person.role === 'CLIENTE' ? 'Parte' : person.role} · {value.some((s) => s.order === person.signatureOrder) ? 'na página' : 'na folha'}
    </button>)}</div>
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>← Página anterior</button>
      <span>Página {pageNumber} de {pageCount}</span>
      <button type="button" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((p) => p + 1)}>Próxima página →</button>
      {box && <><label>Largura <input aria-label="Largura do selo selecionado" type="range" min="22" max="65" value={Math.round(box.width * 100)} onChange={(e) => { const width = Number(e.target.value) / 100; update({ ...box, width, x: Math.min(box.x, 1 - width) }); }} /></label>
        <label>Altura <input aria-label="Altura do selo selecionado" type="range" min="7" max="25" value={Math.round(box.height * 100)} onChange={(e) => { const height = Number(e.target.value) / 100; update({ ...box, height, y: Math.min(box.y, 1 - height) }); }} /></label>
        <button type="button" onClick={() => onChange(value.filter((s) => s.order !== chosen.signatureOrder))}>Usar somente a folha</button></>}
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="max-h-[600px] overflow-auto bg-slate-200 p-3">
      <div ref={surface} className="relative mx-auto max-w-[700px] bg-white touch-none" onPointerDown={(e) => { if (e.target !== e.currentTarget && e.target !== canvas.current) return; const r = e.currentTarget.getBoundingClientRect(); addAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }}>
        <canvas ref={canvas} className="block w-full h-auto" />
        {value.filter((s) => s.page === pageNumber).map((s) => {
          const person = participants.find((p) => p.signatureOrder === s.order); if (!person) return null;
          return <div key={s.order} tabIndex={0} role="button" aria-label={`Selo de ${person.name}`} className={`absolute border-2 cursor-move p-1 overflow-hidden text-[9px] ${chosen?.signatureOrder === s.order ? 'border-blue-700 bg-blue-50/80 z-20' : 'border-slate-400 bg-white/70 z-10'}`}
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
            <strong className="block">{person.name}</strong><span>{isWitnessStamp(person.role) ? 'TESTEMUNHA · QR' : 'ASSINATURA ELETRÔNICA · QR'}</span><span className="block">CPF: {person.cpf}</span><span className="block">Horário e código após a assinatura</span>
          </div>;
        })}
        {busy && <div className="absolute inset-0 bg-white/80 flex items-center justify-center">Carregando página…</div>}
      </div>
    </div>
  </div>;
}
