'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';

type ClauseType = 'title' | 'heading' | 'paragraph';
type Alignment = 'left' | 'center' | 'right' | 'justify';
type Clause = { id: string; type: ClauseType; text: string; font: string; size: string; align: Alignment; spaceAfter: 'normal' | 'large' };
const makeClause = (type: ClauseType, text = ''): Clause => ({ id: crypto.randomUUID(), type, text, font: 'Helvetica', size: type === 'title' ? '4' : '3', align: type === 'title' ? 'center' : type === 'paragraph' ? 'justify' : 'left', spaceAfter: 'normal' });

function toClauses(html: string): Clause[] {
  const root = document.createElement('div'); root.innerHTML = html;
  const blocks = Array.from(root.children).flatMap((node) => {
    const element = node as HTMLElement; const text = (element.innerText || element.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    const tag = element.tagName.toLowerCase(); const clause = makeClause(tag === 'h1' ? 'title' : /^h[2-6]$/.test(tag) ? 'heading' : 'paragraph', text);
    const align = element.style.textAlign as Alignment; if (align) clause.align = align;
    const font = element.querySelector('font')?.getAttribute('face'); if (font) clause.font = font;
    const size = element.querySelector('font')?.getAttribute('size'); if (size) clause.size = size;
    return [clause];
  });
  const raw = root.textContent?.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() || '';
  if (blocks.length <= 1 && /\b(?:OUTORGANTE|OUTORGADOS|CONTRATANTE|CONTRATADOS|OBJETO|PODERES|CLÁUSULA)\s*:/i.test(raw)) {
    return raw.split(/\s+(?=(?:OUTORGANTE|OUTORGADOS|CONTRATANTE|CONTRATADOS|OBJETO|PODERES(?:\s+(?:GERAIS|ESPECIAIS))?|CLÁUSULA\s+\d+|ASSIM,|DECLARA,|POR\s+SER)\b)/gi).map((text) => text.trim()).filter(Boolean).map((text, index) => makeClause(index === 0 ? 'title' : /^(?:CLÁUSULA|PODERES)/i.test(text) ? 'heading' : 'paragraph', text));
  }
  return blocks.length ? blocks : [makeClause('paragraph', raw)];
}
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function clauseToHtml(clause: Clause) {
  const content = `<font face="${clause.font}" size="${clause.size}">${escapeHtml(clause.text)}</font>`;
  const tag = clause.type === 'title' ? 'h1' : clause.type === 'heading' ? 'h2' : 'p';
  const body = clause.type === 'paragraph' ? content.replace(/^<font[^>]*>([A-ZÀ-Ú][A-ZÀ-Ú\sªº0-9.-]{1,70}:)/, (match, label) => match.replace(label, `<strong>${label}</strong>`)) : content;
  return `<${tag} style="text-align: ${clause.align};">${body}</${tag}>${clause.spaceAfter === 'large' ? '<p data-aj-spacer="large">&nbsp;</p>' : ''}`;
}

export function ClauseEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [clauses, setClauses] = useState<Clause[]>(() => toClauses(value));
  const commit = (next: Clause[]) => { setClauses(next); onChange(next.map(clauseToHtml).join('')); };
  const patch = (id: string, updates: Partial<Clause>) => commit(clauses.map((clause) => clause.id === id ? { ...clause, ...updates } : clause));
  const move = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= clauses.length) return; const next = [...clauses]; [next[index], next[target]] = [next[target], next[index]]; commit(next); };
  const add = (type: ClauseType) => commit([...clauses, makeClause(type)]);
  const remove = (id: string) => { if (clauses.length > 1) commit(clauses.filter((clause) => clause.id !== id)); };
  return <div className="space-y-3"><div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">Edite cada bloco sem alterar o modelo original. A prévia PDF será montada a partir destes parágrafos.</div><div className="space-y-2">{clauses.map((clause, index) => <div key={clause.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"><GripVertical className="h-4 w-4 text-slate-300" />{clause.type === 'title' ? 'Título' : clause.type === 'heading' ? 'Cláusula / subtítulo' : `Parágrafo ${index + 1}`}</div><div className="flex items-center gap-1"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button><button type="button" onClick={() => move(index, 1)} disabled={index === clauses.length - 1} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button><button type="button" onClick={() => remove(clause.id)} disabled={clauses.length === 1} className="rounded p-1 text-rose-500 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div></div><div className="mb-2 flex flex-wrap gap-2"><select value={clause.font} onChange={(e) => patch(clause.id, { font: e.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option>Helvetica</option><option>Times New Roman</option><option>Courier New</option></select><select value={clause.size} onChange={(e) => patch(clause.id, { size: e.target.value })} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option value="2">10 pt</option><option value="3">12 pt</option><option value="4">14 pt</option><option value="5">18 pt</option></select><select value={clause.align} onChange={(e) => patch(clause.id, { align: e.target.value as Alignment })} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option value="justify">Justificado</option><option value="left">Esquerda</option><option value="center">Centralizado</option><option value="right">Direita</option></select><select value={clause.spaceAfter} onChange={(e) => patch(clause.id, { spaceAfter: e.target.value as 'normal' | 'large' })} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"><option value="normal">Espaço normal</option><option value="large">Espaço maior após</option></select></div><textarea value={clause.text} onChange={(event) => patch(clause.id, { text: event.target.value })} rows={clause.type === 'paragraph' ? 4 : 2} className={`w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 ${clause.type === 'title' ? 'text-center font-bold' : clause.type === 'heading' ? 'font-bold' : ''}`} /></div>)}</div><div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3"><button type="button" onClick={() => add('paragraph')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />Adicionar parágrafo</button><button type="button" onClick={() => add('heading')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />Adicionar cláusula</button></div></div>;
}
