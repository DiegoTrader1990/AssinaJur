'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Check
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  sizeBytes: number;
  hash: string;
}

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
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
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Dados do Passo 1: Upload
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  // Dados do Passo 2: Cliente & Signatários
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [signers, setSigners] = useState<SignerInput[]>([
    { name: '', cpf: '', email: '', phone: '', role: 'CLIENTE', signatureOrder: 1 },
  ]);

  // Dados do Passo 3: Título e Detalhes
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('CONTRATO');
  const [customMessage, setCustomMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdDocument, setCreatedDocument] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      })
      .catch((err) => console.error('Erro ao carregar clientes:', err));
  }, []);

  // Quando o usuário seleciona um cliente cadastrado, preenche automaticamente os dados do 1º signatário
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
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
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar arquivo PDF.');

      setUploadedFile(data.file);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
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

  const handleRemoveSigner = (index: number) => {
    if (signers.length === 1) return;
    setSigners(signers.filter((_, i) => i !== index));
  };

  const handleSignerChange = (index: number, field: keyof SignerInput, value: any) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const handleSubmitDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setError('Por favor, faça upload do PDF antes de prosseguir.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          documentType,
          originalFileId: uploadedFile.id,
          originalHash: uploadedFile.hash,
          clientId: selectedClientId || null,
          customMessage,
          signers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar documento.');

      setCreatedDocument(data);
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

  // Se o documento já foi gerado com sucesso, mostra tela de links prontos
  if (createdDocument) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-lg space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1D3D]">Documento Criado e Links Prontos!</h1>
          <p className="text-sm text-slate-500 mt-1">
            Envie os links abaixo diretamente pelo WhatsApp ou E-mail dos signatários.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Links de Assinatura Direta</h2>
          {createdDocument.signers.map((s: any) => (
            <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                <div className="text-xs text-slate-500">{s.role} • CPF: {s.cpf}</div>
              </div>

              <button
                onClick={() => handleCopyLink(s.token)}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl text-xs shadow-xs transition-all flex items-center gap-2 shrink-0"
              >
                {copiedToken === s.token ? (
                  <>
                    <Check className="w-4 h-4" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar Link
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="pt-6 flex justify-between items-center border-t border-slate-100">
          <button
            onClick={() => router.push('/documentos')}
            className="px-6 py-2.5 bg-[#0B1D3D] text-white font-bold rounded-xl text-xs hover:bg-slate-800"
          >
            Ir para Gestão de Documentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1D3D] tracking-tight">Novo Envio de Documento PDF</h1>
          <p className="text-sm text-slate-500 mt-1">Envie um documento PDF para colher assinaturas eletrônicas com validade jurídica.</p>
        </div>
        <button
          onClick={() => router.push('/documentos')}
          className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Indicador de Passos */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#0B1D3D]' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-gold-500 text-[#0B1D3D]' : 'bg-slate-100 text-slate-400'}`}>1</div>
          <span>Upload PDF</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#0B1D3D]' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-gold-500 text-[#0B1D3D]' : 'bg-slate-100 text-slate-400'}`}>2</div>
          <span>Signatários</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#0B1D3D]' : 'text-slate-400'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-gold-500 text-[#0B1D3D]' : 'bg-slate-100 text-slate-400'}`}>3</div>
          <span>Detalhes & Disparo</span>
        </div>
      </div>

      {/* Passo 1: Upload do PDF */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-[#0B1D3D]">Passo 1: Selecione o Arquivo PDF</h2>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-gold-500 transition-colors bg-slate-50/50">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Arraste o arquivo PDF aqui ou clique para selecionar</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Formatos suportados: PDF (máximo 25MB)</p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1D3D] text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-slate-800 transition-all shadow-sm">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gold-400" /> Processando Hash...
                </>
              ) : (
                'Selecionar Arquivo PDF'
              )}
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {uploadedFile && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="font-bold">{uploadedFile.name}</div>
                  <div className="text-[10px] font-mono text-emerald-700">Hash SHA-256: {uploadedFile.hash.substring(0, 24)}...</div>
                </div>
              </div>
              <span className="font-bold bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full">Pronto</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!uploadedFile}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              Avançar para Signatários
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Passo 2: Seleção de Cliente e Signatários */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-[#0B1D3D]">Passo 2: Signatários e Papéis Jurídicos</h2>

          {/* Selecionar Cliente Cadastrado */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vincular a um Cliente Cadastrado (Opcional)
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-gold-500 focus:outline-none"
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
              <span className="text-xs font-bold text-[#0B1D3D] uppercase tracking-wider">Lista de Signatários</span>
              <button
                type="button"
                onClick={handleAddSigner}
                className="text-xs font-bold text-gold-600 hover:text-gold-500 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Adicionar Outro Signatário
              </button>
            </div>

            {signers.map((s, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Signatário #{index + 1}</span>
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
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
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
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Papel Jurídico *</label>
                    <select
                      value={s.role}
                      onChange={(e) => handleSignerChange(index, 'role', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
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
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={s.phone}
                      onChange={(e) => handleSignerChange(index, 'phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-slate-600 font-semibold text-xs flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-sm text-xs transition-all flex items-center gap-2"
            >
              Avançar para Detalhes
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Passo 3: Detalhes & Disparo */}
      {step === 3 && (
        <form onSubmit={handleSubmitDocument} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h2 className="text-base font-bold text-[#0B1D3D]">Passo 3: Título e Mensagem Personalizada</h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título do Documento *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contrato de Honorários Advocatícios - João da Silva"
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Documento</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-gold-500 focus:outline-none"
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
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mensagem para o Cliente (Exibida no Celular)</label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Olá, por favor revise e assine os termos para dar prosseguimento ao seu atendimento..."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-slate-600 font-semibold text-xs flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-gold-500 hover:bg-gold-400 text-[#0B1D3D] font-bold rounded-xl shadow-md text-sm transition-all flex items-center gap-2 disabled:opacity-50"
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
