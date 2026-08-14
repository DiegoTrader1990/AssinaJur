'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, ChevronRight, FolderPlus, Send, Folder, User, ShieldCheck,
  Zap, MessageSquare, Search, Copy, Check, Loader2, AlertCircle, X,
  UserPlus, FileUp, File, QrCode, ChevronDown, Bell, Activity,
  Edit3, Scale, ArrowUpRight, Briefcase, Clock, FileText, Layers,
} from 'lucide-react';

/* ═══ MASKS ═══ */
const maskCpf = (v: string) => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const maskPhone = (v: string) => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
const maskRg = (v: string) => v.replace(/\D/g, '').slice(0, 9).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const validateCpf = (cpf: string) => {
  const n = cpf.replace(/\D/g, ''); if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i); let c = 11 - (s % 11); if (c >= 10) c = 0; if (parseInt(n[9]) !== c) return false;
  s = 0; for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i); c = 11 - (s % 11); if (c >= 10) c = 0; return parseInt(n[10]) === c;
};

/* ═══ COMBOBOX ═══ */
function ClientSearch({ clients, value, onChange, onNew }: { clients: any[]; value: string; onChange: (id: string) => void; onNew?: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(() => { if (!q) return clients; const s = q.toLowerCase(); return clients.filter((c) => c.name?.toLowerCase().includes(s) || c.cpfCnpj?.includes(s)); }, [clients, q]);
  const sel = clients.find((c) => c.id === value);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`w-full flex items-center gap-3 px-5 py-4 bg-white border-2 rounded-2xl text-left transition-all duration-200 ${open ? 'border-[#B68B1C] shadow-[0_0_0_4px_rgba(182,139,28,0.08)]' : 'border-slate-200 hover:border-slate-300'}`}>
        {sel ? (
          <><div className="w-10 h-10 rounded-full bg-[#071B3A] text-white flex items-center justify-center text-sm font-black shrink-0">{sel.name.charAt(0)}</div>
            <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold text-slate-900 truncate">{sel.name}</p><p className="text-sm text-slate-500">{sel.cpfCnpj || 'CPF não informado'}</p></div></>
        ) : (
          <><Search className="w-5 h-5 text-slate-400 shrink-0" /><span className="text-[15px] text-slate-400">Selecionar cliente...</span></>
        )}
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] max-h-80 overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou CPF..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-800 focus:outline-none focus:border-[#B68B1C] focus:bg-white transition-all" autoFocus />
          </div>
          <div className="overflow-y-auto max-h-52 py-1">
            {list.length > 0 ? list.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); setQ(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${value === c.id ? 'bg-amber-50/80' : 'hover:bg-slate-50'}`}>
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">{c.name.charAt(0)}</div>
                <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold text-slate-800 truncate">{c.name}</p><p className="text-sm text-slate-500">{c.cpfCnpj || 'Sem CPF'}</p></div>
                {value === c.id && <Check className="w-5 h-5 text-[#B68B1C] shrink-0" />}
              </button>
            )) : <p className="px-4 py-6 text-center text-sm text-slate-400">Nenhuma cliente encontrada.</p>}
          </div>
          {onNew && (
            <div className="border-t border-slate-100 p-3">
              <button type="button" onClick={() => { onNew(); setOpen(false); }} className="w-full py-3 bg-[#071B3A] text-white text-sm font-semibold rounded-xl hover:bg-[#0A254F] transition-all flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Cadastrar Nova Cliente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<'PDF' | 'KIT' | 'CLIENT' | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [docCustomTitle, setDocCustomTitle] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientRg, setNewClientRg] = useState('');
  const cpfValid = useMemo(() => { const r = newClientCpf.replace(/\D/g, ''); return r.length < 11 ? null : validateCpf(newClientCpf); }, [newClientCpf]);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.ok ? r.json() : null),
      fetch('/api/office').then((r) => r.ok ? r.json() : null),
      fetch('/api/clients').then((r) => r.ok ? r.json() : null),
      fetch('/api/documents').then((r) => r.ok ? r.json() : null),
      fetch('/api/processos').then((r) => r.ok ? r.json() : null),
      fetch('/api/kits').then((r) => r.ok ? r.json() : null),
    ]).then(([u, o, c, d, p, k]) => {
      if (u?.user) setCurrentUser(u.user);
      if (o?.office) setOffice(o.office);
      setClients(c?.clients || []);
      setDocuments(d?.documents || []);
      const pr = p?.processes || [];
      setProcesses(pr);
      if (pr.length > 0) setExpandedFolder(pr[0].id);
      const lk = k?.kits || [];
      setKits(lk);
      if (lk.length > 0) setSelectedKitId(lk[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const completed = useMemo(() => documents.filter((d) => d.status === 'CONCLUIDO'), [documents]);
  const pending = useMemo(() => documents.filter((d) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(d.status)), [documents]);
  const timeSaved = useMemo(() => { const m = completed.length * 45 + processes.length * 15 + pending.length * 20; return { h: Math.floor(m / 60), m: m % 60 }; }, [completed, pending, processes]);

  const activities = useMemo(() => {
    const a: { date: Date; type: 'signed' | 'pending' | 'folder'; text: string }[] = [];
    documents.forEach((d) => a.push({ date: new Date(d.updatedAt || d.createdAt), type: d.status === 'CONCLUIDO' ? 'signed' : 'pending', text: `${d.title} — ${d.client?.name || 'Cliente'}` }));
    processes.forEach((p) => a.push({ date: new Date(p.createdAt), type: 'folder', text: `Dossiê ${p.client?.name || p.title}` }));
    return a.sort((x, y) => y.date.getTime() - x.date.getTime()).slice(0, 5);
  }, [documents, processes]);

  const pendingAlerts = useMemo(() => {
    return pending.map((doc) => {
      const days = Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 864e5);
      return { days, urgent: days >= 3, title: doc.title, client: doc.client?.name || 'Cliente', phone: doc.client?.phone || doc.client?.whatsapp || '' };
    }).sort((a, b) => b.days - a.days).slice(0, 4);
  }, [pending]);

  /* Handlers */
  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Envie um arquivo PDF.'); return; }
    setUploadingPdf(true); setError(''); setDocCustomTitle(file.name.replace(/\.pdf$/i, ''));
    try { const fd = new FormData(); fd.append('file', file); const r = await fetch('/api/documents/upload', { method: 'POST', body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setUploadedPdf(d.file); } catch (e: any) { setError(e.message); } finally { setUploadingPdf(false); }
  };
  const buildMsg = useCallback((name: string, link: string) => `Olá ${name}!\n\nSeus documentos jurídicos do escritório ${office?.name || 'Rodrigues & Soares'} estão prontos para assinatura digital.\n\nAcesse o link seguro:\n${link}\n\nQualquer dúvida, entre em contato.`, [office]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedClientId) { setError('Selecione a cliente.'); return; }
    setSubmitting(true); setError(''); setResult(null);
    try {
      if (activeAction === 'PDF') {
        if (!uploadedPdf) throw new Error('Selecione um PDF.');
        const r = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: docCustomTitle || uploadedPdf.name, clientId: selectedClientId, fileId: uploadedPdf.id }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error);
        const cl = clients.find((c) => c.id === selectedClientId); const link = `https://www.assinajur.com.br/assinar/${d.document.token}`;
        setWhatsappMsg(buildMsg(cl?.name || 'Cliente', link));
        setResult({ clientName: cl?.name || 'Cliente', clientPhone: cl?.phone || cl?.whatsapp || '', signatureLink: link });
      } else {
        if (!selectedKitId) throw new Error('Selecione o Kit.');
        const r = await fetch('/api/kits/generate-package', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, kitId: selectedKitId, variables: { valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%' } }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); const cl = clients.find((c) => c.id === selectedClientId);
        setWhatsappMsg(buildMsg(d.result.clientName, d.result.signatureLink));
        setResult({ clientName: d.result.clientName, clientPhone: cl?.phone || cl?.whatsapp || '', signatureLink: d.result.signatureLink });
      }
      fetch('/api/documents').then((r) => r.json()).then((x) => setDocuments(x.documents || []));
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  };

  const handleNewClient = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newClientName.trim()) { setError('Informe o nome.'); return; }
    setSubmitting(true); setError('');
    try {
      const r = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClientName, cpfCnpj: newClientCpf.replace(/\D/g, ''), phone: newClientPhone.replace(/\D/g, ''), whatsapp: newClientPhone.replace(/\D/g, ''), rg: newClientRg }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      await fetch('/api/processos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Dossiê — ${d.client.name}`, clientId: d.client.id }) });
      const [uc, up] = await Promise.all([fetch('/api/clients').then((r) => r.json()), fetch('/api/processos').then((r) => r.json())]);
      if (uc?.clients) setClients(uc.clients); if (up?.processes) setProcesses(up.processes);
      setSelectedClientId(d.client.id); setActiveAction(null); setNewClientName(''); setNewClientCpf(''); setNewClientPhone(''); setNewClientRg('');
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  };

  const selectedKit = useMemo(() => kits.find((k) => k.id === selectedKitId), [kits, selectedKitId]);
  const name = currentUser?.name?.split(' ').slice(0, 2).join(' ') || 'Dr. Diego';

  return (
    <main className="mx-auto max-w-6xl pb-24">
      {/* ─────────────────────────────────────────────── */}
      {/*  HEADER PREMIUM                                 */}
      {/* ─────────────────────────────────────────────── */}
      <header className="pt-2 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{office?.name || 'Rodrigues & Soares Advocacia'}</p>
            <h1 className="text-[28px] font-extrabold text-[#071B3A] tracking-tight mt-0.5">
              Olá, {name} <span className="inline-block animate-[wave_2s_ease-in-out_infinite]">👋</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            {[
              { n: loading ? '—' : String(clients.length).padStart(2, '0'), l: 'Clientes', c: 'text-[#071B3A]' },
              { n: loading ? '—' : String(pending.length).padStart(2, '0'), l: 'Pendentes', c: 'text-amber-600', dot: pending.length > 0 },
              { n: loading ? '—' : String(completed.length).padStart(2, '0'), l: 'Assinados', c: 'text-emerald-600' },
              { n: `${timeSaved.h}h${String(timeSaved.m).padStart(2, '0')}`, l: 'Tempo Salvo', c: 'text-[#B68B1C]' },
            ].map((m, i) => (
              <div key={i} className="text-center hidden sm:block">
                <p className={`text-2xl font-extrabold ${m.c} tabular-nums leading-none`}>{m.n}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{m.l}</p>
                {m.dot && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mx-auto mt-1 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {/* ─────────────────────────────────────────────── */}
        {/*  AÇÕES RÁPIDAS — 3 CARDS PREMIUM                */}
        {/* ─────────────────────────────────────────────── */}
        {!activeAction && !result && (
          <section className="grid sm:grid-cols-3 gap-4">
            {[
              { key: 'PDF' as const, icon: <FileUp className="w-7 h-7" />, title: 'Enviar PDF', desc: 'Arraste um documento do computador', color: 'from-[#071B3A] to-[#0d2d5e]', iconBg: 'bg-amber-400/20 text-amber-300' },
              { key: 'KIT' as const, icon: <Layers className="w-7 h-7" />, title: 'Disparar Kit Jurídico', desc: 'Procuração + Contrato + Declaração', color: 'from-[#0d2d5e] to-[#164080]', iconBg: 'bg-blue-400/20 text-blue-300' },
              { key: 'CLIENT' as const, icon: <UserPlus className="w-7 h-7" />, title: 'Nova Cliente', desc: 'Cadastro qualificado + dossiê automático', color: 'from-emerald-700 to-emerald-900', iconBg: 'bg-emerald-400/20 text-emerald-300' },
            ].map((card) => (
              <button key={card.key} onClick={() => { setActiveAction(card.key); setResult(null); setError(''); }}
                className={`group relative bg-gradient-to-br ${card.color} rounded-3xl p-7 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.99] overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
                <div className={`w-14 h-14 rounded-2xl ${card.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>{card.icon}</div>
                <h3 className="text-lg font-bold text-white">{card.title}</h3>
                <p className="text-sm text-white/60 mt-1">{card.desc}</p>
                <ArrowUpRight className="absolute bottom-6 right-6 w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
              </button>
            ))}
          </section>
        )}

        {/* ─────────────────────────────────────────────── */}
        {/*  RESULTADO DO ENVIO                              */}
        {/* ─────────────────────────────────────────────── */}
        {result && (
          <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle2 className="w-7 h-7" /></div>
                <div><h2 className="text-xl font-bold text-[#071B3A]">Documento pronto para assinatura!</h2><p className="text-sm text-slate-500 mt-0.5">Enviado para <strong>{result.clientName}</strong> — link seguro gerado.</p></div>
              </div>
              <button onClick={() => { setResult(null); setUploadedPdf(null); setActiveAction(null); }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Mensagem do WhatsApp</p>
                <button onClick={() => setEditingMsg(!editingMsg)} className="text-xs font-semibold text-[#B68B1C] hover:underline flex items-center gap-1"><Edit3 className="w-3 h-3" />{editingMsg ? 'Fechar' : 'Editar'}</button></div>
              {editingMsg ? <textarea value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)} rows={5} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#B68B1C] resize-none" />
                : <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">{whatsappMsg}</div>}
            </div>

            <div className="flex flex-wrap gap-3">
              {result.clientPhone ? (
                <a href={`https://wa.me/55${result.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`} target="_blank" rel="noreferrer"
                  className="px-7 py-3.5 bg-[#25D366] hover:bg-[#1fb855] text-white font-bold text-sm rounded-2xl shadow-lg flex items-center gap-2 transition-all hover:shadow-xl hover:-translate-y-0.5"><MessageSquare className="w-4 h-4" /> Enviar no WhatsApp</a>
              ) : <span className="px-5 py-3.5 bg-amber-50 text-amber-800 font-semibold text-sm rounded-2xl border border-amber-200">⚠️ Sem telefone cadastrado</span>}
              <button onClick={() => { navigator.clipboard.writeText(result.signatureLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                className="px-6 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-semibold text-sm rounded-2xl flex items-center gap-2 hover:border-slate-300 transition-all">
                {copiedLink ? <><Check className="w-4 h-4 text-emerald-600" /> Link copiado!</> : <><Copy className="w-4 h-4" /> Copiar link</>}</button>
              <button onClick={() => setShowQr(true)} className="px-5 py-3.5 bg-white border-2 border-slate-200 text-slate-700 font-semibold text-sm rounded-2xl flex items-center gap-2 hover:border-slate-300 transition-all"><QrCode className="w-4 h-4" /> QR Code</button>
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────── */}
        {/*  FORMULÁRIO: PDF AVULSO                          */}
        {/* ─────────────────────────────────────────────── */}
        {activeAction === 'PDF' && !result && (
          <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#071B3A] flex items-center justify-center"><FileUp className="w-5 h-5 text-amber-400" /></div>
                <div><h2 className="text-lg font-bold text-[#071B3A]">Enviar PDF para Assinatura</h2><p className="text-sm text-slate-500">Arraste do computador ou busque nos arquivos</p></div></div>
              <button onClick={() => { setActiveAction(null); setUploadedPdf(null); }} className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">← Voltar</button>
            </div>
            <form onSubmit={handleDispatch} className="space-y-5 max-w-xl">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDrop={async (e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) await processFile(e.dataTransfer.files[0]); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${
                  dragActive ? 'border-[#B68B1C] bg-amber-50/50 scale-[1.01]'
                  : uploadedPdf ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-[#B68B1C] hover:bg-amber-50/20'}`}>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={async (e) => { if (e.target.files?.[0]) await processFile(e.target.files[0]); }} className="hidden" />
                {uploadingPdf ? (
                  <div className="py-14 text-center"><Loader2 className="w-8 h-8 text-[#B68B1C] animate-spin mx-auto" /><p className="text-sm font-medium text-slate-600 mt-3">Carregando...</p></div>
                ) : uploadedPdf ? (
                  <div className="p-6 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><File className="w-7 h-7" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold text-slate-900 truncate">{uploadedPdf.name}</p><p className="text-sm text-emerald-600 font-medium mt-0.5">✓ Pronto • {(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(1)} MB</p></div>
                    <span className="text-sm font-medium text-slate-500 hover:text-slate-700 bg-slate-100 px-4 py-2 rounded-xl">Trocar</span>
                  </div>
                ) : (
                  <div className="py-14 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><FileUp className="w-8 h-8 text-slate-400" /></div>
                    <p className="text-[15px] font-semibold text-slate-800">Arraste e solte seu PDF aqui</p>
                    <p className="text-sm text-slate-500 mt-1">ou <span className="text-[#B68B1C] font-semibold underline underline-offset-2">clique para buscar</span></p>
                  </div>
                )}
              </div>
              <input type="text" value={docCustomTitle} onChange={(e) => setDocCustomTitle(e.target.value)} placeholder="Título (Ex: Procuração Ad Judicia)"
                className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-[#B68B1C] focus:shadow-[0_0_0_4px_rgba(182,139,28,0.08)] rounded-2xl text-[15px] text-slate-800 focus:outline-none transition-all" />
              <ClientSearch clients={clients} value={selectedClientId} onChange={setSelectedClientId} onNew={() => setActiveAction('CLIENT')} />
              <button type="submit" disabled={submitting || !selectedClientId || !uploadedPdf}
                className="w-full py-4 bg-[#071B3A] text-white font-bold text-[15px] rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-30 hover:bg-[#0A254F] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-amber-400" />} Gerar Link & Disparar no WhatsApp</button>
            </form>
          </section>
        )}

        {/* ─────────────────────────────────────────────── */}
        {/*  FORMULÁRIO: KIT JURÍDICO                        */}
        {/* ─────────────────────────────────────────────── */}
        {activeAction === 'KIT' && !result && (
          <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-[#0d2d5e] flex items-center justify-center"><Layers className="w-5 h-5 text-blue-300" /></div>
                <div><h2 className="text-lg font-bold text-[#071B3A]">Disparar Kit Jurídico</h2><p className="text-sm text-slate-500">Selecione o kit e a cliente — documentos gerados automaticamente</p></div></div>
              <button onClick={() => setActiveAction(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">← Voltar</button>
            </div>
            <form onSubmit={handleDispatch} className="space-y-5 max-w-xl">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2 block">Kit Jurídico</label>
                <select value={selectedKitId} onChange={(e) => setSelectedKitId(e.target.value)}
                  className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-[#B68B1C] rounded-2xl text-[15px] font-medium text-slate-800 focus:outline-none transition-all">
                  {kits.map((k) => (<option key={k.id} value={k.id}>{k.name} ({k.items?.length || 3} documentos)</option>))}
                </select>
                {selectedKit && <div className="flex flex-wrap gap-2 mt-3">{selectedKit.items?.map((it: any, i: number) => (<span key={i} className="text-sm font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl">✓ {it.template?.title || `Doc ${i+1}`}</span>))}</div>}
              </div>
              <ClientSearch clients={clients} value={selectedClientId} onChange={setSelectedClientId} onNew={() => setActiveAction('CLIENT')} />
              <button type="submit" disabled={submitting || !selectedClientId || !selectedKitId}
                className="w-full py-4 bg-[#071B3A] text-white font-bold text-[15px] rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-30 hover:bg-[#0A254F] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-amber-400" />} Gerar Kit & Disparar no WhatsApp</button>
            </form>
          </section>
        )}

        {/* ─────────────────────────────────────────────── */}
        {/*  FORMULÁRIO: NOVA CLIENTE                        */}
        {/* ─────────────────────────────────────────────── */}
        {activeAction === 'CLIENT' && !result && (
          <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-emerald-700 flex items-center justify-center"><UserPlus className="w-5 h-5 text-emerald-200" /></div>
                <div><h2 className="text-lg font-bold text-[#071B3A]">Cadastrar Nova Cliente</h2><p className="text-sm text-slate-500">Qualificação completa + dossiê automático no Windows</p></div></div>
              <button onClick={() => setActiveAction(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors">← Voltar</button>
            </div>
            <form onSubmit={handleNewClient} className="space-y-4 max-w-xl">
              <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2 block">Nome Completo</label><input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Maria das Graças Silva" className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.08)] rounded-2xl text-[15px] text-slate-800 focus:outline-none transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2 flex items-center justify-between">CPF {cpfValid !== null && <span className={cpfValid ? 'text-emerald-600' : 'text-rose-500'}>{cpfValid ? '✓ Válido' : '✗ Inválido'}</span>}</label><input type="text" value={newClientCpf} onChange={(e) => setNewClientCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className={`w-full px-5 py-4 bg-white border-2 rounded-2xl text-[15px] text-slate-800 focus:outline-none transition-all ${cpfValid === false ? 'border-rose-300' : cpfValid ? 'border-emerald-300' : 'border-slate-200 focus:border-emerald-500'}`} /></div>
                <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2 block">WhatsApp</label><input type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(maskPhone(e.target.value))} placeholder="(71) 99999-9999" className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-2xl text-[15px] text-slate-800 focus:outline-none transition-all" /></div>
              </div>
              <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2 block">RG (opcional)</label><input type="text" value={newClientRg} onChange={(e) => setNewClientRg(maskRg(e.target.value))} placeholder="00.000.000-00" className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-2xl text-[15px] text-slate-800 focus:outline-none transition-all" /></div>
              <button type="submit" disabled={submitting || !newClientName.trim()} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[15px] rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-30 hover:-translate-y-0.5">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderPlus className="w-5 h-5" />} Cadastrar & Criar Dossiê 📁</button>
            </form>
          </section>
        )}

        {error && <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 px-5 py-3 rounded-2xl flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</p>}

        {/* ─────────────────────────────────────────────── */}
        {/*  PAINEL INFERIOR: ALERTAS + DOSSIÊ               */}
        {/* ─────────────────────────────────────────────── */}
        <section className="grid lg:grid-cols-2 gap-6">
          {/* ESQUERDA: ALERTAS + ATIVIDADE */}
          <div className="space-y-6">
            {pendingAlerts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[#071B3A] flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-rose-500" /> Pendências <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{pendingAlerts.length}</span></h3>
                <div className="space-y-2.5">
                  {pendingAlerts.map((a, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${a.urgent ? 'bg-rose-50/50 border-rose-200' : 'bg-amber-50/50 border-amber-200'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.urgent ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                        <div className="min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{a.client}</p><p className="text-xs text-slate-500">{a.title} • {a.days > 0 ? `${a.days} dias` : 'Hoje'}</p></div>
                      </div>
                      {a.phone && <a href={`https://wa.me/55${a.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${a.client}! Seus documentos aguardam assinatura.`)}`} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 bg-[#25D366] text-white text-xs font-bold rounded-lg shrink-0">Cobrar</a>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activities.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[#071B3A] flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-[#B68B1C]" /> Atividade Recente</h3>
                <div className="space-y-1">
                  {activities.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${a.type === 'signed' ? 'bg-emerald-500' : a.type === 'pending' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <p className="text-sm text-slate-700 truncate flex-1">{a.text}</p>
                      <p className="text-xs text-slate-400 shrink-0">{a.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DIREITA: DOSSIÊ */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#071B3A] flex items-center gap-2"><Folder className="w-4 h-4 text-amber-600" /> Dossiês de Processos</h3>
              <Link href="/processos" className="text-xs font-semibold text-[#B68B1C] hover:underline flex items-center gap-1">Ver todos <ArrowUpRight className="w-3 h-3" /></Link>
            </div>
            <div className="space-y-2.5">
              {processes.slice(0, 5).map((p) => {
                const exp = expandedFolder === p.id;
                return (
                  <div key={p.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:border-amber-300 transition-colors">
                    <button onClick={() => setExpandedFolder(exp ? null : p.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Folder className="w-4 h-4 fill-amber-400/30" /></div>
                        <div className="min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p><p className="text-xs text-slate-500"><User className="w-3 h-3 inline mr-1" />{p.client?.name || 'Cliente'}</p></div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${exp ? 'rotate-180' : ''}`} />
                    </button>
                    {exp && (
                      <div className="px-4 pb-4 grid grid-cols-2 gap-1.5">
                        {['01. Doc Pessoais', '02. Procuração', '03. Provas', '04. Peças'].map((f, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center gap-2 text-xs font-medium text-slate-600"><Folder className="w-3.5 h-3.5 text-amber-500" /> {f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {!processes.length && <div className="py-10 text-center"><Folder className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-400">Nenhum dossiê ativo.</p></div>}
            </div>
          </div>
        </section>
      </div>

      {/* QR CODE MODAL */}
      {showQr && result?.signatureLink && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative">
            <button onClick={() => setShowQr(false)} className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <QrCode className="w-10 h-10 text-[#B68B1C] mx-auto" />
            <div><h3 className="text-lg font-bold text-[#071B3A]">Assinatura Presencial</h3><p className="text-sm text-slate-500 mt-1">Peça para a cliente escanear com o celular</p></div>
            <div className="bg-slate-50 p-5 border border-slate-200 rounded-2xl inline-block"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.signatureLink)}`} alt="QR" className="w-44 h-44" /></div>
            <button onClick={() => setShowQr(false)} className="w-full py-3 bg-[#071B3A] text-white font-bold rounded-xl">Concluir</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes wave { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(20deg); } 75% { transform: rotate(-10deg); } }
      `}</style>
    </main>
  );
}
