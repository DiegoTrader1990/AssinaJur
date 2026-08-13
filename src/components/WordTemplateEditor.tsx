'use client';

import { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';
import { AlertCircle, Eye, Loader2, Save } from 'lucide-react';

interface Props { templateId: string; title: string; }
const WORD_SERVICE = process.env.NEXT_PUBLIC_WORD_SERVICE_URL || 'http://127.0.0.1:5127';

export function WordTemplateEditor({ templateId, title }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [notice, setNotice] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;
    let root: Root | undefined;
    async function open() {
      try {
        setLoading(true); setError('');
        const health = await fetch(`${WORD_SERVICE}/health`);
        if (!health.ok) throw new Error('Editor Word local não está ativo. Abra o arquivo INICIAR_EDITOR_WORD.bat no computador do escritório e tente novamente.');
        const source = await fetch(`/api/templates/word?templateId=${templateId}`);
        if (!source.ok) throw new Error('Não foi possível obter o modelo Word protegido.');
        const form = new FormData();
        form.set('file', new File([await source.blob()], `${title}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        const converted = await fetch(`${WORD_SERVICE}/api/documenteditor/import`, { method: 'POST', body: form });
        if (!converted.ok) throw new Error('O modelo não pôde ser preparado para edição.');
        const sfdt = await converted.text();
        const { DocumentEditorContainerComponent, Toolbar } = await import('@syncfusion/ej2-react-documenteditor');
        DocumentEditorContainerComponent.Inject(Toolbar);
        if (destroyed || !hostRef.current) return;
        root = createRoot(hostRef.current);
        root.render(createElement(DocumentEditorContainerComponent as any, {
          height: '720px', enableToolbar: true,
          ref: (value: any) => { editorRef.current = value; },
        }));
        for (let attempt = 0; attempt < 20 && !editorRef.current; attempt += 1) await new Promise(resolve => setTimeout(resolve, 50));
        if (!editorRef.current) throw new Error('O editor Word não iniciou corretamente.');
        editorRef.current.documentEditor.open(sfdt);
      } catch (err: any) { if (!destroyed) setError(err.message || 'Não foi possível abrir o editor Word.'); }
      finally { if (!destroyed) setLoading(false); }
    }
    open();
    return () => { destroyed = true; try { root?.unmount(); } catch {} };
  }, [templateId, title]);

  const getSfdt = () => {
    const editor = editorRef.current?.documentEditor;
    if (!editor) throw new Error('O editor ainda está sendo preparado.');
    return editor.serialize();
  };
  const previewPdf = async () => {
    try {
      setPreviewing(true); setNotice('');
      const response = await fetch(`${WORD_SERVICE}/api/documenteditor/export-pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: getSfdt() }) });
      if (!response.ok) throw new Error('Não foi possível gerar a prévia em PDF.');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch (err: any) { setError(err.message || 'Não foi possível gerar a prévia.'); } finally { setPreviewing(false); }
  };
  const saveModel = async () => {
    try {
      setSaving(true); setNotice('');
      const editor = editorRef.current?.documentEditor;
      if (!editor) throw new Error('O editor ainda está sendo preparado.');
      const blob = await editor.saveAsBlob('Docx');
      const payload = new FormData();
      payload.set('templateId', templateId);
      payload.set('file', new File([blob], `${title}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
      const response = await fetch('/api/templates/word', { method: 'PUT', body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar o modelo Word.');
      setNotice('Modelo Word salvo. A próxima abertura manterá esta versão.');
    } catch (err: any) { setError(err.message || 'Não foi possível salvar o modelo.'); } finally { setSaving(false); }
  };

  if (error) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950"><div className="flex gap-2 font-bold"><AlertCircle className="w-5 h-5 text-amber-600" />Editor Word pronto para conexão local</div><p className="mt-2">{error}</p><p className="mt-3 text-xs">O modelo original permanece protegido. Abra o arquivo INICIAR_EDITOR_WORD.bat e recarregue esta tela.</p></div>;
  return <div className="relative min-h-[720px] overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Edição fiel do Word • a prévia usa este mesmo documento</p><div className="flex gap-2"><button onClick={previewPdf} disabled={loading || previewing} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><Eye className="h-4 w-4" />{previewing ? 'Gerando...' : 'Prévia PDF'}</button><button onClick={saveModel} disabled={loading || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1D3D] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando...' : 'Salvar modelo'}</button></div></div>{notice && <p className="border-b bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{notice}</p>}{loading && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/90 text-sm font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin text-blue-600" />Preparando documento Word...</div>}<div ref={hostRef} className="min-h-[720px]" />{previewUrl && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4"><div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white"><div className="flex items-center justify-between bg-[#0B1D3D] px-5 py-3 text-white"><strong>Prévia PDF do modelo Word</strong><button onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">Fechar</button></div><iframe src={previewUrl} title="Prévia PDF do modelo" className="w-full flex-1" /></div></div>}</div>;
}
