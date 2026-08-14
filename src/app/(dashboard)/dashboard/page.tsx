'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, ChevronRight, FolderPlus, Send, Folder, User, ShieldCheck,
  Zap, MessageSquare, Search, Copy, Check, Loader2, AlertCircle, X,
  UserPlus, FileUp, File, QrCode, ChevronDown, Bell, Activity,
  Edit3, Scale, ArrowUpRight, Clock, FileText, Layers, Sparkles,
  Lock, CheckCheck, HelpCircle, FileCheck, RefreshCw, Award,
  ExternalLink, Hash, Smartphone, ArrowRight, ShieldAlert,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════ */
/*  MÁSCARAS E VALIDAÇÃO DE DADOS BRASILEIROS                  */
/* ═══════════════════════════════════════════════════════════ */
const maskCpf = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const maskPhone = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

const maskRg = (v: string) =>
  v.replace(/\D/g, '').slice(0, 9)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const validateCpf = (cpf: string) => {
  const n = cpf.replace(/\D/g, '');
  if (n.length !== 11 || /^(\d)\1+$/.test(n)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i);
  let c = 11 - (s % 11);
  if (c >= 10) c = 0;
  if (parseInt(n[9]) !== c) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i);
  c = 11 - (s % 11);
  if (c >= 10) c = 0;
  return parseInt(n[10]) === c;
};

