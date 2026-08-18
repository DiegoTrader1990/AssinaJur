'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Upload,
  UserPlus,
  Users,
  FileCheck2,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Scale,
  Move,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';

function formatFullCpf(cpf: string): string {
  const clean = String(cpf || '').replace(/\D/g, '');
  if (clean.length !== 11) return cpf || '000.000.000-00';
  return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
}

interface UploadedFile {
  id: string;
  name: string;
  sizeBytes: number;
  hash: string;
}

interface DocumentSettings {
  title: string;
  documentType: string;
  signaturePosition: 'CUSTOM' | 'BOTTOM' | 'TOP' | 'RIGHT_MARGIN' | 'LEFT_MARGIN';
  placementPage: number;
  stampPlacement: { x: number; y: number; width: number; height: number };
}

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  legalRepresentative?: string | null;
  representativeCpf?: string | null;
  representativePhone?: string | null;
  representativeRole?: string | null;
}

interface SignerInput {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  role: string;
  signatureOrder: number;
}

export default function NewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Dados do Passo 1: Upload
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [documentSettings, setDocumentSettings] = useState<Record<string, DocumentSettings>>({});
  const [uploading, setUploading] = useState(false);

  // Dados do Passo 2: Cliente & Signatários
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [signers, setSigners] = useState<SignerInput[]>([
    { name: '', cpf: '', email: '', phone: '', role: 'CLIENTE', signatureOrder: 1 },
  ]);

  // Dados do Passo 3: Título e Detalhes
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('Contrato');
  const [signaturePosition, setSignaturePosition] = useState<'CUSTOM' | 'BOTTOM' | 'TOP' | 'RIGHT_MARGIN' | 'LEFT_MARGIN'>('CUSTOM');
  const [placementPage, setPlacementPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [stampPlacement, setStampPlacement] = useState({ x: 0.33, y: 0.79, width: 0.34, height: 0.095 });
  const [renderingPreview, setRenderingPreview] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const isResizingRef = useRef<boolean>(false);
  const resizeStartRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  // Assinatura a Rogo (Clientes Analfabetos / com Limitação)
  const [isIlliterate, setIsIlliterate] = useState(false);
  const [rogoName, setRogoName] = useState('');
  const [rogoCpf, setRogoCpf] = useState('');
  const [rogoRelationship, setRogoRelationship] = useState('Acompanhante / Familiar');
  const [rogoPhone, setRogoPhone] = useState('');
  const [rogoEmail, setRogoEmail] = useState('');
  const [enforceSignatureOrder, setEnforceSignatureOrder] = useState(false);
  const [witnessSigningMode, setWitnessSigningMode] = useState<'INDIVIDUAL' | 'SAME_DEVICE'>('INDIVIDUAL');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdDocument, setCreatedDocument] = useState<any | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [letterhead, setLetterhead] = useState<{id: string; originalName: string; sizeBytes: number} | null>(null);
  const [uploadingLetterhead, setUploadingLetterhead] = useState(false);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const loadedDashboardFilesRef = useRef(false);

  useEffect(() => {
    const fileIds = (searchParams.get('files') || '').split(',').filter(Boolean);
    if (loadedDashboardFilesRef.current || fileIds.length === 0) return;
    loadedDashboardFilesRef.current = true;
    setUploading(true);
    Promise.all(fileIds.map(async (fileId) => {
      const res = await fetch(`/api/documents/upload?fileId=${encodeURIComponent(fileId)}&info=true`);
      const data = await res.json();
      if (!res.ok || !data.file) throw new Error(data.error || 'Não foi possível preparar um dos PDFs enviados.');
      return data.file as UploadedFile;
    }))
      .then((files) => {
        setUploadedFiles(files);
        setUploadedFile(files[0] || null);
        setSelectedDocumentId(files[0]?.id || '');
        setDocumentSettings(Object.fromEntries(files.map((item) => [item.id, {
          title: item.name.replace(/\.[^/.]+$/, ''), documentType: 'Contrato', signaturePosition: 'CUSTOM' as const,
          placementPage: 1, stampPlacement: { x: 0.33, y: 0.79, width: 0.34, height: 0.095 },
        }])));
        if (files[0]) setTitle(files[0].name.replace(/\.[^/.]+$/, ''));
        if (searchParams.get('source') === 'dashboard') setStep(2);
      })
      .catch((err) => setError(err.message || 'Não foi possível carregar os PDFs enviados.'))
      .finally(() => setUploading(false));
  }, [searchParams]);

  useEffect(() => {
    if (uploadedFile?.id) {
      fetch(`/api/documents/preview-page?fileId=${uploadedFile.id}&info=true`)
        .then((res) => res.json())
        .then((data) => {
          if (data.totalPages) setPdfPageCount(data.totalPages);
        })
        .catch((err) => console.error('Erro ao obter total de páginas:', err));
    }
  }, [uploadedFile]);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      })
      .catch((err) => console.error('Erro ao carregar clientes:', err));

    fetch('/api/office/letterhead')
      .then((res) => res.json())
      .then((data) => {
        if (data.letterhead || data.file) {
          setLetterhead(data.letterhead || data.file);
        }
      })
      .catch((err) => console.error('Erro ao carregar papel timbrado:', err));
  }, []);

  const handleUploadLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const lFile = e.target.files[0];
    if (lFile.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }
    setUploadingLetterhead(true);
    const fData = new FormData();
    fData.append('file', lFile);
    try {
      const res = await fetch('/api/office/letterhead', { method: 'POST', body: fData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar papel timbrado.');
      setLetterhead(data.letterhead || data.file);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar papel timbrado.');
    } finally {
      setUploadingLetterhead(false);
    }
  };

  const handleRemoveLetterhead = async () => {
    if (!confirm('Deseja remover o papel timbrado oficial do escritório?')) return;
    try {
      const res = await fetch('/api/office/letterhead', { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover papel timbrado.');
      setLetterhead(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if ((!file && !uploadedFile?.id) || step !== 3 || signaturePosition !== 'CUSTOM') return;
    let cancelled = false;
    let activeRender: any = null;
    const renderPage = async () => {
      setRenderingPreview(true);
      try {
        const pdfjs = await import('pdfjs-dist');
        const pdfjsVersion = pdfjs.version || '4.10.38';
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

        let bytes: Uint8Array | null = null;
        if (file) {
          bytes = new Uint8Array(await file.arrayBuffer());
        } else if (uploadedFile?.id) {
          const res = await fetch(`/api/documents/upload?fileId=${uploadedFile.id}`);
          if (res.ok) {
            bytes = new Uint8Array(await res.arrayBuffer());
          }
        }

        if (!bytes || cancelled) return;

        const loadingTask = pdfjs.getDocument({
          data: bytes,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/standard_fonts/`,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdfPageCount(pdf.numPages);
        const safePage = Math.min(Math.max(1, placementPage), pdf.numPages);
        if (safePage !== placementPage) setPlacementPage(safePage);
        const pdfPage = await pdf.getPage(safePage);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        let canvas = previewCanvasRef.current;
        if (!canvas) {
          await new Promise((res) => setTimeout(res, 200));
          canvas = previewCanvasRef.current;
        }
        if (!canvas || cancelled) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        activeRender = pdfPage.render({ canvasContext: context, viewport });
        await activeRender.promise;
      } catch (previewError) {
        if (!cancelled) console.error('Erro ao renderizar prévia do PDF:', previewError);
      } finally {
        if (!cancelled) setRenderingPreview(false);
      }
    };
    renderPage();
    return () => {
      cancelled = true;
      activeRender?.cancel?.();
    };
  }, [file, uploadedFile, step, placementPage, signaturePosition]);

  const moveStamp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewContainerRef.current) return;
    const bounds = previewContainerRef.current.getBoundingClientRect();

    if (isResizingRef.current && resizeStartRef.current) {
      const deltaX = event.clientX - resizeStartRef.current.startX;
      const newWidthPx = Math.max(110, Math.min(bounds.width * 0.7, resizeStartRef.current.startWidth + deltaX));
      const newWidthRatio = newWidthPx / bounds.width;
      const newHeightRatio = Math.max(0.075, newWidthRatio * 0.28);
      setStampPlacement((current) => ({
        ...current,
        width: newWidthRatio,
        height: newHeightRatio,
        x: Math.min(current.x, 1 - newWidthRatio),
      }));
      return;
    }

    if (!dragOffsetRef.current) return;
    const nextX = (event.clientX - bounds.left - dragOffsetRef.current.x) / bounds.width;
    const nextY = (event.clientY - bounds.top - dragOffsetRef.current.y) / bounds.height;
    setStampPlacement((current) => ({
      ...current,
      x: Math.min(1 - current.width, Math.max(0, nextX)),
      y: Math.min(1 - current.height, Math.max(0, nextY)),
    }));
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      setSigners((current) => [{ name: '', cpf: '', email: '', phone: '', role: 'CLIENTE', signatureOrder: 1 }, ...current.slice(1)]);
      setIsIlliterate(false);
      setRogoName(''); setRogoCpf(''); setRogoPhone(''); setRogoEmail('');
      setRogoRelationship('Acompanhante / Familiar');
      return;
    }
    if (client) {
      if (!title) setTitle(`Contrato - ${client.name}`);
      const updatedSigners = [...signers];
      updatedSigners[0] = {
        name: client.name,
        cpf: client.cpfCnpj,
        email: client.email || '',
        phone: client.phone || '',
        role: 'CLIENTE',
        signatureOrder: 1,
      };
      setSigners(updatedSigners);

      // Um representante já cadastrado é a indicação natural para assinatura a rogo.
      // O usuário continua podendo desmarcar o fluxo ou editar os dados antes do envio.
      if (client.legalRepresentative) {
        setIsIlliterate(true);
        setEnforceSignatureOrder(true);
        setRogoName(client.legalRepresentative);
        setRogoCpf(maskCpfCnpj(client.representativeCpf || ''));
        setRogoPhone(maskPhone(client.representativePhone || ''));
        setRogoRelationship(client.representativeRole || 'Representante cadastrado');
      } else {
        setIsIlliterate(false);
        setRogoName(''); setRogoCpf(''); setRogoPhone(''); setRogoEmail('');
        setRogoRelationship('Acompanhante / Familiar');
      }
    }
  };

  useEffect(() => {
    const clientIdFromDashboard = searchParams.get('clientId') || '';
    if (!clientIdFromDashboard || clients.length === 0 || selectedClientId) return;
    if (clients.some((client) => client.id === clientIdFromDashboard)) {
      handleSelectClient(clientIdFromDashboard);
    }
  }, [clients, searchParams, selectedClientId]);

  const currentSettings = (): DocumentSettings => ({ title, documentType, signaturePosition, placementPage, stampPlacement });

  const saveCurrentSettings = () => {
    if (!uploadedFile?.id) return;
    setDocumentSettings((current) => ({ ...current, [uploadedFile.id]: currentSettings() }));
  };

  const selectDocumentForPlacement = (fileId: string) => {
    if (fileId === uploadedFile?.id) return;
    const target = uploadedFiles.find((item) => item.id === fileId);
    if (!target) return;
    const existing = documentSettings[fileId];
    if (uploadedFile?.id) {
      setDocumentSettings((current) => ({ ...current, [uploadedFile.id]: currentSettings() }));
    }
    const settings = existing || {
      title: target.name.replace(/\.[^/.]+$/, ''), documentType: 'Contrato', signaturePosition: 'CUSTOM' as const,
      placementPage: 1, stampPlacement: { x: 0.33, y: 0.79, width: 0.34, height: 0.095 },
    };
    setUploadedFile(target); setFile(null); setSelectedDocumentId(fileId);
    setTitle(settings.title); setDocumentType(settings.documentType); setSignaturePosition(settings.signaturePosition);
    setPlacementPage(settings.placementPage); setStampPlacement(settings.stampPlacement);
  };

  const processFiles = async (files: File[]) => {
    setUploading(true);
    setError('');

    try {
      const newUploads: UploadedFile[] = [];
      for (const selectedFile of files) {
        if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
          throw new Error('Todos os arquivos enviados devem ser PDFs.');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erro ao enviar ${selectedFile.name}.`);
        newUploads.push(data.file);
        if (uploadedFiles.length === 0 && newUploads.length === 1) {
          setUploadedFile(data.file);
          setFile(selectedFile);
          setSelectedDocumentId(data.file.id);
          if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
      }
      setUploadedFiles((current) => [...current, ...newUploads]);
      setDocumentSettings((current) => ({ ...current, ...Object.fromEntries(newUploads.map((item) => [item.id, {
        title: item.name.replace(/\.[^/.]+$/, ''), documentType: 'Contrato', signaturePosition: 'CUSTOM' as const,
        placementPage: 1, stampPlacement: { x: 0.33, y: 0.79, width: 0.34, height: 0.095 },
      }])) }));
      if (!selectedDocumentId && newUploads[0]) setSelectedDocumentId(newUploads[0].id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length) await processFiles(selectedFiles);
    e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleAddSigner = () => {
    setSigners([
      ...signers,
      {
        name: '',
        cpf: '',
        email: '',
        phone: '',
        role: signers.length === 1 ? 'ADVOGADO' : 'TESTEMUNHA',
        signatureOrder: signers.length + 1,
      },
    ]);
  };

  const handleRogoToggle = (enabled: boolean) => {
    setIsIlliterate(enabled);
    if (!enabled) return;
    setEnforceSignatureOrder(true);
  };

  const handleRemoveSigner = (index: number) => {
    if (signers.length === 1) return;
    setSigners(signers.filter((_, i) => i !== index));
  };

  const handleSignerChange = (index: number, field: keyof SignerInput, value: any) => {
    let val = value;
    if (field === 'cpf') val = maskCpfCnpj(val);
    if (field === 'phone') val = maskPhone(val);
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: val };
    setSigners(updated);
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedFiles.length === 0) {
      setError('Por favor, faça upload do PDF antes de prosseguir.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const batchId = uploadedFiles.length > 1
        ? (globalThis.crypto?.randomUUID?.() || `pacote-${Date.now()}-${Math.random().toString(36).slice(2)}`)
        : null;
      const responses: any[] = [];
      const savedSettings = uploadedFile?.id ? { ...documentSettings, [uploadedFile.id]: currentSettings() } : documentSettings;
      for (let index = 0; index < uploadedFiles.length; index++) {
        const currentFile = uploadedFiles[index];
        const settings = savedSettings[currentFile.id] || currentSettings();
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          title: settings.title || currentFile.name.replace(/\.[^/.]+$/, ''),
          documentType: settings.documentType,
          originalFileId: currentFile.id,
          originalHash: currentFile.hash,
          kitBatchId: batchId,
          clientId: selectedClientId || null,
          signaturePosition: settings.signaturePosition === 'CUSTOM'
            ? `CUSTOM:${settings.placementPage}:${settings.stampPlacement.x.toFixed(4)}:${settings.stampPlacement.y.toFixed(4)}:${settings.stampPlacement.width.toFixed(4)}:${settings.stampPlacement.height.toFixed(4)}`
            : settings.signaturePosition,
          customMessage,
          signers,
          isIlliterate,
          rogoName: isIlliterate ? rogoName : null,
          rogoCpf: isIlliterate ? rogoCpf : null,
          rogoRelationship: isIlliterate ? rogoRelationship : null,
          rogoPhone: isIlliterate ? rogoPhone : null,
          rogoEmail: isIlliterate ? rogoEmail : null,
          enforceSignatureOrder,
          witnessSigningMode,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar documento.');
        responses.push(data);
      }
      setCreatedDocument({ ...responses[0], documentCount: responses.length, documents: responses.map((item) => item.document) });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  if (createdDocument) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6 font-sans">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A]">{createdDocument.documentCount > 1 ? 'Pacote criado e link pronto!' : 'Documento criado e link pronto!'}</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            Envie os links abaixo diretamente pelo WhatsApp ou E-mail dos signatários.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">
            {createdDocument.isIlliterate || createdDocument.signers.some((s: any) => s.role === 'ASSINANTE_A_ROGO') ? 'Link Único de Assinatura a Rogo (Mesmo Celular)' : 'Links de Assinatura Direta'}
          </h2>
          
          {createdDocument.documentCount > 1 ? (
            <div className="p-5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 rounded-2xl border border-blue-200 space-y-3 shadow-xs">
              <div className="font-extrabold text-[#071B3A] text-sm font-heading">Assinatura de {createdDocument.documentCount} documentos em um só link</div>
              <p className="text-xs text-slate-600 font-medium">O cliente revisará os documentos e concluirá a assinatura uma única vez.</p>
              <button onClick={() => handleCopyLink(createdDocument.signers.find((s: any) => s.role === 'CLIENTE')?.token || createdDocument.signers[0]?.token)} className="px-5 py-3 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 font-heading">
                {copiedToken === (createdDocument.signers.find((s: any) => s.role === 'CLIENTE')?.token || createdDocument.signers[0]?.token) ? <><Check className="w-4 h-4 stroke-[3]" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar link único</>}
              </button>
              {createdDocument.signers.filter((s: any) => String(s.role).startsWith('TESTEMUNHA') && s.signingMode === 'INDIVIDUAL').map((s: any, index: number) => (
                <div key={s.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold text-amber-950">Testemunha {index + 1}: {s.name}</p><p className="text-[11px] text-amber-800">Assinatura no próprio aparelho.</p></div><button onClick={() => handleCopyLink(s.token)} className="px-3 py-2 bg-amber-700 text-white font-extrabold rounded-lg text-[11px]">{copiedToken === s.token ? 'Copiado!' : 'Copiar link'}</button></div>
              ))}
            </div>
          ) : createdDocument.isIlliterate || createdDocument.signers.some((s: any) => s.role === 'ASSINANTE_A_ROGO') ? (
            <div className="p-5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 rounded-2xl border border-blue-200 space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-extrabold text-[#071B3A] text-sm font-heading flex items-center gap-2">
                    <span>{createdDocument.signers.find((s: any) => s.role === 'CLIENTE')?.name || createdDocument.signers[0]?.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold">Fluxo A Rogo Unificado</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium leading-relaxed">📱 <strong>Mesmo celular:</strong> cliente e assinante a rogo participam em sequência neste link. As testemunhas seguem conforme a modalidade escolhida.</div>
                </div>

                <button
                  onClick={() => handleCopyLink(createdDocument.signers.find((s: any) => s.role === 'CLIENTE')?.token || createdDocument.signers[0]?.token)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 font-heading"
                >
                  {copiedToken === (createdDocument.signers.find((s: any) => s.role === 'CLIENTE')?.token || createdDocument.signers[0]?.token) ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar Link Único de Assinatura
                    </>
                  )}
                </button>
              </div>
              {createdDocument.signers.filter((s: any) => String(s.role).startsWith('TESTEMUNHA') && s.signingMode === 'INDIVIDUAL').map((s: any, index: number) => (
                <div key={s.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center justify-between gap-3">
                  <div><p className="text-xs font-extrabold text-amber-950">Testemunha {index + 1}: {s.name}</p><p className="text-[11px] text-amber-800">Link individual — a pessoa assina no próprio aparelho.</p></div>
                  <button onClick={() => handleCopyLink(s.token)} className="px-3 py-2 bg-amber-700 text-white font-extrabold rounded-lg text-[11px]">{copiedToken === s.token ? 'Copiado!' : 'Copiar link'}</button>
                </div>
              ))}
            </div>
          ) : (
            createdDocument.signers.map((s: any) => (
              <div key={s.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 text-sm font-heading">{s.name}</div>
                  <div className="text-xs text-slate-500 font-medium">{s.role} • CPF: {s.cpf}</div>
                </div>

                <button
                  onClick={() => handleCopyLink(s.token)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-2 shrink-0 font-heading"
                >
                  {copiedToken === s.token ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar Link
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-6 flex justify-between items-center border-t border-slate-100">
          <button
            onClick={() => router.push('/documentos')}
            className="px-6 py-3 bg-[#071B3A] text-white font-extrabold rounded-xl text-xs hover:bg-[#0B1D3D] transition-colors font-heading shadow-md"
          >
            Ir para Gestão de Documentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">Novo envio para assinatura</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Reúna um ou mais PDFs em um único fluxo de assinatura eletrônica com validade jurídica.</p>
        </div>
        <button
          onClick={() => router.push('/documentos')}
          className="text-xs text-slate-500 hover:text-slate-800 font-bold font-heading"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Indicador de Passos */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs font-bold font-heading">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#071B3A]' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
          <span>Upload PDF</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#071B3A]' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
          <span>Signatários</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#071B3A]' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
          <span>Detalhes & Disparo</span>
        </div>
      </div>

      {/* Passo 1: Upload do PDF */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="font-heading text-base font-extrabold text-[#071B3A]">Passo 1: Selecione os documentos PDF</h2>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all bg-slate-50/50 ${
              dragActive ? 'border-blue-600 bg-blue-50/40 scale-[1.01]' : 'border-slate-300 hover:border-blue-600'
            }`}
          >
            <Upload className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800 font-heading">
              {dragActive ? 'Solte os PDFs para enviar!' : 'Arraste um ou mais PDFs aqui, ou clique para selecionar'}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">Formatos suportados: PDF (máximo 25MB)</p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#071B3A] text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-[#0B1D3D] transition-all shadow-md font-heading">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Processando Hash...
                </>
              ) : (
                'Selecionar PDFs'
              )}
              <input type="file" accept=".pdf,application/pdf" multiple onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs text-emerald-800">
              <div className="flex items-center justify-between">
                <div className="font-extrabold">{uploadedFiles.length} {uploadedFiles.length === 1 ? 'documento pronto' : 'documentos prontos para o pacote'}</div>
                <span className="font-bold bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full text-[11px]">Pronto</span>
              </div>
              <div className="space-y-2">
                {uploadedFiles.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 bg-white/70 border border-emerald-100 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0"><FileText className="w-4 h-4 text-emerald-600 shrink-0" /><span className="font-bold truncate">{item.name}</span></div>
                    <button type="button" onClick={() => setUploadedFiles((items) => items.filter((current) => current.id !== item.id))} className="text-red-600 hover:text-red-700 font-bold shrink-0">Remover</button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-emerald-700">Um único link será criado para a assinatura de todos estes documentos.</p>
            </div>
          )}

          {/* Seção Papel Timbrado Oficial do Escritório */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Papel Timbrado Oficial do Escritório</span>
              </div>
              {letterhead && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                  <CheckCircle className="w-3 h-3" /> Ativo
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500">
              O papel timbrado do escritório é inserido automaticamente como plano de fundo no PDF de todos os documentos gerados.
            </p>

            {letterhead ? (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl text-blue-700">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{letterhead.originalName}</p>
                    <p className="text-[10px] text-slate-400">{(letterhead.sizeBytes / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 cursor-pointer text-xs transition-colors">
                    Substituir
                    <input type="file" accept="application/pdf" onChange={handleUploadLetterhead} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveLetterhead}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-100 text-xs transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-between p-3.5 border border-dashed border-slate-300 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-600">Clique para enviar um PDF de Papel Timbrado</span>
                </div>
                <span className="px-3 py-1.5 bg-white border border-slate-300 font-bold text-slate-700 rounded-xl text-xs">
                  {uploadingLetterhead ? 'Enviando...' : 'Selecionar PDF'}
                </span>
                <input type="file" accept="application/pdf" onChange={handleUploadLetterhead} className="hidden" />
              </label>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={uploadedFiles.length === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2 disabled:opacity-50 font-heading"
            >
              Avançar para Signatários
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Passo 2: Seleção de Cliente e Signatários */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <h2 className="font-heading text-base font-extrabold text-[#071B3A]">Passo 2: Signatários e Papéis Jurídicos</h2>

          {/* Selecionar Cliente Cadastrado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">
              Vincular a um Cliente Cadastrado (Opcional)
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none bg-slate-50/80"
            >
              <option value="">Nenhum (Preenchimento Avulso)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — CPF/CNPJ: {c.cpfCnpj}
                </option>
              ))}
            </select>
          </div>

          <hr className="border-slate-100" />

          {/* Lista de Signatários */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">Lista de Signatários</span>
              <button
                type="button"
                onClick={handleAddSigner}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 font-heading"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Adicionar Outro Signatário
              </button>
            </div>

            {signers.map((s, index) => (
              <div key={index} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 font-heading">Signatário #{index + 1}</span>
                  {signers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSigner(index)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={s.name}
                      onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                      placeholder="João da Silva"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CPF *</label>
                    <input
                      type="text"
                      required
                      value={s.cpf}
                      onChange={(e) => handleSignerChange(index, 'cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Papel Jurídico *</label>
                    <select
                      value={s.role}
                      onChange={(e) => handleSignerChange(index, 'role', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold font-heading"
                    >
                      <option value="CLIENTE">Cliente</option>
                      <option value="ADVOGADO">Advogado</option>
                      <option value="CONTRATANTE">Contratante</option>
                      <option value="CONTRATADO">Contratado</option>
                      <option value="TESTEMUNHA">Testemunha</option>
                      <option value="REPRESENTANTE_LEGAL">Representante Legal</option>
                      <option value="RESPONSAVEL_FINANCEIRO">Responsável Financeiro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={s.email}
                      onChange={(e) => handleSignerChange(index, 'email', e.target.value)}
                      placeholder="email@cliente.com"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={s.phone}
                      onChange={(e) => handleSignerChange(index, 'phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Configuração de Cliente Analfabeto / Assinatura a Rogo */}
          <div className="p-5 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 rounded-2xl border border-blue-200 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isIlliterate}
                onChange={(e) => handleRogoToggle(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="font-heading font-extrabold text-xs text-[#071B3A]">
                Usar assinatura a rogo para esta cliente
              </span>
            </label>

            {isIlliterate && (
              <div className="pt-3 border-t border-blue-100 space-y-3 animate-in fade-in duration-300">
                <p className="text-[11px] text-slate-600 font-medium">
                  {rogoName ? `O representante cadastrado, ${rogoName}, foi incluído como assinante a rogo. Confira os dados abaixo antes de gerar.` : 'Informe quem assinará a rogo pela cliente.'} Você pode adicionar testemunhas instrumentárias, se necessário.
                </p>

                {/* Seletor Rápido de Testemunhas */}
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/60 space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">
                    Deseja Adicionar Testemunhas Instrumentárias a este Documento?
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSigners(current => current.filter(s => s.role !== 'TESTEMUNHA'));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        signers.filter(s => s.role === 'TESTEMUNHA').length === 0
                          ? 'bg-[#071B3A] text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Sem Testemunhas (Somente A Rogo)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSigners(current => {
                          const withoutWitnesses = current.filter(s => s.role !== 'TESTEMUNHA');
                          return [
                            ...withoutWitnesses,
                            { name: '', cpf: '', email: '', phone: '', role: 'TESTEMUNHA', signatureOrder: withoutWitnesses.length + 1 }
                          ];
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        signers.filter(s => s.role === 'TESTEMUNHA').length === 1
                          ? 'bg-[#071B3A] text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      + 1 Testemunha
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSigners(current => {
                          const withoutWitnesses = current.filter(s => s.role !== 'TESTEMUNHA');
                          return [
                            ...withoutWitnesses,
                            { name: '', cpf: '', email: '', phone: '', role: 'TESTEMUNHA', signatureOrder: withoutWitnesses.length + 1 },
                            { name: '', cpf: '', email: '', phone: '', role: 'TESTEMUNHA', signatureOrder: withoutWitnesses.length + 2 }
                          ];
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        signers.filter(s => s.role === 'TESTEMUNHA').length >= 2
                          ? 'bg-[#071B3A] text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      + 2 Testemunhas (Recomendado)
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Acompanhante a Rogo *</label>
                    <input
                      type="text"
                      required={isIlliterate}
                      value={rogoName}
                      onChange={(e) => setRogoName(e.target.value)}
                      placeholder="Ex: Maria da Silva"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">CPF do Acompanhante *</label>
                    <input
                      type="text"
                      required={isIlliterate}
                      value={rogoCpf}
                      onChange={(e) => setRogoCpf(maskCpfCnpj(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Relação com o Cliente</label>
                    <input
                      type="text"
                      value={rogoRelationship}
                      onChange={(e) => setRogoRelationship(e.target.value)}
                      placeholder="Ex: Filha, Cônjuge, Irmão"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp do Assinante a Rogo *</label>
                    <input type="text" required={isIlliterate} value={rogoPhone} onChange={(e) => setRogoPhone(maskPhone(e.target.value))}
                      placeholder="(73) 99999-9999" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">E-mail do Assinante a Rogo</label>
                    <input type="email" value={rogoEmail} onChange={(e) => setRogoEmail(e.target.value)}
                      placeholder="email@exemplo.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                  </div>
                </div>
                {signers.some((s) => s.role === 'TESTEMUNHA') && (
                  <div className="rounded-xl border border-blue-200 bg-white p-3 space-y-2">
                    <p className="text-[11px] font-extrabold text-[#071B3A]">Como as testemunhas vão assinar?</p>
                    <label className="flex gap-2 text-xs text-slate-700"><input type="radio" checked={witnessSigningMode === 'INDIVIDUAL'} onChange={() => setWitnessSigningMode('INDIVIDUAL')} /> Cada testemunha no próprio aparelho (recomendado)</label>
                    <label className="flex gap-2 text-xs text-slate-700"><input type="radio" checked={witnessSigningMode === 'SAME_DEVICE'} onChange={() => setWitnessSigningMode('SAME_DEVICE')} /> Em sequência no mesmo celular da cliente</label>
                    <p className="text-[10px] text-slate-500">Mesmo celular mantém links individuais e seguros, mas o sistema abre automaticamente a etapa da próxima testemunha naquele aparelho.</p>
                  </div>
                )}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium text-amber-900">
                  Preencha os dados das testemunhas antes de avançar. A ordem protegida será: cliente → assinante a rogo → testemunha 1 → testemunha 2.
                </div>
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 cursor-pointer">
            <input type="checkbox" checked={enforceSignatureOrder} disabled={isIlliterate}
              onChange={(e) => setEnforceSignatureOrder(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded" />
            <span>
              <span className="block text-xs font-extrabold text-[#071B3A] font-heading">Exigir ordem sequencial de assinatura</span>
              <span className="block mt-1 text-[11px] text-slate-600 font-medium">O próximo link só será liberado quando o participante anterior concluir. No fluxo a rogo esta proteção é obrigatória.</span>
            </span>
          </label>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-slate-600 font-bold text-xs flex items-center gap-1 font-heading"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2 font-heading"
            >
              Avançar para Detalhes
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Passo 3: Detalhes & Disparo */}
      {step === 3 && (
        <form onSubmit={handleSubmitDocument} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <h2 className="font-heading text-base font-extrabold text-[#071B3A]">Passo 3: Revisão, selo e envio</h2>
            <p className="text-xs text-slate-500 mt-1">Defina o título e o local do selo individualmente para cada PDF. O selo principal será inserido apenas na página escolhida.</p>
          </div>

          {uploadedFiles.length > 1 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3"><span className="text-xs font-extrabold uppercase tracking-wider text-[#071B3A]">Documento em edição</span><span className="text-[11px] font-bold text-blue-700">{uploadedFiles.length} PDFs no mesmo link</span></div>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((item, index) => (
                  <button key={item.id} type="button" onClick={() => selectDocumentForPlacement(item.id)} className={`max-w-full rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${selectedDocumentId === item.id ? 'bg-[#071B3A] border-[#071B3A] text-white shadow-sm' : 'bg-white border-blue-200 text-slate-700 hover:border-blue-500'}`}>
                    {index + 1}. {item.name.replace(/\.[^/.]+$/, '')}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-600">Clique em cada documento para posicionar o selo na página correspondente.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Título do documento selecionado *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contrato de Honorários Advocatícios - João da Silva"
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Tipo de Documento</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:border-blue-600 focus:outline-none font-heading"
              >
                <option value="Contrato">Contrato</option>
                <option value="Procuração">Procuração</option>
                <option value="Declaração">Declaração</option>
                <option value="Termo">Termo</option>
                <option value="Acordo">Acordo</option>
                <option value="Petição">Petição</option>
                <option value="Documento de identificação">Documento de identificação</option>
                <option value="Documento previdenciário">Documento previdenciário</option>
                <option value="Documento trabalhista">Documento trabalhista</option>
                <option value="Documento societário">Documento societário</option>
                <option value="Outros">Outros</option>
                <option value="Não informado">Não informado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Posição do Carimbo / Grampo nas Páginas</label>
              <select
                value={signaturePosition}
                onChange={(e) => setSignaturePosition(e.target.value as typeof signaturePosition)}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:border-blue-600 focus:outline-none font-heading"
              >
                <option value="CUSTOM">✥ Escolher na página (Arrastar selo)</option>
                <option value="BOTTOM">⬇️ Rodapé (Faixa Inferior - Padrão)</option>
                <option value="TOP">⬆️ Cabeçalho (Faixa Superior)</option>
                <option value="RIGHT_MARGIN">➡️ Margem Lateral Direita (Grampo Vertical)</option>
                <option value="LEFT_MARGIN">⬅️ Margem Lateral Esquerda (Grampo Vertical)</option>
              </select>
            </div>
          </div>

          {signaturePosition === 'CUSTOM' && (
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-amber-50/50 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-sm font-extrabold text-[#071B3A] flex items-center gap-2">
                    <Move className="w-4 h-4 text-blue-600" /> Posicione o selo na linha de assinatura
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1">Arraste o selo sobre a página. Ele será aplicado exatamente neste local após a assinatura.</p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setPlacementPage((current) => Math.max(1, current - 1))}
                    disabled={placementPage <= 1}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-extrabold text-[#071B3A] min-w-[82px] text-center">Página {placementPage} de {pdfPageCount}</span>
                  <button
                    type="button"
                    onClick={() => setPlacementPage((current) => Math.min(pdfPageCount, current + 1))}
                    disabled={placementPage >= pdfPageCount}
                    className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Próxima página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 whitespace-nowrap">Tamanho do selo</span>
                <input
                  type="range"
                  min="22"
                  max="52"
                  value={Math.round(stampPlacement.width * 100)}
                  onChange={(event) => {
                    const width = Number(event.target.value) / 100;
                    setStampPlacement((current) => ({ ...current, width, height: Math.max(0.075, width * 0.28), x: Math.min(current.x, 1 - width) }));
                  }}
                  className="w-full accent-blue-600"
                />
                <span className="text-[11px] font-bold text-slate-700 w-9 text-right">{Math.round(stampPlacement.width * 100)}%</span>
              </div>

              <div className="overflow-auto rounded-xl border border-slate-300 bg-slate-200/70 p-3 max-h-[680px]">
                <div
                  ref={previewContainerRef}
                  className="relative mx-auto w-full max-w-[640px] shadow-2xl bg-white touch-none select-none rounded-xl overflow-hidden"
                  onPointerMove={moveStamp}
                  onPointerUp={() => {
                    dragOffsetRef.current = null;
                    isResizingRef.current = false;
                    resizeStartRef.current = null;
                  }}
                  onPointerCancel={() => {
                    dragOffsetRef.current = null;
                    isResizingRef.current = false;
                    resizeStartRef.current = null;
                  }}
                >
                  <canvas ref={previewCanvasRef} className="block w-full h-auto rounded-xl pointer-events-none min-h-[500px]" />
                  <div
                    role="button"
                    tabIndex={0}
                    className="absolute cursor-move overflow-hidden group"
                    style={{
                      left: `${stampPlacement.x * 100}%`,
                      top: `${stampPlacement.y * 100}%`,
                      width: `${stampPlacement.width * 100}%`,
                      height: `${stampPlacement.height * 100}%`,
                    }}
                    onPointerDown={(event) => {
                      const bounds = previewContainerRef.current?.getBoundingClientRect();
                      if (!bounds) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragOffsetRef.current = {
                        x: event.clientX - bounds.left - stampPlacement.x * bounds.width,
                        y: event.clientY - bounds.top - stampPlacement.y * bounds.height,
                      };
                    }}
                  >
                    {/* Selo final: sem moldura nem fundo (fica transparente sobre o
                        papel timbrado), QR centralizado à esquerda e texto empilhado
                        à direita, com o traço dourado colado logo abaixo do código -
                        mesmo desenho aplicado no documento assinado de verdade. */}
                    <div className="flex h-full items-center text-[#071B3A] leading-tight select-none">
                      <div className="h-full flex items-center shrink-0 pr-1.5">
                        <div className="aspect-square h-[70%] bg-white border border-slate-300 rounded-[2px] flex items-center justify-center">
                          <span className="text-[7px] sm:text-[9px] font-black tracking-widest text-[#0B1D3D]">QR</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                        <div className="text-[7px] sm:text-[9.5px] font-black text-[#0B1D3D] truncate font-heading tracking-wide uppercase">
                          {signers[0]?.name || 'DOMINICK QUINTO SOARES'}
                        </div>
                        <div className="text-[6px] sm:text-[8px] font-bold text-slate-700 font-mono tracking-tight">
                          CPF: {signers[0]?.cpf ? formatFullCpf(signers[0].cpf) : '000.000.000-00'}
                        </div>
                        <div className="text-[5px] sm:text-[6.8px] font-extrabold text-emerald-700 uppercase">
                          Assinatura Eletrônica Qualificada
                        </div>
                        <div className="text-[6.5px] sm:text-[9px] font-mono font-black text-[#0B1D3D]">
                          CÓD: AJ-A1B2-C3D4
                        </div>
                        <div className="h-[2px] w-[46%] bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 rounded-full" />
                      </div>
                    </div>

                    {/* ALÇA INTERATIVA DE REDIMENSIONAMENTO NO PRÓPRIO SELO */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const bounds = previewContainerRef.current?.getBoundingClientRect();
                        if (!bounds) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        isResizingRef.current = true;
                        resizeStartRef.current = { startX: e.clientX, startWidth: stampPlacement.width * bounds.width };
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        isResizingRef.current = false;
                        resizeStartRef.current = null;
                      }}
                      className="absolute bottom-0 right-0 w-4 h-4 bg-[#D4AF37] hover:bg-amber-400 cursor-se-resize flex items-center justify-center rounded-tl-sm shadow-md z-30 transition-transform active:scale-125"
                      title="Arraste aqui para redimensionar o selo"
                    >
                      <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-[#071B3A]" />
                    </div>
                  </div>
                  {renderingPreview && (
                    <div className="absolute inset-0 bg-white/75 flex items-center justify-center text-xs font-bold text-[#071B3A]">
                      <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" /> Carregando página…
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Mensagem para o Cliente (Exibida no Celular)</label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Olá, por favor revise e assine os termos para dar prosseguimento ao seu atendimento..."
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-slate-600 font-bold text-xs flex items-center gap-1 font-heading"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2 disabled:opacity-50 font-heading"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Gerando Links...
                </>
              ) : (
                <>
                  Finalizar e Gerar Links de Assinatura
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
