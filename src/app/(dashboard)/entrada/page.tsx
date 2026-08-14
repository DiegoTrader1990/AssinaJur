'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, FileText, FolderInput, Loader2, Sparkles, UserPlus } from 'lucide-react';

type Intake = {
  id: string;
  sourceFolderName: string;
  status: string;
  extractedName?: string | null;
  extractedCpf?: string | null;
  suggestedArea?: string | null;
  confidence: number;
  suggestedClient?: { id: string; name: string; cpfCnpj: string } | null;
  files: Array<{ id: string; title: string; classification?: string | null; file: { sizeBytes: number } }>;
};

export default function EntradaPage() {
  const [folders, setFolders] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/intake', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setFolders(data.folders || []))
      .finally(() => setLoading(false));
  }, []);

  return <main className="mx-auto max-w-6xl space-y-6 pb-12">
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#B68B1C]">Drive conectado</p><h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-[#071B3A]">Central de Entrada</h1><p className="mt-1.5 max-w-2xl text-sm text-slate-500">Pastas recebidas pela sua área sincronizada. Revise os dados sugeridos antes de transformar a entrada em cliente ou processo.</p></div>
      <span className="inline-flex items-center gap-2 rounded-xl border border-[#e4d09a] bg-[#fffaf0] px-4 py-3 text-xs font-bold text-[#705613]"><Sparkles className="h-4 w-4" /> Triagem assistida</span>
    </header>
    <section className="rounded-[26px] border border-blue-100 bg-gradient-to-r from-[#071B3A] to-[#143365] p-6 text-white shadow-lg"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#D4AF37]">Como a entrada funciona</p><p className="mt-2 text-sm leading-6 text-slate-200">Crie uma pasta com o nome da cliente, coloque os documentos e deixe o conector local importar. O AssinaJur procura um cadastro existente e organiza uma pré-triagem para conferência.</p></div><span className="shrink-0 rounded-xl bg-white/10 px-4 py-3 text-xs font-bold">Nada é cadastrado sem validação</span></div></section>
    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : !folders.length ? <section className="rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><FolderInput className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 font-heading text-lg font-extrabold text-[#071B3A]">Nenhuma pasta recebida ainda</h2><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">Quando você adicionar arquivos à pasta configurada do Drive, eles aparecerão aqui para revisão.</p></section> : <section className="grid gap-4 md:grid-cols-2">{folders.map((folder) => <article key={folder.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#B68B1C]">Aguardando revisão</p><h2 className="mt-1 truncate font-heading text-base font-extrabold text-[#071B3A]">{folder.sourceFolderName}</h2></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">{folder.files.length} arquivo{folder.files.length === 1 ? '' : 's'}</span></div><div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs"><p className="font-extrabold text-[#071B3A]">{folder.suggestedClient ? `Cliente identificado: ${folder.suggestedClient.name}` : `Pré-cadastro sugerido: ${folder.extractedName || folder.sourceFolderName}`}</p><p className="mt-1 text-slate-500">{folder.suggestedClient ? 'Cadastro existente encontrado para conferência.' : 'Nenhum cadastro correspondente foi confirmado ainda.'}{folder.suggestedArea ? ` Área sugerida: ${folder.suggestedArea}.` : ''}</p></div><div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">{folder.files.map((file) => <a key={file.id} href={`/api/documents/upload?fileId=${file.file.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg p-1.5 text-xs hover:bg-slate-50"><FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate font-medium text-slate-600">{file.title}</span><span className="shrink-0 text-[10px] text-slate-400">{file.classification || 'Documento'}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-blue-600" /></a>)}</div><div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">{folder.suggestedClient ? <Link href={`/processos?clienteId=${folder.suggestedClient.id}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#071B3A] px-3 py-2.5 text-xs font-bold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Abrir cliente</Link> : <Link href={`/clientes?novo=true&nome=${encodeURIComponent(folder.extractedName || folder.sourceFolderName)}&area=${encodeURIComponent(folder.suggestedArea || 'Previdenciário')}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#071B3A] px-3 py-2.5 text-xs font-bold text-white"><UserPlus className="h-3.5 w-3.5" /> Conferir pré-cadastro</Link>}</div></article>)}</section>}
  </main>;
}
