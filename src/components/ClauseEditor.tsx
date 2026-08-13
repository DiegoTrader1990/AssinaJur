'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';

type ClauseType = 'title' | 'heading' | 'paragraph';
type Clause = { id: string; type: ClauseType; text: string };

function toClauses(html: string): Clause[] {
  const root = document.createElement('div'); root.innerHTML = html;
  const blocks = Array.from(root.children).flatMap((node) => {
    const element = node as HTMLElement;
    const text = (element.innerText || element.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    const tag = element.tagName.toLowerCase();
    return [{ id: crypto.randomUUID(), type: tag === 'h1' ? 'title' : /^h[2-6]$/.test(tag) ? 'heading' : 'paragraph', text } as Clause];
  });
  return blocks.length ? blocks : [{ id: crypto.randomUUID(), type: 'paragraph', text: root.textContent?.replace(/\s+/g, ' ').trim() || '' }];
}
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function clauseToHtml(clause: Clause) {
  const text = escapeHtml(clause.text);
  if (clause.type === 'title') return `<h1>${text}</h1>`;
  if (clause.type === 'heading') return `<h2>${text}</h2>`;
  return `<p>${text.replace(/^([A-ZÀ-Ú][A-ZÀ-Ú\sªº0-9.-]{1,70}:)/, '<strong>$1</strong>')}</p>`;
}

export function ClauseEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [clauses, setClauses] = useState<Clause[]>(() => toClauses(value));
  const commit = (next: Clause[]) => { setClauses(next); onChange(next.map(clauseToHtml).join('')); };
  const update = (id: string, text: string) => commit(clauses.map((clause) => clause.id === id ? { ...clause, text } : clause));
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= clauses.length) return; const next = [...clauses]; [next[index], next[target]] = [next[target], next[index]]; commit(next); };
  const add = (type: ClauseType) => commit([...clauses, { id: crypto.randomUUID(), type, text: '' }]);
  const remove = (id: string) => { if (clauses.length > 1) commit(clauses.filter((clause) => clause.id !== id)); };
  return <div className="space-y-3"><div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">Edite cada bloco sem alterar o modelo original. A prévia PDF será montada a partir destes parágrafos.</div><div className="space-y-2">{clauses.map((clause, index) => <div key={clause.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><GripVertical className="h-4 w-4 text-slate-300" />{clause.type === 'title' ? 'Título' : clause.type === 'heading' ? 'Cláusula / subtítulo' : `Parágrafo ${index + 1}`}</div><div className="flex items-center gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={() => move(index, 1)} disabled={index === clauses.length - 1} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button><button type="button" onClick={() => remove(clause.id)} disabled={clauses.length === 1} className="rounded p-1 text-rose-500 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div></div><textarea value={clause.text} onChange={(event) => update(clause.id, event.target.value)} rows={clause.type === 'paragraph' ? 4 : 2} className={`w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 ${clause.type === 'title' ? 'text-center font-bold' : clause.type === 'heading' ? 'font-bold' : ''}`} /></div>)}</div><div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3"><button type="button" onClick={() => add('paragraph')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />Adicionar parágrafo</button><button type="button" onClick={() => add('heading')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />Adicionar cláusula</button></div></div>;
}
