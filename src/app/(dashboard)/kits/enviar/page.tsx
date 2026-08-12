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
    cidade: 'São Paulo',
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
    setCustomContents(contents);
    setShowReviewStep(true);
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
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-8 h-8 text-gold-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B1D3D]">Kit Gerado com Sucesso!</h1>
          <p className="text-sm text-slate-600">
            Foram gerados <strong className="text-[#0B1D3D]">{result.documentsCount} documentos</strong> do <strong>{result.kitName}</strong> para o cliente <strong>{result.clientName}</strong>.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">Documentos do kit</span>
          <p className="text-xs text-slate-600 leading-relaxed">Cada documento possui sua própria minuta e link seguro. Confira todos abaixo antes de encaminhar ao cliente.</p>
          <div className="space-y-3">
            {result.documents.map((document, index) => (
              <div key={document.id} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0B1D3D]">{index + 1}. {document.title}</p>
                    <p className="font-mono text-[10px] text-slate-500 break-all mt-1">{document.signatureLink}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDocument(document)}
                    className="py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver minuta
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(document)}
                    className="py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedDocumentId === document.id ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar link</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-slate-100">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor dos Honorários ({"{{valor_honorarios}}"})</label>
              <input
                type="text"
                value={variables.valor_honorarios}
                onChange={(e) => setVariables({ ...variables, valor_honorarios: e.target.value })}
                placeholder="R$ 3.000,00"
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Percentual de Êxito ({"{{percentual_exito}}"})</label>
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
                        onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gold-500" />
                          <span className="font-bold text-sm text-[#0B1D3D]">{item.template.title}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedItemId === item.id ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedItemId === item.id && (
                        <div className="p-4 border-t border-slate-200">
                          <DocumentRichEditor
                            value={customContents[item.template.id] || ''}
                            onChange={(html) => setCustomContents(prev => ({...prev, [item.template.id]: html}))}
                            showAiCopilot={true}
                          />
                          <button 
                            type="button"
                            onClick={() => setCustomContents(prev => ({...prev, [item.template.id]: item.template.contentHtml}))}
                            className="mt-2 text-xs text-slate-500 hover:text-slate-700 font-semibold"
                          >
                            Restaurar Original
                          </button>
                        </div>
                      )}
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
    </div>
  );
}
