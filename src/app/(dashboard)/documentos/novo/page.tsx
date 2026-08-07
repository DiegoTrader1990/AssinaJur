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
  Check,
  Scale
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';

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
  const [documentType, setDocumentType] = useState('Contrato');
  const [customMessage, setCustomMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdDocument, setCreatedDocument] = useState<any | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      })
      .catch((err) => console.error('Erro ao carregar clientes:', err));
  }, []);

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

  const processFile = async (file: File) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar arquivo PDF.');

      setUploadedFile(data.file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) await processFile(selectedFile);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
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
    let val = value;
    if (field === 'cpf') val = maskCpfCnpj(val);
    if (field === 'phone') val = maskPhone(val);
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: val };
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

  if (createdDocument) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6 font-sans">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A]">Documento Criado e Links Prontos!</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            Envie os links abaixo diretamente pelo WhatsApp ou E-mail dos signatários.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="text-xs font-extrabold text-[#071B3A] uppercase tracking-wider font-heading">
            Links de Assinatura Direta
          </h2>
          {createdDocument.signers.map((s: any) => (
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
          ))}
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
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">Novo Envio de Documento PDF</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Envie um documento PDF para colher assinaturas eletrônicas com validade jurídica.</p>
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
          <h2 className="font-heading text-base font-extrabold text-[#071B3A]">Passo 1: Selecione o Arquivo PDF</h2>

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
              {dragActive ? 'Solte o arquivo PDF para enviar!' : 'Arraste o arquivo PDF aqui ou clique para selecionar'}
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">Formatos suportados: PDF (máximo 25MB)</p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#071B3A] text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-[#0B1D3D] transition-all shadow-md font-heading">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Processando Hash...
                </>
              ) : (
                'Selecionar Arquivo PDF'
              )}
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {uploadedFile && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="font-bold">{uploadedFile.name}</div>
                  <div className="text-[10px] font-mono text-emerald-700">Hash SHA-256: {uploadedFile.hash.substring(0, 24)}...</div>
                </div>
              </div>
              <span className="font-bold bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full text-[11px]">Pronto</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!uploadedFile}
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
          <h2 className="font-heading text-base font-extrabold text-[#071B3A]">Passo 3: Título e Mensagem Personalizada</h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Título do Documento *</label>
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
          </div>

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
