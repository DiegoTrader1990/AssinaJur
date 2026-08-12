'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FolderArchive, Send, CheckCircle2, Copy, Check, FileText, ArrowLeft, Loader2, AlertCircle, Sparkles, ChevronDown, Eye, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const DocumentRichEditor = dynamic(() => import('@/components/DocumentRichEditor').then(mod => mod.DocumentRichEditor), { ssr: false });

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone?: string;
  email?: string;
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

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState(searchParams.get('kitId') || '');
  const [variables, setVariables] = useState({
    valor_honorarios: 'R$ 3.000,00',
    percentual_exito: '30%',
  });

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
      const [clientResponse, officeResponse, teamResponse] = await Promise.all([
        fetch(`/api/clients/${selectedClientId}`), fetch('/api/office'), fetch('/api/office/team'),
      ]);
      const [clientPayload, officePayload, teamPayload] = await Promise.all([clientResponse.json(), officeResponse.json(), teamResponse.json()]);
      const client = clientPayload.client || {};
      const activeLawyers = (teamPayload.members || []).filter((member: any) => member.active);
      const lawyer = activeLawyers[0] || {};
      const officeAddress = officePayload.office?.address || 'endereço profissional informado na configuração';
      const officeState = String(officeAddress).match(/(?:\/|,|\s)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)?.[1]?.toUpperCase() || 'BA';
      const patronos = activeLawyers.map((member: any) => {
        const role = member.gender === 'FEMININO' ? 'advogada, inscrita' : member.gender === 'MASCULINO' ? 'advogado, inscrito' : 'advogado(a), inscrito(a)';
        const oab = String(member.oabNumber || '').trim();
        return `${member.name}, ${role} ${/\bOAB\b/i.test(oab) ? `na ${oab}` : oab ? `na OAB/${officeState} sob o nº ${oab}` : 'na Ordem dos Advogados do Brasil'}`;
      }).join(' e ');
      setReviewClientData({
        cliente_nome: client.name || '', cliente_cpf: client.cpfCnpj || '', cliente_rg: client.rg || '—', cliente_nacionalidade: client.nationality || 'Brasileira',
        cliente_estado_civil: client.maritalStatus || '—', cliente_profissao: client.profession || '—', cliente_endereco: [client.address, client.number, client.neighborhood, [client.city, client.state].filter(Boolean).join('/')].filter(Boolean).join(', ') || '—', cidade: client.city || '—',
        advogado_nome: lawyer.name || 'Advogado responsável', advogado_oab: lawyer.oabNumber || '—', escritorio_nome: officePayload.office?.tradeName || officePayload.office?.name || '—',
        patronos_qualificacao_conjunta: patronos ? `${patronos}, com escritório profissional na ${officeAddress}` : 'Advogado responsável',
        cliente_genero: client.gender || '',
        data_atual: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
      });
    } catch { setReviewClientData({}); }
    setCustomContents(contents);
    setShowReviewStep(true);
    setReviewItem(null);
  };

  const renderForReview = (html: string) => Object.entries({ ...variables, ...reviewClientData }).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), String(value || '—')),
    html,
  ).replace(/{{\s*[a-zA-Z0-9_]+\s*}}/g, '—');

  const renderEditableReview = (html: string) => {
    let rendered = renderForReview(html);
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
    void generateReviewPdf(item);
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
            onChange={(e) => setSelectedClientId(e.target.value)}
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
            onChange={(e) => setSelectedKitId(e.target.value)}
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

        {/* Ajuste de Variáveis */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">
            3. Ajustar Valores e Variáveis do Contrato
          </span>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor dos Honorários</label>
              <input
                type="text"
                value={variables.valor_honorarios}
                onChange={(e) => setVariables({ ...variables, valor_honorarios: e.target.value })}
                placeholder="R$ 3.000,00"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Percentual de Êxito</label>
              <input
                type="text"
                value={variables.percentual_exito}
                onChange={(e) => setVariables({ ...variables, percentual_exito: e.target.value })}
                placeholder="30%"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Revisar e Editar Minutas */}
        {selectedClientId && selectedKitId && (
          <div className="pt-4 border-t border-slate-100">
            {!showReviewStep ? (
              <button
                type="button"
                onClick={handleReviewStep}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-400 hover:text-slate-800 transition-all text-sm"
              >
                4. Revisar e Editar Minutas (Opcional)
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">
                    4. Revisar e Editar Minutas
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReviewStep(false)}
                    className="text-xs text-slate-500 font-semibold hover:text-slate-700"
                  >
                    Ocultar Revisão
                  </button>
                </div>
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
              {loadingReviewPdf ? <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-600"><Loader2 className="w-8 h-8 animate-spin text-gold-500" /><p className="text-sm font-semibold">Montando a prévia final…</p></div> : editingReview ? <div className="max-w-[680px] mx-auto bg-white rounded-xl border border-slate-200 p-4"><DocumentRichEditor value={renderEditableReview(customContents[reviewItem.template.id] || reviewItem.template.contentHtml)} onChange={(html) => setCustomContents(prev => ({ ...prev, [reviewItem.template.id]: html }))} showAiCopilot={false} showTags={false} contentClassName="font-sans text-[10px] leading-[15px] p-10 text-slate-800 [&_p]:my-0 [&_p]:mb-2 [&_p]:text-justify [&_p:nth-last-child(-n+2)]:text-center [&_p:nth-last-child(3)]:mt-12 [&_h1]:text-center [&_h1]:text-[12px] [&_h1]:leading-[17px] [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-[11px] [&_h2]:font-bold" /></div> : reviewPdfUrl ? <iframe src={reviewPdfUrl} className="w-full h-full bg-white rounded-xl border border-slate-200" title="Prévia final do documento" /> : <div className="h-full flex items-center justify-center text-sm text-slate-500">Não foi possível carregar a prévia.</div>}
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex justify-between gap-3">
              {editingReview ? <button type="button" onClick={() => setCustomContents(prev => ({ ...prev, [reviewItem.template.id]: reviewItem.template.contentHtml }))} className="text-xs font-bold text-slate-600">Restaurar modelo</button> : <span className="text-xs text-slate-500 self-center">Prévia com a diagramação final do documento</span>}
              <div className="flex gap-2"><button type="button" onClick={() => editingReview ? void generateReviewPdf(reviewItem) : setEditingReview(true)} className="px-4 py-2.5 border border-[#071B3A] text-[#071B3A] rounded-lg text-xs font-bold">{editingReview ? 'Atualizar prévia final' : 'Editar conteúdo'}</button><button type="button" onClick={() => { if (reviewPdfUrl) URL.revokeObjectURL(reviewPdfUrl); setReviewPdfUrl(null); setReviewItem(null); }} className="px-5 py-2.5 bg-[#071B3A] text-white rounded-lg text-xs font-bold">Concluir revisão</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
