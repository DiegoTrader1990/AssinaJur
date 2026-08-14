'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  FileUp,
  FileText,
  Layers,
  UserPlus,
  Send,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  Copy,
  Check,
  Loader2,
  X,
  MessageSquare,
  QrCode,
  Folder,
  User,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Bell,
  RefreshCw,
  Scale,
  FileCheck2,
  CheckCheck,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Plus,
  Edit3,
  FolderPlus,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════ */
/*  FORMATTERS & CPF VALIDATION                                */
/* ═══════════════════════════════════════════════════════════ */
const formatCpf = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const formatPhone = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

const formatRg = (v: string) =>
  v.replace(/\D/g, '').slice(0, 9)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const isValidCpf = (cpf: string) => {
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
/*  LUXURY CLIENT AUTOCOMPLETE PICKER                          */
/* ═══════════════════════════════════════════════════════════ */
function ClientPicker({
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
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.cpfCnpj?.includes(q) ||
        c.phone?.includes(q)
    );
  }, [clients, query]);

  const selectedClient = clients.find((c) => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-white rounded-2xl border transition-all duration-200 cursor-pointer select-none ${
          open
            ? 'border-[#0B192C] ring-4 ring-[#0B192C]/5 shadow-sm'
            : 'border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
        }`}
      >
        {selectedClient ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0B192C] text-[#D4AF37] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {selectedClient.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {selectedClient.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {selectedClient.cpfCnpj ? `CPF ${selectedClient.cpfCnpj}` : 'Sem CPF'}{' '}
                {selectedClient.phone ? `• ${selectedClient.phone}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-400">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-medium">Selecione ou busque o cliente...</span>
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            open ? 'rotate-180 text-slate-800' : ''
          }`}
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_50px_-15px_rgba(11,25,44,0.12)] max-h-72 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, CPF ou telefone..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B192C]"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-48 py-1 divide-y divide-slate-50">
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    value === c.id ? 'bg-amber-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {c.cpfCnpj || 'Sem CPF'} {c.phone ? `• ${c.phone}` : ''}
                    </p>
                  </div>
                  {value === c.id && <Check className="w-4 h-4 text-[#B68B1C] shrink-0" />}
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
                Nenhum cliente encontrado.
              </p>
            )}
          </div>

          {onNew && (
            <div className="border-t border-slate-100 p-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  onNew();
                  setOpen(false);
                }}
                className="w-full py-2 bg-[#0B192C] hover:bg-[#152a47] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#D4AF37]" /> Cadastrar Novo Cliente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT: OPERATIONAL SUITE                          */
/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Workflow mode
  const [dispatchTab, setDispatchTab] = useState<'PDF' | 'KIT' | 'CLIENT'>('PDF');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [docCustomTitle, setDocCustomTitle] = useState('');

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Client State
  const [newClientName, setNewClientName] = useState('');
  const [newClientCpf, setNewClientCpf] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientRg, setNewClientRg] = useState('');
  const cpfValid = useMemo(() => {
    const r = newClientCpf.replace(/\D/g, '');
    return r.length < 11 ? null : isValidCpf(newClientCpf);
  }, [newClientCpf]);

  // Dispatch & Result State
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Dossier expansion
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);

  // Load initial data
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

  // File Upload Processor
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
      } estão prontos para assinatura digital.\n\nAcesse o link seguro no celular para assinar:\n${link}\n\nQualquer dúvida, estamos à disposição.`,
    [office]
  );

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      setError('Selecione o cliente destinatário.');
      return;
    }
    setSubmitting(true);
    setError('');
    setResult(null);

    try {
      if (dispatchTab === 'PDF') {
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
      } else if (dispatchTab === 'KIT') {
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
      setError('Informe o nome completo do cliente.');
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

      // Criação automática do dossiê no banco
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
      setDispatchTab('PDF');
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
    <main className="mx-auto max-w-6xl pb-24 space-y-8">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP EXECUTIVE BAR — LUXURY MINIMALIST HEADER               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#B68B1C] bg-[#B68B1C]/10 border border-[#B68B1C]/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Scale className="w-3 h-3 text-[#B68B1C]" />
              {office?.name || 'Rodrigues & Soares Advocacia'}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              ICP-Brasil • MP 2.200-2/2001
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-[#0B192C] tracking-tight">
            Olá, {doctorName} ⚖️
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Estúdio de Formalização Jurídica • Dispare e acompanhe assinaturas digitais instantaneamente.
          </p>
        </div>

        {/* TIME SAVED & STATS STRIP */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-br from-amber-50 via-amber-100/50 to-amber-50 border border-amber-200/90 px-4 py-2.5 rounded-2xl text-center min-w-[95px] shadow-2xs">
            <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest">⏱ Tempo Salvo</p>
            <p className="text-lg font-black text-amber-700 tabular-nums">
              {timeSaved.h}<span className="text-xs font-bold">h</span>
              {String(timeSaved.m).padStart(2, '0')}<span className="text-xs font-bold">m</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[
              { n: loading ? '—' : String(clients.length).padStart(2, '0'), l: 'Clientes', c: 'text-[#0B192C]' },
              { n: loading ? '—' : String(pending.length).padStart(2, '0'), l: 'Pendentes', c: 'text-amber-600', dot: pending.length > 0 },
              { n: loading ? '—' : String(completed.length).padStart(2, '0'), l: 'Assinados', c: 'text-emerald-700' },
            ].map((m, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200/90 px-3.5 py-2.5 rounded-2xl text-center min-w-[70px] shadow-2xs"
              >
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{m.l}</p>
                <p className={`text-lg font-black ${m.c} tabular-nums leading-tight`}>{m.n}</p>
                {m.dot && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mx-auto mt-0.5 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. THE SIGNATURE STUDIO (HERO ACTION DESK WITH VISIBLE DROP) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border-2 border-slate-200/90 rounded-[32px] shadow-[0_4px_25px_-4px_rgba(11,25,44,0.06)] overflow-hidden">
        {/* EXECUTIVE STUDIO TABS */}
        <div className="bg-slate-50/80 px-6 lg:px-8 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setDispatchTab('PDF');
                setResult(null);
                setError('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                dispatchTab === 'PDF'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileUp className="w-4 h-4 text-[#D4AF37]" />
              1. Enviar PDF Avulso
            </button>

            <button
              type="button"
              onClick={() => {
                setDispatchTab('KIT');
                setResult(null);
                setError('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                dispatchTab === 'KIT'
                  ? 'bg-[#0B192C] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-300" />
              2. Kit Jurídico Automático
            </button>

            <button
              type="button"
              onClick={() => {
                setDispatchTab('CLIENT');
                setResult(null);
                setError('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                dispatchTab === 'CLIENT'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-4 h-4 text-emerald-300" />
              3. Cadastrar Cliente & Dossiê
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1 text-[#0B192C]">
              <span className="w-4 h-4 rounded-full bg-[#0B192C] text-[#D4AF37] flex items-center justify-center text-[9px] font-black">1</span>
              Solte o PDF
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="flex items-center gap-1 text-[#0B192C]">
              <span className="w-4 h-4 rounded-full bg-[#0B192C] text-[#D4AF37] flex items-center justify-center text-[9px] font-black">2</span>
              Escolha o Cliente
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black">3</span>
              Envie no WhatsApp
            </span>
          </div>
        </div>

        {/* WORKSPACE AREA */}
        <div className="p-6 lg:p-8">
          {result ? (
            /* SUCCESS STATE */
            <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-emerald-50 border border-emerald-300 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-emerald-950">
                      {result.type === 'KIT' ? 'Kit Jurídico Pronto para Assinatura!' : 'Documento Pronto para Assinatura!'}
                    </h2>
                    <p className="text-xs text-emerald-800 font-medium">
                      Cliente: <strong className="text-emerald-950">{result.clientName}</strong> • Link seguro gerado.
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

              {/* WHATSAPP MESSAGE PREVIEW */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" /> Mensagem do WhatsApp
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingMsg(!editingMsg)}
                    className="text-xs font-bold text-[#B68B1C] hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    {editingMsg ? 'OK' : 'Personalizar Texto'}
                  </button>
                </div>

                {editingMsg ? (
                  <textarea
                    value={whatsappMsg}
                    onChange={(e) => setWhatsappMsg(e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#B68B1C] rounded-xl text-xs text-slate-800 focus:outline-none resize-none leading-relaxed shadow-inner"
                  />
                ) : (
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 whitespace-pre-line leading-relaxed max-h-24 overflow-y-auto">
                    {whatsappMsg}
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
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
                      <Copy className="w-3.5 h-3.5 text-[#B68B1C]" /> Copiar Link
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
          ) : dispatchTab === 'PDF' ? (
            /* ─────────────────────────────────────────────────── */
            /* TAB 1: PDF AVULSO — VISIBLE DROP SURFACE            */
            /* ─────────────────────────────────────────────────── */
            <form onSubmit={handleDispatch} className="max-w-2xl mx-auto space-y-4">
              {/* THE DROP SURFACE */}
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
                    ? 'border-[#B68B1C] bg-amber-50/80 shadow-md scale-[1.01]'
                    : uploadedPdf
                    ? 'border-emerald-400 bg-emerald-50/40 shadow-2xs'
                    : 'border-slate-300 bg-slate-50/50 hover:border-[#B68B1C] hover:bg-amber-50/20 hover:shadow-2xs'
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
                    <Loader2 className="w-7 h-7 text-[#B68B1C] animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Validando estrutura do PDF...</p>
                  </div>
                ) : uploadedPdf ? (
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{uploadedPdf.name}</p>
                        <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                          ✓ PDF Validado • {(uploadedPdf.sizeBytes / 1024 / 1024).toFixed(2)} MB • Pronto para Assinatura
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
                      <FileUp className="w-6 h-6 text-[#B68B1C]" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        Arraste e solte o documento PDF aqui
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Petições, procurações, contratos — ou <span className="text-[#B68B1C] font-bold underline">clique para selecionar do seu computador</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* DOCUMENT TITLE */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Título do Documento
                </label>
                <input
                  type="text"
                  value={docCustomTitle}
                  onChange={(e) => setDocCustomTitle(e.target.value)}
                  placeholder="Ex: Procuração Ad Judicia e Declaração de Hipossuficiência"
                  className="w-full px-4 py-2.5 bg-slate-50/80 focus:bg-white border-2 border-slate-200/90 focus:border-[#B68B1C] rounded-2xl text-xs font-bold text-slate-800 focus:outline-none transition-all shadow-2xs"
                />
              </div>

              {/* CLIENT PICKER */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Destinatário(a) da Assinatura
                </label>
                <ClientPicker
                  clients={clients}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  onNew={() => setDispatchTab('CLIENT')}
                />
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={submitting || !selectedClientId || !uploadedPdf}
                className="w-full py-3.5 bg-gradient-to-r from-[#0B192C] to-[#152a47] hover:from-[#152a47] hover:to-[#1e3c66] text-white font-black text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-35 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-[#D4AF37]" />
                )}
                GERAR LINK DE ASSINATURA & DISPARAR NO WHATSAPP
              </button>
            </form>
          ) : dispatchTab === 'KIT' ? (
            /* ─────────────────────────────────────────────────── */
            /* TAB 2: KIT JURÍDICO AUTOMÁTICO                      */
            /* ─────────────────────────────────────────────────── */
            <form onSubmit={handleDispatch} className="max-w-2xl mx-auto space-y-4">
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                  Pacote Jurídico Integrado
                </label>
                <select
                  value={selectedKitId}
                  onChange={(e) => setSelectedKitId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-[#B68B1C] rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
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
                  Destinatário(a) do Pacote
                </label>
                <ClientPicker
                  clients={clients}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  onNew={() => setDispatchTab('CLIENT')}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedClientId || !selectedKitId}
                className="w-full py-3.5 bg-gradient-to-r from-[#0B192C] to-[#152a47] text-white font-black text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-35 hover:shadow-md hover:-translate-y-0.5"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-[#D4AF37]" />
                )}
                GERAR KIT COMPLETO & DISPARAR NO WHATSAPP
              </button>
            </form>
          ) : (
            /* ─────────────────────────────────────────────────── */
            /* TAB 3: CADASTRO RÁPIDO DE CLIENTE + DOSSIÊ          */
            /* ─────────────────────────────────────────────────── */
            <form onSubmit={handleNewClient} className="max-w-2xl mx-auto space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-600">
                  Nome Completo do Cliente
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
                    onChange={(e) => setNewClientCpf(formatCpf(e.target.value))}
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
                    onChange={(e) => setNewClientPhone(formatPhone(e.target.value))}
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
                  onChange={(e) => setNewClientRg(formatRg(e.target.value))}
                  placeholder="00.000.000-00"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !newClientName.trim()}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-35 hover:shadow-md hover:-translate-y-0.5"
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
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. OPERATIONAL GRID: RADAR DE ASSINATURAS + DOSSIÊS           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="grid lg:grid-cols-2 gap-6">
        {/* RADAR DE ASSINATURAS & COBRANÇA WHATSAPP 1-CLICK */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-[#0B192C] text-sm">Atenção Prioritária</h3>
                <p className="text-[11px] text-slate-500">Cobrança de assinaturas pendentes</p>
              </div>
            </div>

            {pendingAlerts.length > 0 && (
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
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
        </div>

        {/* GERENCIADOR DOSSIÊ DOS PROCESSOS (WINDOWS EXPLORER) */}
        <div className="bg-white border border-slate-200/90 rounded-[28px] p-5 lg:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B68B1C] flex items-center justify-center shrink-0 border border-amber-100">
                <Folder className="w-4 h-4 fill-[#B68B1C]/30" />
              </div>
              <div>
                <h3 className="font-black text-[#0B192C] text-sm">Dossiê de Processos</h3>
                <p className="text-[11px] text-slate-500">Pastas Nativas do Windows Explorer</p>
              </div>
            </div>

            <Link
              href="/processos"
              className="text-xs font-bold text-[#B68B1C] hover:underline flex items-center gap-1"
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
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#B68B1C] flex items-center justify-center mx-auto shadow-2xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0B192C]">Assinatura Presencial</h3>
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
              className="w-full py-3 bg-[#0B192C] text-white text-xs font-extrabold rounded-xl shadow-sm hover:bg-[#152a47] transition-all"
            >
              Concluir Atendimento
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
