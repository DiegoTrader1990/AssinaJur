'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  Clock,
  History,
  AlertCircle,
  Loader2,
  CheckCircle,
  FolderOpen,
  Scale,
  Upload,
  Sparkles,
  Eye,
  Check,
  Zap,
  Camera,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Pencil,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';
import { createPortal } from 'react-dom';
import ClientsCentral, { CentralClient } from '@/components/clientes/ClientsCentral';

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  rg?: string;
  issuingOrgan?: string;
  birthDate?: string;
  nationality?: string;
  gender?: string;
  maritalStatus?: string;
  profession?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  legalRepresentative?: string;
  representativeCpf?: string;
  representativeRg?: string;
  representativeBirthDate?: string;
  representativeAddress?: string;
  representativeSameAddress?: boolean;
  representativePhone?: string;
  representativeRole?: string;
  financialResponsible?: string;
  notes?: string;
  legalArea?: string;
  processNumber?: string;
  lawyerInCharge?: { id: string; name: string; oabNumber?: string };
  processes?: Array<{ id: string; title: string; legalArea?: string; status: string; priority: string; dueDate?: string | null; protocolNumber?: string | null; lastActivityAt: string; _count?: { documents: number; attachments: number } }>;
  documents?: Array<{ id: string; title: string; status: string; createdAt: string; completedAt?: string | null; process?: { id: string; title: string } | null }>;
  pendencies?: Array<{ id: string; title?: string | null; description: string; status: string; category: string; priority: string; dueDate?: string | null; updatedAt: string; responsible?: { id: string; name: string } | null }>;
  createdAt: string;
  updatedAt?: string;
}

const EMPTY_CLIENT_FORM = {
  name: '',
  cpfCnpj: '',
  rg: '',
  issuingOrgan: '',
  birthDate: '',
  nationality: 'Brasileira',
  gender: '',
  maritalStatus: '',
  profession: '',
  phone: '',
  whatsapp: '',
  email: '',
  cep: '',
  address: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  legalRepresentative: '',
  representativeCpf: '',
  representativeRg: '',
  representativeBirthDate: '',
  representativeAddress: '',
  representativeSameAddress: false,
  representativePhone: '',
  representativeRole: '',
  financialResponsible: '',
  notes: '',
  legalArea: 'Previdenciário',
  processNumber: '',
};

