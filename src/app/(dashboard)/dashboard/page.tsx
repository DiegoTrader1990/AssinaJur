'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight, CheckCircle2, ChevronRight, Clock, FolderPlus, Send, Sparkles, Folder,
  User, ShieldCheck, Zap, MessageSquare, Search, FileText, Award, Copy, Check,
  Loader2, AlertCircle, X, UserPlus, FileUp, File, QrCode, ChevronDown, Bell,
  Activity, RotateCw, Edit3, TrendingUp,
} from 'lucide-react';

/* ═══ MÁSCARAS & VALIDAÇÃO ═══ */
function maskCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskPhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}
function maskRg(v: string) {
  return v.replace(/\D/g, '').slice(0, 9).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function validateCpf(cpf: string): boolean {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i);
  let c = 11 - (s % 11); if (c >= 10) c = 0; if (parseInt(n[9]) !== c) return false;
  s = 0; for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i);
  c = 11 - (s % 11); if (c >= 10) c = 0; return parseInt(n[10]) === c;
}

/* ═══ COMBOBOX BUSCA DE CLIENTE ═══ */
function ClientCombobox({ clients, value, onChange, onNewClient }: { clients: any[]; value: string; onChange: (id: string) => void; onNewClient?: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!query) return clients;
    const q = query.toLowerCase();
    return clients.filter((c) => c.name?.toLowerCase().includes(q) || c.cpfCnpj?.includes(q) || c.phone?.includes(q));
  }, [clients, query]);
  const selected = clients.find((c) => c.id === value);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3.5 py-2.5 bg-white border rounded-xl cursor-pointer transition-all ${open ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-300 hover:border-slate-400'}`}>
        {selected ? (
          <>
            <div className="w-7 h-7 rounded-lg bg-[#071B3A] text-white flex items-center justify-center text-[10px] font-black shrink-0">{selected.name.charAt(0)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{selected.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{selected.cpfCnpj || 'CPF não informado'} {selected.phone ? `• ${selected.phone}` : ''}</p>
            </div>
          </>
        ) : (
          <><Search className="w-4 h-4 text-slate-400 shrink-0" /><span className="text-xs text-slate-400">Buscar cliente por nome ou CPF...</span></>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, CPF ou telefone..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-400" autoFocus />
            </div>
          </div>
          <div className="overflow-y-auto max-h-44">
            {filtered.length > 0 ? filtered.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); setQuery(''); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-amber-50/60 transition-colors ${value === c.id ? 'bg-amber-50' : ''}`}>
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black shrink-0">{c.name.charAt(0)}</div>
                <div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{c.name}</p><p className="text-[10px] text-slate-500">{c.cpfCnpj || 'Sem CPF'} {c.phone ? `• ${c.phone}` : ''}</p></div>
                {value === c.id && <Check className="w-4 h-4 text-amber-600 shrink-0 ml-auto" />}
              </button>
            )) : (<div className="px-3 py-4 text-center text-xs text-slate-400">Nenhuma cliente encontrada.</div>)}
          </div>
          {onNewClient && (
            <div className="border-t border-slate-100 p-2">
              <button type="button" onClick={() => { onNewClient(); setOpen(false); }}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Cadastrar Nova Cliente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dispatchMode, setDispatchMode] = useState<'PDF_FILE' | 'KIT'>('PDF_FILE');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [docCustomTitle, setDocCustomTitle] = useState('');

  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showNewClientPanel, setShowNewClientPanel] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientRg, setNewClientRg] = useState('');
  const cpfValid = useMemo(() => { const r = newClientCpf.replace(/\D/g, ''); if (r.length < 11) return null; return validateCpf(newClientCpf); }, [newClientCpf]);

  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionError, setExecutionError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
    ]).then(([u, o, c, d, p, k]) => {
      if (u?.user) setCurrentUser(u.user);
      if (o?.office) setOffice(o.office);
      setClients(c?.clients || []);
      setDocuments(d?.documents || []);
      const procs = p?.processes || [];
      setProcesses(procs);
      if (procs.length > 0) setExpandedFolderId(procs[0].id);
      const lk = k?.kits || [];
      setKits(lk);
      if (lk.length > 0) setSelectedKitId(lk[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const completedDocs = useMemo(() => documents.filter((d) => d.status === 'CONCLUIDO'), [documents]);
  const pendingDocs = useMemo(() => documents.filter((d) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(d.status)), [documents]);

  const timeSaved = useMemo(() => {
    const mins = completedDocs.length * 45 + processes.length * 15 + pendingDocs.length * 20;
    return { hours: Math.floor(mins / 60), mins: mins % 60 };
  }, [completedDocs, pendingDocs, processes]);

  const recentActivities = useMemo(() => {
    const acts: { date: Date; icon: string; color: string; text: string }[] = [];
    documents.forEach((doc) => {
      const d = new Date(doc.updatedAt || doc.createdAt);
      acts.push(doc.status === 'CONCLUIDO'
        ? { date: d, icon: '🟢', color: 'text-emerald-800', text: `${doc.client?.name || 'Cliente'} assinou ${doc.title} ✓` }
        : { date: d, icon: '🟡', color: 'text-amber-800', text: `${doc.title} enviado para ${doc.client?.name || 'Cliente'}` });
    });
    processes.forEach((p) => acts.push({ date: new Date(p.createdAt), icon: '🔵', color: 'text-blue-800', text: `Dossiê criado: "${p.title}"` }));
    return acts.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [documents, processes]);

  const urgentActions = useMemo(() => {
    const a: { level: 'RED' | 'YELLOW' | 'GREEN'; text: string; clientName: string; clientPhone?: string }[] = [];
    pendingDocs.forEach((doc) => {
      const days = Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 864e5);
      a.push({ level: days >= 3 ? 'RED' : 'YELLOW', text: days >= 3 ? `Sem assinatura há ${days} dias` : `Enviado há ${days || '<1'} dia(s)`, clientName: doc.client?.name || 'Cliente', clientPhone: doc.client?.phone || doc.client?.whatsapp || '' });
    });
    clients.forEach((c) => {
      const cd = documents.filter((d) => d.clientId === c.id);
      if (cd.length > 0 && cd.every((d) => d.status === 'CONCLUIDO'))
        a.push({ level: 'GREEN', text: 'Todos documentos assinados — pode protocolar!', clientName: c.name, clientPhone: c.phone || c.whatsapp || '' });
    });
    return a.sort((x, y) => ({ RED: 0, YELLOW: 1, GREEN: 2 }[x.level] - { RED: 0, YELLOW: 1, GREEN: 2 }[y.level])).slice(0, 4);
  }, [pendingDocs, clients, documents]);

  const weeklyBars = useMemo(() => {
    const now = new Date(); const dn = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const bars: { label: string; sent: number; signed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()), e = new Date(s.getTime() + 864e5);
      bars.push({
        label: dn[s.getDay()],
        sent: documents.filter((x) => { const c = new Date(x.createdAt); return c >= s && c < e; }).length,
        signed: documents.filter((x) => x.status === 'CONCLUIDO' && new Date(x.updatedAt || x.createdAt) >= s && new Date(x.updatedAt || x.createdAt) < e).length,
      });
    }
    return bars;
  }, [documents]);
  const maxBar = Math.max(1, ...weeklyBars.map((b) => Math.max(b.sent, b.signed)));

  /* ── Handlers ── */
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) await processFile(e.dataTransfer.files[0]); };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) await processFile(e.target.files[0]); };
  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { setExecutionError('Envie um arquivo PDF.'); return; }
    setUploadingPdf(true); setExecutionError(''); setDocCustomTitle(file.name.replace(/\.pdf$/i, ''));
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch('/api/documents/upload', { method: 'POST', body: fd }); const d = await r.json();
      if (!r.ok) throw new Error(d.error); setUploadedPdf(d.file);
    } catch (err: any) { setExecutionError(err.message); } finally { setUploadingPdf(false); }
  };

  const buildMsg = useCallback((name: string, link: string) =>
    `Olá ${name}!\n\nSeus documentos jurídicos do escritório ${office?.name || 'Rodrigues & Soares'} estão prontos para assinatura digital.\n\nAcesse o link seguro no celular:\n${link}\n\nQualquer dúvida, entre em contato conosco.`, [office]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) { setExecutionError('Selecione a cliente.'); return; }
    setSubmitting(true); setExecutionError(''); setExecutionResult(null);
    try {
      if (dispatchMode === 'PDF_FILE') {
        if (!uploadedPdf) throw new Error('Arraste ou selecione um PDF.');
        const r = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: docCustomTitle || uploadedPdf.name, clientId: selectedClientId, fileId: uploadedPdf.id }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error);
        const cl = clients.find((c) => c.id === selectedClientId);
        const link = `https://www.assinajur.com.br/assinar/${d.document.token}`;
        setWhatsappMsg(buildMsg(cl?.name || 'Cliente', link));
        setExecutionResult({ type: 'SINGLE_DOC', clientName: cl?.name || 'Cliente', clientPhone: cl?.phone || cl?.whatsapp || '', docTitle: d.document.title, signatureLink: link });
      } else {
        if (!selectedKitId) throw new Error('Selecione o Kit.');
        const r = await fetch('/api/kits/generate-package', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, kitId: selectedKitId, variables: { valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%' } }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error);
        const cl = clients.find((c) => c.id === selectedClientId);
        setWhatsappMsg(buildMsg(d.result.clientName, d.result.signatureLink));
        setExecutionResult({ type: 'KIT', clientName: d.result.clientName, clientPhone: cl?.phone || cl?.whatsapp || '', kitName: d.result.kitName, documentsCount: d.result.documentsCount, signatureLink: d.result.signatureLink });
      }
      fetch('/api/documents').then((r) => r.json()).then((x) => setDocuments(x.documents || []));
    } catch (err: any) { setExecutionError(err.message); } finally { setSubmitting(false); }
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) { setExecutionError('Informe o nome.'); return; }
    setSubmitting(true); setExecutionError('');
    try {
      const r = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClientName, cpfCnpj: newClientCpf.replace(/\D/g, ''), phone: newClientPhone.replace(/\D/g, ''), whatsapp: newClientPhone.replace(/\D/g, ''), rg: newClientRg }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      await fetch('/api/processos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Dossiê — ${d.client.name}`, clientId: d.client.id }) });
      const [uc, up] = await Promise.all([fetch('/api/clients').then((r) => r.json()), fetch('/api/processos').then((r) => r.json())]);
      if (uc?.clients) setClients(uc.clients);
      if (up?.processes) setProcesses(up.processes);
      setSelectedClientId(d.client.id);
      setShowNewClientPanel(false); setNewClientName(''); setNewClientCpf(''); setNewClientPhone(''); setNewClientRg('');
    } catch (err: any) { setExecutionError(err.message); } finally { setSubmitting(false); }
  };

  const selectedKit = useMemo(() => kits.find((k) => k.id === selectedKitId), [kits, selectedKitId]);
  const doctorName = currentUser?.name || 'Dr. Diego dos Santos Rodrigues';
  const isFirstRun = !loading && clients.length === 0 && documents.length === 0;
  const mv = (v: number) => (loading ? '—' : String(v).padStart(2, '0'));

  return (
    <main className="mx-auto max-w-7xl space-y-5 pb-24">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. WELCOME BAR PREMIUM (COMPACTA & ELEGANTE)                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#B68B1C] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Award className="w-2.5 h-2.5" /> {office?.name || 'Rodrigues & Soares'}
              </span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5" /> ICP-Brasil Ativo
              </span>
            </div>
            <h1 className="font-heading text-xl lg:text-2xl font-black text-[#071B3A] tracking-tight">Olá, {doctorName}! ⚖️</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-200/80 px-3.5 py-2 rounded-2xl text-center min-w-[88px]">
              <p className="text-[9px] font-black text-amber-800 uppercase tracking-wide">⏱️ Tempo Salvo</p>
              <p className="text-base font-black font-heading text-amber-700 tabular-nums">{timeSaved.hours}<span className="text-[10px]">h</span>{String(timeSaved.mins).padStart(2, '0')}<span className="text-[10px]">m</span></p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-2xl text-center min-w-[72px]">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Clientes</p>
              <p className="text-base font-black font-heading text-[#071B3A]">{mv(clients.length)}</p>
            </div>
            <div className="bg-amber-50/70 border border-amber-200/80 px-3 py-2 rounded-2xl text-center min-w-[72px]">
              <p className="text-[9px] font-bold text-amber-800 uppercase">Pendentes</p>
              <p className="text-base font-black font-heading text-amber-600">{mv(pendingDocs.length)}</p>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200/80 px-3 py-2 rounded-2xl text-center min-w-[72px]">
              <p className="text-[9px] font-bold text-emerald-800 uppercase">Assinados</p>
              <p className="text-base font-black font-heading text-emerald-700">{mv(completedDocs.length)}</p>
            </div>
          </div>
        </div>

        {/* MINI GRÁFICO SEMANAL */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[#B68B1C]" /> Últimos 7 Dias</span>
            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-[#071B3A]" /> Enviados</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-sm bg-emerald-500" /> Assinados</span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-1 h-10">
            {weeklyBars.map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex items-end justify-center gap-px h-7">
                  <div className="w-2 bg-[#071B3A]/80 rounded-t-sm" style={{ height: `${Math.max(2, (b.sent / maxBar) * 28)}px` }} />
                  <div className="w-2 bg-emerald-500/80 rounded-t-sm" style={{ height: `${Math.max(2, (b.signed / maxBar) * 28)}px` }} />
                </div>
                <span className="text-[8px] font-bold text-slate-400">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. ONBOARDING FIRST-RUN                                      */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isFirstRun && (
        <section className="bg-gradient-to-br from-white to-amber-50/40 border border-amber-200 rounded-[28px] p-6 shadow-xs space-y-4">
          <div className="text-center space-y-1">
            <h2 className="font-heading text-lg font-black text-[#071B3A]">🎉 Bem-vindo ao AssinaJur!</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">Configure em 3 passos e comece a economizar horas.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            <button onClick={() => setShowNewClientPanel(true)} className="bg-white border border-slate-200 hover:border-amber-400 p-3 rounded-xl text-center space-y-1.5 transition-all hover:shadow-sm">
              <UserPlus className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-[11px] font-black text-[#071B3A]">1. Cadastrar Cliente</p>
            </button>
            <div className="bg-white border border-slate-200 p-3 rounded-xl text-center space-y-1.5 opacity-50">
              <FileUp className="w-6 h-6 text-amber-600 mx-auto" />
              <p className="text-[11px] font-black text-[#071B3A]">2. Arrastar PDF</p>
            </div>
            <div className="bg-white border border-slate-200 p-3 rounded-xl text-center space-y-1.5 opacity-50">
              <MessageSquare className="w-6 h-6 text-blue-600 mx-auto" />
              <p className="text-[11px] font-black text-[#071B3A]">3. Disparar WhatsApp</p>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. CENTRAL DE DISPARO (ACIMA DE TUDO) + NOVO ATENDIMENTO     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="grid lg:grid-cols-12 gap-5">
        {/* BLOCO ESQUERDO (7COL): DISPATCH */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-amber-700 fill-amber-500/20" /></div>
              <h3 className="font-heading font-black text-[#071B3A] text-sm">Disparar Documento para Assinatura</h3>
            </div>
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[10px] font-extrabold shrink-0">
              <button type="button" onClick={() => { setDispatchMode('PDF_FILE'); setExecutionResult(null); }}
                className={`px-2.5 py-1.5 rounded-md transition-all ${dispatchMode === 'PDF_FILE' ? 'bg-[#071B3A] text-white shadow-2xs' : 'text-slate-600'}`}>📂 PDF do PC</button>
              <button type="button" onClick={() => { setDispatchMode('KIT'); setExecutionResult(null); }}
                className={`px-2.5 py-1.5 rounded-md transition-all ${dispatchMode === 'KIT' ? 'bg-[#071B3A] text-white shadow-2xs' : 'text-slate-600'}`}>✨ Kit Jurídico</button>
            </div>
          </div>

          {executionResult ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" /><div><p className="text-xs font-black text-emerald-950">{executionResult.type === 'KIT' ? `Kit gerado para ${executionResult.clientName}!` : `Documento pronto para ${executionResult.clientName}!`}</p><p className="text-[10px] text-emerald-800">Link seguro de assinatura gerado.</p></div></div>
                <button onClick={() => { setExecutionResult(null); setUploadedPdf(null); }} className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase text-emerald-800 tracking-wider">📝 Mensagem do WhatsApp</span>
                  <button type="button" onClick={() => setEditingMsg(!editingMsg)} className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"><Edit3 className="w-3 h-3" />{editingMsg ? 'OK' : 'Editar'}</button></div>
                {editingMsg ? <textarea value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)} rows={4} className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 focus:outline-none resize-none" />
                  : <div className="bg-white border border-emerald-200 rounded-xl p-2.5 text-[11px] text-slate-700 whitespace-pre-line leading-relaxed max-h-20 overflow-y-auto">{whatsappMsg}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {executionResult.clientPhone ? (
                  <a href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`} target="_blank" rel="noreferrer"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all">
                    <MessageSquare className="w-3.5 h-3.5 fill-white" /> Enviar no WhatsApp</a>
                ) : <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg">⚠️ Sem telefone</span>}
                <button onClick={() => { navigator.clipboard.writeText(executionResult.signatureLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                  className="px-3 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1">
                  {copiedLink ? <><Check className="w-3 h-3 text-emerald-600" /> Copiado!</> : <><Copy className="w-3 h-3 text-[#B68B1C]" /> Copiar Link</>}</button>
                <button onClick={() => setShowQrModal(true)} className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl flex items-center gap-1"><QrCode className="w-3 h-3" /> QR Code</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDispatch} className="space-y-3">
              {dispatchMode === 'PDF_FILE' ? (
                <div className="space-y-2">
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${dragActive ? 'border-amber-500 bg-amber-50' : uploadedPdf ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-300 bg-slate-50/60 hover:border-amber-400 hover:bg-amber-50/30'}`}>
                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                    {uploadingPdf ? <Loader2 className="w-5 h-5 text-amber-600 animate-spin mx-auto" />
                      : uploadedPdf ? (
                        <div className="flex items-center justify-between text-left"><div className="flex items-center gap-2 min-w-0"><div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><File className="w-4 h-4" /></div><div className="min-w-0"><p className="text-xs font-black text-slate-800 truncate">{uploadedPdf.name}</p><p className="text-[10px] text-emerald-600 font-bold">✓ Pronto ({(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(2)} MB)</p></div></div><span className="text-[9px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded shrink-0">Trocar</span></div>
                      ) : (
                        <div className="py-1.5 space-y-0.5"><FileUp className="w-7 h-7 text-[#B68B1C] mx-auto" /><p className="text-xs font-black text-slate-800">Solte o PDF do seu Windows aqui</p><p className="text-[10px] text-slate-500">ou <span className="text-amber-700 font-bold underline">clique para procurar</span></p></div>
                      )}
                  </div>
                  <input type="text" value={docCustomTitle} onChange={(e) => setDocCustomTitle(e.target.value)} placeholder="Título (Ex: Procuração Ad Judicia)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none" />
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-600">Kit Jurídico</label>
                  <select value={selectedKitId} onChange={(e) => setSelectedKitId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none">
                    {kits.map((k) => (<option key={k.id} value={k.id}>{k.name} ({k.items?.length || 3} papéis)</option>))}
                  </select>
                  {selectedKit && <div className="flex flex-wrap gap-1">{selectedKit.items?.map((it: any, i: number) => (<span key={i} className="text-[10px] font-bold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md">✓ {it.template?.title || `Doc ${i+1}`}</span>))}</div>}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">Para qual cliente enviar?</label>
                <ClientCombobox clients={clients} value={selectedClientId} onChange={setSelectedClientId} onNewClient={() => setShowNewClientPanel(true)} />
              </div>
              <button type="submit" disabled={submitting || !selectedClientId || (dispatchMode === 'PDF_FILE' && !uploadedPdf)}
                className="w-full py-3 bg-[#071B3A] hover:bg-[#0A254F] text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-[#D4AF37]" />} GERAR LINK & DISPARAR NO WHATSAPP
              </button>
            </form>
          )}
        </div>

        {/* BLOCO DIREITO (5COL): CADASTRO OU ATENÇÃO NECESSÁRIA */}
        <div className="lg:col-span-5 space-y-5">
          {showNewClientPanel ? (
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><UserPlus className="w-4 h-4" /></div><h3 className="font-heading font-black text-[#071B3A] text-sm">Nova Cliente &amp; Dossiê</h3></div>
                <button onClick={() => setShowNewClientPanel(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleRegisterClient} className="space-y-2">
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-600">Nome Completo</label><input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Maria das Graças Silva" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-600 flex items-center justify-between">CPF{cpfValid !== null && <span className={`text-[9px] font-black ${cpfValid ? 'text-emerald-600' : 'text-rose-600'}`}>{cpfValid ? '✓' : '✗'}</span>}</label><input type="text" value={newClientCpf} onChange={(e) => setNewClientCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:outline-none ${cpfValid === false ? 'border-rose-400' : cpfValid === true ? 'border-emerald-400' : 'border-slate-300'}`} /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-600">WhatsApp</label><input type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(maskPhone(e.target.value))} placeholder="(71) 99999-9999" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500" /></div>
                </div>
                <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-slate-600">RG (opcional)</label><input type="text" value={newClientRg} onChange={(e) => setNewClientRg(maskRg(e.target.value))} placeholder="00.000.000-00" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500" /></div>
                <button type="submit" disabled={submitting || !newClientName.trim()} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Cadastrar &amp; Criar Dossiê 📁</button>
              </form>
            </div>
          ) : urgentActions.length > 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black text-[#071B3A] uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-600" /> Atenção Necessária
                  <span className="ml-0.5 text-[9px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded-full font-black">{urgentActions.length}</span>
                </h3>
                <button onClick={() => setShowNewClientPanel(true)} className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1"><UserPlus className="w-3 h-3" /> Nova Cliente</button>
              </div>
              <div className="space-y-1.5">
                {urgentActions.map((a, i) => (
                  <div key={i} className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${a.level === 'RED' ? 'bg-rose-50/70 border-rose-200' : a.level === 'YELLOW' ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${a.level === 'RED' ? 'bg-rose-200 text-rose-900' : a.level === 'YELLOW' ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'}`}>
                        {a.level === 'RED' ? '🔴' : a.level === 'YELLOW' ? '🟡' : '🟢'}
                      </span>
                      <div className="min-w-0"><p className="text-[11px] font-bold text-slate-800 truncate">{a.clientName}</p><p className="text-[10px] text-slate-600 truncate">{a.text}</p></div>
                    </div>
                    {a.level !== 'GREEN' && a.clientPhone && (
                      <a href={`https://wa.me/55${a.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${a.clientName}! Seus documentos aguardam assinatura digital.`)}`} target="_blank" rel="noreferrer"
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-md shrink-0"><RotateCw className="w-3 h-3 inline mr-0.5" />Cobrar</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-[11px] font-black text-[#071B3A] uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tudo em dia!</h3>
                <button onClick={() => setShowNewClientPanel(true)} className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1"><UserPlus className="w-3 h-3" /> Nova Cliente</button>
              </div>
              <p className="text-xs text-slate-500">Nenhuma pendência no momento. Cadastre uma nova cliente ou arraste um documento para iniciar.</p>
            </div>
          )}

          {/* TIMELINE DE ATIVIDADE RECENTE */}
          {recentActivities.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 shadow-xs space-y-3">
              <h3 className="text-[11px] font-black text-[#071B3A] uppercase tracking-wider flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-[#B68B1C]" /> Atividade Recente</h3>
              <div className="space-y-0.5">
                {recentActivities.map((act, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs shrink-0 mt-0.5">{act.icon}</span>
                    <div className="min-w-0"><p className={`text-[11px] font-semibold ${act.color} truncate`}>{act.text}</p><p className="text-[9px] text-slate-400">{act.date.toLocaleDateString('pt-BR')} às {act.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {executionError && <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {executionError}</p>}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 4. DOSSIÊ DE PROCESSOS (MANTIDO — SEÇÃO QUE O DR. GOSTOU)    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#FBFCFE] border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B68B1C]">Gerenciador Dossiê dos Processos</span><h3 className="font-heading font-black text-[#071B3A] text-base mt-0.5">Pastas Nativas do Windows Explorer</h3></div>
          <Link href="/processos" className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1">Abrir Central 📁 <ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {processes.slice(0, 4).map((p) => {
            const isExp = expandedFolderId === p.id;
            return (
              <div key={p.id} className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl shadow-2xs overflow-hidden transition-all">
                <div onClick={() => setExpandedFolderId(isExp ? null : p.id)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-amber-50/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><Folder className="w-4 h-4 fill-amber-500/30 text-amber-600" /></div>
                    <div className="min-w-0"><h4 className="text-xs font-extrabold text-[#071B3A] truncate">{p.title}</h4><p className="text-[10px] text-slate-500 truncate flex items-center gap-1"><User className="w-3 h-3 text-slate-400 shrink-0" />{p.client?.name || 'Cliente'}</p></div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isExp ? 'rotate-180' : ''}`} />
                </div>
                {isExp && (
                  <div className="bg-slate-50/80 border-t border-slate-100 p-2.5 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold text-slate-700">
                      <div className="bg-white border border-slate-200 p-1.5 rounded-lg flex items-center gap-1"><Folder className="w-3 h-3 text-amber-500 fill-amber-500/20" /> 01. Doc Pessoais</div>
                      <div className="bg-white border border-slate-200 p-1.5 rounded-lg flex items-center gap-1"><Folder className="w-3 h-3 text-amber-500 fill-amber-500/20" /> 02. Procuração</div>
                      <div className="bg-white border border-slate-200 p-1.5 rounded-lg flex items-center gap-1"><Folder className="w-3 h-3 text-amber-500 fill-amber-500/20" /> 03. Provas</div>
                      <div className="bg-white border border-slate-200 p-1.5 rounded-lg flex items-center gap-1"><Folder className="w-3 h-3 text-amber-500 fill-amber-500/20" /> 04. Peças</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!processes.length && <div className="py-8 text-center text-xs text-slate-400"><Folder className="w-6 h-6 mx-auto text-slate-300 mb-1" /><p>Nenhum dossiê ativo.</p></div>}
        <Link href="/processos" className="w-full py-2.5 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-950 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all"><Folder className="w-4 h-4 text-amber-600 fill-amber-500/20" /> Navegar pelas Pastas dos Processos</Link>
      </section>

      {/* QR CODE MODAL */}
      {showQrModal && executionResult?.signatureLink && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-3 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowQrModal(false)} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <QrCode className="w-8 h-8 text-amber-600 mx-auto" />
            <div><h3 className="font-heading font-black text-[#071B3A] text-base">Assinatura Presencial</h3><p className="text-xs text-slate-500 mt-0.5">Peça para a cliente apontar a câmera do celular:</p></div>
            <div className="bg-slate-50 p-3 border border-slate-200 rounded-2xl flex justify-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(executionResult.signatureLink)}`} alt="QR Code" className="w-40 h-40 rounded-xl" /></div>
            <button onClick={() => setShowQrModal(false)} className="w-full py-2.5 bg-[#071B3A] text-white text-xs font-extrabold rounded-xl">Concluir</button>
          </div>
        </div>
      )}
    </main>
  );
}