/* ═══════════════════════════════════════════════════════════ */
/*  COMBOBOX EXECUTIVO DE BUSCA DE CLIENTES                    */
/* ═══════════════════════════════════════════════════════════ */
function ExecutiveClientSearch({
  clients,
  value,
  onChange,
  onNew,
}: {
  clients: any[];
  value: string;
  onChange: (id: string) => void;
  onNew?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    if (!q) return clients;
    const s = q.toLowerCase();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(s) ||
        c.cpfCnpj?.includes(s) ||
        c.phone?.includes(s)
    );
  }, [clients, q]);

  const sel = clients.find((c) => c.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 bg-slate-50/80 hover:bg-white border-2 rounded-2xl text-left transition-all duration-200 ${
          open
            ? 'border-gold-500 bg-white ring-4 ring-gold-100/50 shadow-md'
            : 'border-slate-200/90 hover:border-slate-300 shadow-2xs'
        }`}
      >
        {sel ? (
          <>
            <div className="w-8 h-8 rounded-xl bg-[#071B3A] text-gold-400 flex items-center justify-center text-xs font-black shrink-0 border border-gold-500/20">
              {sel.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{sel.name}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {sel.cpfCnpj ? `CPF ${sel.cpfCnpj}` : 'Sem CPF'} {sel.phone ? `• WhatsApp ${sel.phone}` : ''}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700">Selecione o Cliente Destinatário</p>
              <p className="text-[11px] text-slate-400">Buscar por nome, CPF ou WhatsApp...</p>
            </div>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 ml-auto transition-transform duration-200 ${
            open ? 'rotate-180 text-gold-600' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_-10px_rgba(7,27,58,0.15)] max-h-80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Digitar nome, CPF ou telefone..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-gold-500 shadow-2xs"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-52 py-1 divide-y divide-slate-50">
            {list.length > 0 ? (
              list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    value === c.id ? 'bg-amber-50/90' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {c.cpfCnpj || 'Sem CPF'} {c.phone ? `• ${c.phone}` : ''}
                    </p>
                  </div>
                  {value === c.id && <Check className="w-4 h-4 text-gold-600 shrink-0" />}
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                Nenhum cliente cadastrado com esse termo.
              </p>
            )}
          </div>

          {onNew && (
            <div className="border-t border-slate-100 p-2 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  onNew();
                  setOpen(false);
                }}
                className="w-full py-2 bg-[#071B3A] hover:bg-[#0A254F] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5 text-gold-400" /> Cadastrar Novo Cliente Agora
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  DASHBOARD EXECUTIVO PRINCIPAL                              */
/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo ativo de trabalho
  const [mode, setMode] = useState<'PDF' | 'KIT' | 'CLIENT'>('PDF');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [docCustomTitle, setDocCustomTitle] = useState('');

  // Drag and Drop & Upload
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cadastro Rápido de Cliente
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientRg, setNewClientRg] = useState('');
  const cpfValid = useMemo(() => {
    const r = newClientCpf.replace(/\D/g, '');
    return r.length < 11 ? null : validateCpf(newClientCpf);
  }, [newClientCpf]);

  // Mensagem e Envio
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Dossiê de Processos
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  // Inicialização
  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/office').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/clients').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/documents').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/processos').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/kits').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, o, c, d, p, k]) => {
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
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completed = useMemo(
    () => documents.filter((d) => d.status === 'CONCLUIDO'),
    [documents]
  );
  const pending = useMemo(
    () => documents.filter((d) => !['CONCLUIDO', 'CANCELADO', 'EXPIRADO'].includes(d.status)),
    [documents]
  );
  const timeSaved = useMemo(() => {
    const m = completed.length * 45 + processes.length * 15 + pending.length * 20;
    return { h: Math.floor(m / 60), m: m % 60 };
  }, [completed, pending, processes]);

  const activities = useMemo(() => {
    const a: { date: Date; type: 'signed' | 'pending' | 'folder'; text: string; hash?: string }[] = [];
    documents.forEach((d) =>
      a.push({
        date: new Date(d.updatedAt || d.createdAt),
        type: d.status === 'CONCLUIDO' ? 'signed' : 'pending',
        text: `${d.title} — ${d.client?.name || 'Cliente'}`,
        hash: d.id.slice(0, 8),
      })
    );
    processes.forEach((p) =>
      a.push({
        date: new Date(p.createdAt),
        type: 'folder',
        text: `Dossiê criado: "${p.client?.name || p.title}"`,
      })
    );
    return a.sort((x, y) => y.date.getTime() - x.date.getTime()).slice(0, 4);
  }, [documents, processes]);

  const pendingAlerts = useMemo(() => {
    return pending
      .map((doc) => {
        const days = Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 864e5);
        return {
          id: doc.id,
          days,
          urgent: days >= 3,
          title: doc.title,
          client: doc.client?.name || 'Cliente',
          phone: doc.client?.phone || doc.client?.whatsapp || '',
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 4);
  }, [pending]);

  /* Handlers */
  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor, selecione um arquivo em formato PDF.');
      return;
    }
    setUploadingPdf(true);
    setError('');
    setDocCustomTitle(file.name.replace(/\.pdf$/i, ''));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro no upload do PDF.');
      setUploadedPdf(d.file);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingPdf(false);
    }
  };

  const buildMsg = useCallback(
    (clientName: string, link: string) =>
      `Olá, ${clientName}!\n\nSeus documentos jurídicos do escritório ${
        office?.name || 'Rodrigues & Soares Advocacia'
      } estão prontos para sua assinatura digital eletrônica com validade jurídica oficial.\n\nClique no link seguro para assinar pelo celular em menos de 1 minuto:\n${link}\n\nQualquer dúvida, estamos à disposição no escritório.`,
    [office]
  );

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Selecione a cliente destinatária.');
      return;
    }
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      if (mode === 'PDF') {
        if (!uploadedPdf) throw new Error('Por favor, arraste ou selecione um documento PDF.');
        const r = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: docCustomTitle || uploadedPdf.name,
            clientId: selectedClientId,
            fileId: uploadedPdf.id,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Erro ao gerar documento.');

        const cl = clients.find((c) => c.id === selectedClientId);
        const link = `https://www.assinajur.com.br/assinar/${d.document.token}`;
        setWhatsappMsg(buildMsg(cl?.name || 'Cliente', link));
        setResult({
          type: 'PDF',
          clientName: cl?.name || 'Cliente',
          clientPhone: cl?.phone || cl?.whatsapp || '',
          docTitle: d.document.title,
          signatureLink: link,
        });
      } else if (mode === 'KIT') {
        if (!selectedKitId) throw new Error('Selecione o Kit Jurídico.');
        const r = await fetch('/api/kits/generate-package', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedClientId,
            kitId: selectedKitId,
            variables: {
              valor_honorarios: 'R$ 3.000,00',
              percentual_exito: '30%',
            },
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Erro ao gerar Kit.');

        const cl = clients.find((c) => c.id === selectedClientId);
        setWhatsappMsg(buildMsg(d.result.clientName, d.result.signatureLink));
        setResult({
          type: 'KIT',
          clientName: d.result.clientName,
          clientPhone: cl?.phone || cl?.whatsapp || '',
          kitName: d.result.kitName,
          documentsCount: d.result.documentsCount,
          signatureLink: d.result.signatureLink,
        });
      }

      fetch('/api/documents')
        .then((r) => r.json())
        .then((x) => setDocuments(x.documents || []));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      setError('Informe o nome da cliente.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const r = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          cpfCnpj: newClientCpf.replace(/\D/g, ''),
          phone: newClientPhone.replace(/\D/g, ''),
          whatsapp: newClientPhone.replace(/\D/g, ''),
          rg: newClientRg,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao cadastrar cliente.');

      // Criação automática do dossiê
      await fetch('/api/processos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Dossiê — ${d.client.name}`,
          clientId: d.client.id,
        }),
      });

      const [uc, up] = await Promise.all([
        fetch('/api/clients').then((r) => r.json()),
        fetch('/api/processos').then((r) => r.json()),
      ]);
      if (uc?.clients) setClients(uc.clients);
      if (up?.processes) setProcesses(up.processes);

      setSelectedClientId(d.client.id);
      setMode('PDF');
      setNewClientName('');
      setNewClientCpf('');
      setNewClientPhone('');
      setNewClientRg('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedKit = useMemo(
    () => kits.find((k) => k.id === selectedKitId),
    [kits, selectedKitId]
  );
  const doctorName = currentUser?.name || 'Dr. Diego dos Santos Rodrigues';

  return (
    <main className="mx-auto max-w-6xl pb-24 space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CABEÇALHO EXECUTIVO DE ALTA ADVOCACIA                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#071B3A] via-[#0A254F] to-[#0E2A52] rounded-[28px] p-6 lg:p-7 text-white shadow-card border border-navy-700/50">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl -translate-y-24 translate-x-24 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* IDENTIDADE DO ESCRITÓRIO */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-300 bg-gold-400/15 border border-gold-400/30 px-3 py-0.5 rounded-full flex items-center gap-1.5 backdrop-blur-md">
                <Award className="w-3 h-3 text-gold-400" />
                {office?.name || 'Rodrigues & Soares Advocacia'}
              </span>
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-md">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ICP-Brasil • MP 2.200-2/2001
              </span>
            </div>

            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight font-heading">
              Olá, {doctorName} ⚖️
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Painel de Operações Jurídicas. Arraste petições, dispare kits contratuais e acompanhe assinaturas eletrônicas com validade jurídica integral.
            </p>
          </div>

          {/* PAINEL DE PERFORMANCE (TEMPO SALVO + KPIS) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-gradient-to-br from-gold-400/20 to-gold-500/10 border border-gold-400/30 backdrop-blur-md px-4 py-3 rounded-2xl text-center min-w-[100px] shadow-2xs">
              <p className="text-[9px] font-black text-gold-300 uppercase tracking-widest">⏱ Tempo Salvo</p>
              <p className="text-xl font-black text-gold-300 tabular-nums font-heading mt-0.5">
                {timeSaved.h}<span className="text-xs font-bold text-gold-400">h</span>
                {String(timeSaved.m).padStart(2, '0')}<span className="text-xs font-bold text-gold-400">m</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { n: loading ? '—' : String(clients.length).padStart(2, '0'), l: 'Clientes', c: 'text-white' },
                { n: loading ? '—' : String(pending.length).padStart(2, '0'), l: 'Pendentes', c: 'text-amber-300', dot: pending.length > 0 },
                { n: loading ? '—' : String(completed.length).padStart(2, '0'), l: 'Assinados', c: 'text-emerald-400' },
              ].map((m, i) => (
                <div
                  key={i}
                  className="bg-white/10 border border-white/10 backdrop-blur-md px-3.5 py-3 rounded-2xl text-center min-w-[68px]"
                >
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{m.l}</p>
                  <p className={`text-xl font-black ${m.c} tabular-nums font-heading mt-0.5`}>{m.n}</p>
                  {m.dot && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto mt-1 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MESA EXECUTIVA DE DISPARO (DROP ZONE EM DESTAQUE TOTAL)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200/90 rounded-[28px] shadow-card overflow-hidden">
        {/* NAVEGAÇÃO DE FLUXO SUPERIOR */}
        <div className="bg-slate-50/90 px-6 lg:px-8 py-3.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setMode('PDF');
                setResult(null);
                setError('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                mode === 'PDF'
                  ? 'bg-[#071B3A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 text-gold-400" />
              1. Enviar PDF do Computador
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('KIT');
                setResult(null);
                setError('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                mode === 'KIT'
                  ? 'bg-[#071B3A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-brand-300" />
              2. Kit Jurídico Automático
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('CLIENT');
                setResult(null);
                setError('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                mode === 'CLIENT'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
              3. Cadastrar Cliente & Dossiê
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1 text-[#071B3A]">
              <span className="w-4 h-4 rounded-full bg-[#071B3A] text-gold-400 flex items-center justify-center text-[9px] font-black">1</span>
              Solte o PDF
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="flex items-center gap-1 text-[#071B3A]">
              <span className="w-4 h-4 rounded-full bg-[#071B3A] text-gold-400 flex items-center justify-center text-[9px] font-black">2</span>
              Escolha o Cliente
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black">3</span>
              WhatsApp 1-Click
            </span>
          </div>
        </div>

        {/* ÁREA DE DISPARO INTERATIVA */}
        <div className="p-6 lg:p-8">
          {result ? (
            /* SUCESSO DO ENVIO */
            <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-emerald-950">
                      {result.type === 'KIT' ? 'Kit Jurídico Gerado com Sucesso!' : 'Documento Pronto para Assinatura!'}
                    </h2>
                    <p className="text-xs text-emerald-800 font-medium">
                      Destinatária: <strong className="text-emerald-950">{result.clientName}</strong> • Link seguro ativo.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setResult(null);
                    setUploadedPdf(null);
                  }}
                  className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-emerald-800 border border-emerald-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* PRÉVIA DA MENSAGEM DO WHATSAPP */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" /> Mensagem Pré-Formatada do WhatsApp
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingMsg(!editingMsg)}
                    className="text-xs font-bold text-gold-600 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    {editingMsg ? 'OK' : 'Personalizar'}
                  </button>
                </div>

                {editingMsg ? (
                  <textarea
                    value={whatsappMsg}
                    onChange={(e) => setWhatsappMsg(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-white border border-gold-500 rounded-xl text-xs text-slate-800 focus:outline-none resize-none font-sans leading-relaxed shadow-inner"
                  />
                ) : (
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto font-sans">
                    {whatsappMsg}
                  </div>
                )}
              </div>

              {/* BOTÕES DE DISPARO */}
              <div className="flex flex-wrap items-center gap-2.5">
                {result.clientPhone ? (
                  <a
                    href={`https://wa.me/55${result.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMsg)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 bg-[#25D366] hover:bg-[#1fb855] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <MessageSquare className="w-4 h-4 fill-white" /> ENVIAR NO WHATSAPP AGORA
                  </a>
                ) : (
                  <span className="px-4 py-3 bg-amber-50 text-amber-800 font-bold text-xs rounded-xl border border-amber-200">
                    ⚠️ Sem telefone cadastrado
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(result.signatureLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-4 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gold-600" /> Copiar Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(true)}
                  className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <QrCode className="w-3.5 h-3.5" /> QR Code Presencial
                </button>
              </div>
            </div>
          ) : mode === 'PDF' ? (
            /* ─────────────────────────────────────────────────── */
            /* MODO 1: PDF AVULSO — DROP ZONE VISÍVEL              */
            /* ─────────────────────────────────────────────────── */
            <form onSubmit={handleDispatch} className="max-w-2xl mx-auto space-y-4">
              {/* DROP ZONE EXECUTIVO COM EFEITO DE PROFUNDIDADE */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) await processFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${
                  dragActive
                    ? 'border-gold-500 bg-amber-50/80 shadow-card scale-[1.01]'
                    : uploadedPdf
                    ? 'border-emerald-400 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-300 bg-slate-50/50 hover:border-gold-500 hover:bg-amber-50/20 hover:shadow-xs'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    if (e.target.files?.[0]) await processFile(e.target.files[0]);
                  }}
                  className="hidden"
                />

                {uploadingPdf ? (
                  <div className="py-10 text-center space-y-2">
                    <Loader2 className="w-7 h-7 text-gold-500 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Validando estrutura do PDF...</p>
                  </div>
                ) : uploadedPdf ? (
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{uploadedPdf.name}</p>
                        <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                          ✓ PDF Pronto • {(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(2)} MB • Hash SHA-256 Validado
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shrink-0 shadow-2xs hover:bg-slate-50">
                      Trocar PDF
                    </span>
                  </div>
                ) : (
                  <div className="py-9 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200/50 border border-amber-300/40 flex items-center justify-center mx-auto shadow-2xs">
                      <FileUp className="w-6 h-6 text-gold-600" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        Arraste e solte o documento PDF aqui
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Petições, procurações, contratos — ou <span className="text-gold-600 font-bold underline">clique para selecionar do seu computador</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* TÍTULO PERSONALIZADO */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Título do Documento
                </label>
                <input
                  type="text"
                  value={docCustomTitle}
                  onChange={(e) => setDocCustomTitle(e.target.value)}
                  placeholder="Ex: Procuração Ad Judicia e Declaração de Hipossuficiência"
                  className="w-full px-4 py-2.5 bg-slate-50/80 focus:bg-white border-2 border-slate-200/90 focus:border-gold-500 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* BUSCA DA CLIENTE */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Destinatária da Assinatura
                </label>
                <ExecutiveClientSearch
                  clients={clients}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  onNew={() => setMode('CLIENT')}
                />
              </div>

              {/* CTA PRINCIPAL */}
              <button
                type="submit"
                disabled={submitting || !selectedClientId || !uploadedPdf}
                className="w-full py-3.5 bg-gradient-to-r from-[#071B3A] to-[#0A254F] hover:from-[#0A254F] hover:to-[#143464] text-white font-black text-xs rounded-2xl shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-35 hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-gold-400" />
                )}
                GERAR LINK DE ASSINATURA & DISPARAR NO WHATSAPP
              </button>
            </form>
          ) : mode === 'KIT' ? (
            /* ─────────────────────────────────────────────────── */
            /* MODO 2: KIT JURÍDICO AUTOMÁTICO                     */
            /* ─────────────────────────────────────────────────── */
            <form onSubmit={handleDispatch} className="max-w-2xl mx-auto space-y-4">
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                  Pacote Jurídico Integrado
                </label>
                <select
                  value={selectedKitId}
                  onChange={(e) => setSelectedKitId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-gold-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
                >
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.items?.length || 3} documentos inclusos)
                    </option>
                  ))}
                </select>

                {selectedKit && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedKit.items?.map((it: any, i: number) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg shadow-2xs"
                      >
                        ✓ {it.template?.title || `Documento ${i + 1}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Destinatária do Pacote
                </label>
                <ExecutiveClientSearch
                  clients={clients}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  onNew={() => setMode('CLIENT')}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedClientId || !selectedKitId}
                className="w-full py-3.5 bg-gradient-to-r from-[#071B3A] to-[#0A254F] text-white font-black text-xs rounded-2xl shadow-card transition-all flex items-center justify-center gap-2 disabled:opacity-35 hover:shadow-card-hover hover:-translate-y-0.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-gold-400" />
                )}
                GERAR KIT COMPLETO & DISPARAR NO WHATSAPP
              </button>
            </form>
          ) : (
            /* ─────────────────────────────────────────────────── */
            /* MODO 3: CADASTRO RÁPIDO + DOSSIÊ AUTOMÁTICO         */
            /* ─────────────────────────────────────────────────── */
            <form onSubmit={handleNewClient} className="max-w-2xl mx-auto space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-600">
                  Nome Completo da Cliente
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Maria das Graças Silva"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-600 flex items-center justify-between">
                    CPF
                    {cpfValid !== null && (
                      <span className={`text-[9px] font-black ${cpfValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {cpfValid ? '✓ CPF Válido' : '✗ CPF Inválido'}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={newClientCpf}
                    onChange={(e) => setNewClientCpf(maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    className={`w-full px-3.5 py-2.5 bg-white border-2 rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs ${
                      cpfValid === false
                        ? 'border-rose-300'
                        : cpfValid === true
                        ? 'border-emerald-400'
                        : 'border-slate-200 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-600">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(maskPhone(e.target.value))}
                    placeholder="(71) 99999-9999"
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-600">
                  RG (Opcional)
                </label>
                <input
                  type="text"
                  value={newClientRg}
                  onChange={(e) => setNewClientRg(maskRg(e.target.value))}
                  placeholder="00.000.000-00"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !newClientName.trim()}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-35 hover:shadow-lg hover:-translate-y-0.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderPlus className="w-4 h-4 text-emerald-200" />
                )}
                SALVAR CLIENTE & CRIAR DOSSIÊ AUTOMÁTICO 📁
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. GRID OPERACIONAL: ATENÇÃO PRIORITÁRIA + DOSSIÊS NATIVOS   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid lg:grid-cols-2 gap-6">
        {/* COLUNA 1: ATENÇÃO PRIORITÁRIA & COBRANÇA 1-CLICK */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-black text-[#071B3A] text-sm">Atenção Prioritária</h3>
                <p className="text-[11px] text-slate-500">Cobrança de assinaturas pendentes</p>
              </div>
            </div>

            {pendingAlerts.length > 0 && (
              <span className="text-[10px] bg-rose-100 text-rose-800 font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                {pendingAlerts.length} pendente(s)
              </span>
            )}
          </div>

          <div className="space-y-2">
            {pendingAlerts.length > 0 ? (
              pendingAlerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                    a.urgent
                      ? 'bg-rose-50/70 border-rose-200/90'
                      : 'bg-amber-50/60 border-amber-200/90'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        a.urgent ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{a.client}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {a.title} • {a.days > 0 ? `Aguardando há ${a.days} dia(s)` : 'Enviado hoje'}
                      </p>
                    </div>
                  </div>

                  {a.phone && (
                    <a
                      href={`https://wa.me/55${a.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Olá, ${a.client}! Passando para lembrar sobre a assinatura digital dos seus documentos no escritório ${
                          office?.name || 'Rodrigues & Soares Advocacia'
                        }. Podemos te ajudar a concluir?`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[10px] font-black rounded-lg shrink-0 shadow-2xs flex items-center gap-1 transition-all"
                    >
                      <MessageSquare className="w-3 h-3 fill-white" /> Cobrar
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="py-7 text-center space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">Tudo em dia!</p>
                <p className="text-[11px] text-slate-500">
                  Nenhum documento aguardando assinatura no momento.
                </p>
              </div>
            )}
          </div>

          {/* ATIVIDADE RECENTE LOG */}
          {activities.length > 0 && (
            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                Últimos Registros
              </p>
              <div className="space-y-1">
                {activities.slice(0, 3).map((act, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-700">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        act.type === 'signed'
                          ? 'bg-emerald-500'
                          : act.type === 'pending'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <p className="truncate flex-1 font-medium">{act.text}</p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {act.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA 2: GERENCIADOR DOSSIÊ DOS PROCESSOS (WINDOWS EXPLORER) */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Folder className="w-4 h-4 fill-amber-400/30" />
              </div>
              <div>
                <h3 className="font-heading font-black text-[#071B3A] text-sm">Dossiê de Processos</h3>
                <p className="text-[11px] text-slate-500">Pastas Nativas do Windows Explorer</p>
              </div>
            </div>

            <Link
              href="/processos"
              className="text-xs font-bold text-gold-600 hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {processes.slice(0, 4).map((p) => {
              const isExp = expandedFolder === p.id;
              return (
                <div
                  key={p.id}
                  className="border border-slate-200 hover:border-amber-300 rounded-2xl overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFolder(isExp ? null : p.id)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <Folder className="w-3.5 h-3.5 fill-amber-400/40" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{p.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          <User className="w-3 h-3 inline mr-1 text-slate-400" />
                          {p.client?.name || 'Cliente'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        isExp ? 'rotate-180 text-amber-600' : ''
                      }`}
                    />
                  </button>

                  {isExp && (
                    <div className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5 bg-slate-50/50 border-t border-slate-100">
                      {[
                        '01. Doc Pessoais',
                        '02. Procuração',
                        '03. Provas',
                        '04. Peças',
                      ].map((f, i) => (
                        <div
                          key={i}
                          className="bg-white border border-slate-200/80 p-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 shadow-2xs"
                        >
                          <Folder className="w-3 h-3 text-amber-500 fill-amber-400/30" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {!processes.length && (
              <div className="py-7 text-center space-y-1">
                <Folder className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Nenhum dossiê ativo ainda.</p>
              </div>
            )}
          </div>

          <Link
            href="/processos"
            className="w-full py-2.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 text-amber-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs"
          >
            <Folder className="w-3.5 h-3.5 text-amber-600 fill-amber-400/30" /> Navegar por Todas as Pastas
          </Link>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MODAL DE QR CODE PRESENCIAL                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showQr && result?.signatureLink && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQr(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-gold-600 flex items-center justify-center mx-auto shadow-2xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#071B3A]">Assinatura Presencial</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Peça para a cliente apontar a câmera do celular para assinar na hora:
              </p>
            </div>
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  result.signatureLink
                )}`}
                alt="QR Code"
                className="w-44 h-44 rounded-xl"
              />
            </div>
            <button
              onClick={() => setShowQr(false)}
              className="w-full py-3 bg-[#071B3A] text-white text-xs font-extrabold rounded-xl shadow-sm hover:bg-[#0A254F] transition-all"
            >
              Concluir Atendimento
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
