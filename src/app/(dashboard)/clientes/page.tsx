'use client';

import { useState, useEffect } from 'react';
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
  Camera
} from 'lucide-react';
import { maskCpfCnpj, maskPhone } from '@/lib/formatters';

interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  rg?: string;
  issuingOrgan?: string;
  birthDate?: string;
  nationality?: string;
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
  financialResponsible?: string;
  notes?: string;
  legalArea?: string;
  processNumber?: string;
  lawyerInCharge?: { id: string; name: string; oabNumber?: string };
  createdAt: string;
}

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // OCR Document Parser State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [ocrDocPreview, setOcrDocPreview] = useState<string | null>(null);
  const [ocrDragActive, setOcrDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'resumo' | 'pessoais' | 'documentos' | 'historico'>('resumo');

  // Formulário do Cliente
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
    rg: '',
    issuingOrgan: '',
    birthDate: '',
    nationality: 'Brasileira',
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
    financialResponsible: '',
    notes: '',
    legalArea: 'Previdenciário',
    processNumber: '',
  });

  useEffect(() => {
    fetchClients();
    if (searchParams.get('novo') === 'true') {
      setShowModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/clients', window.location.origin);
      if (searchQuery) url.searchParams.set('q', searchQuery);
      if (areaFilter) url.searchParams.set('legalArea', areaFilter);

      const res = await fetch(url.toString());
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients();
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === 'cpfCnpj') value = maskCpfCnpj(value);
    if (name === 'phone' || name === 'whatsapp') value = maskPhone(value);
    setFormData({ ...formData, [name]: value });
  };

  const processOcrFile = async (file: File) => {
    setOcrLoading(true);
    setFormError('');
    setOcrSuccess(false);

    const previewUrl = URL.createObjectURL(file);
    setOcrDocPreview(previewUrl);

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/clients/parse-document', {
        method: 'POST',
        body: data,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Falha ao ler o documento.');

      if (result.extracted) {
        setFormData((prev) => ({
          ...prev,
          name: result.extracted.name || prev.name,
          cpfCnpj: result.extracted.cpfCnpj || prev.cpfCnpj,
          rg: result.extracted.rg || prev.rg,
          issuingOrgan: result.extracted.issuingOrgan || prev.issuingOrgan,
          birthDate: result.extracted.birthDate || prev.birthDate,
        }));
        setOcrSuccess(true);
      }
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleDocumentOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processOcrFile(file);
  };

  const handleOcrDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setOcrDragActive(true);
    } else if (e.type === 'dragleave') {
      setOcrDragActive(false);
    }
  };

  const handleOcrDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOcrDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processOcrFile(e.dataTransfer.files[0]);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar cliente.');
      }

      setShowModal(false);
      setFormData({
        name: '',
        cpfCnpj: '',
        rg: '',
        issuingOrgan: '',
        birthDate: '',
        nationality: 'Brasileira',
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
        financialResponsible: '',
        notes: '',
        legalArea: 'Previdenciário',
        processNumber: '',
      });
      fetchClients();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-[#071B3A] tracking-tight">Cadastro de Clientes</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Gerencie os dados e documentos centralizados dos clientes do seu escritório.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-xs transition-all font-heading"
        >
          <UserPlus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Nome, CPF/CNPJ ou Telefone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
          />
        </form>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600 font-heading"
            >
              <option value="">Todas as Áreas</option>
              <option value="Previdenciário">Previdenciário</option>
              <option value="Trabalhista">Trabalhista</option>
              <option value="Família">Família</option>
              <option value="Cível">Cível</option>
              <option value="Empresarial">Empresarial</option>
            </select>
            <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={fetchClients}
            className="px-4 py-2 bg-[#071B3A] text-white rounded-xl text-xs font-bold font-heading hover:bg-[#0B1D3D] transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Carregando lista de clientes...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-heading font-extrabold text-slate-800 text-base">Nenhum cliente cadastrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Cadastre seus clientes para reutilizar os dados em contratos, procurações e pacotes de documentos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-heading font-extrabold text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Cliente</th>
                  <th className="px-6 py-3.5">CPF / CNPJ</th>
                  <th className="px-6 py-3.5">Contato</th>
                  <th className="px-6 py-3.5">Área Jurídica</th>
                  <th className="px-6 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 font-heading">{client.name}</div>
                      {client.profession && <div className="text-xs text-slate-400 font-medium">{client.profession}</div>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">
                      {maskCpfCnpj(client.cpfCnpj)}
                    </td>
                    <td className="px-6 py-4 text-xs space-y-0.5 font-medium">
                      <div className="font-bold text-slate-800">{maskPhone(client.phone)}</div>
                      {client.email && <div className="text-slate-400">{client.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                        {client.legalArea || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#071B3A] hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-all font-heading"
                      >
                        Abrir Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Novo Cliente com OCR & Leitura por IA */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className={`bg-white rounded-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 transition-all ${
            ocrDocPreview ? 'max-w-5xl' : 'max-w-3xl'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">Cadastrar Novo Cliente</h2>
              </div>
              <button onClick={() => {
                setShowModal(false);
                setOcrDocPreview(null);
                setOcrSuccess(false);
              }} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Zona de Leitura Inteligente de Documento (RG / CNH / CPF) */}
            <div
              onDragEnter={handleOcrDrag}
              onDragLeave={handleOcrDrag}
              onDragOver={handleOcrDrag}
              onDrop={handleOcrDrop}
              className={`mt-4 p-4 rounded-2xl transition-all border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                ocrDragActive
                  ? 'bg-blue-100/90 border-blue-600 scale-[1.01]'
                  : 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Zap className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-[#071B3A] text-xs">Preenchimento por Foto (IA / OCR)</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider font-heading">
                      Novo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Envie a foto da CNH ou RG do cliente para preencher Nome, CPF, RG e Data de Nascimento automaticamente.
                  </p>
                </div>
              </div>

              <label className="cursor-pointer shrink-0">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocumentOcr}
                  disabled={ocrLoading}
                  className="hidden"
                />
                <div className="px-4 py-2.5 bg-[#071B3A] hover:bg-[#0B1D3D] text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md font-heading">
                  {ocrLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Lendo Documento...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-blue-400" /> Enviar RG ou CNH
                    </>
                  )}
                </div>
              </label>
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
            <div className={ocrDocPreview ? 'grid md:grid-cols-12 gap-6 mt-6' : 'mt-6'}>
              {/* Coluna da Esquerda: Pré-visualização do Documento Enviado */}
              {ocrDocPreview && (
                <div className="md:col-span-4 bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 flex flex-col justify-between p-3 relative group min-h-[300px]">
                  <div className="flex items-center justify-between text-white text-[11px] font-bold pb-2 border-b border-slate-700 font-heading">
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <Camera className="w-4 h-4" /> Documento Original
                    </span>
                    <span className="text-slate-400 text-[10px]">Conferência</span>
                  </div>
                  <div className="my-auto py-2 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ocrDocPreview}
                      alt="Documento do cliente"
                      className="max-h-[340px] w-auto object-contain rounded-lg shadow-md"
                    />
                  </div>
                  <div className="text-center pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-medium">
                    Confira a imagem ao lado com o formulário
                  </div>
                </div>
              )}

              {/* Coluna da Direita: Formulário de Cadastro */}
              <div className={ocrDocPreview ? 'md:col-span-8' : 'w-full'}>
                <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
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

                  <div className="grid md:grid-cols-3 gap-4">
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
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Endereço Residencial</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Rua das Flores, nº 100"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">Cidade / UF</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleFormChange}
                        placeholder="São Paulo / SP"
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                    </div>
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
                      onClick={() => setShowModal(false)}
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
                      Salvar Cadastro do Cliente
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ficha Detalhada do Cliente */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 font-heading font-extrabold flex items-center justify-center text-base">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-heading text-lg font-extrabold text-[#071B3A]">{selectedClient.name}</h2>
                  <p className="text-xs text-slate-400 font-medium">CPF/CNPJ: {maskCpfCnpj(selectedClient.cpfCnpj)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navegação de Abas da Ficha */}
            <div className="flex border-b border-slate-200 mt-4 text-xs font-heading font-bold">
              <button
                onClick={() => setActiveTab('resumo')}
                className={`py-2.5 px-4 border-b-2 transition-all ${
                  activeTab === 'resumo' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Resumo do Cliente
              </button>
              <button
                onClick={() => setActiveTab('pessoais')}
                className={`py-2.5 px-4 border-b-2 transition-all ${
                  activeTab === 'pessoais' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dados Pessoais
              </button>
            </div>

            {/* Conteúdo da Aba */}
            <div className="py-6 space-y-4 text-xs">
              {activeTab === 'resumo' && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">Contato Principal</div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Phone className="w-4 h-4 text-blue-600" /> {maskPhone(selectedClient.phone)}
                    </div>
                    {selectedClient.email && (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Mail className="w-4 h-4 text-slate-400" /> {selectedClient.email}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading">Classificação Jurídica</div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Scale className="w-4 h-4 text-blue-600" /> Área: {selectedClient.legalArea || 'Geral'}
                    </div>
                    {selectedClient.profession && (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Briefcase className="w-4 h-4 text-slate-400" /> Profissão: {selectedClient.profession}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'pessoais' && (
                <div className="grid md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">RG</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedClient.rg || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Órgão Expedidor</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedClient.issuingOrgan || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Estado Civil</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedClient.maritalStatus || 'Não informado'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs font-heading"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
