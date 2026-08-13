"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  Download,
  FileText,
  FolderPlus,
  HardDrive,
  Loader2,
  Pencil,
  Search,
  Upload,
  User,
  X,
  ExternalLink,
  CloudUpload,
  Trash2,
  Folder,
  FolderOpen,
  Grid,
  List,
  ArrowLeft,
  Eye,
  Check,
  Plus,
  Move,
} from "lucide-react";

type Activity = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
};
type Process = {
  id: string;
  title: string;
  legalArea?: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  processNumber?: string;
  protocolNumber?: string;
  notes?: string;
  lastActivityAt: string;
  driveFolderUrl?: string | null;
  client: { id: string; name: string; cpfCnpj: string; phone?: string };
  documents: Array<{
    id: string;
    title: string;
    status: string;
    signedFileId?: string;
  }>;
  attachments: Array<{
    id: string;
    title: string;
    description?: string;
    driveFileUrl?: string | null;
    file: { id: string; originalName: string; sizeBytes: number };
  }>;
  activities: Activity[];
};
type Client = { id: string; name: string; cpfCnpj: string };
const statuses = [
  { id: "EM_TRIAGEM", label: "Triagem" },
  { id: "DOCUMENTACAO_PENDENTE", label: "Documentação pendente" },
  { id: "PRONTO_PARA_PROTOCOLAR", label: "Pronto para protocolar" },
  { id: "PROTOCOLADO", label: "Protocolado" },
  { id: "EM_ANDAMENTO", label: "Em andamento" },
  { id: "CONCLUIDO", label: "Concluído / arquivado" },
];
const priorities = [
  { id: "ALTA", label: "Alta", color: "bg-rose-100 text-rose-700" },
  { id: "NORMAL", label: "Normal", color: "bg-blue-100 text-blue-700" },
  { id: "BAIXA", label: "Baixa", color: "bg-slate-100 text-slate-600" },
];
const blankForm = {
  clientId: "",
  title: "",
  legalArea: "Previdenciário",
  status: "EM_TRIAGEM",
  priority: "NORMAL",
  dueDate: "",
  processNumber: "",
  protocolNumber: "",
  notes: "",
  documentIds: [] as string[],
};

