'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileWarning, Loader2, Minus, Plus, RotateCcw } from 'lucide-react';

type Props = { fileId: string; title: string };

const extension = (name: string) => name.split('.').pop()?.toLowerCase() || '';

export function IntakeDocumentPreview({ fileId, title }: Props) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pagesRef = useRef<HTMLDivElement>(null);
  const url = `/api/intake/file/${fileId}`;
  const ext = extension(title);
  const image = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  const pdf = ext === 'pdf';

  useEffect(() => {
    if (!pdf || !pagesRef.current) return;
    let cancelled = false;
    const container = pagesRef.current;
    async function render() {
      setLoading(true); setError(''); container.innerHTML = '';
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Não foi possível carregar o PDF.');
        const data = new Uint8Array(await response.arrayBuffer());
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
        const document = await pdfjs.getDocument({ data }).promise;
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await document.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.3 * zoom });
          const canvas = window.document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          canvas.className = 'mx-auto mb-5 max-w-full bg-white shadow-xl';
          await page.render({ canvasContext: context, viewport }).promise;
          if (!cancelled) container.appendChild(canvas);
        }
      } catch (reason: any) { if (!cancelled) setError(reason?.message || 'Não foi possível exibir este PDF.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    render();
    return () => { cancelled = true; };
  }, [pdf, url, zoom]);

  const controls = <div className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 p-1"><button type="button" onClick={() => setZoom((value) => Math.max(.6, Number((value - .15).toFixed(2))))} className="rounded p-1.5 hover:bg-white/15" aria-label="Diminuir zoom"><Minus className="h-4 w-4" /></button><span className="min-w-12 text-center text-[11px] font-bold">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(2.2, Number((value + .15).toFixed(2))))} className="rounded p-1.5 hover:bg-white/15" aria-label="Aumentar zoom"><Plus className="h-4 w-4" /></button><button type="button" onClick={() => setZoom(1)} className="rounded p-1.5 hover:bg-white/15" aria-label="Redefinir zoom"><RotateCcw className="h-4 w-4" /></button></div>;

  return <div className="flex min-h-0 flex-1 flex-col bg-slate-100"><div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-500"><span>{pdf ? 'Leitura do PDF — use os controles para ajustar a página.' : image ? 'Imagem original — use os controles para ampliar ou reduzir.' : 'Este formato não possui leitura integrada.'}</span>{(pdf || image) && <div className="bg-[#071B3A] text-white">{controls}</div>}</div>{pdf ? <div className="relative min-h-0 flex-1 overflow-auto p-5"><div ref={pagesRef} className="min-w-fit" />{loading && <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-100/80 text-sm font-bold text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Preparando páginas…</div>}{error && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-rose-700">{error}</div>}</div> : image ? <div className="min-h-0 flex-1 overflow-auto p-5"><img src={url} alt={title} className="mx-auto origin-top transition-transform" style={{ transform: `scale(${zoom})` }} onLoad={() => setLoading(false)} /><span className="sr-only">{loading ? 'Carregando imagem' : ''}</span></div> : <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"><FileWarning className="h-12 w-12 text-amber-500" /><div><p className="font-bold text-[#071B3A]">Arquivo do Word recebido</p><p className="mt-1 max-w-sm text-sm text-slate-500">Para preservar a formatação original, baixe o arquivo e abra-o no Word.</p></div><a href={url} download className="inline-flex items-center gap-2 rounded-xl bg-[#071B3A] px-4 py-3 text-xs font-bold text-white"><Download className="h-4 w-4" /> Baixar documento</a></div>}</div>;
}
