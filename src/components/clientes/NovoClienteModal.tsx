'use client';

/**
 * Caixa de cadastro/edição de cliente, extraída de src/app/(dashboard)/clientes/page.tsx
 * para poder ser reaproveitada em outros lugares do sistema (ex.: Fluxo Rápido do
 * Início), sem duplicar ~500 linhas de JSX e lógica de OCR/zoom/drag-and-drop.
 *
 * Continua com o mesmo botão "Preencher por Foto/RG (IA)" da tela de Clientes,
 * incluindo a mesma limitação conhecida de leitura automática — isso é
 * deliberado: o pedido foi trazer a caixa exatamente como está hoje, e tratar
 * a IA de Foto/RG separadamente depois.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlus,
  X,
  Upload,
  Zap,
  Loader2,
  Sparkles,
  AlertCircle,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  CheckCircle,
  Camera,
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';

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
  representativePhone: '',
  representativeRole: '',
  financialResponsible: '',
  notes: '',
  legalArea: 'Previdenciário',
  processNumber: '',
};

export interface ClienteEditavel {
  id: string;
  name?: string;
  cpfCnpj?: string;
  rg?: string;
  issuingOrgan?: string;
  birthDate?: string;
  nationality?: string;
  gender?: string;
  maritalStatus?: string;
  profession?: string;
  phone?: string;
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
  representativePhone?: string;
  representativeRole?: string;
  financialResponsible?: string;
  notes?: string;
  legalArea?: string;
  processNumber?: string;
}

interface NovoClienteModalProps {
  /** Controla se a caixa está visível. */
  open: boolean;
  /** Passe um cliente para editar; null/undefined para cadastrar um novo. */
  editingClient?: ClienteEditavel | null;
  /** Pré-preenche o nome ao abrir para cadastro (ex.: vindo de um deep-link). */
  initialName?: string;
  /** Pré-preenche a área jurídica ao abrir para cadastro. */
  initialArea?: string;
  /** Chamado ao fechar a caixa (botão Cancelar, X, ou depois de salvar). */
  onClose: () => void;
  /** Chamado depois que o cliente é salvo com sucesso na API. */
  onSaved: (client: any) => void;
}

export default function NovoClienteModal({
  open,
  editingClient = null,
  initialName,
  initialArea,
  onClose,
  onSaved,
}: NovoClienteModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [formData, setFormData] = useState(EMPTY_CLIENT_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
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

  // Preenche o formulário ao abrir — cliente existente (edição) ou vazio (novo).
  useEffect(() => {
    if (!open) return;
    if (editingClient) {
      setFormData({
        name: editingClient.name || '',
        cpfCnpj: maskCpfCnpj(editingClient.cpfCnpj || ''),
        rg: editingClient.rg || '',
        issuingOrgan: editingClient.issuingOrgan || '',
        birthDate: editingClient.birthDate || '',
        nationality: editingClient.nationality || 'Brasileira',
        gender: editingClient.gender || '',
        maritalStatus: editingClient.maritalStatus || '',
        profession: editingClient.profession || '',
        phone: maskPhone(editingClient.phone || ''),
        whatsapp: maskPhone(editingClient.whatsapp || ''),
        email: editingClient.email || '',
        cep: editingClient.cep || '',
        address: editingClient.address || '',
        number: editingClient.number || '',
        complement: editingClient.complement || '',
        neighborhood: editingClient.neighborhood || '',
        city: editingClient.city || '',
        state: editingClient.state || '',
        legalRepresentative: editingClient.legalRepresentative || '',
        representativeCpf: maskCpfCnpj(editingClient.representativeCpf || ''),
        representativeRg: editingClient.representativeRg || '',
        representativePhone: maskPhone(editingClient.representativePhone || ''),
        representativeRole: editingClient.representativeRole || '',
        financialResponsible: editingClient.financialResponsible || '',
        notes: editingClient.notes || '',
        legalArea: editingClient.legalArea || '',
        processNumber: editingClient.processNumber || '',
      });
      setShowRepresentative(Boolean(editingClient.legalRepresentative));
    } else {
      setFormData({ ...EMPTY_CLIENT_FORM, name: initialName || '', legalArea: initialArea || 'Previdenciário' });
      setShowRepresentative(false);
    }
    setFormError('');
    setOcrDocPreview(null);
    setOcrSuccess(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingClient]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === 'cpfCnpj') value = maskCpfCnpj(value);
    if (name === 'phone' || name === 'whatsapp' || name === 'representativePhone') value = maskPhone(value);
    if (name === 'representativeCpf') value = maskCpfCnpj(value);
    setFormData({ ...formData, [name]: value });
  };

  const closeClientForm = () => {
    setFormError('');
    setOcrDocPreview(null);
    setOcrSuccess(false);
    currentFileRef.current = null;
    setFormData(EMPTY_CLIENT_FORM);
    setShowRepresentative(false);
    onClose();
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

      onSaved(data.client);
      closeClientForm();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Modal: Novo Cliente com OCR & Leitura por IA */}
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
                        if (!event.target.checked) setFormData((current) => ({ ...current, legalRepresentative: '', representativeCpf: '', representativeRg: '', representativePhone: '', representativeRole: '' }));
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
      </div>

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
    </>,
    document.body
  );
}