// Mesma composição de endereço usada em /api/kits/generate-package/route.ts
// (cliente_endereco), reaproveitada para mostrar o endereço da própria cliente
// quando o representante marca "mesmo endereço da cliente".
function formatOwnAddress(data: typeof EMPTY_CLIENT_FORM): string {
  return [
    data.address,
    data.number && !String(data.address || '').includes(data.number) ? `nº ${data.number}` : '',
    data.complement,
    data.neighborhood,
    [data.city, data.state].filter(Boolean).join('/'),
    data.cep ? `CEP ${data.cep}` : '',
  ].filter(Boolean).join(', ');
}

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showRepresentative, setShowRepresentative] = useState(false);

  // OCR Document Parser State & Transform (Zoom + Pan Mãozinha)
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrDocPreview, setOcrDocPreview] = useState<string | null>(null);
  const [ocrDragActive, setOcrDragActive] = useState(false);
  const [isPdfDoc, setIsPdfDoc] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const currentFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');

  // Formulário do Cliente
  const [formData, setFormData] = useState(EMPTY_CLIENT_FORM);

  useEffect(() => {
    fetchClients();
    if (searchParams.get('novo') === 'true') {
      setFormData({ ...EMPTY_CLIENT_FORM, name: searchParams.get('nome') || '', legalArea: searchParams.get('area') || 'Previdenciário' });
      setShowModal(true);
    }
    
    // Atualização em tempo real para exibir novos cadastros vindos do WhatsApp
    const interval = setInterval(fetchClients, 6000);
    const onFocus = () => fetchClients();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchClients = async () => {
    try {
      const url = new URL('/api/clients', window.location.origin);
      url.searchParams.set('_t', Date.now().toString());

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.clients) {
        setClients(data.clients);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === 'cpfCnpj') value = maskCpfCnpj(value);
    if (name === 'phone' || name === 'whatsapp' || name === 'representativePhone') value = maskPhone(value);
    if (name === 'representativeCpf') value = maskCpfCnpj(value);
    setFormData({ ...formData, [name]: value });
  };

  const closeClientForm = () => {
    setShowModal(false);
    setEditingClient(null);
    setFormError('');
    setOcrDocPreview(null);
    setOcrSuccess(false);
    currentFileRef.current = null;
    setFormData(EMPTY_CLIENT_FORM);
    setShowRepresentative(false);
  };

  const openCreateClient = () => {
    setEditingClient(null);
    setFormData(EMPTY_CLIENT_FORM);
    setShowRepresentative(false);
    setFormError('');
    setShowModal(true);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      cpfCnpj: maskCpfCnpj(client.cpfCnpj || ''),
      rg: client.rg || '',
      issuingOrgan: client.issuingOrgan || '',
      birthDate: client.birthDate || '',
      nationality: client.nationality || 'Brasileira',
      gender: client.gender || '',
      maritalStatus: client.maritalStatus || '',
      profession: client.profession || '',
      phone: maskPhone(client.phone || ''),
      whatsapp: maskPhone(client.whatsapp || ''),
      email: client.email || '',
      cep: client.cep || '',
      address: client.address || '',
      number: client.number || '',
      complement: client.complement || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || '',
      legalRepresentative: client.legalRepresentative || '',
      representativeCpf: maskCpfCnpj(client.representativeCpf || ''),
      representativeRg: client.representativeRg || '',
      representativeBirthDate: client.representativeBirthDate || '',
      representativeAddress: client.representativeAddress || '',
      representativeSameAddress: Boolean(client.representativeSameAddress),
      representativePhone: maskPhone(client.representativePhone || ''),
      representativeRole: client.representativeRole || '',
      financialResponsible: client.financialResponsible || '',
      notes: client.notes || '',
      legalArea: client.legalArea || '',
      processNumber: client.processNumber || '',
    });
    setShowRepresentative(Boolean(client.legalRepresentative));
    setFormError('');
    setOcrDocPreview(null);
    setOcrSuccess(false);
    setShowModal(true);
  };

  const openClientDossier = async (client: Client) => {
    setSelectedClient(client);
    setActiveTab('resumo');
    try {
      const response = await fetch(`/api/clients/${client.id}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.client) setSelectedClient(data.client);
    } catch {
      // A ficha básica continua disponível mesmo que os dados complementares falhem.
    }
  };

  const processOcrFile = async (file: File) => {
    setOcrLoading(true);
    setFormError('');
    setOcrSuccess(false);
    currentFileRef.current = file;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.toLowerCase().includes('pdf');
    setIsPdfDoc(isPdf);

    const previewUrl = URL.createObjectURL(file);
    setOcrDocPreview(previewUrl);
    setZoomLevel(1.0);
    setRotationAngle(0);
    setPanOffset({ x: 0, y: 0 });

    // Extração no cliente por regex e heurística de nome/CPF
    const filenameCpf = file.name.match(/\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\s]?\d{2}\b/) || file.name.match(/\b\d{11}\b/);
    if (filenameCpf) {
      setFormData((prev) => ({
        ...prev,
        cpfCnpj: maskCpfCnpj(filenameCpf[0].replace(/\D/g, '')),
      }));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/clients/parse-document', {
        method: 'POST',
        body: data,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await res.json();

      if (result && result.extracted) {
        const hasData = result.extracted.name || result.extracted.cpfCnpj || result.extracted.rg || result.extracted.birthDate;
        if (hasData) {
          const rawBirth = result.extracted.birthDate || '';
          let formattedBirth = rawBirth;
          if (rawBirth.includes('/')) {
            const parts = rawBirth.split('/');
            if (parts.length === 3 && parts[2].length === 4) {
              formattedBirth = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          setFormData((prev) => ({
            ...prev,
            name: result.extracted.name || prev.name,
            cpfCnpj: result.extracted.cpfCnpj || prev.cpfCnpj,
            rg: result.extracted.rg || prev.rg,
            issuingOrgan: result.extracted.issuingOrgan || prev.issuingOrgan,
            birthDate: formattedBirth || prev.birthDate,
            nationality: result.extracted.nationality || prev.nationality,
            maritalStatus: result.extracted.maritalStatus || prev.maritalStatus,
            profession: result.extracted.profession || prev.profession,
            address: result.extracted.address || prev.address,
            number: result.extracted.number || prev.number,
            neighborhood: result.extracted.neighborhood || prev.neighborhood,
            city: result.extracted.city || prev.city,
            state: result.extracted.state || prev.state,
            cep: result.extracted.cep || prev.cep,
          }));
          setOcrSuccess(true);
        }
      }
    } catch {
      /* Leitura exibida visualmente no painel */
    } finally {
      clearTimeout(timeoutId);
      setOcrLoading(false);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleRotate = () => setRotationAngle((prev) => (prev + 90) % 360);
  const handleResetTransform = () => {
    setZoomLevel(1.0);
    setRotationAngle(0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mãozinha / Pan Mouse Handlers
  const handlePanStart = (e: React.MouseEvent) => {
    if (zoomLevel > 1.0) {
      setIsPanning(true);
      startPanRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning && zoomLevel > 1.0) {
      e.preventDefault();
      setPanOffset({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  const handleDocumentOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processOcrFile(file);
    }
    e.target.value = '';
  };

  const handleOcrDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setOcrDragActive(true);
    }
  };

  const handleOcrDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setOcrDragActive(false);
    }
  };

  const handleOcrDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleOcrDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setOcrDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processOcrFile(e.dataTransfer.files[0]);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const res = await fetch(editingClient ? `/api/clients/${editingClient.id}` : '/api/clients', {
        method: editingClient ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erro ao ${editingClient ? 'atualizar' : 'cadastrar'} cliente.`);
      }

      if (editingClient && data.client) {
        setSelectedClient(data.client);
      }
      closeClientForm();
      await fetchClients();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete || deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR') return;

    setDeleting(true);
    setFormError('');
    try {
      const res = await fetch(`/api/clients/${clientToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir cliente.');

      setClients((current) => current.filter((client) => client.id !== clientToDelete.id));
      if (selectedClient?.id === clientToDelete.id) setSelectedClient(null);
      setClientToDelete(null);
      setDeleteConfirmation('');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <ClientsCentral
        clients={clients as CentralClient[]}
        loading={loading}
        onRefresh={fetchClients}
        onCreate={openCreateClient}
        onOpen={(client) => openClientDossier(client as Client)}
        onEdit={(client) => openEditClient(client as Client)}
        onDelete={(client) => {
          setClientToDelete(client as Client);
          setDeleteConfirmation('');
          setFormError('');
        }}
      />

      {/* Modal: Novo Cliente com OCR & Leitura por IA */}
      {showModal && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#071B3A]/40 flex items-center justify-center p-3 sm:p-5 font-sans">
          <div
            onDragEnter={handleOcrDragEnter}
            onDragLeave={handleOcrDragLeave}
            onDragOver={handleOcrDragOver}
            onDrop={handleOcrDrop}
            className={`bg-white rounded-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/90 relative max-h-[88vh] overflow-y-auto transition-all ${
              ocrDocPreview ? 'max-w-5xl' : 'max-w-3xl'
            }`}
          >
            {/* Overlay de Drag Drop (Restrito Exclusivamente Dentro do Card do Modal) */}
            {ocrDragActive && (
              <div className="absolute inset-0 bg-blue-600/95 backdrop-blur-md z-50 rounded-3xl flex flex-col items-center justify-center text-white p-8 border-4 border-dashed border-white/80 pointer-events-none">
                <Upload className="w-16 h-16 text-white animate-bounce mb-4" />
                <h2 className="font-heading text-2xl font-extrabold">Solte o RG, CNH ou PDF aqui!</h2>
                <p className="text-sm text-blue-100 mt-2">Preenchimento automático por visão computacional</p>
              </div>
            )}

            {/* Cabeçalho Limpo com Ação Compacta de IA / OCR Integrada */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="font-heading text-base font-extrabold text-[#071B3A]">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h2>
              </div>

              <div className="flex items-center gap-2.5">
                {!editingClient && <button
                  type="button"
                  onClick={() => {
                    if (currentFileRef.current) {
                      processOcrFile(currentFileRef.current);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold rounded-xl text-xs border border-blue-200/80 transition-all font-heading shadow-2xs cursor-pointer"
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Lendo Documento...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600" /> 
                      <span>Preencher por Foto/RG (IA)</span>
                    </>
                  )}
                </button>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentOcr}
                  disabled={ocrLoading}
                  className="hidden"
                />

                <button onClick={closeClientForm} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {ocrSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Sucesso!</strong> Os dados do documento foram identificados e preenchidos nos campos abaixo para sua conferência.</span>
              </div>
            )}

            {formError && (
              <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* Layout Lado a Lado (Caso tenha enviado documento) */}
            <div className={ocrDocPreview ? 'grid md:grid-cols-12 gap-5 mt-5' : 'mt-5'}>
              {/* Coluna da Esquerda: Pré-visualização Ampliada que Preenche 100% o Espaço (460px) */}
              {ocrDocPreview && (
                <div className="md:col-span-6 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-col justify-between p-3.5 relative shadow-xs min-h-[460px]">
                  <div className="flex items-center justify-between text-slate-800 text-[11px] font-bold pb-2 border-b border-slate-200 font-heading">
                    <span className="flex items-center gap-1.5 text-[#071B3A]">
                      <FileText className="w-4 h-4 text-blue-600" /> Documento Original
                    </span>
                    
                    {/* Barra de Ferramentas Elegante */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        title="Diminuir Zoom (-)"
                        className="p-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all shadow-xs"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono text-slate-600 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        title="Aumentar Zoom (+)"
                        className="p-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-bold transition-all shadow-xs"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRotate}
                        title="Girar 90°"
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold transition-all shadow-xs flex items-center gap-1 font-heading"
                      >
                        <RotateCw className="w-3 h-3" /> Girar
                      </button>
                    </div>
                  </div>

                  <div className="relative my-auto py-1 flex items-center justify-center w-full h-[380px] overflow-hidden bg-slate-100/80 rounded-xl border border-slate-200 p-1 shadow-inner select-none">
                    {/* Overlay Transparente de Mãozinha (Ativo quando Zoom > 1.0) */}
                    {zoomLevel > 1.0 && (
                      <div
                        onMouseDown={handlePanStart}
                        onMouseMove={handlePanMove}
                        onMouseUp={handlePanEnd}
                        onMouseLeave={handlePanEnd}
                        className={`absolute inset-0 z-20 ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                        title="Arraste para mover o documento"
                      />
                    )}

                    {isPdfDoc ? (
                      <iframe
                        src={`${ocrDocPreview}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                        scrolling="no"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
                          transformOrigin: 'center center',
                        }}
                        className="w-full h-full min-h-[360px] rounded-lg bg-white border-0 overflow-hidden pointer-events-none transition-transform duration-100 ease-out"
                        title="Documento PDF"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ocrDocPreview}
                        alt="Documento do cliente"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
                          transformOrigin: 'center center',
                        }}
                        className="max-w-full max-h-full object-contain rounded-lg pointer-events-none transition-transform duration-100 ease-out"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 font-medium">
                    {zoomLevel > 1.0 ? (
                      <span className="text-blue-600 font-bold flex items-center gap-1">
                        🖐️ Mãozinha Ativa (Arraste no documento)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetTransform}
                        className="text-slate-500 hover:text-slate-800 underline text-[10px]"
                      >
                        Restaurar Vista
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowZoomModal(true)}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Tela Cheia 🔍
                    </button>
                  </div>
                </div>
              )}

              {/* Coluna da Direita: Formulário de Cadastro */}
              <div className={ocrDocPreview ? 'md:col-span-6' : 'w-full'}>
                <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="João da Silva"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                        CPF ou CNPJ * (Único por Escritório)
                      </label>
                      <input
                        type="text"
                        name="cpfCnpj"
                        required
                        value={formData.cpfCnpj}
                        onChange={handleFormChange}
                        placeholder="000.000.000-00"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">RG</label>
                      <input
                        type="text"
                        name="rg"
                        value={formData.rg}
                        onChange={handleFormChange}
                        placeholder="MG-12.345.678"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Órgão Expedidor</label>
                      <input
                        type="text"
                        name="issuingOrgan"
                        value={formData.issuingOrgan}
                        onChange={handleFormChange}
                        placeholder="SSP/SP"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Data Nascimento</label>
                      <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Sexo para qualificação documental</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:border-blue-600 focus:outline-none font-heading"
                      >
                        <option value="">Não informado</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMININO">Feminino</option>
                      </select>
                      <p className="mt-1 text-[10px] text-slate-400">Usado apenas para redigir a qualificação corretamente.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Estado Civil</label>
                      <select
                        name="maritalStatus"
                        value={formData.maritalStatus}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:border-blue-600 focus:outline-none font-heading"
                      >
                        <option value="">Selecione...</option>
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a)">Casado(a)</option>
                        <option value="Divorciado(a)">Divorciado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Profissão</label>
                      <input
                        type="text"
                        name="profession"
                        value={formData.profession}
                        onChange={handleFormChange}
                        placeholder="Comerciante"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Área Jurídica</label>
                      <select
                        name="legalArea"
                        value={formData.legalArea}
                        onChange={handleFormChange}
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:border-blue-600 focus:outline-none font-heading"
                      >
                        <option value="">Geral</option>
                        <option value="Previdenciário">Previdenciário</option>
                        <option value="Trabalhista">Trabalhista</option>
                        <option value="Família">Família</option>
                        <option value="Cível">Cível</option>
                        <option value="Empresarial">Empresarial</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Telefone / WhatsApp *</label>
                      <input
                        type="text"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleFormChange}
                        placeholder="(11) 99999-9999"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">E-mail</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="cliente@email.com"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Endereço Residencial (Rua - Nº - Bairro)</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Rua Botafogo - 112 - Novo Prado"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">CEP</label>
                      <input
                        type="text"
                        name="cep"
                        value={formData.cep}
                        onChange={handleFormChange}
                        placeholder="00000-000"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Cidade</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleFormChange}
                        placeholder="Porto Seguro"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">UF</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleFormChange}
                        maxLength={2}
                        placeholder="BA"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium uppercase focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        id="has-legal-representative"
                        type="checkbox"
                        checked={showRepresentative}
                        onChange={(event) => {
                          setShowRepresentative(event.target.checked);
                          if (!event.target.checked) setFormData((current) => ({ ...current, legalRepresentative: '', representativeCpf: '', representativeRg: '', representativeBirthDate: '', representativeAddress: '', representativeSameAddress: false, representativePhone: '', representativeRole: '' }));
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <label htmlFor="has-legal-representative" className="block text-sm font-bold text-[#071B3A] cursor-pointer">Possui representante legal</label>
                        <p className="mt-0.5 text-[11px] text-slate-500">Use para incapaz, menor de idade ou cliente que será representado na assinatura e nos documentos.</p>
                      </div>
                    </div>

                    {showRepresentative && (
                      <div className="grid md:grid-cols-2 gap-4 border-t border-blue-100 pt-4">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Nome completo do representante *</label>
                          <input type="text" name="legalRepresentative" required value={formData.legalRepresentative} onChange={handleFormChange} placeholder="Nome completo do pai, mãe, tutor ou curador" className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">CPF do representante *</label>
                          <input type="text" name="representativeCpf" required value={formData.representativeCpf} onChange={handleFormChange} placeholder="000.000.000-00" className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Qualidade da representação *</label>
                          <select name="representativeRole" required value={formData.representativeRole} onChange={handleFormChange} className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none bg-white">
                            <option value="">Selecione...</option>
                            <option value="Mãe">Mãe</option><option value="Pai">Pai</option><option value="Tutor(a)">Tutor(a)</option><option value="Curador(a)">Curador(a)</option><option value="Representante legal">Representante legal</option><option value="Outro">Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">RG</label>
                          <input type="text" name="representativeRg" value={formData.representativeRg} onChange={handleFormChange} placeholder="Documento de identidade" className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Telefone / WhatsApp</label>
                          <input type="text" name="representativePhone" value={formData.representativePhone} onChange={handleFormChange} placeholder="(00) 00000-0000" className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Data de Nascimento</label>
                          <input type="date" name="representativeBirthDate" value={formData.representativeBirthDate} onChange={handleFormChange} className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none" />
                        </div>
                        <div className="md:col-span-2 rounded-xl border border-blue-100 bg-white p-3 space-y-2">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input type="checkbox" checked={Boolean(formData.representativeSameAddress)}
                              onChange={(event) => setFormData((current) => ({ ...current, representativeSameAddress: event.target.checked, representativeAddress: event.target.checked ? '' : current.representativeAddress }))}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                            <span className="text-[11px] font-bold text-slate-700">É residente e domiciliado(a) no mesmo endereço da cliente</span>
                          </label>
                          {formData.representativeSameAddress ? (
                            <p className="text-[11px] text-slate-500 font-medium pl-6">
                              {formatOwnAddress(formData) || 'Endereço da cliente ainda não preenchido acima.'}
                            </p>
                          ) : (
                            <div className="pl-6">
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Endereço do representante</label>
                              <input type="text" name="representativeAddress" value={formData.representativeAddress} onChange={handleFormChange} placeholder="Rua, número, bairro, cidade/UF, CEP" className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Observações Internas</label>
                    <textarea
                      name="notes"
                      rows={2}
                      value={formData.notes}
                      onChange={handleFormChange}
                      placeholder="Informações adicionais do cliente para a equipe do escritório..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={closeClientForm}
                      className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-bold text-xs font-heading"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2 font-heading"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {editingClient ? 'Salvar Alterações' : 'Salvar Cadastro do Cliente'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Ficha operacional: modal central, sem navegação lateral */}
      {selectedClient && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#071B3A]/55 p-3 font-sans backdrop-blur-[4px] sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedClient(null); }}>
          <section role="dialog" aria-modal="true" aria-label={`Ficha de ${selectedClient.name}`} className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_35px_100px_-28px_rgba(7,27,58,.72)]">
            <div className="h-1 shrink-0 bg-gradient-to-r from-[#b98f17] via-[#e1c45b] to-[#b98f17]" />
            <header className="shrink-0 border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#071B3A] font-heading text-sm font-black text-[#e3c45e] shadow-[0_12px_26px_-16px_rgba(7,27,58,.9)] sm:h-14 sm:w-14">{selectedClient.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2"><span className="text-[8px] font-black uppercase tracking-[.2em] text-[#a57e11]">Ficha operacional</span>{selectedClient.legalArea && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-bold text-slate-500">{selectedClient.legalArea}</span>}</div>
                    <h2 className="truncate font-heading text-lg font-black text-[#071B3A] sm:text-xl">{selectedClient.name}</h2>
                    <p className="mt-1 text-[10px] font-semibold text-slate-400 sm:text-[11px]">{maskCpfCnpj(selectedClient.cpfCnpj)}{selectedClient.city ? ` · ${selectedClient.city}${selectedClient.state ? `/${selectedClient.state}` : ''}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedClient(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#071B3A]" aria-label="Fechar ficha"><X className="h-4 w-4" /></button>
              </div>
            </header>

            <div className="grid shrink-0 grid-cols-3 border-b border-slate-200 bg-[#f8fafc] px-4 py-3 sm:grid-cols-6 sm:px-6">
              <a href={`https://wa.me/${String(selectedClient.whatsapp || selectedClient.phone || '').replace(/\D/g, '').startsWith('55') ? String(selectedClient.whatsapp || selectedClient.phone || '').replace(/\D/g, '') : `55${String(selectedClient.whatsapp || selectedClient.phone || '').replace(/\D/g, '')}`}`} target="_blank" rel="noreferrer" className="group flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[9px] font-extrabold text-slate-600 transition hover:bg-white hover:text-[#071B3A] hover:shadow-sm"><Phone className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp</a>
              <a href={`/documentos/novo?clientId=${selectedClient.id}`} className="group flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[9px] font-extrabold text-slate-600 transition hover:bg-white hover:text-[#071B3A] hover:shadow-sm"><FileText className="h-3.5 w-3.5 text-blue-600" /> Documento</a>
              <a href={`/kits/enviar?clientId=${selectedClient.id}`} className="group flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[9px] font-extrabold text-slate-600 transition hover:bg-white hover:text-[#071B3A] hover:shadow-sm"><Sparkles className="h-3.5 w-3.5 text-[#b88c14]" /> Kit jurídico</a>
              <a href={`/processos?clienteId=${selectedClient.id}`} className="group flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[9px] font-extrabold text-slate-600 transition hover:bg-white hover:text-[#071B3A] hover:shadow-sm"><FolderOpen className="h-3.5 w-3.5 text-violet-600" /> Demanda</a>
              <button onClick={() => { const client = selectedClient; setSelectedClient(null); openEditClient(client); }} className="group flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[9px] font-extrabold text-slate-600 transition hover:bg-white hover:text-[#071B3A] hover:shadow-sm"><Pencil className="h-3.5 w-3.5 text-slate-500" /> Editar</button>
              <a href={`/processos?clienteId=${selectedClient.id}`} className="group flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-[9px] font-extrabold text-slate-600 transition hover:bg-white hover:text-[#071B3A] hover:shadow-sm"><History className="h-3.5 w-3.5 text-slate-500" /> Histórico</a>
            </div>

            <nav className="flex shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-4 text-[10px] font-black text-slate-400 sm:px-6">
              {[['resumo', 'Visão geral'], ['pessoais', 'Dados pessoais'], ['documentos', 'Processos e documentos']].map(([key, label]) => <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} className={`whitespace-nowrap border-b-2 px-3 py-3.5 transition ${activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent hover:text-slate-700'}`}>{label}</button>)}
            </nav>

            <div className="flex-1 overflow-y-auto bg-[#f7f9fc] px-5 py-5 text-xs sm:px-7">
              {activeTab === 'resumo' && (
                <div className="space-y-5">
                  <section><div className="mb-2.5 flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Pendências e próxima ação</p><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-500 shadow-sm">{selectedClient.pendencies?.length || 0} abertas</span></div>
                    <div className="space-y-2">{selectedClient.pendencies?.slice(0, 4).map((pendency) => <div key={pendency.id} className={`rounded-2xl border bg-white p-3.5 shadow-sm ${pendency.priority === 'URGENTE' ? 'border-rose-200' : 'border-slate-200'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${pendency.priority === 'URGENTE' ? 'bg-rose-500' : pendency.status === 'AGUARDANDO_CLIENTE' ? 'bg-violet-500' : 'bg-amber-500'}`} /><div className="min-w-0 flex-1"><strong className="block text-[11px] font-black text-[#071B3A]">{pendency.title || pendency.description}</strong><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{pendency.description}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[8px] font-bold uppercase tracking-wide text-slate-400">{pendency.dueDate && <span className={new Date(pendency.dueDate) < new Date() ? 'text-rose-600' : 'text-amber-700'}>Prazo {new Date(pendency.dueDate).toLocaleDateString('pt-BR')}</span>}{pendency.responsible && <span>Responsável: {pendency.responsible.name}</span>}</div></div></div></div>)}{!selectedClient.pendencies?.length && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-[11px] font-bold text-emerald-700"><Check className="mr-2 inline h-4 w-4" />Nenhuma pendência aberta para este cliente.</div>}</div>
                  </section>

                  <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Contato principal</p><div className="mt-3 flex items-center gap-2 font-black text-[#071B3A]"><Phone className="h-4 w-4 text-blue-600" />{maskPhone(selectedClient.phone)}</div><div className="mt-2 flex min-w-0 items-center gap-2 text-[10px] font-semibold text-slate-500"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{selectedClient.email || 'E-mail não informado'}</span></div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Gestão jurídica</p><div className="mt-3 flex items-center gap-2 font-black text-[#071B3A]"><Scale className="h-4 w-4 text-blue-600" />{selectedClient.legalArea || 'Área geral'}</div><p className="mt-2 text-[10px] font-semibold text-slate-500">Responsável: {selectedClient.lawyerInCharge?.name || 'Não definido'}</p></div></section>

                  <section><p className="mb-2.5 text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Movimentações recentes</p><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="space-y-4">{selectedClient.documents?.slice(0, 4).map((document, index) => <div key={document.id} className="relative flex gap-3"><span className={`relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full ${document.status === 'CONCLUIDO' ? 'bg-emerald-500' : 'bg-blue-500'}`} />{index < Math.min((selectedClient.documents?.length || 0), 4) - 1 && <span className="absolute left-[3px] top-4 h-7 w-px bg-slate-200" />}<div className="min-w-0 flex-1"><strong className="block truncate text-[10px] font-extrabold text-slate-700">{document.title}</strong><span className="mt-1 block text-[9px] text-slate-400">{new Date(document.completedAt || document.createdAt).toLocaleDateString('pt-BR')} · {document.status === 'CONCLUIDO' ? 'Documento assinado' : document.status.replaceAll('_', ' ')}</span></div></div>)}{!selectedClient.documents?.length && <p className="text-[10px] text-slate-400">Nenhuma movimentação documental registrada.</p>}</div></div></section>
                </div>
              )}

              {activeTab === 'pessoais' && (
                <div className="space-y-4"><section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2"><DataItem label="CPF/CNPJ" value={maskCpfCnpj(selectedClient.cpfCnpj)} /><DataItem label="RG / Órgão expedidor" value={[selectedClient.rg, selectedClient.issuingOrgan].filter(Boolean).join(' · ') || 'Não informado'} /><DataItem label="Nascimento" value={selectedClient.birthDate ? new Date(`${selectedClient.birthDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Não informado'} /><DataItem label="Estado civil" value={selectedClient.maritalStatus || 'Não informado'} /><DataItem label="Nacionalidade" value={selectedClient.nationality || 'Não informado'} /><DataItem label="Profissão" value={selectedClient.profession || 'Não informado'} /><DataItem label="Endereço" value={[selectedClient.address, selectedClient.number, selectedClient.neighborhood, selectedClient.city && `${selectedClient.city}/${selectedClient.state || ''}`, selectedClient.cep && `CEP ${selectedClient.cep}`].filter(Boolean).join(', ') || 'Não informado'} wide /></section>{selectedClient.legalRepresentative && <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-[9px] font-black uppercase tracking-wider text-blue-700">Representante legal</p><p className="mt-2 text-[11px] font-black text-[#071B3A]">{selectedClient.legalRepresentative}</p><p className="mt-1 text-[10px] text-slate-500">{selectedClient.representativeRole || 'Representante'} · CPF {maskCpfCnpj(selectedClient.representativeCpf || '')}</p></section>}</div>
              )}

              {activeTab === 'documentos' && (
                <div className="space-y-6"><section><div className="mb-2.5 flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Processos e demandas</p><a href={`/processos?clienteId=${selectedClient.id}`} className="text-[9px] font-black text-blue-700">Abrir gestão</a></div><div className="space-y-2">{selectedClient.processes?.map((process) => <a key={process.id} href={`/processos?clienteId=${selectedClient.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${process.status === 'CONCLUIDO' ? 'bg-emerald-500' : process.priority === 'ALTA' ? 'bg-rose-500' : 'bg-blue-500'}`} /><span className="min-w-0 flex-1"><strong className="block truncate text-[11px] font-black text-[#071B3A]">{process.title}</strong><span className="mt-1 block text-[9px] text-slate-400">{process.legalArea || 'Geral'} · {process._count?.documents || 0} documentos · {process._count?.attachments || 0} arquivos</span></span><span className="text-[9px] font-bold text-slate-400">{process.dueDate ? new Date(process.dueDate).toLocaleDateString('pt-BR') : process.status.replaceAll('_', ' ')}</span></a>)}{!selectedClient.processes?.length && <EmptyDrawer text="Nenhum processo criado para este cliente." />}</div></section><section><div className="mb-2.5 flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">Documentos e assinaturas</p><a href="/documentos" className="text-[9px] font-black text-blue-700">Abrir central</a></div><div className="space-y-2">{selectedClient.documents?.map((document) => <a key={document.id} href="/documentos" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-200"><FileText className={`h-4 w-4 shrink-0 ${document.status === 'CONCLUIDO' ? 'text-emerald-600' : 'text-amber-500'}`} /><span className="min-w-0 flex-1"><strong className="block truncate text-[10px] font-black text-[#071B3A]">{document.title}</strong><span className="mt-1 block truncate text-[9px] text-slate-400">{document.process?.title || 'Sem processo vinculado'}</span></span><span className={`rounded-full px-2 py-1 text-[8px] font-black ${document.status === 'CONCLUIDO' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{document.status === 'CONCLUIDO' ? 'ASSINADO' : document.status.replaceAll('_', ' ')}</span></a>)}{!selectedClient.documents?.length && <EmptyDrawer text="Nenhum documento vinculado a este cliente." />}</div></section></div>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-5 py-3 sm:px-7"><button onClick={() => { setClientToDelete(selectedClient); setDeleteConfirmation(''); setFormError(''); }} className="text-[9px] font-bold text-slate-400 transition hover:text-rose-600">Excluir cliente</button><button onClick={() => setSelectedClient(null)} className="rounded-xl bg-[#071B3A] px-5 py-2.5 text-[10px] font-black text-white">Fechar</button></footer>
          </section>
        </div>,
        document.body
      )}

      {/* Confirmação segura de exclusão */}
      {clientToDelete && mounted && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] bg-[#071B3A]/55 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-rose-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">Excluir cliente?</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              O cadastro de <strong>{clientToDelete.name}</strong> será removido. Documentos já emitidos e suas evidências permanecem preservados no sistema.
            </p>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mt-5 mb-1.5">
              Digite EXCLUIR para confirmar
            </label>
            <input
              autoFocus
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-rose-500"
              placeholder="EXCLUIR"
            />
            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setClientToDelete(null);
                  setDeleteConfirmation('');
                  setFormError('');
                }}
                className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold font-heading"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={deleting || deleteConfirmation.trim().toUpperCase() !== 'EXCLUIR'}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold font-heading transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir definitivamente
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Zoom / Tela Cheia do Documento */}
      {showZoomModal && ocrDocPreview && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col p-4 font-sans animate-fade-in">
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10 max-w-6xl w-full mx-auto">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-400" />
              <span className="font-heading font-extrabold text-base">Inspeção de Documento em Alta Resolução</span>
            </div>
            <button
              onClick={() => setShowZoomModal(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all font-heading flex items-center gap-1.5"
            >
              <X className="w-4 h-4" /> Fechar Zoom
            </button>
          </div>

          <div className="flex-1 max-w-6xl w-full mx-auto my-auto p-2 flex items-center justify-center overflow-auto">
            {isPdfDoc ? (
              <iframe
                src={ocrDocPreview}
                className="w-full h-[85vh] rounded-2xl bg-white shadow-2xl border border-white/20"
                title="Visualização Ampliada do PDF"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ocrDocPreview}
                alt="Documento ampliado"
                className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/20 bg-black/40"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DataItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <p className="mt-1 text-[10px] font-extrabold leading-4 text-slate-700">{value}</p>
    </div>
  );
}

function EmptyDrawer({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[10px] font-semibold text-slate-400">{text}</div>;
}
