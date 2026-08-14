'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, ChevronRight, FolderPlus, Send, Folder, User, ShieldCheck,
  Zap, MessageSquare, Search, Award, Copy, Check, Loader2, AlertCircle, X,
  UserPlus, FileUp, File, QrCode, ChevronDown, Bell, Activity, RotateCw,
  Edit3, Scale, ArrowUpRight,
} from 'lucide-react';

/* ═══ MASKS ═══ */
function maskCpf(v: string) { return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function maskPhone(v: string) { return v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'); }
function maskRg(v: string) { return v.replace(/\D/g, '').slice(0, 9).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function validateCpf(cpf: string): boolean {
  const n = cpf.replace(/\D/g, ''); if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i); let c = 11 - (s % 11); if (c >= 10) c = 0; if (parseInt(n[9]) !== c) return false;
  s = 0; for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i); c = 11 - (s % 11); if (c >= 10) c = 0; return parseInt(n[10]) === c;
}

/* ═══ COMBOBOX ═══ */
function ClientCombobox({ clients, value, onChange, onNewClient }: { clients: any[]; value: string; onChange: (id: string) => void; onNewClient?: () => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => { if (!query) return clients; const q = query.toLowerCase(); return clients.filter((c) => c.name?.toLowerCase().includes(q) || c.cpfCnpj?.includes(q) || c.phone?.includes(q)); }, [clients, query]);
  const selected = clients.find((c) => c.id === value);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)} className={`flex items-center gap-2.5 px-4 py-3 bg-white border-2 rounded-2xl cursor-pointer transition-all duration-200 ${open ? 'border-[#B68B1C] ring-4 ring-amber-100/40 shadow-lg' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}>
        {selected ? (
          <><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#071B3A] to-[#0d2d5e] text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm">{selected.name.charAt(0)}</div>
            <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-slate-800 truncate">{selected.name}</p><p className="text-[11px] text-slate-500 truncate">{selected.cpfCnpj || 'CPF não informado'} {selected.phone ? `• ${selected.phone}` : ''}</p></div></>
        ) : (<><Search className="w-4 h-4 text-slate-400 shrink-0" /><span className="text-[13px] text-slate-400">Buscar cliente por nome ou CPF...</span></>)}
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, CPF ou telefone..." className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 focus:outline-none focus:border-amber-400 shadow-sm" autoFocus /></div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length > 0 ? filtered.map((c) => (
              <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); setQuery(''); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-amber-50/60 transition-all border-b border-slate-50 last:border-0 ${value === c.id ? 'bg-amber-50' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-black shrink-0">{c.name.charAt(0)}</div>
                <div className="min-w-0 flex-1"><p className="text-[13px] font-bold text-slate-800 truncate">{c.name}</p><p className="text-[11px] text-slate-500">{c.cpfCnpj || 'Sem CPF'} {c.phone ? `• ${c.phone}` : ''}</p></div>
                {value === c.id && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
              </button>
            )) : <div className="px-4 py-6 text-center text-[13px] text-slate-400">Nenhuma cliente encontrada.</div>}
          </div>
          {onNewClient && (
            <div className="border-t border-slate-100 p-2.5 bg-slate-50/30">
              <button type="button" onClick={() => { onNewClient(); setOpen(false); }} className="w-full py-2.5 bg-[#071B3A] hover:bg-[#0A254F] text-white text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"><UserPlus className="w-3.5 h-3.5" /> Cadastrar Nova Cliente</button>
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
  const [dispatchMode, setDispatchMode] = useState<'PDF_FILE' | 'KIT'>('PDF_FILE');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [docCustomTitle, setDocCustomTitle] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewClient, setShowNewClient] = useState(false);
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
  const timeSaved = useMemo(() => { const m = completedDocs.length * 45 + processes.length * 15 + pendingDocs.length * 20; return { h: Math.floor(m / 60), m: m % 60 }; }, [completedDocs, pendingDocs, processes]);

  const recentActivities = useMemo(() => {
    const a: { date: Date; icon: string; color: string; bg: string; text: string }[] = [];
    documents.forEach((doc) => {
      const d = new Date(doc.updatedAt || doc.createdAt);
      a.push(doc.status === 'CONCLUIDO'
        ? { date: d, icon: '✓', color: 'text-emerald-700', bg: 'bg-emerald-100', text: `${doc.client?.name || 'Cliente'} assinou ${doc.title}` }
        : { date: d, icon: '⏳', color: 'text-amber-700', bg: 'bg-amber-100', text: `${doc.title} — ${doc.client?.name || 'Cliente'}` });
    });
    processes.forEach((p) => a.push({ date: new Date(p.createdAt), icon: '📁', color: 'text-blue-700', bg: 'bg-blue-100', text: `Dossiê "${p.client?.name || p.title}"` }));
    return a.sort((x, y) => y.date.getTime() - x.date.getTime()).slice(0, 5);
  }, [documents, processes]);

  const urgentActions = useMemo(() => {
    const a: { level: 'RED' | 'YELLOW' | 'GREEN'; text: string; clientName: string; clientPhone?: string }[] = [];
    pendingDocs.forEach((doc) => {
      const days = Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 864e5);
      a.push({ level: days >= 3 ? 'RED' : 'YELLOW', text: days >= 3 ? `Sem assinatura há ${days} dias` : `Enviado há ${days || '<1'} dia(s)`, clientName: doc.client?.name || 'Cliente', clientPhone: doc.client?.phone || doc.client?.whatsapp || '' });
    });
    clients.forEach((c) => { const cd = documents.filter((d) => d.clientId === c.id); if (cd.length > 0 && cd.every((d) => d.status === 'CONCLUIDO')) a.push({ level: 'GREEN', text: 'Documentos assinados ✓', clientName: c.name, clientPhone: c.phone || c.whatsapp || '' }); });
    return a.sort((x, y) => ({ RED: 0, YELLOW: 1, GREEN: 2 }[x.level] - { RED: 0, YELLOW: 1, GREEN: 2 }[y.level])).slice(0, 4);
  }, [pendingDocs, clients, documents]);

  /* Handlers */
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); };
  const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) await processFile(e.dataTransfer.files[0]); };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) await processFile(e.target.files[0]); };
  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { setExecutionError('Envie um arquivo PDF.'); return; }
    setUploadingPdf(true); setExecutionError(''); setDocCustomTitle(file.name.replace(/\.pdf$/i, ''));
    try { const fd = new FormData(); fd.append('file', file); const r = await fetch('/api/documents/upload', { method: 'POST', body: fd }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setUploadedPdf(d.file); } catch (err: any) { setExecutionError(err.message); } finally { setUploadingPdf(false); }
  };
  const buildMsg = useCallback((name: string, link: string) => `Olá ${name}!\n\nSeus documentos jurídicos do escritório ${office?.name || 'Rodrigues & Soares'} estão prontos para assinatura digital.\n\nAcesse o link seguro no celular:\n${link}\n\nQualquer dúvida, entre em contato.`, [office]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedClientId) { setExecutionError('Selecione a cliente.'); return; }
    setSubmitting(true); setExecutionError(''); setExecutionResult(null);
    try {
      if (dispatchMode === 'PDF_FILE') {
        if (!uploadedPdf) throw new Error('Arraste ou selecione um PDF.');
        const r = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: docCustomTitle || uploadedPdf.name, clientId: selectedClientId, fileId: uploadedPdf.id }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error);
        const cl = clients.find((c) => c.id === selectedClientId); const link = `https://www.assinajur.com.br/assinar/${d.document.token}`;
        setWhatsappMsg(buildMsg(cl?.name || 'Cliente', link));
        setExecutionResult({ type: 'SINGLE_DOC', clientName: cl?.name || 'Cliente', clientPhone: cl?.phone || cl?.whatsapp || '', docTitle: d.document.title, signatureLink: link });
      } else {
        if (!selectedKitId) throw new Error('Selecione o Kit.');
        const r = await fetch('/api/kits/generate-package', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, kitId: selectedKitId, variables: { valor_honorarios: 'R$ 3.000,00', percentual_exito: '30%' } }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error); const cl = clients.find((c) => c.id === selectedClientId);
        setWhatsappMsg(buildMsg(d.result.clientName, d.result.signatureLink));
        setExecutionResult({ type: 'KIT', clientName: d.result.clientName, clientPhone: cl?.phone || cl?.whatsapp || '', kitName: d.result.kitName, documentsCount: d.result.documentsCount, signatureLink: d.result.signatureLink });
      }
      fetch('/api/documents').then((r) => r.json()).then((x) => setDocuments(x.documents || []));
    } catch (err: any) { setExecutionError(err.message); } finally { setSubmitting(false); }
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newClientName.trim()) { setExecutionError('Informe o nome.'); return; }
    setSubmitting(true); setExecutionError('');
    try {
      const r = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClientName, cpfCnpj: newClientCpf.replace(/\D/g, ''), phone: newClientPhone.replace(/\D/g, ''), whatsapp: newClientPhone.replace(/\D/g, ''), rg: newClientRg }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      await fetch('/api/processos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Dossiê — ${d.client.name}`, clientId: d.client.id }) });
      const [uc, up] = await Promise.all([fetch('/api/clients').then((r) => r.json()), fetch('/api/processos').then((r) => r.json())]);
      if (uc?.clients) setClients(uc.clients); if (up?.processes) setProcesses(up.processes);
      setSelectedClientId(d.client.id); setShowNewClient(false); setNewClientName(''); setNewClientCpf(''); setNewClientPhone(''); setNewClientRg('');
    } catch (err: any) { setExecutionError(err.message); } finally { setSubmitting(false); }
  };

  const selectedKit = useMemo(() => kits.find((k) => k.id === selectedKitId), [kits, selectedKitId]);
  const doctorName = currentUser?.name || 'Dr. Diego dos Santos Rodrigues';
  const isFirstRun = !loading && clients.length === 0 && documents.length === 0;

  return (
    <main className="mx-auto max-w-7xl space-y-6 pb-24">

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  WELCOME STRIP — SLIM, ELEGANT, INFORMATIVE                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-[24px] shadow-lg">
        <div className="bg-gradient-to-r from-[#071B3A] via-[#0A254F] to-[#071B3A] px-6 py-5 lg:px-8 lg:py-6">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-400/80 bg-amber-400/10 border border-amber-400/15 px-2.5 py-0.5 rounded-full"><Scale className="w-2.5 h-2.5 inline mr-1" />{office?.name || 'Rodrigues & Soares'}</span>
                <span className="text-[9px] font-bold text-emerald-400/80 bg-emerald-400/10 border border-emerald-400/15 px-2.5 py-0.5 rounded-full"><ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" /> ICP-Brasil</span>
              </div>
              <h1 className="text-lg lg:text-xl font-black text-white tracking-tight">{doctorName} <span className="text-amber-400">⚖️</span></h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center px-4 py-2 bg-amber-400/10 border border-amber-400/15 rounded-2xl min-w-[80px]">
                <p className="text-[8px] font-black text-amber-400/70 uppercase tracking-widest">Tempo Salvo</p>
                <p className="text-lg font-black text-amber-400 tabular-nums leading-tight">{timeSaved.h}<span className="text-[10px]">h</span>{String(timeSaved.m).padStart(2, '0')}<span className="text-[10px]">m</span></p>
              </div>
              <div className="flex gap-2">
                {[
                  { label: 'Clientes', value: clients.length, color: 'text-white' },
                  { label: 'Pendentes', value: pendingDocs.length, color: 'text-amber-300', pulse: pendingDocs.length > 0 },
                  { label: 'Assinados', value: completedDocs.length, color: 'text-emerald-400' },
                ].map((m, i) => (
                  <div key={i} className="text-center px-3 py-2 bg-white/5 border border-white/8 rounded-2xl min-w-[60px]">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{m.label}</p>
                    <p className={`text-lg font-black ${m.color} tabular-nums leading-tight`}>{loading ? '—' : String(m.value).padStart(2, '0')}</p>
                    {m.pulse && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto mt-0.5 animate-pulse" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ONBOARDING */}
      {isFirstRun && (
        <section className="bg-gradient-to-br from-white to-amber-50/30 border-2 border-amber-200/40 rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="text-center space-y-1"><h2 className="text-lg font-black text-[#071B3A]">🎉 Bem-vindo ao AssinaJur!</h2><p className="text-sm text-slate-500">Configure em 3 passos rápidos.</p></div>
          <div className="grid sm:grid-cols-3 gap-3 max-w-lg mx-auto">
            <button onClick={() => setShowNewClient(true)} className="bg-white border-2 border-slate-200 hover:border-amber-400 p-4 rounded-2xl text-center space-y-2 transition-all hover:shadow-md"><UserPlus className="w-7 h-7 text-emerald-600 mx-auto" /><p className="text-sm font-black text-[#071B3A]">1. Cadastrar</p></button>
            <div className="bg-white border-2 border-slate-100 p-4 rounded-2xl text-center space-y-2 opacity-40"><FileUp className="w-7 h-7 text-amber-600 mx-auto" /><p className="text-sm font-black text-[#071B3A]">2. Arrastar PDF</p></div>
            <div className="bg-white border-2 border-slate-100 p-4 rounded-2xl text-center space-y-2 opacity-40"><MessageSquare className="w-7 h-7 text-blue-600 mx-auto" /><p className="text-sm font-black text-[#071B3A]">3. WhatsApp</p></div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  CENTRAL DE DISPARO — A ESTRELA DA PÁGINA                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border border-slate-200/70 rounded-[24px] shadow-sm overflow-hidden">
        {/* HEADER COM TABS */}
        <div className="px-6 lg:px-8 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#071B3A] to-[#0d2d5e] flex items-center justify-center shadow-md"><Zap className="w-5 h-5 text-amber-400" /></div>
            <div>
              <h2 className="text-base font-black text-[#071B3A] tracking-tight">Central de Disparo</h2>
              <p className="text-[11px] text-slate-500">Envie documentos para assinatura digital em segundos</p>
            </div>
          </div>
          <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl">
            {[
              { key: 'PDF_FILE' as const, label: 'PDF do Computador', icon: '📂' },
              { key: 'KIT' as const, label: 'Kit Jurídico Automático', icon: '✨' },
            ].map((tab) => (
              <button key={tab.key} type="button" onClick={() => { setDispatchMode(tab.key); setExecutionResult(null); }}
                className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-200 ${dispatchMode === tab.key ? 'bg-[#071B3A] text-white shadow-md' : 'text-slate-600 hover:text-slate-800'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 lg:px-8 py-6">
          {executionResult ? (
            /* RESULTADO DO ENVIO */
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"><CheckCircle2 className="w-6 h-6" /></div>
                  <div>
                    <p className="text-base font-black text-[#071B3A]">{executionResult.type === 'KIT' ? 'Kit Jurídico Gerado!' : 'Documento Pronto!'}</p>
                    <p className="text-sm text-slate-600">Para <span className="font-bold">{executionResult.clientName}</span> — link seguro gerado com sucesso.</p>
                  </div>
                </div>
                <button onClick={() => { setExecutionResult(null); setUploadedPdf(null); }} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Mensagem para WhatsApp</span>
                  <button type="button" onClick={() => setEditingMsg(!editingMsg)} className="text-[11px] font-bold text-[#B68B1C] hover:underline flex items-center gap-1"><Edit3 className="w-3 h-3" />{editingMsg ? 'Fechar' : 'Personalizar'}</button></div>
                {editingMsg
                  ? <textarea value={whatsappMsg} onChange={(e) => setWhatsappMsg(e.target.value)} rows={5} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-amber-500 resize-none" />
                  : <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed max-h-28 overflow-y-auto">{whatsappMsg}</div>}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {executionResult.clientPhone ? (
                  <a href={`https://wa.me/55${executionResult.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`} target="_blank" rel="noreferrer"
                    className="px-6 py-3 bg-[#25D366] hover:bg-[#1fb855] text-white font-black text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all hover:shadow-xl hover:-translate-y-px">
                    <MessageSquare className="w-4 h-4" /> Enviar no WhatsApp</a>
                ) : <span className="text-sm font-bold text-amber-800 bg-amber-100 px-4 py-3 rounded-xl">⚠️ Sem telefone cadastrado</span>}
                <button onClick={() => { navigator.clipboard.writeText(executionResult.signatureLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                  className="px-5 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-sm rounded-xl flex items-center gap-2 transition-all shadow-sm">
                  {copiedLink ? <><Check className="w-4 h-4 text-emerald-600" /> Copiado!</> : <><Copy className="w-4 h-4 text-[#B68B1C]" /> Copiar Link</>}</button>
                <button onClick={() => setShowQrModal(true)} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 transition-all"><QrCode className="w-4 h-4" /> QR Code</button>
              </div>
            </div>
          ) : (
            /* FORMULÁRIO */
            <form onSubmit={handleDispatch} className="max-w-2xl mx-auto space-y-5">
              {dispatchMode === 'PDF_FILE' ? (
                <div className="space-y-4">
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                      dragActive ? 'border-[#B68B1C] bg-amber-50/60 shadow-xl scale-[1.01]'
                      : uploadedPdf ? 'border-emerald-400 bg-emerald-50/40 shadow-sm'
                      : 'border-slate-300 bg-slate-50/30 hover:border-[#B68B1C] hover:bg-amber-50/20 hover:shadow-md'}`}>
                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                    {uploadingPdf ? (
                      <div className="py-10 text-center"><Loader2 className="w-8 h-8 text-[#B68B1C] animate-spin mx-auto" /><p className="text-sm font-bold text-slate-600 mt-2">Carregando documento...</p></div>
                    ) : uploadedPdf ? (
                      <div className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm"><File className="w-7 h-7" /></div>
                          <div><p className="text-sm font-black text-slate-800">{uploadedPdf.name}</p><p className="text-[12px] text-emerald-600 font-bold mt-0.5">✓ PDF pronto para envio • {(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(1)} MB</p></div>
                        </div>
                        <span className="text-[12px] font-bold text-slate-500 bg-white border-2 border-slate-200 px-3 py-1.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all">Trocar arquivo</span>
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-200/50 flex items-center justify-center mx-auto shadow-sm"><FileUp className="w-8 h-8 text-[#B68B1C]" /></div>
                        <div><p className="text-sm font-black text-slate-800">Arraste e solte seu PDF aqui</p><p className="text-[13px] text-slate-500 mt-1">Petições, contratos, procurações — ou <span className="text-[#B68B1C] font-bold underline underline-offset-2">clique para buscar no computador</span></p></div>
                      </div>
                    )}
                  </div>
                  <input type="text" value={docCustomTitle} onChange={(e) => setDocCustomTitle(e.target.value)} placeholder="Título do documento (Ex: Procuração Ad Judicia)"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#B68B1C] focus:ring-4 focus:ring-amber-100/40 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none transition-all" />
                </div>
              ) : (
                <div className="bg-slate-50/80 border-2 border-slate-200/80 p-5 rounded-2xl space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Kit Jurídico Automatizado</label>
                  <select value={selectedKitId} onChange={(e) => setSelectedKitId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#B68B1C] rounded-2xl text-sm font-bold text-slate-800 focus:outline-none">
                    {kits.map((k) => (<option key={k.id} value={k.id}>{k.name} ({k.items?.length || 3} documentos inclusos)</option>))}
                  </select>
                  {selectedKit && <div className="flex flex-wrap gap-2">{selectedKit.items?.map((it: any, i: number) => (<span key={i} className="text-[12px] font-bold bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-xl shadow-sm">✓ {it.template?.title || `Doc ${i+1}`}</span>))}</div>}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Para qual cliente enviar?</label>
                <ClientCombobox clients={clients} value={selectedClientId} onChange={setSelectedClientId} onNewClient={() => setShowNewClient(true)} />
              </div>

              <button type="submit" disabled={submitting || !selectedClientId || (dispatchMode === 'PDF_FILE' && !uploadedPdf)}
                className="w-full py-4 bg-gradient-to-r from-[#071B3A] to-[#0d2d5e] hover:from-[#0A254F] hover:to-[#103672] text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-30 hover:shadow-xl hover:-translate-y-px active:translate-y-0">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 text-amber-400" />}
                GERAR LINK DE ASSINATURA & DISPARAR NO WHATSAPP
              </button>
            </form>
          )}
        </div>
      </section>

      {executionError && <p className="text-sm font-bold text-rose-700 bg-rose-50 border-2 border-rose-200 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-sm"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /> {executionError}</p>}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  PAINEL LATERAL: CADASTRO / URGÊNCIAS / ATIVIDADE + DOSSIÊ      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <section className="grid lg:grid-cols-2 gap-5">
        {/* COLUNA 1: URGÊNCIAS + ATIVIDADE OU CADASTRO */}
        <div className="space-y-5">
          {showNewClient ? (
            <div className="bg-white border border-slate-200/70 rounded-[24px] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200/60 text-emerald-700 flex items-center justify-center shrink-0 shadow-sm"><UserPlus className="w-4 h-4" /></div><h3 className="font-black text-[#071B3A] text-sm">Nova Cliente &amp; Dossiê</h3></div>
                <button onClick={() => setShowNewClient(false)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleRegisterClient} className="space-y-3">
                <div><label className="text-[10px] font-black uppercase text-slate-600 mb-1 block">Nome Completo</label><input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Maria das Graças Silva" className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black uppercase text-slate-600 mb-1 flex items-center justify-between">CPF{cpfValid !== null && <span className={`text-[9px] ${cpfValid ? 'text-emerald-600' : 'text-rose-600'}`}>{cpfValid ? '✓ Válido' : '✗ Inválido'}</span>}</label><input type="text" value={newClientCpf} onChange={(e) => setNewClientCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className={`w-full px-4 py-3 bg-white border-2 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none ${cpfValid === false ? 'border-rose-400' : cpfValid === true ? 'border-emerald-400' : 'border-slate-200'}`} /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-600 mb-1 block">WhatsApp</label><input type="text" value={newClientPhone} onChange={(e) => setNewClientPhone(maskPhone(e.target.value))} placeholder="(71) 99999-9999" className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500" /></div>
                </div>
                <div><label className="text-[10px] font-black uppercase text-slate-600 mb-1 block">RG (opcional)</label><input type="text" value={newClientRg} onChange={(e) => setNewClientRg(maskRg(e.target.value))} placeholder="00.000.000-00" className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-500" /></div>
                <button type="submit" disabled={submitting || !newClientName.trim()} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 hover:-translate-y-px">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />} Cadastrar &amp; Criar Dossiê 📁</button>
              </form>
            </div>
          ) : (
            <>
              {urgentActions.length > 0 && (
                <div className="bg-white border border-slate-200/70 rounded-[24px] p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#071B3A] flex items-center gap-2"><Bell className="w-4 h-4 text-rose-500" /> Atenção Necessária <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-black">{urgentActions.length}</span></h3>
                    <button onClick={() => setShowNewClient(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#071B3A] text-[11px] font-bold rounded-lg transition-all"><UserPlus className="w-3 h-3 inline mr-1" />Nova Cliente</button>
                  </div>
                  <div className="space-y-2">
                    {urgentActions.map((a, i) => (
                      <div key={i} className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${a.level === 'RED' ? 'bg-rose-50/70 border-rose-200' : a.level === 'YELLOW' ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.level === 'RED' ? 'bg-rose-500 animate-pulse' : a.level === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <div className="min-w-0"><p className="text-[13px] font-bold text-slate-800 truncate">{a.clientName}</p><p className="text-[11px] text-slate-500 truncate">{a.text}</p></div>
                        </div>
                        {a.level !== 'GREEN' && a.clientPhone && (
                          <a href={`https://wa.me/55${a.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${a.clientName}! Seus documentos aguardam assinatura digital.`)}`} target="_blank" rel="noreferrer"
                            className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[11px] font-bold rounded-lg shrink-0 shadow-sm transition-all">💬 Cobrar</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentActivities.length > 0 && (
                <div className="bg-white border border-slate-200/70 rounded-[24px] p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-[#071B3A] flex items-center gap-2"><Activity className="w-4 h-4 text-[#B68B1C]" /> Atividade Recente</h3>
                    {urgentActions.length === 0 && <button onClick={() => setShowNewClient(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#071B3A] text-[11px] font-bold rounded-lg transition-all"><UserPlus className="w-3 h-3 inline mr-1" />Nova</button>}
                  </div>
                  <div className="space-y-1">
                    {recentActivities.map((act, i) => (
                      <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                        <div className={`w-7 h-7 rounded-lg ${act.bg} flex items-center justify-center text-[11px] shrink-0 mt-0.5 shadow-sm`}>{act.icon}</div>
                        <div className="min-w-0"><p className={`text-[13px] font-semibold ${act.color} truncate`}>{act.text}</p><p className="text-[10px] text-slate-400 mt-0.5">{act.date.toLocaleDateString('pt-BR')} às {act.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {urgentActions.length === 0 && recentActivities.length === 0 && (
                <div className="bg-white border border-slate-200/70 rounded-[24px] p-8 shadow-sm text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-[#071B3A]">Tudo em dia!</p>
                  <p className="text-[13px] text-slate-500">Arraste um PDF acima ou cadastre uma nova cliente.</p>
                  <button onClick={() => setShowNewClient(true)} className="mx-auto px-5 py-2.5 bg-[#071B3A] hover:bg-[#0A254F] text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"><UserPlus className="w-4 h-4" /> Nova Cliente</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* COLUNA 2: DOSSIÊ */}
        <div className="bg-white border border-slate-200/70 rounded-[24px] p-5 lg:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/50 border border-amber-300/30 flex items-center justify-center shadow-sm"><Folder className="w-5 h-5 text-amber-700 fill-amber-500/20" /></div>
              <div><span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B68B1C]">Gerenciador Dossiê</span><h3 className="font-black text-[#071B3A] text-sm mt-0.5">Pastas do Windows Explorer</h3></div>
            </div>
            <Link href="/processos" className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#071B3A] text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all">Central <ArrowUpRight className="w-3 h-3" /></Link>
          </div>
          <div className="space-y-2.5">
            {processes.slice(0, 4).map((p) => {
              const isExp = expandedFolderId === p.id;
              return (
                <div key={p.id} className="bg-slate-50/50 border border-slate-200 hover:border-amber-400 rounded-2xl overflow-hidden transition-all shadow-sm hover:shadow-md">
                  <div onClick={() => setExpandedFolderId(isExp ? null : p.id)} className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-50/20 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-sm"><Folder className="w-4 h-4 fill-amber-500/30" /></div>
                      <div className="min-w-0"><h4 className="text-[13px] font-extrabold text-[#071B3A] truncate">{p.title}</h4><p className="text-[11px] text-slate-500 truncate"><User className="w-3 h-3 text-slate-400 inline mr-1" />{p.client?.name || 'Cliente'}</p></div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isExp ? 'rotate-180' : ''}`} />
                  </div>
                  {isExp && (
                    <div className="bg-white border-t border-slate-100 p-3 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {['01. Doc Pessoais', '02. Procuração', '03. Provas', '04. Peças'].map((f, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center gap-2 text-[11px] font-semibold text-slate-700 shadow-sm"><Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> {f}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!processes.length && <div className="py-8 text-center"><Folder className="w-8 h-8 mx-auto text-slate-300 mb-2" /><p className="text-[13px] text-slate-400">Nenhum dossiê ativo.</p></div>}
          <Link href="/processos" className="w-full py-3 bg-amber-50 hover:bg-amber-100/70 border border-amber-200 text-amber-950 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"><Folder className="w-4 h-4 text-amber-600 fill-amber-500/20" /> Navegar pelas Pastas</Link>
        </div>
      </section>

      {/* QR CODE */}
      {showQrModal && executionResult?.signatureLink && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowQrModal(false)} className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <QrCode className="w-10 h-10 text-[#B68B1C] mx-auto" />
            <div><h3 className="font-black text-[#071B3A] text-lg">Assinatura Presencial</h3><p className="text-sm text-slate-500 mt-1">Peça para a cliente escanear:</p></div>
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl flex justify-center"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(executionResult.signatureLink)}`} alt="QR Code" className="w-44 h-44 rounded-xl" /></div>
            <button onClick={() => setShowQrModal(false)} className="w-full py-3 bg-[#071B3A] text-white text-sm font-black rounded-xl shadow-lg">Concluir</button>
          </div>
        </div>
      )}
    </main>
  );
}
