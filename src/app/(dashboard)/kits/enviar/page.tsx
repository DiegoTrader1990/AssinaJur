'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FolderArchive, Send, CheckCircle2, Copy, Check, FileText, ArrowLeft, Loader2, AlertCircle, Sparkles } from 'lucide-react';

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
    template: { title: string };
  }>;
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
  const [result, setResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

  const handleCopyLink = () => {
    if (!result?.signatureLink) return;
    navigator.clipboard.writeText(result.signatureLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
          <h1 className="text-2xl font-extrabold text-[#0B1D3D]">Kit Gerado com 1 Único Link!</h1>
          <p className="text-sm text-slate-600">
            Foram gerados <strong className="text-[#0B1D3D]">{result.documentsCount} documentos</strong> do <strong>{result.kitName}</strong> para o cliente <strong>{result.clientName}</strong>.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider block">Link Único de Assinatura pelo Celular</span>
          <div className="p-3 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-800 break-all">
            {result.signatureLink}
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full py-3 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" /> Link Copiado com Sucesso!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" /> Copiar Link para WhatsApp
              </>
            )}
          </button>
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
      </div>
    );
  }

  const selectedKit = kits.find((k) => k.id === selectedKitId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Disparar Kit Jurídico em 1 Link</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha as variáveis e envie múltiplos documentos de uma só vez no celular do cliente.</p>
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
                Gerar Pacote e Enviar em 1 Link
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