export default function ProcessosPage() {
  const searchParams = useSearchParams();
  const openedFromDocuments = useRef(false);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Process | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [savingQuickClient, setSavingQuickClient] = useState(false);
  const [quickClient, setQuickClient] = useState({
    name: "",
    cpfCnpj: "",
    phone: "",
    legalArea: "Previdenciário",
  });

  // Estado do Gerenciador de Arquivos Estilo Windows Explorer
  const [currentFolder, setCurrentFolder] = useState<string>("ROOT");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [explorerViewMode, setExplorerViewMode] = useState<"GRID" | "LIST">("GRID");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [renamingAttachment, setRenamingAttachment] = useState<{ id: string; title: string } | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string | null>(null);

  const DEFAULT_FOLDERS = useMemo(() => [
    "01. Documentos Pessoais",
    "02. Procuração e Contratos Assinados",
    "03. Provas Médicas e CNIS",
    "04. Peças e Petições",
    "05. Decisões e Sentenças",
  ], []);

  const allFolders = useMemo(() => {
    return Array.from(new Set([...DEFAULT_FOLDERS, ...customFolders]));
  }, [customFolders, DEFAULT_FOLDERS]);
  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      fetch("/api/processos").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]);
    const nextProcesses = (p.processes || []) as Process[];
    setProcesses(nextProcesses);
    setClients(c.clients || []);
    setLoading(false);
    return nextProcesses;
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const clientId = searchParams.get("clienteId");
    if (!clientId || openedFromDocuments.current) return;
    openedFromDocuments.current = true;
    setForm((current) => ({
      ...current,
      clientId,
      documentIds: (searchParams.get("documentoIds") || "")
        .split(",")
        .filter(Boolean),
    }));
    setModal(true);
  }, [searchParams]);
  const visible = useMemo(
    () =>
      processes.filter(
        (p) =>
          (statusFilter === "ALL" || p.status === statusFilter) &&
          `${p.title} ${p.client.name} ${p.processNumber || ""}`
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")),
      ),
    [processes, statusFilter, query],
  );
  const overdue = (p: Process) =>
    !!p.dueDate &&
    p.status !== "CONCLUIDO" &&
    new Date(p.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/processos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) return alert(d.error);
    setModal(false);
    setForm(blankForm);
    await load();
  };
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const r = await fetch(`/api/processos/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) return alert(d.error);
    setEditing(false);
    setSelected(null);
    setForm(blankForm);
    await load();
  };
  const beginEdit = (p: Process) => {
    setForm({
      clientId: p.client.id,
      title: p.title,
      legalArea: p.legalArea || "",
      status: p.status,
      priority: p.priority || "NORMAL",
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString().slice(0, 10) : "",
      processNumber: p.processNumber || "",
      protocolNumber: p.protocolNumber || "",
      notes: p.notes || "",
      documentIds: [],
    });
    setEditing(true);
  };
  const uploadAttachments = async (files: FileList | File[], targetFolder?: string) => {
    if (!selected) return;
    const processId = selected.id;
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;
    if (
      selectedFiles.some(
        (file) =>
          file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf"),
      )
    )
      return alert("Para preservar o dossiê, envie somente arquivos PDF.");
    setUploadingAttachment(true);
    try {
      const folderToUse = targetFolder || (currentFolder !== "ROOT" ? currentFolder : "01. Documentos Pessoais");
      for (const file of selectedFiles) {
        const body = new FormData();
        body.append("file", file);
        body.append("folderName", folderToUse);
        const res = await fetch(`/api/processos/${processId}`, {
          method: "POST",
          body,
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(
            data.error || `Não foi possível anexar ${file.name}.`,
          );
      }
      const updated = await load();
      setSelected(updated.find((item) => item.id === processId) || null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const renameAttachmentFile = async (fileId: string, newTitle: string) => {
    if (!selected || !newTitle.trim()) return;
    try {
      const res = await fetch(`/api/processos/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renameAttachment", fileId, newTitle: newTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao renomear arquivo.");
      const updated = await load();
      setSelected(updated.find((item) => item.id === selected.id) || null);
      setRenamingAttachment(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const moveAttachmentFolder = async (fileId: string, folderName: string) => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/processos/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "moveAttachmentFolder", fileId, folderName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao mover arquivo de pasta.");
      const updated = await load();
      setSelected(updated.find((item) => item.id === selected.id) || null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderNameInput.trim()) return;
    const folderName = newFolderNameInput.trim();
    if (!customFolders.includes(folderName)) {
      setCustomFolders((prev) => [...prev, folderName]);
    }
    setCurrentFolder(folderName);
    setNewFolderNameInput("");
    setShowNewFolderModal(false);
  };
  const manageFile = async (action: "unlinkDocument" | "moveDocument" | "moveAttachment" | "removeAttachment", fileId: string, targetProcessId?: string) => {
    if (!selected) return;
    const destructive = action === "unlinkDocument" || action === "removeAttachment";
    if (destructive && !confirm(action === "unlinkDocument" ? "Remover este documento somente deste dossiê? Ele continuará preservado na Central de Documentos." : "Remover este arquivo deste dossiê?")) return;
    const processId = selected.id;
    try {
      const res = await fetch(`/api/processos/${processId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, fileId, targetProcessId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível atualizar o arquivo.");
      const updated = await load();
      setSelected(updated.find((item) => item.id === processId) || null);
    } catch (error: any) { alert(error.message); }
  };
  const otherDossiersForSelected = selected ? processes.filter((item) => item.client.id === selected.client.id && item.id !== selected.id) : [];
  const syncExistingProcessesToDrive = async () => {
    setSyncingDrive(true);
    try {
      const res = await fetch("/api/processos/sync-drive", { method: "POST" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Não foi possível sincronizar o Drive.");
      await load();
      alert(
        data.created
          ? `${data.created} processo(s) organizado(s) no Google Drive.`
          : "Todos os processos já possuem pasta no Google Drive.",
      );
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSyncingDrive(false);
    }
  };
  const createQuickClient = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingQuickClient(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quickClient),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Não foi possível cadastrar a cliente.");
      setClients((current) => [
        {
          id: data.client.id,
          name: data.client.name,
          cpfCnpj: data.client.cpfCnpj,
        },
        ...current,
      ]);
      setForm((current) => ({
        ...current,
        clientId: data.client.id,
        legalArea: data.client.legalArea || current.legalArea,
      }));
      setQuickClientOpen(false);
      setQuickClient({
        name: "",
        cpfCnpj: "",
        phone: "",
        legalArea: "Previdenciário",
      });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSavingQuickClient(false);
    }
  };
  const statusLabel = (id: string) =>
    statuses.find((s) => s.id === id)?.label || id;
  const priority = (id: string) =>
    priorities.find((p) => p.id === id) || priorities[1];
  // Não é um componente separado: isso preserva o foco dos campos enquanto
  // cada letra atualiza o estado do formulário.
  const renderProcessForm = (edit = false) => (
    <form onSubmit={edit ? saveEdit : create} className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="flex gap-2">
          <select
            required
            disabled={!!edit}
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="w-full border rounded-xl p-3 text-sm bg-white"
          >
            <option value="">Selecione a cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.cpfCnpj}
              </option>
            ))}
          </select>
          {!edit && (
            <button
              type="button"
              onClick={() => setQuickClientOpen(true)}
              className="shrink-0 px-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-extrabold text-xs"
            >
              + Cliente
            </button>
          )}
        </div>
        <input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Título do atendimento"
          className="border rounded-xl p-3 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <input
          value={form.legalArea}
          onChange={(e) => setForm({ ...form, legalArea: e.target.value })}
          placeholder="Área"
          className="border rounded-xl p-3 text-sm"
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="border rounded-xl p-3 text-sm"
        >
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
          className="border rounded-xl p-3 text-sm"
        >
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>
              Prioridade {p.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          className="border rounded-xl p-3 text-sm"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <input
          value={form.processNumber}
          onChange={(e) => setForm({ ...form, processNumber: e.target.value })}
          placeholder="Número judicial (opcional)"
          className="border rounded-xl p-3 text-sm"
        />
        <input
          value={form.protocolNumber}
          onChange={(e) => setForm({ ...form, protocolNumber: e.target.value })}
          placeholder="Protocolo administrativo (opcional)"
          className="border rounded-xl p-3 text-sm"
        />
      </div>
      <textarea
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Resumo e próximas providências internas"
        className="w-full border rounded-xl p-3 text-sm min-h-24"
      />
      <button
        disabled={saving}
        className="w-full py-3 bg-[#071B3A] text-white font-extrabold rounded-xl text-sm"
      >
        {saving
          ? "Salvando..."
          : edit
            ? "Salvar alterações"
            : "Criar processo e organizar documentos"}
      </button>
    </form>
  );
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-[#071B3A] to-[#0B3B78] text-white p-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">
            Gestão do escritório
          </p>
          <h1 className="text-2xl font-black font-heading mt-1">
            Processos e dossiês
          </h1>
          <p className="text-sm text-blue-100 mt-2">
            Controle operacional de prazos, etapas, protocolo e documentos de
            cada cliente.
          </p>
        </div>
        <div className="self-start sm:self-center flex flex-wrap gap-2">
          <button
            onClick={syncExistingProcessesToDrive}
            disabled={syncingDrive}
            className="inline-flex items-center gap-2 border border-blue-200/50 bg-blue-950/20 text-white px-4 py-3 rounded-xl text-xs font-extrabold disabled:opacity-60"
          >
            <HardDrive className="w-4 h-4" />{" "}
            {syncingDrive ? "Organizando..." : "Organizar Drive"}
          </button>
          <button
            onClick={() => {
              setForm(blankForm);
              setModal(true);
            }}
            className="inline-flex items-center gap-2 bg-white text-[#071B3A] px-5 py-3 rounded-xl text-xs font-extrabold"
          >
            <FolderPlus className="w-4 h-4" /> Novo processo
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-2xl p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400">
            Em andamento
          </p>
          <p className="text-2xl font-black text-[#071B3A]">
            {
              processes.filter(
                (p) => !["CONCLUIDO", "EM_TRIAGEM"].includes(p.status),
              ).length
            }
          </p>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400">
            Para protocolar
          </p>
          <p className="text-2xl font-black text-amber-600">
            {
              processes.filter((p) => p.status === "PRONTO_PARA_PROTOCOLAR")
                .length
            }
          </p>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400">
            Prazos vencidos
          </p>
          <p className="text-2xl font-black text-rose-600">
            {processes.filter(overdue).length}
          </p>
        </div>
        <div className="bg-white border rounded-2xl p-4">
          <p className="text-[10px] uppercase font-bold text-slate-400">
            Dossiês ativos
          </p>
          <p className="text-2xl font-black text-blue-600">
            {processes.filter((p) => p.status !== "CONCLUIDO").length}
          </p>
        </div>
      </div>
      {/* WINDOWS EXPLORER BARRA SUPERIOR DE CONTROLES DO ESCRITÓRIO */}
      <div className="bg-[#071B3A] text-white border border-slate-700 rounded-2xl p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between shadow-md">
        {/* Caminho tipo Windows Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <div className="w-7 h-7 bg-amber-400/20 rounded-lg flex items-center justify-center">
            <Folder className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-slate-400">Este Computador</span>
          <span>/</span>
          <span className="text-white font-bold">Processos e Dossiês</span>
          <span className="text-slate-400">({visible.length})</span>
        </div>

        {/* Busca + Filtros + Alternador de Exibição */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, processo ou número"
              className="w-full pl-8 pr-3 py-1.5 bg-blue-950/70 border border-blue-900 text-white placeholder-slate-400 rounded-xl text-xs focus:outline-none focus:border-blue-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-blue-950/70 border border-blue-900 text-white rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-blue-400"
          >
            <option value="ALL">Todas as Etapas</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Alternador de Modo estilo Windows: Ícones Grandes vs Detalhes */}
          <div className="flex bg-blue-950 p-0.5 rounded-xl border border-blue-900">
            <button
              onClick={() => setExplorerViewMode("GRID")}
              className={`p-1.5 rounded-lg transition-all ${
                explorerViewMode === "GRID"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Modo Ícones Grandes (Pastas Amarelas)"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExplorerViewMode("LIST")}
              className={`p-1.5 rounded-lg transition-all ${
                explorerViewMode === "LIST"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Modo Tabela de Detalhes"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="animate-spin w-6 h-6 text-blue-600 mx-auto" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <BriefcaseBusiness className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-bold text-[#071B3A]">
            Nenhum processo encontrado
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Clique no botão "Novo Processo" para criar a primeira pasta de processo do escritório.
          </p>
        </div>
      ) : explorerViewMode === "GRID" ? (
        /* MODO ÍCONES GRANDES: PASTAS AMARELAS DO WINDOWS PARA CADA PROCESSO */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                setCurrentFolder("ROOT");
              }}
              className="group bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-400 rounded-3xl p-5 text-left transition-all shadow-xs flex flex-col justify-between min-h-[170px] relative overflow-hidden"
            >
              {/* Header da Pasta */}
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors shadow-xs">
                  <Folder className="w-7 h-7 text-amber-600 fill-amber-500/30" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-extrabold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                    {statusLabel(p.status)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {p.documents.length + p.attachments.length} arquivos
                  </span>
                </div>
              </div>

              {/* Informações do Cliente & Título do Processo */}
              <div className="mt-4">
                <h3 className="font-heading font-black text-[#071B3A] text-sm group-hover:text-blue-700 line-clamp-1">
                  {p.title}
                </h3>
                <p className="text-xs font-bold text-slate-600 mt-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {p.client.name}
                </p>
              </div>

              {/* Rodapé da Pasta do Windows */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate font-mono">
                  {p.processNumber || p.protocolNumber || "Sem número"}
                </span>
                <span className="text-blue-700 font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Abrir Pasta 📁
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* MODO LISTA DETALHADA DO WINDOWS EXPLORER */
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#071B3A] text-white font-heading text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Nome da Pasta / Processo</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Etapa</th>
                  <th className="py-3 px-4">Número / Protocolo</th>
                  <th className="py-3 px-4">Arquivos</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => {
                      setSelected(p);
                      setCurrentFolder("ROOT");
                    }}
                    className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Folder className="w-5 h-5 text-amber-500 fill-amber-400/30" />
                    </td>
                    <td className="py-3 px-4 font-bold text-[#071B3A]">
                      {p.title}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {p.client.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {p.processNumber || p.protocolNumber || "—"}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-600">
                      {p.documents.length + p.attachments.length} arquivos
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(p);
                          setCurrentFolder("ROOT");
                        }}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px]"
                      >
                        Abrir Pasta 📁
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="font-heading font-black text-[#071B3A] text-lg">
                  Novo processo
                </h2>
                <p className="text-xs text-slate-500">
                  Os documentos assinados escolhidos serão preservados e
                  vinculados ao dossiê.
                </p>
              </div>
              <button onClick={() => setModal(false)}>
                <X />
              </button>
            </div>
            {renderProcessForm()}
          </div>
        </div>
      )}
      {quickClientOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-heading font-black text-[#071B3A] text-lg">
                  Cadastrar cliente rapidamente
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Cadastre o essencial e continue criando este processo.
                </p>
              </div>
              <button onClick={() => setQuickClientOpen(false)}>
                <X />
              </button>
            </div>
            <form onSubmit={createQuickClient} className="space-y-3">
              <input
                required
                value={quickClient.name}
                onChange={(e) =>
                  setQuickClient({ ...quickClient, name: e.target.value })
                }
                placeholder="Nome completo"
                className="w-full border rounded-xl p-3 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={quickClient.cpfCnpj}
                  onChange={(e) =>
                    setQuickClient({ ...quickClient, cpfCnpj: e.target.value })
                  }
                  placeholder="CPF"
                  className="border rounded-xl p-3 text-sm"
                />
                <input
                  required
                  value={quickClient.phone}
                  onChange={(e) =>
                    setQuickClient({ ...quickClient, phone: e.target.value })
                  }
                  placeholder="WhatsApp com DDD"
                  className="border rounded-xl p-3 text-sm"
                />
              </div>
              <input
                value={quickClient.legalArea}
                onChange={(e) =>
                  setQuickClient({ ...quickClient, legalArea: e.target.value })
                }
                placeholder="Área"
                className="w-full border rounded-xl p-3 text-sm"
              />
              <button
                disabled={savingQuickClient}
                className="w-full py-3 bg-[#071B3A] text-white font-extrabold rounded-xl text-sm"
              >
                {savingQuickClient
                  ? "Cadastrando..."
                  : "Cadastrar e selecionar cliente"}
              </button>
            </form>
          </div>
        </div>
      )}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 space-y-5">
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-700 uppercase">
                  Dossiê da cliente
                </p>
                <h2 className="font-heading font-black text-[#071B3A]">
                  {selected.title}
                </h2>
                <p className="text-xs text-slate-500">{selected.client.name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => beginEdit(selected)}
                  className="p-2 text-blue-700 border rounded-xl"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setSelected(null)}>
                  <X />
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 border p-3 text-xs">
                <b>Etapa</b>
                <br />
                {statusLabel(selected.status)}
              </div>
              <div className="rounded-xl bg-slate-50 border p-3 text-xs">
                <b>Prioridade</b>
                <br />
                {priority(selected.priority).label}
              </div>
              <div
                className={`rounded-xl border p-3 text-xs ${overdue(selected) ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-slate-50"}`}
              >
                <b>Próximo prazo</b>
                <br />
                {selected.dueDate
                  ? new Date(selected.dueDate).toLocaleDateString("pt-BR")
                  : "Não definido"}
              </div>
            </div>
            <div className="text-sm border rounded-2xl p-4">
              {selected.processNumber && (
                <p>
                  <b>Processo:</b> {selected.processNumber}
                </p>
              )}
              {selected.protocolNumber && (
                <p>
                  <b>Protocolo:</b> {selected.protocolNumber}
                </p>
              )}
              {selected.notes && (
                <p className="mt-2 text-slate-600">{selected.notes}</p>
              )}
            </div>
            {/* GERENCIADOR DE DOSSIÊ ESTILO WINDOWS EXPLORER */}
            <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-50 shadow-sm space-y-0">
              {/* Barra de Ferramentas / Ribbon do Windows Explorer */}
              <div className="bg-[#071B3A] text-white p-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  {currentFolder !== "ROOT" ? (
                    <button
                      onClick={() => setCurrentFolder("ROOT")}
                      className="p-1.5 bg-blue-900/80 hover:bg-blue-800 rounded-lg text-white text-xs flex items-center gap-1 font-bold transition-all"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                  ) : (
                    <div className="w-7 h-7 bg-amber-400/20 rounded-lg flex items-center justify-center">
                      <Folder className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                  <div className="text-xs font-mono flex items-center gap-1 text-slate-300">
                    <span className="text-slate-400">Dossiê</span>
                    <span>/</span>
                    <span className="text-white font-bold">
                      {currentFolder === "ROOT" ? "Pastas Principais" : currentFolder}
                    </span>
                  </div>
                </div>

                {/* Controles do Explorer: Nova Pasta e Visualização */}
                <div className="flex items-center gap-2">
                  {selected.driveFolderUrl && (
                    <a
                      href={selected.driveFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <HardDrive className="w-3.5 h-3.5" /> Drive
                    </a>
                  )}
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Nova Pasta
                  </button>

                  <div className="flex bg-blue-950 p-0.5 rounded-lg border border-blue-900">
                    <button
                      onClick={() => setExplorerViewMode("GRID")}
                      className={`p-1 rounded ${explorerViewMode === "GRID" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                      title="Modo Ícones Grandes"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setExplorerViewMode("LIST")}
                      className={`p-1 rounded ${explorerViewMode === "LIST" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                      title="Modo Lista Detalhada"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Área de Conteúdo / Pastas e Arquivos */}
              <div className="p-4 min-h-[300px]">
                {currentFolder === "ROOT" ? (
                  /* NÍVEL RAIZ: LISTAGEM DAS PASTAS */
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Pastas do Dossiê ({allFolders.length})
                    </p>

                    <div className={explorerViewMode === "GRID" ? "grid grid-cols-2 sm:grid-cols-3 gap-3" : "space-y-2"}>
                      {allFolders.map((folderName) => {
                        const countSigned = folderName === "02. Procuração e Contratos Assinados" ? selected.documents.length : 0;
                        const countAttachments = selected.attachments.filter(
                          (a) => (a.description || "01. Documentos Pessoais") === folderName
                        ).length;
                        const totalCount = countSigned + countAttachments;

                        if (explorerViewMode === "GRID") {
                          return (
                            <button
                              key={folderName}
                              onClick={() => setCurrentFolder(folderName)}
                              className="group bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 p-4 rounded-2xl text-left transition-all shadow-xs flex flex-col justify-between min-h-[105px]"
                            >
                              <div className="flex items-start justify-between">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
                                  <Folder className="w-6 h-6 text-amber-600 fill-amber-500/30" />
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  {totalCount} arquivos
                                </span>
                              </div>
                              <h4 className="text-xs font-extrabold text-[#071B3A] mt-2 group-hover:text-blue-700 line-clamp-1">
                                {folderName}
                              </h4>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={folderName}
                            onClick={() => setCurrentFolder(folderName)}
                            className="w-full bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 p-3 rounded-xl flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <Folder className="w-5 h-5 text-amber-500 fill-amber-400/30" />
                              <span className="text-xs font-bold text-[#071B3A]">{folderName}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                              {totalCount} arquivos
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* DENTRO DA PASTA: ARQUIVOS */
                  <div className="space-y-4">
                    {/* Área de Drag & Drop para esta pasta */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDraggingFiles(true); }}
                      onDragLeave={() => setDraggingFiles(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDraggingFiles(false);
                        uploadAttachments(e.dataTransfer.files, currentFolder);
                      }}
                      className={`border-2 border-dashed rounded-2xl p-3.5 text-center transition-all ${
                        draggingFiles ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <CloudUpload className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-bold text-[#071B3A]">
                            Pasta: <strong className="text-blue-700">{currentFolder}</strong>
                          </span>
                        </div>
                        <label className="cursor-pointer text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadingAttachment ? "Enviando..." : "Anexar PDF nesta pasta"}
                          <input
                            type="file"
                            multiple
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={uploadingAttachment}
                            onChange={(e) => {
                              if (e.target.files) uploadAttachments(e.target.files, currentFolder);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Exibição dos arquivos na pasta ativa */}
                    {(() => {
                      const folderDocs = currentFolder === "02. Procuração e Contratos Assinados" ? selected.documents : [];
                      const folderAttachments = selected.attachments.filter(
                        (a) => (a.description || "01. Documentos Pessoais") === currentFolder
                      );
                      const totalInFolder = folderDocs.length + folderAttachments.length;

                      if (totalInFolder === 0) {
                        return (
                          <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl space-y-2">
                            <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold text-slate-600">Esta pasta está vazia</p>
                            <p className="text-[11px] text-slate-400">
                              Arraste arquivos PDF ou clique em "Anexar PDF nesta pasta" para adicionar documentos aqui.
                            </p>
                          </div>
                        );
                      }

                      if (explorerViewMode === "GRID") {
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {/* Documentos Assinados */}
                            {folderDocs.map((d) => (
                              <div key={d.id} className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-3 flex flex-col justify-between min-h-[115px] shadow-xs">
                                <div className="flex items-start justify-between gap-1">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                                    Assinado
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-[#071B3A] truncate mt-2">{d.title}</p>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                  <a href={`/api/documents/${d.id}/download`} download className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                                    <Download className="w-3.5 h-3.5" /> PDF
                                  </a>
                                  <button onClick={() => manageFile("unlinkDocument", d.id)} title="Remover" className="text-slate-400 hover:text-rose-600 p-1">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Anexos do Escritório */}
                            {folderAttachments.map((a) => (
                              <div key={a.id} className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-3 flex flex-col justify-between min-h-[115px] shadow-xs">
                                <div className="flex items-start justify-between gap-1">
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400">
                                    {Math.ceil(a.file.sizeBytes / 1024)} KB
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-[#071B3A] truncate mt-2" title={a.title}>{a.title}</p>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2 gap-1">
                                  <div className="flex gap-1">
                                    <a href={`/api/documents/upload?fileId=${a.file.id}`} download title="Baixar" className="p-1 text-emerald-700 hover:bg-emerald-50 rounded">
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                    <button onClick={() => setRenamingAttachment({ id: a.id, title: a.title })} title="Renomear" className="p-1 text-blue-700 hover:bg-blue-50 rounded">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <button onClick={() => manageFile("removeAttachment", a.id)} title="Excluir" className="p-1 text-slate-400 hover:text-rose-600">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      /* MODO LISTA DETALHADA */
                      return (
                        <div className="space-y-2 bg-white border border-slate-200 rounded-2xl overflow-hidden p-2">
                          {folderDocs.map((d) => (
                            <div key={d.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="font-bold text-[#071B3A] truncate">{d.title}</span>
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">Assinado</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <a href={`/api/documents/${d.id}/download`} download className="text-emerald-700 font-bold flex items-center gap-1">
                                  <Download className="w-3.5 h-3.5" /> Baixar
                                </a>
                                <button onClick={() => manageFile("unlinkDocument", d.id)} className="text-slate-400 hover:text-rose-600 p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {folderAttachments.map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="font-bold text-[#071B3A] truncate">{a.title}</span>
                                <span className="text-[10px] text-slate-400">({Math.ceil(a.file.sizeBytes / 1024)} KB)</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <select
                                  aria-label="Mover pasta"
                                  value={currentFolder}
                                  onChange={(e) => moveAttachmentFolder(a.id, e.target.value)}
                                  className="border border-slate-200 rounded-lg p-1 text-[10px] text-blue-700 bg-white"
                                >
                                  {allFolders.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                  ))}
                                </select>
                                <button onClick={() => setRenamingAttachment({ id: a.id, title: a.title })} title="Renomear" className="text-blue-700 hover:bg-blue-50 p-1 rounded">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <a href={`/api/documents/upload?fileId=${a.file.id}`} download className="text-emerald-700 font-bold flex items-center gap-1">
                                  <Download className="w-3.5 h-3.5" /> Baixar
                                </a>
                                <button onClick={() => manageFile("removeAttachment", a.id)} className="text-slate-400 hover:text-rose-600 p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase text-[#071B3A]">
                Linha do tempo
              </h3>
              <div className="mt-2 border-l-2 border-blue-100 ml-2 space-y-3">
                {selected.activities.map((a) => (
                  <div key={a.id} className="pl-4 text-xs">
                    <p className="font-bold text-slate-700">{a.description}</p>
                    <p className="text-slate-400">
                      {new Date(a.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/documentos"
              className="block text-center py-3 border rounded-xl text-sm font-bold text-[#071B3A]"
            >
              Abrir Central de Documentos
            </Link>
          </div>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-[60] bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="font-heading font-black text-[#071B3A]">
                Atualizar processo
              </h2>
              <button onClick={() => setEditing(false)}>
                <X />
              </button>
            </div>
            {renderProcessForm(true)}
          </div>
        </div>
      )}

      {/* Modal Nova Pasta (Windows Explorer) */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-black text-[#071B3A] text-sm flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-500" /> Criar Nova Pasta
              </h3>
              <button onClick={() => setShowNewFolderModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input
              required
              value={newFolderNameInput}
              onChange={(e) => setNewFolderNameInput(e.target.value)}
              placeholder="Nome da pasta (ex: 06. Laudos Médicos Periciais)"
              className="w-full border rounded-xl p-3 text-xs"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="w-full py-2.5 bg-[#071B3A] text-white font-extrabold rounded-xl text-xs"
            >
              Criar Pasta
            </button>
          </div>
        </div>
      )}

      {/* Modal Renomear Arquivo (Windows Explorer) */}
      {renamingAttachment && (
        <div className="fixed inset-0 z-[70] bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-heading font-black text-[#071B3A] text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" /> Renomear Arquivo
              </h3>
              <button onClick={() => setRenamingAttachment(null)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input
              required
              value={renamingAttachment.title}
              onChange={(e) => setRenamingAttachment({ ...renamingAttachment, title: e.target.value })}
              placeholder="Novo nome do arquivo"
              className="w-full border rounded-xl p-3 text-xs"
              autoFocus
            />
            <button
              onClick={() => renameAttachmentFile(renamingAttachment.id, renamingAttachment.title)}
              className="w-full py-2.5 bg-blue-600 text-white font-extrabold rounded-xl text-xs"
            >
              Salvar Novo Nome
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
