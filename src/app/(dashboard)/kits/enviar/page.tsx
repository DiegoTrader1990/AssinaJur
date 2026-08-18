'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FolderArchive, Send, CheckCircle2, Copy, Check, FileText, ArrowLeft, Loader2, AlertCircle, Sparkles, ChevronDown, Eye, X, Plus, Trash2, Move, ChevronLeft, ChevronRight } from 'lucide-react';
import { DocumentRichEditor } from '@/components/DocumentRichEditor';
import { ensureClientQualificationTokens, formatBirthDate, formatCpfCnpj, removeStandaloneClientNameBeforeQualification } from '@/lib/kitTemplateNormalization';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone?: string;
  email?: string;
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

interface LegalKit {
  id: string;
  name: string;
  category: string;
  items: Array<{
    id: string;
    displayOrder: number;
    template: { id: string; title: string; contentHtml: string };
  }>;
}

interface GeneratedKitDocument {
  id: string;
  title: string;
  signerToken: string;
  signatureLink: string;
}

interface KitGenerationResult {
  kitName: string;
  clientName: string;
  documentsCount: number;
  documents: GeneratedKitDocument[];
  signatureLink: string;
}

export default function DispatchKitPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [kits, setKits] = useState<LegalKit[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState(searchParams.get('clientId') || '');
  const [selectedKitId, setSelectedKitId] = useState(searchParams.get('kitId') || '');
  const [variables, setVariables] = useState({
    valor_honorarios: 'R$ 3.000,00',
    percentual_exito: '30%',
  });

  // Signatários adicionais (além da cliente principal selecionada acima) e
  // fluxo de assinatura a rogo/testemunhas - mesma lógica do envio de PDF avulso.
  const [signers, setSigners] = useState<SignerInput[]>([]);
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
  const [result, setResult] = useState<KitGenerationResult | null>(null);
  const [copiedDocumentId, setCopiedDocumentId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<GeneratedKitDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [showReviewStep, setShowReviewStep] = useState(false);
  const [customContents, setCustomContents] = useState<Record<string, string>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [reviewItem, setReviewItem] = useState<LegalKit['items'][number] | null>(null);
  const [reviewClientData, setReviewClientData] = useState<Record<string, string>>({});
  const [reviewPdfUrl, setReviewPdfUrl] = useState<string | null>(null);
  const [loadingReviewPdf, setLoadingReviewPdf] = useState(false);
  const [editingReview, setEditingReview] = useState(false);

  // Posição manual do selo de assinatura, ajustável por documento do kit
  // (chave = template.id), igual ao arrastar-e-soltar do envio de PDF avulso.
  // Quando ausente para um item, o sistema detecta a posição automaticamente.
  const [stampOverrides, setStampOverrides] = useState<Record<string, { page: number; x: number; y: number; width: number; height: number }>>({});
  const [adjustingStamp, setAdjustingStamp] = useState(false);
  const [stampDraft, setStampDraft] = useState({ page: 1, x: 0.31, y: 0.62, width: 0.38, height: 0.085 });
  const [stampPageCount, setStampPageCount] = useState(1);
  const [renderingStampPreview, setRenderingStampPreview] = useState(false);
  const stampCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stampContainerRef = useRef<HTMLDivElement | null>(null);
  const stampDragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const stampResizingRef = useRef<boolean>(false);
  const stampResizeStartRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!previewDocument) {
      setPreviewUrl(null);
      setPreviewLoading(false);
      setPreviewError('');
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewUrl(null);

    fetch(`/api/documents/${previewDocument.id}/download`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar esta minuta.');
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setPreviewUrl(objectUrl);
      })
      .catch((previewFailure) => {
        if (active) setPreviewError(previewFailure instanceof Error ? previewFailure.message : 'Não foi possível carregar esta minuta.');
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewDocument]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resClients, resKits] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/kits'),
      ]);

      const dataClients = await resClients.json();
      const dataKits = await resKits.json();

      if (dataClients.clients) setClients(dataClients.clients);
      if (dataKits.kits) setKits(dataKits.kits);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedKit = kits.find((k) => k.id === selectedKitId);

  const handleSelectClient = (clientId: string) => {
    resetReviewForSelection();
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    // Um representante já cadastrado é a indicação natural para assinatura a rogo.
    // O usuário continua podendo desmarcar o fluxo ou editar os dados antes do envio.
    if (client?.legalRepresentative) {
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
    setSigners([]);
  };

  const handleAddSigner = () => {
    // Nunca crie com papel TESTEMUNHA aqui: esse papel é gerenciado só pelo
    // seletor rápido "Sem/1/2 Testemunhas" dentro do bloco de assinatura a
    // rogo (que não tem botão de excluir individual). Um signatário criado
    // aqui com papel TESTEMUNHA ficaria "invisível" nesta lista e impossível
    // de remover - por isso o papel inicial precisa ser outro.
    setSigners([
      ...signers,
      { name: '', cpf: '', email: '', phone: '', role: 'ADVOGADO', signatureOrder: signers.length + 2 },
    ]);
  };

  const handleRemoveSigner = (index: number) => {
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

  const handleRogoToggle = (enabled: boolean) => {
    setIsIlliterate(enabled);
    if (!enabled) return;
    setEnforceSignatureOrder(true);
  };

  // Uma revisão pertence a uma combinação específica de cliente e kit. Ao trocar
  // qualquer um deles, descartamos a cópia temporária anterior para nunca levar
  // dados de outra cliente (inclusive cidade e assinatura final) à nova minuta.
  const resetReviewForSelection = () => {
    setShowReviewStep(false);
    setReviewItem(null);
    setReviewClientData({});
    setCustomContents({});
    setStampOverrides({});
    setAdjustingStamp(false);
    if (reviewPdfUrl) URL.revokeObjectURL(reviewPdfUrl);
    setReviewPdfUrl(null);
  };

  const handleReviewStep = async () => {
    if (!selectedKit) return;
    
    const contents: Record<string, string> = {};
    
    for (const item of selectedKit.items) {
      if (item.template.contentHtml) {
        contents[item.template.id] = item.template.contentHtml;
      } else {
        try {
          const res = await fetch(`/api/templates/${item.template.id}`);
          const data = await res.json();
          if (data.template) {
            contents[item.template.id] = data.template.contentHtml;
            item.template.contentHtml = data.template.contentHtml;
          }
        } catch (error) {
          console.error("Failed to fetch template", error);
        }
      }
    }
    try {
      // O cliente é indispensável. Dados institucionais são complementares e
      // não podem zerar toda a revisão se uma consulta secundária falhar.
      const clientResponse = await fetch(`/api/clients/${selectedClientId}`, { cache: 'no-store' });
      if (!clientResponse.ok) throw new Error('Não foi possível carregar os dados da cliente selecionada.');
      const clientPayload = await clientResponse.json();
      const [officePayload, teamPayload] = await Promise.all([
        fetch('/api/office', { cache: 'no-store' }).then((response) => response.ok ? response.json() : { office: {} }).catch(() => ({ office: {} })),
        fetch('/api/office/team', { cache: 'no-store' }).then((response) => response.ok ? response.json() : { members: [] }).catch(() => ({ members: [] })),
      ]);
      const client = clientPayload.client || {};
      const activeLawyers = (teamPayload.members || []).filter((member: any) => member.active && ['LAWYER', 'OFFICE_ADMIN'].includes(member.role));
      const lawyer = activeLawyers[0] || {};
      const officeAddress = officePayload.office?.address || 'endereço profissional informado na configuração';
      const officeState = String(officeAddress).match(/(?:\/|,|\s)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)?.[1]?.toUpperCase() || 'BA';
      const patronos = activeLawyers.map((member: any) => {
        const role = member.gender === 'FEMININO' ? 'advogada, inscrita' : member.gender === 'MASCULINO' ? 'advogado, inscrito' : 'advogado(a), inscrito(a)';
        const oab = String(member.oabNumber || '').trim();
        return `${member.name}, ${role} ${/\bOAB\b/i.test(oab) ? `na ${oab}` : oab ? `na OAB/${officeState} sob o nº ${oab}` : 'na Ordem dos Advogados do Brasil'}`;
      }).join(' e ');
      setReviewClientData({
        cliente_nome: client.name || '', cliente_cpf: formatCpfCnpj(client.cpfCnpj), cliente_rg: client.rg || '—', cliente_nacionalidade: client.nationality || 'Brasileira',
        cliente_estado_civil: client.maritalStatus || '—', cliente_profissao: client.profession || '—', cliente_nascimento_qualificacao: client.birthDate ? `, nascido(a) em ${formatBirthDate(client.birthDate)}` : '', cliente_endereco: [client.address, client.number, client.complement, client.neighborhood, [client.city, client.state].filter(Boolean).join('/'), client.cep ? `CEP ${client.cep}` : ''].filter(Boolean).join(', ') || '—', cidade: [client.city, client.state].filter(Boolean).join('/') || '—',
        advogado_nome: lawyer.name || 'Advogado responsável', advogado_oab: lawyer.oabNumber || '—', escritorio_nome: officePayload.office?.tradeName || officePayload.office?.name || '—',
        patronos_qualificacao_conjunta: patronos ? `${patronos}, com escritório profissional na ${officeAddress}` : 'Advogado responsável',
        patronos_nomes: activeLawyers.map((member: any) => member.name).join('|'),
        cliente_genero: client.gender || '',
        representante_legal: client.legalRepresentative || '', representante_cpf: formatCpfCnpj(client.representativeCpf) || '', representante_rg: client.representativeRg || '', representante_telefone: maskPhone(client.representativePhone || '') || '',
        representante_qualificacao: [client.representativeRole, client.representativeCpf ? `CPF nº ${formatCpfCnpj(client.representativeCpf)}` : '', client.representativeRg ? `RG nº ${client.representativeRg}` : '', client.representativePhone ? `telefone ${maskPhone(client.representativePhone)}` : ''].filter(Boolean).join(', '),
        cliente_representacao: client.legalRepresentative ? `neste ato representado(a) por ${client.legalRepresentative}, ${[client.representativeRole, client.representativeCpf ? `CPF nº ${formatCpfCnpj(client.representativeCpf)}` : '', client.representativeRg ? `RG nº ${client.representativeRg}` : '', client.representativePhone ? `telefone ${maskPhone(client.representativePhone)}` : ''].filter(Boolean).join(', ')}` : '',
        data_atual: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
      });
    } catch (reviewError: any) {
      setReviewClientData({});
      setError(reviewError?.message || 'Não foi possível aplicar os dados da cliente à revisão.');
      return;
    }
    setCustomContents(contents);
    setShowReviewStep(true);
    setReviewItem(null);
  };

  const renderForReview = (html: string) => Object.entries({ ...variables, ...reviewClientData }).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value || '—')),
    html,
  ).replace(/{{\s*[a-zA-Z0-9_]+\s*}}/g, '—');

  const renderEditableReview = (html: string) => {
    let rendered = removeStandaloneClientNameBeforeQualification(
      renderForReview(ensureClientQualificationTokens(html, reviewItem?.template.title || '')),
      reviewClientData.cliente_nome || '',
    );
    if (/(procura[cç][aã]o|contrato)/i.test(reviewItem?.template.title || '')) {
      let replaced = false;
      rendered = rendered.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attributes, innerHtml) => {
        const text = String(innerHtml).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
        if (!/^(OUTORGADOS?|CONTRATADOS?)\s*:/i.test(text)) return block;
        replaced = true;
        const label = /^CONTRATADOS?/i.test(text) ? 'CONTRATADOS' : 'OUTORGADOS';
        return `<${tag}${attributes}><strong>${label}:</strong> ${reviewClientData.patronos_qualificacao_conjunta || '—'}.</${tag}>`;
      });
      if (!replaced) rendered = rendered.replace(/(OUTORGADOS?|CONTRATADOS?)\s*:[^\n<]*/i, (_match, label) => `${label}: ${reviewClientData.patronos_qualificacao_conjunta || '—'}.`);
    }

    if (reviewClientData.cliente_representacao && /(procura[cç][aã]o|contrato|declara[cç][aã]o)/i.test(reviewItem?.template.title || '')) {
      const label = /contrato/i.test(reviewItem?.template.title || '') ? 'CONTRATANTE' : /procura/i.test(reviewItem?.template.title || '') ? 'OUTORGANTE' : '';
      let included = false;
      rendered = rendered.replace(/<(p|div)([^>]*)>([\s\S]*?)<\/\1>/gi, (block, tag, attributes, innerHtml) => {
        const text = String(innerHtml).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
        const matchesClient = label ? new RegExp(`^${label}\\s*:`, 'i').test(text) : text.includes(reviewClientData.cliente_nome || '');
        if (included || !matchesClient) return block;
        included = true;
        return `<${tag}${attributes}>${String(innerHtml).replace(/\s*\.?\s*$/, '')}, ${reviewClientData.cliente_representacao}.</${tag}>`;
      });
    }

    // O PDF destaca automaticamente os nomes envolvidos; a edição deve mostrar o mesmo resultado.
    const names = [reviewClientData.cliente_nome, reviewClientData.representante_legal, ...String(reviewClientData.patronos_nomes || '').split('|')]
      .filter((name, index, values) => name && values.indexOf(name) === index)
      .sort((left, right) => right.length - left.length);
    rendered = rendered.replace(/(<[^>]+>)|([^<]+)/g, (_part, tag, text) => {
      if (tag) return tag;
      return names.reduce((segment, name) => segment.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (match: string) => `<strong>${match}</strong>`), text);
    });

    // A linha e a identificação final são o bloco de assinatura, tal como o compilador do PDF.
    const blocks = [...rendered.matchAll(/<(p|div)([^>]*)>[\s\S]*?<\/\1>/gi)];
    const signatureLineIndex = blocks.map((block) => block[0].replace(/<[^>]+>/g, '').trim()).map((text, index) => /^_{5,}/.test(text) ? index : -1).filter(index => index >= 0).at(-1);
    const firstSignatureBlock = signatureLineIndex ?? Math.max(0, blocks.length - 3);
    if (blocks.length) {
      rendered = rendered.replace(/<(p|div)([^>]*)>[\s\S]*?<\/\1>/gi, (block, tag, attributes, offset) => {
        const blockIndex = blocks.findIndex((item) => item.index === offset);
        if (blockIndex < firstSignatureBlock || blockIndex > firstSignatureBlock + 2) return block;
        const cleanAttributes = attributes.replace(/\s*style=(['"]).*?\1/i, '');
        return `<${tag}${cleanAttributes} style="text-align: center;">${block.slice(block.indexOf('>') + 1, block.lastIndexOf('</'))}</${tag}>`;
      });
    }
    return rendered;
  };

  const generateReviewPdf = async (item: LegalKit['items'][number]) => {
    setLoadingReviewPdf(true);
    setReviewPdfUrl(null);
    try {
      const response = await fetch('/api/kits/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: selectedClientId, title: item.template.title, contentHtml: customContents[item.template.id] || item.template.contentHtml, customVariables: variables }) });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      if (reviewPdfUrl) URL.revokeObjectURL(reviewPdfUrl);
      setReviewPdfUrl(url);
      setEditingReview(false);
    } catch { alert('Não foi possível gerar a prévia final.'); } finally { setLoadingReviewPdf(false); }
  };

  const openReviewItem = (item: LegalKit['items'][number]) => {
    setReviewItem(item);
    setEditingReview(false);
    setAdjustingStamp(false);
    const existingOverride = stampOverrides[item.template.id];
    setStampDraft(existingOverride || { page: 1, x: 0.31, y: 0.62, width: 0.38, height: 0.085 });
    void generateReviewPdf(item);
  };

  const handleSaveStampPosition = () => {
    if (!reviewItem) return;
    setStampOverrides((current) => ({ ...current, [reviewItem.template.id]: stampDraft }));
    setAdjustingStamp(false);
  };

  const handleResetStampPosition = () => {
    if (!reviewItem) return;
    setStampOverrides((current) => {
      const next = { ...current };
      delete next[reviewItem.template.id];
      return next;
    });
    setStampDraft({ page: 1, x: 0.31, y: 0.62, width: 0.38, height: 0.085 });
  };

  // Renderiza a página escolhida da prévia final (já compilada com o papel
  // timbrado e o texto real) para o advogado arrastar o selo por cima dela.
  useEffect(() => {
    if (!adjustingStamp || !reviewPdfUrl) return;
    let cancelled = false;
    let activeRender: any = null;
    const renderPage = async () => {
      setRenderingStampPreview(true);
      try {
        const pdfjs = await import('pdfjs-dist');
        const pdfjsVersion = pdfjs.version || '4.10.38';
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
        const res = await fetch(reviewPdfUrl);
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (cancelled) return;
        const loadingTask = pdfjs.getDocument({
          data: bytes,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/standard_fonts/`,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        setStampPageCount(pdf.numPages);
        const safePage = Math.min(Math.max(1, stampDraft.page), pdf.numPages);
        if (safePage !== stampDraft.page) setStampDraft((current) => ({ ...current, page: safePage }));
        const pdfPage = await pdf.getPage(safePage);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        let canvas = stampCanvasRef.current;
        if (!canvas) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          canvas = stampCanvasRef.current;
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
      } catch (stampPreviewError) {
        if (!cancelled) console.error('Erro ao renderizar prévia do selo:', stampPreviewError);
      } finally {
        if (!cancelled) setRenderingStampPreview(false);
      }
    };
    renderPage();
    return () => {
      cancelled = true;
      activeRender?.cancel?.();
    };
  }, [adjustingStamp, reviewPdfUrl, stampDraft.page]);

  const moveStampDraft = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!stampContainerRef.current) return;
    const bounds = stampContainerRef.current.getBoundingClientRect();

    if (stampResizingRef.current && stampResizeStartRef.current) {
      const deltaX = event.clientX - stampResizeStartRef.current.startX;
      const newWidthPx = Math.max(110, Math.min(bounds.width * 0.7, stampResizeStartRef.current.startWidth + deltaX));
      const newWidthRatio = newWidthPx / bounds.width;
      const newHeightRatio = Math.max(0.075, newWidthRatio * 0.28);
      setStampDraft((current) => ({
        ...current,
        width: newWidthRatio,
        height: newHeightRatio,
        x: Math.min(current.x, 1 - newWidthRatio),
      }));
      return;
    }

    if (!stampDragOffsetRef.current) return;
    const nextX = (event.clientX - bounds.left - stampDragOffsetRef.current.x) / bounds.width;
    const nextY = (event.clientY - bounds.top - stampDragOffsetRef.current.y) / bounds.height;
    setStampDraft((current) => ({
      ...current,
      x: Math.min(1 - current.width, Math.max(0, nextX)),
      y: Math.min(1 - current.height, Math.max(0, nextY)),
    }));
  };

  const handleGeneratePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedKitId) {
      setError('Por favor, selecione um Cliente e um Kit Jurídico.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/kits/generate-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          kitId: selectedKitId,
          customVariables: variables,
          customContents,
          stampOverrides,
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

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao gerar pacote do kit.');

      setResult(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (document: GeneratedKitDocument) => {
    navigator.clipboard.writeText(document.signatureLink);
    setCopiedDocumentId(document.id);
    setTimeout(() => setCopiedDocumentId(null), 3000);
  };

  const handleCopyKitLink = () => {
    if (!result?.signatureLink) return;
    navigator.clipboard.writeText(result.signatureLink);
    setCopiedDocumentId('KIT_LINK');
    setTimeout(() => setCopiedDocumentId(null), 3000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
        Carregando formulário de disparo do kit...
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-[28px] border border-slate-200 shadow-xl space-y-7">
        <div className="-mx-8 sm:-mx-10 -mt-8 sm:-mt-10 px-8 sm:px-10 pt-10 pb-9 bg-[#071B3A] text-center space-y-2.5 rounded-t-[28px] relative overflow-hidden">
          <div className="absolute -right-10 -top-16 w-48 h-48 rounded-full bg-[#d4af37]/10" />
          <div className="w-14 h-14 bg-white/10 border border-[#d4af37]/40 text-gold-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-950/15 relative">
            <Sparkles className="w-7 h-7" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold-300 font-bold">Assinatura eletrônica</p>
          <h1 className="text-2xl font-extrabold text-white">Kit preparado com sucesso</h1>
          <p className="text-sm text-slate-300">
            <strong className="text-white">{result.documentsCount} documentos</strong> do <strong className="text-white">{result.kitName}</strong> para <strong className="text-white">{result.clientName}</strong>.
          </p>
        </div>

        <div className="p-5 bg-[#f9f6ed] border-l-4 border-[#d4af37] rounded-r-2xl space-y-4 shadow-sm">
          <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">Link único de assinatura do kit</span>
          <p className="text-xs text-slate-600 leading-relaxed">Envie somente este link ao cliente. Ele revisará e assinará todos os documentos em uma única sessão.</p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p className="text-xs font-semibold text-[#071B3A] flex-1">Link seguro do kit disponível</p>
            <button type="button" onClick={handleCopyKitLink} className="w-full sm:w-auto shrink-0 py-3 px-6 bg-[#071B3A] hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-950/10">
              {copiedDocumentId === 'KIT_LINK' ? <><Check className="w-4 h-4" /> Link copiado</> : <><Copy className="w-4 h-4" /> Copiar link do kit</>}
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden pt-5">
          <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">Documentos incluídos</span>
          <p className="text-xs text-slate-600 leading-relaxed">Confira as minutas abaixo. Os links individuais permanecem internos ao sistema.</p>
          <div className="divide-y divide-slate-100">
            {result.documents.map((document, index) => (
              <div key={document.id} className="bg-white px-4 py-4 flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-extrabold">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0B1D3D] truncate">{document.title}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Minuta pronta para conferência</p>
                </div>
                  <button
                    type="button"
                    onClick={() => setPreviewDocument(document)}
                    className="shrink-0 py-2 px-3 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver minuta
                  </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-between items-center border-t border-slate-100">
          <button
            onClick={() => router.push('/documentos')}
            className="px-6 py-2.5 bg-[#0B1D3D] text-white font-bold rounded-xl text-xs hover:bg-slate-800"
          >
            Ver Documentos do Escritório
          </button>
          <button
            onClick={() => {
              setResult(null);
              setSelectedClientId('');
              setSigners([]);
              setIsIlliterate(false);
              setRogoName(''); setRogoCpf(''); setRogoPhone(''); setRogoEmail('');
              setRogoRelationship('Acompanhante / Familiar');
              setEnforceSignatureOrder(false);
              setStampOverrides({});
            }}
            className="px-4 py-2.5 text-slate-600 font-semibold text-xs"
          >
            Enviar Outro Kit
          </button>
        </div>

        {previewDocument && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
            <div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-[#0B1D3D] text-white px-5 py-4 flex items-center justify-between gap-4 shrink-0">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-gold-300 font-bold">Prévia da minuta</p>
                    <h2 className="text-sm font-bold truncate">{previewDocument.title}</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setPreviewDocument(null)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" aria-label="Fechar prévia">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 bg-slate-100 p-2 sm:p-4 flex items-center justify-center">
                {previewLoading ? (
                  <div className="text-center text-slate-600 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-gold-500 mx-auto" />
                    <p className="text-sm font-semibold">Carregando minuta…</p>
                  </div>
                ) : previewError ? (
                  <div className="text-center text-slate-600 space-y-3 max-w-sm">
                    <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold">{previewError}</p>
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={`Prévia de ${previewDocument.title}`}
                    className="w-full h-full bg-white rounded-lg border border-slate-300"
                  />
                ) : null}
              </div>
              <div className="px-5 py-3 border-t border-slate-200 flex justify-end shrink-0">
                <button type="button" onClick={() => setPreviewDocument(null)} className="px-5 py-2.5 bg-[#0B1D3D] hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors">Fechar prévia</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Preparar Kit Jurídico</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha as variáveis, revise todas as minutas e encaminhe cada documento com seu link seguro.</p>
        </div>
        <button onClick={() => router.push('/kits')} className="text-xs text-slate-500 font-semibold">
          Cancelar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGeneratePackage} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Seleção do Cliente */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            1. Selecione o Cliente *
          </label>
          <select
            required
            value={selectedClientId}
            onChange={(e) => handleSelectClient(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-gold-500 focus:outline-none"
          >
            <option value="">Selecione o Cliente Cadastrado...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — CPF/CNPJ: {c.cpfCnpj}
              </option>
            ))}
          </select>
        </div>

        {/* Seleção do Kit */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Selecione o Kit Jurídico *
          </label>
          <select
            required
            value={selectedKitId}
            onChange={(e) => {
              resetReviewForSelection();
              setSelectedKitId(e.target.value);
            }}
            className="w-full p-3 border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-gold-500 focus:outline-none"
          >
            <option value="">Selecione o Kit Jurídico...</option>
            {kits.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.items.length} Modelos)
              </option>
            ))}
          </select>
        </div>

        {/* Resumo do Kit Selecionado */}
        {selectedKit && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-[#0B1D3D] uppercase tracking-wider block">Documentos que serão gerados:</span>
            <div className="space-y-1 text-slate-700">
              {selectedKit.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                  <span>{item.displayOrder}. {item.template.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Valores e variáveis do contrato (honorários, percentual de êxito) usam os
            padrões definidos no modelo. Quem quiser um valor diferente edita
            diretamente o texto na etapa de revisão de cada minuta, mais abaixo. */}

        {/* Signatários Adicionais, Assinatura a Rogo e Testemunhas */}
        {selectedClientId && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">
                3. Assinatura a Rogo e Testemunhas (Opcional)
              </span>
              <button
                type="button"
                onClick={handleAddSigner}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Adicionar Outro Signatário
              </button>
            </div>

            {signers.filter((s) => s.role !== 'TESTEMUNHA').map((s) => {
              const index = signers.indexOf(s);
              return (
              <div key={index} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Signatário adicional</span>
                  <button type="button" onClick={() => handleRemoveSigner(index)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nome Completo *</label>
                    <input type="text" required value={s.name} onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                      placeholder="João da Silva" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">CPF *</label>
                    <input type="text" required value={s.cpf} onChange={(e) => handleSignerChange(index, 'cpf', e.target.value)}
                      placeholder="000.000.000-00" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Papel Jurídico *</label>
                    <select value={s.role} onChange={(e) => handleSignerChange(index, 'role', e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold">
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
                    <input type="email" value={s.email} onChange={(e) => handleSignerChange(index, 'email', e.target.value)}
                      placeholder="email@cliente.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input type="text" value={s.phone} onChange={(e) => handleSignerChange(index, 'phone', e.target.value)}
                      placeholder="(11) 99999-9999" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                  </div>
                </div>
              </div>
              );
            })}

            <div className="p-5 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 rounded-2xl border border-blue-200 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={isIlliterate} onChange={(e) => handleRogoToggle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <span className="font-extrabold text-xs text-[#071B3A]">Usar assinatura a rogo para esta cliente</span>
              </label>

              {isIlliterate && (
                <div className="pt-3 border-t border-blue-100 space-y-3 animate-in fade-in duration-300">
                  <p className="text-[11px] text-slate-600 font-medium">
                    {rogoName ? `O representante cadastrado, ${rogoName}, foi incluído como assinante a rogo. Confira os dados abaixo antes de gerar.` : 'Informe quem assinará a rogo pela cliente.'} Você pode adicionar testemunhas instrumentárias, se necessário.
                  </p>

                  <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/60 space-y-2">
                    <label className="block text-[11px] font-extrabold text-[#071B3A] uppercase tracking-wider">
                      Deseja Adicionar Testemunhas Instrumentárias a este Documento?
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setSigners((current) => current.filter((s) => s.role !== 'TESTEMUNHA'))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${signers.filter((s) => s.role === 'TESTEMUNHA').length === 0 ? 'bg-[#071B3A] text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                        Sem Testemunhas (Somente A Rogo)
                      </button>
                      <button type="button" onClick={() => setSigners((current) => {
                          const withoutWitnesses = current.filter((s) => s.role !== 'TESTEMUNHA');
                          return [...withoutWitnesses, { name: '', cpf: '', email: '', phone: '', role: 'TESTEMUNHA', signatureOrder: withoutWitnesses.length + 2 }];
                        })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${signers.filter((s) => s.role === 'TESTEMUNHA').length === 1 ? 'bg-[#071B3A] text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                        + 1 Testemunha
                      </button>
                      <button type="button" onClick={() => setSigners((current) => {
                          const withoutWitnesses = current.filter((s) => s.role !== 'TESTEMUNHA');
                          return [...withoutWitnesses,
                            { name: '', cpf: '', email: '', phone: '', role: 'TESTEMUNHA', signatureOrder: withoutWitnesses.length + 2 },
                            { name: '', cpf: '', email: '', phone: '', role: 'TESTEMUNHA', signatureOrder: withoutWitnesses.length + 3 }];
                        })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${signers.filter((s) => s.role === 'TESTEMUNHA').length >= 2 ? 'bg-[#071B3A] text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
                        + 2 Testemunhas (Recomendado)
                      </button>
                    </div>
                  </div>

                  {signers.filter((s) => s.role === 'TESTEMUNHA').map((s) => {
                    const index = signers.indexOf(s);
                    const witnessNumber = signers.filter((item) => item.role === 'TESTEMUNHA').indexOf(s) + 1;
                    return (
                      <div key={index} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700">Testemunha {witnessNumber}</span>
                        <div className="grid md:grid-cols-2 gap-3">
                          <input type="text" required value={s.name} onChange={(e) => handleSignerChange(index, 'name', e.target.value)}
                            placeholder="Nome completo da testemunha" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                          <input type="text" required value={s.cpf} onChange={(e) => handleSignerChange(index, 'cpf', e.target.value)}
                            placeholder="000.000.000-00" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <input type="email" value={s.email} onChange={(e) => handleSignerChange(index, 'email', e.target.value)}
                            placeholder="email@testemunha.com" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                          <input type="text" value={s.phone} onChange={(e) => handleSignerChange(index, 'phone', e.target.value)}
                            placeholder="(73) 99999-9999" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                        </div>
                      </div>
                    );
                  })}

                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Acompanhante a Rogo *</label>
                      <input type="text" required={isIlliterate} value={rogoName} onChange={(e) => setRogoName(e.target.value)}
                        placeholder="Ex: Maria da Silva" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">CPF do Acompanhante *</label>
                      <input type="text" required={isIlliterate} value={rogoCpf} onChange={(e) => setRogoCpf(maskCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Relação com o Cliente</label>
                      <input type="text" value={rogoRelationship} onChange={(e) => setRogoRelationship(e.target.value)}
                        placeholder="Ex: Filha, Cônjuge, Irmão" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium" />
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
                <span className="block text-xs font-extrabold text-[#071B3A]">Exigir ordem sequencial de assinatura</span>
                <span className="block mt-1 text-[11px] text-slate-600 font-medium">O próximo link só será liberado quando o participante anterior concluir. No fluxo a rogo esta proteção é obrigatória.</span>
              </span>
            </label>
          </div>
        )}

        {/* Revisar e Editar Minutas */}
        {selectedClientId && selectedKitId && (
          <div className="pt-4 border-t border-slate-100">
            {!showReviewStep ? (
              <button
                type="button"
                onClick={handleReviewStep}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-400 hover:text-slate-800 transition-all text-sm"
              >
                4. Revisar Minutas e Posição do Selo (Opcional)
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">
                    4. Revisar Minutas e Posição do Selo
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReviewStep(false)}
                    className="text-xs text-slate-500 font-semibold hover:text-slate-700"
                  >
                    Ocultar Revisão
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 -mt-2">Por padrão o selo é posicionado automaticamente. Abra cada minuta para ajustar manualmente, se preferir.</p>
                <div className="space-y-2">
                  {selectedKit?.items.map((item) => (
                    <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => openReviewItem(item)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gold-500" />
                          <span className="font-bold text-sm text-[#0B1D3D]">{item.template.title}</span>
                          {stampOverrides[item.template.id] && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Move className="w-2.5 h-2.5" /> Selo ajustado
                            </span>
                          )}
                        </div>
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 flex justify-between items-center border-t border-slate-100">
          <button
            type="button"
            onClick={() => router.push('/kits')}
            className="px-4 py-2.5 text-slate-600 font-semibold text-xs flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-extrabold rounded-xl shadow-lg text-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando Pacote...
              </>
            ) : (
              <>
                Gerar Kit para Revisão
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {reviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#071B3A] text-white px-6 py-4 flex items-center justify-between shrink-0"><div><p className="text-[10px] uppercase tracking-widest text-gold-300 font-bold">Revisão da minuta</p><h2 className="text-sm font-extrabold">{reviewItem.template.title}</h2></div><button type="button" onClick={() => setReviewItem(null)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><X className="w-5 h-5" /></button></div>
            <div className="flex-1 overflow-auto bg-slate-100 p-4 sm:p-6">
              {loadingReviewPdf ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-600"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /><p className="text-sm font-semibold">Montando a prévia final…</p></div>
              ) : editingReview ? (
                <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-4"><DocumentRichEditor key={reviewItem.id} value={customContents[reviewItem.template.id] ?? renderEditableReview(reviewItem.template.contentHtml)} onChange={(html) => setCustomContents(prev => ({ ...prev, [reviewItem.template.id]: html }))} showTags={false} showAiCopilot={false} placeholder="Redija ou ajuste o documento..." /></div>
              ) : adjustingStamp ? (
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-amber-50/50 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#071B3A] flex items-center gap-2">
                        <Move className="w-4 h-4 text-blue-600" /> Posicione o selo na página
                      </h3>
                      <p className="text-[11px] text-slate-600 mt-1">Arraste o selo sobre a página. Ele será aplicado exatamente neste local após a assinatura.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
                      <button type="button" onClick={() => setStampDraft((c) => ({ ...c, page: Math.max(1, c.page - 1) }))} disabled={stampDraft.page <= 1} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Página anterior">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-extrabold text-[#071B3A] min-w-[82px] text-center">Página {stampDraft.page} de {stampPageCount}</span>
                      <button type="button" onClick={() => setStampDraft((c) => ({ ...c, page: Math.min(stampPageCount, c.page + 1) }))} disabled={stampDraft.page >= stampPageCount} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30" aria-label="Próxima página">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 whitespace-nowrap">Tamanho do selo</span>
                    <input type="range" min="22" max="52" value={Math.round(stampDraft.width * 100)}
                      onChange={(event) => {
                        const width = Number(event.target.value) / 100;
                        setStampDraft((current) => ({ ...current, width, height: Math.max(0.075, width * 0.28), x: Math.min(current.x, 1 - width) }));
                      }}
                      className="w-full accent-blue-600" />
                    <span className="text-[11px] font-bold text-slate-700 w-9 text-right">{Math.round(stampDraft.width * 100)}%</span>
                  </div>

                  <div className="overflow-auto rounded-xl border border-slate-300 bg-slate-200/70 p-3 max-h-[520px]">
                    <div
                      ref={stampContainerRef}
                      className="relative mx-auto w-full max-w-[640px] shadow-2xl bg-white touch-none select-none rounded-xl overflow-hidden"
                      onPointerMove={moveStampDraft}
                      onPointerUp={() => { stampDragOffsetRef.current = null; stampResizingRef.current = false; stampResizeStartRef.current = null; }}
                      onPointerCancel={() => { stampDragOffsetRef.current = null; stampResizingRef.current = false; stampResizeStartRef.current = null; }}
                    >
                      <canvas ref={stampCanvasRef} className="block w-full h-auto rounded-xl pointer-events-none min-h-[500px]" />
                      <div
                        role="button"
                        tabIndex={0}
                        className="absolute cursor-move overflow-hidden group"
                        style={{ left: `${stampDraft.x * 100}%`, top: `${stampDraft.y * 100}%`, width: `${stampDraft.width * 100}%`, height: `${stampDraft.height * 100}%` }}
                        onPointerDown={(event) => {
                          const bounds = stampContainerRef.current?.getBoundingClientRect();
                          if (!bounds) return;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          stampDragOffsetRef.current = { x: event.clientX - bounds.left - stampDraft.x * bounds.width, y: event.clientY - bounds.top - stampDraft.y * bounds.height };
                        }}
                      >
                        <div className="flex h-full items-center text-[#071B3A] leading-tight select-none">
                          <div className="h-full flex items-center shrink-0 pr-1.5">
                            <div className="aspect-square h-[70%] bg-white border border-slate-300 rounded-[2px] flex items-center justify-center">
                              <span className="text-[7px] sm:text-[9px] font-black tracking-widest text-[#0B1D3D]">QR</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                            <div className="text-[7px] sm:text-[9.5px] font-black text-[#0B1D3D] truncate uppercase">{reviewClientData.cliente_nome || 'NOME DA CLIENTE'}</div>
                            <div className="text-[6px] sm:text-[8px] font-bold text-slate-700 font-mono tracking-tight">CPF: {reviewClientData.cliente_cpf || '000.000.000-00'}</div>
                            <div className="text-[5px] sm:text-[6.8px] font-extrabold text-emerald-700 uppercase">Assinatura Eletrônica Qualificada</div>
                            <div className="text-[6.5px] sm:text-[9px] font-mono font-black text-[#0B1D3D]">CÓD: AJ-A1B2-C3D4</div>
                            <div className="h-[2px] w-[46%] bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 rounded-full" />
                          </div>
                        </div>
                        <div
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const bounds = stampContainerRef.current?.getBoundingClientRect();
                            if (!bounds) return;
                            e.currentTarget.setPointerCapture(e.pointerId);
                            stampResizingRef.current = true;
                            stampResizeStartRef.current = { startX: e.clientX, startWidth: stampDraft.width * bounds.width };
                          }}
                          onPointerUp={(e) => { e.stopPropagation(); stampResizingRef.current = false; stampResizeStartRef.current = null; }}
                          className="absolute bottom-0 right-0 w-4 h-4 bg-[#D4AF37] hover:bg-amber-400 cursor-se-resize flex items-center justify-center rounded-tl-sm shadow-md z-30 transition-transform active:scale-125"
                          title="Arraste aqui para redimensionar o selo"
                        >
                          <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-[#071B3A]" />
                        </div>
                      </div>
                      {renderingStampPreview && (
                        <div className="absolute inset-0 bg-white/75 flex items-center justify-center text-xs font-bold text-[#071B3A]">
                          <Loader2 className="w-5 h-5 animate-spin mr-2 text-blue-600" /> Carregando página…
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : reviewPdfUrl ? (
                <iframe src={reviewPdfUrl} className="w-full h-full bg-white rounded-xl border border-slate-200" title="Prévia final do documento" />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">Não foi possível carregar a prévia.</div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex justify-between gap-3">
              {adjustingStamp ? (
                <>
                  {stampOverrides[reviewItem.template.id] ? (
                    <button type="button" onClick={handleResetStampPosition} className="text-xs font-bold text-slate-600">Voltar ao automático</button>
                  ) : <span className="text-xs text-slate-500 self-center">Posição padrão detectada automaticamente</span>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAdjustingStamp(false)} className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold">Cancelar</button>
                    <button type="button" onClick={handleSaveStampPosition} className="px-5 py-2.5 bg-[#071B3A] text-white rounded-lg text-xs font-bold">Salvar posição</button>
                  </div>
                </>
              ) : editingReview ? (
                <>
                  <button type="button" onClick={() => setCustomContents(prev => ({ ...prev, [reviewItem.template.id]: renderEditableReview(reviewItem.template.contentHtml) }))} className="text-xs font-bold text-slate-600">Restaurar modelo</button>
                  <div className="flex gap-2"><button type="button" onClick={() => void generateReviewPdf(reviewItem)} className="px-4 py-2.5 border border-[#071B3A] text-[#071B3A] rounded-lg text-xs font-bold">Atualizar prévia final</button><button type="button" onClick={() => { if (reviewPdfUrl) URL.revokeObjectURL(reviewPdfUrl); setReviewPdfUrl(null); setReviewItem(null); }} className="px-5 py-2.5 bg-[#071B3A] text-white rounded-lg text-xs font-bold">Concluir revisão</button></div>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-500 self-center">Prévia com a diagramação final do documento</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAdjustingStamp(true)} className="px-4 py-2.5 border border-blue-600 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5"><Move className="w-3.5 h-3.5" /> Ajustar posição do selo</button>
                    <button type="button" onClick={() => setEditingReview(true)} className="px-4 py-2.5 border border-[#071B3A] text-[#071B3A] rounded-lg text-xs font-bold">Editar conteúdo</button>
                    <button type="button" onClick={() => { if (reviewPdfUrl) URL.revokeObjectURL(reviewPdfUrl); setReviewPdfUrl(null); setReviewItem(null); }} className="px-5 py-2.5 bg-[#071B3A] text-white rounded-lg text-xs font-bold">Concluir revisão</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
